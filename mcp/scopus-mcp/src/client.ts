import * as z from 'zod/v4';
import { ScopusError } from './errors.js';
const ORIGIN = 'https://api.elsevier.com';
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const paths = [
  /^\/content\/search\/(author|affiliation|scopus)$/,
  /^\/content\/author\/author_id\/\d{1,20}$/,
  /^\/content\/affiliation\/affiliation_id\/\d{1,20}$/,
  /^\/content\/abstract\/(scopus_id|eid|doi|pubmed_id)\/[^?#]+$/,
  /^\/content\/serial\/title$/, /^\/content\/serial\/title\/issn\/[\dXx-]{8,9}$/,
  /^\/content\/subject\/scopus$/,
];
export type Quota = { limit: number | null; remaining: number | null; reset_at: string | null };
export type Provenance = { source: 'Scopus'; provider: 'Elsevier'; fetched_at: string; cached: boolean;
  cache_expires_at: string; api: string; quota: Quota };
type Cache = { data: unknown; fetchedAt: number; expiresAt: number; bytes: number; quota: Quota };
export type ClientConfig = { apiKey?: string; instToken?: string; fetcher?: typeof fetch;
  intervalMs?: number; timeoutMs?: number; ttlMs?: number; maxCacheBytes?: number; maxResponseBytes?: number };
const headerNumber = (v: string | null): number | null => v !== null && /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) ? Number(v) : null;
function decodeUtf8(decoder: TextDecoder, value?: Uint8Array, stream = false): string {
  try { return decoder.decode(value, { stream }); }
  catch { throw new ScopusError('UPSTREAM_INVALID_ENCODING', 'Scopus returned invalid UTF-8; text was not silently repaired.'); }
}
const family = (path: string) => path.startsWith('/content/search/') ? path.split('/').slice(2).join('/') : path.split('/')[2]!;
export class ScopusClient {
  private readonly fetcher: typeof fetch;
  private readonly config: ClientConfig;
  private cache = new Map<string, Cache>();
  private pending = new Map<string, Promise<Cache>>();
  private tail: Promise<unknown> = Promise.resolve();
  private nextStart = 0;
  private bytes = 0;
  private cooldowns = new Map<string, number>();
  private quotas = new Map<string, Quota>();
  constructor(config: ClientConfig = {}) {
    this.config = { intervalMs: 600, timeoutMs: 12000, ttlMs: 60000, maxCacheBytes: 8_000_000,
      maxResponseBytes: 5_000_000, ...config };
    this.fetcher = config.fetcher ?? globalThis.fetch;
    for (const value of [config.apiKey, config.instToken]) if (value && /[\r\n]/.test(value)) {
      throw new ScopusError('INVALID_CONFIGURATION', 'Credentials must not contain newline characters.');
    }
  }
  status() {
    return { api_key_configured: Boolean(this.config.apiKey), institutional_token_configured: Boolean(this.config.instToken),
      data_source: 'Scopus', api_origin: ORIGIN, read_only: true, software_license: 'MIT',
      entitlement_verified: false, quota_observations: Object.fromEntries(this.quotas),
      note: 'Configuration is not proof of entitlement. API access, fields and quotas depend on Elsevier authorization. No alternative data sources are used.' };
  }
  async get<S extends z.ZodType>(path: string, params: Record<string, string | number | undefined>, schema: S) {
    if (!path.startsWith('/') || path.includes('..') || /[?#\\]/.test(path) || !paths.some(p => p.test(path))) {
      throw new ScopusError('INVALID_UPSTREAM_PATH', 'Only approved read-only Scopus API paths are allowed.');
    }
    if (Object.keys(params).some(k => /key|token|url|host/i.test(k))) {
      throw new ScopusError('INVALID_UPSTREAM_PARAMETER', 'Credentials and URLs must not be supplied as query parameters.');
    }
    if (!this.config.apiKey && path !== '/content/subject/scopus') throw new ScopusError('SCOPUS_API_KEY_REQUIRED',
      'Set ELSEVIER_API_KEY locally. The server software is free, but Scopus data access requires Elsevier authorization.');
    const url = new URL(path, ORIGIN);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));
    url.searchParams.sort();
    const key = url.href, api = family(path);
    let entry = this.cache.get(key);
    const cached = Boolean(entry && entry.expiresAt > Date.now());
    if (!cached) {
      let promise = this.pending.get(key);
      if (!promise) {
        if (this.pending.size >= 24) throw new ScopusError('BUSY', 'Upstream queue is full. Retry shortly.', 5);
        promise = this.tail.then(() => this.load(url, api));
        this.tail = promise.catch(() => undefined); this.pending.set(key, promise);
      }
      try { entry = await promise; } finally { if (this.pending.get(key) === promise) this.pending.delete(key); }
    }
    const result = schema.safeParse(entry!.data);
    if (!result.success) { this.remove(key); throw new ScopusError('UPSTREAM_SCHEMA_CHANGED', 'Scopus returned an unexpected response structure.'); }
    const provenance: Provenance = { source: 'Scopus', provider: 'Elsevier', api,
      fetched_at: new Date(entry!.fetchedAt).toISOString(), cache_expires_at: new Date(entry!.expiresAt).toISOString(), cached,
      quota: entry!.quota };
    return { data: result.data, provenance };
  }
  private remove(key: string) { const old = this.cache.get(key); if (old) { this.bytes -= old.bytes; this.cache.delete(key); } }
  private async load(url: URL, api: string): Promise<Cache> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const until = this.cooldowns.get(api) ?? 0;
      if (until > Date.now()) throw new ScopusError('RATE_LIMITED', 'Scopus asked this API client to wait.', Math.ceil((until - Date.now()) / 1000));
      await wait(Math.max(0, this.nextStart - Date.now())); this.nextStart = Date.now() + this.config.intervalMs!;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const headers: Record<string, string> = { accept: 'application/json',
          'user-agent': 'scopus-profiles-mcp/0.1.0 (read-only)' };
        if (this.config.apiKey) headers['X-ELS-APIKey'] = this.config.apiKey;
        if (this.config.instToken) headers['X-ELS-Insttoken'] = this.config.instToken;
        const response = await this.fetcher(url, { method: 'GET', redirect: 'error', headers, signal: controller.signal });
        const reset = headerNumber(response.headers.get('x-ratelimit-reset'));
        const quota: Quota = { limit: headerNumber(response.headers.get('x-ratelimit-limit')),
          remaining: headerNumber(response.headers.get('x-ratelimit-remaining')),
          reset_at: reset !== null && reset <= 253402300799 ? new Date(reset * 1000).toISOString() : null };
        this.quotas.set(api, quota);
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status === 401) throw new ScopusError('AUTHENTICATION_FAILED', 'Elsevier rejected the API credentials. Check the configured key and token.', undefined, 401);
          if (response.status === 403) throw new ScopusError('ACCESS_DENIED', 'This Scopus API/view is not authorized for the current key, institutional network or token. No fallback data was substituted.', undefined, 403);
          if (response.status === 429) {
            const exceeded = response.headers.get('x-els-status')?.includes('QUOTA_EXCEEDED') || quota.remaining === 0;
            const retryHeader = response.headers.get('retry-after');
            const parsed = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : retryHeader ? (Date.parse(retryHeader) - Date.now()) / 1000 : NaN;
            const seconds = Math.ceil(Number.isFinite(parsed) ? parsed : exceeded && reset ? reset - Date.now() / 1000 : 30);
            const delay = Math.max(1, Math.min(seconds, 604800)); this.cooldowns.set(api, Date.now() + delay * 1000);
            throw new ScopusError(exceeded ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED', 'Scopus API quota or throttle limit reached.', delay, 429);
          }
          if (response.status >= 500 && attempt === 0) { await wait(800); continue; }
          throw new ScopusError(response.status === 404 ? 'NOT_FOUND' : response.status === 400 ? 'UPSTREAM_QUERY_ERROR' : 'UPSTREAM_HTTP_ERROR',
            response.status === 404 ? 'Scopus did not find this record.' : `Scopus returned HTTP ${response.status}.`, undefined, response.status);
        }
        if (!(response.headers.get('content-type') ?? '').includes('json')) { await response.body?.cancel(); throw new ScopusError('UPSTREAM_NON_JSON', 'Scopus returned a non-JSON response.'); }
        const reader = response.body?.getReader(); if (!reader) throw new ScopusError('UPSTREAM_INVALID_JSON', 'Scopus returned an empty response.');
        const decoder = new TextDecoder('utf-8', { fatal: true }); let length = 0, body = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          length += value.byteLength;
          if (length > this.config.maxResponseBytes!) { await reader.cancel(); throw new ScopusError('RESPONSE_TOO_LARGE', 'Scopus response exceeded the size limit.'); }
          body += decodeUtf8(decoder, value, true);
        }
        body += decodeUtf8(decoder); let data: unknown;
        try { data = JSON.parse(body); } catch { throw new ScopusError('UPSTREAM_INVALID_JSON', 'Scopus returned invalid JSON.'); }
        if (data && typeof data === 'object' && ('service-error' in data || 'error-response' in data)) {
          throw new ScopusError('UPSTREAM_SERVICE_ERROR', 'Scopus returned a service error inside an HTTP success response.');
        }
        const now = Date.now(), entry = { data, fetchedAt: now, expiresAt: now + this.config.ttlMs!, bytes: length, quota };
        this.remove(url.href);
        while (this.cache.size && (this.cache.size >= 100 || this.bytes + length > this.config.maxCacheBytes!)) this.remove(this.cache.keys().next().value!);
        if (length <= this.config.maxCacheBytes!) { this.cache.set(url.href, entry); this.bytes += length; }
        return entry;
      } catch (error) {
        if (error instanceof ScopusError) throw error;
        if (!controller.signal.aborted && attempt === 0) { await wait(800); continue; }
        throw new ScopusError(controller.signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK_ERROR',
          controller.signal.aborted ? 'Scopus request timed out.' : 'Could not connect to the Scopus API.');
      } finally { clearTimeout(timer); }
    }
    throw new ScopusError('UPSTREAM_NETWORK_ERROR', 'Could not complete the Scopus request.');
  }
}
