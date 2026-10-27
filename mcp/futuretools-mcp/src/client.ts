import { ORIGIN, assertPublicUrl, type Source } from './contracts.js';
import { FutureToolsError } from './errors.js';
type Loaded = { html: string; source: Source };
type Options = { fetcher?: typeof fetch; intervalMs?: number; timeoutMs?: number; ttlMs?: number; maxBodyBytes?: number };
export class FutureToolsClient {
  private readonly cache = new Map<string, { value: Loaded; expires: number; bytes: number }>();
  private readonly pending = new Map<string, Promise<Loaded>>();
  private tail: Promise<unknown> = Promise.resolve();
  private lastStart = 0;
  private cooldownUntil = 0;
  private bytes = 0;
  private requests = 0;
  constructor(private readonly options: Options = {}) {}
  status() { return { mode: 'live_public_web', api_key_required: false, paid_services_required: false,
    browser_required: false, origin: ORIGIN, cache_entries: this.cache.size, requests: this.requests,
    cooldown_until: this.cooldownUntil > Date.now() ? new Date(this.cooldownUntil).toISOString() : null,
    access_verified: false, note: 'Status makes no network request. Use check_access to verify a real directory read.' }; }
  async get(url: URL): Promise<Loaded> {
    assertPublicUrl(url); const key = url.href, cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return { html: cached.value.html, source: { ...cached.value.source, cached: true } };
    if (cached) { this.bytes -= cached.bytes; this.cache.delete(key); }
    if (this.pending.has(key)) return this.pending.get(key)!;
    if (this.cooldownUntil > Date.now()) throw new FutureToolsError('RATE_LIMITED', 'FutureTools requested a cooldown; retry later.', Math.ceil((this.cooldownUntil - Date.now()) / 1000));
    if (this.pending.size >= 16) throw new FutureToolsError('QUEUE_FULL', 'Too many pending directory reads. Retry after current requests complete.');
    const task = this.tail.catch(() => {}).then(async () => {
      if (this.cooldownUntil > Date.now()) throw new FutureToolsError('RATE_LIMITED', 'FutureTools cooldown remains active.', Math.ceil((this.cooldownUntil - Date.now()) / 1000));
      const delay = (this.options.intervalMs ?? 600) - (Date.now() - this.lastStart);
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
      this.lastStart = Date.now();
      const value = await this.request(url);
      const bytes = Buffer.byteLength(value.html);
      while (this.cache.size >= 40 || this.bytes + bytes > 16 * 1024 * 1024) {
        const first = this.cache.keys().next().value; if (first === undefined) break;
        this.bytes -= this.cache.get(first)!.bytes; this.cache.delete(first);
      }
      const expires = Date.parse(value.source.cache_expires_at); this.cache.set(key, { value, expires, bytes }); this.bytes += bytes;
      return value;
    });
    this.tail = task; this.pending.set(key, task);
    try { return await task; } finally { this.pending.delete(key); }
  }
  private async request(original: URL): Promise<Loaded> {
    let url = original;
    for (let redirect = 0; redirect < 3; redirect++) {
      assertPublicUrl(url);
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 12000);
      try {
        this.requests++;
        const response = await (this.options.fetcher ?? fetch)(url, { method: 'GET', redirect: 'manual', signal: controller.signal,
          headers: { accept: 'text/html', 'user-agent': 'FutureToolsMCP/0.1 (public directory reader)' } });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location'); if (!location) throw new FutureToolsError('UPSTREAM_REDIRECT', 'Redirect had no target.');
          const next = new URL(location, url); assertPublicUrl(next); await response.body?.cancel(); url = next; continue;
        }
        if ([401, 403].includes(response.status)) { await response.body?.cancel(); throw new FutureToolsError('ACCESS_BLOCKED', 'FutureTools denied this request or presented an access challenge. It was not bypassed; this is not an empty result.'); }
        if (response.status === 429) {
          const retry = response.headers.get('retry-after'), numeric = Number(retry);
          const seconds = retry && Number.isFinite(numeric) ? numeric : retry && Number.isFinite(Date.parse(retry)) ? (Date.parse(retry) - Date.now()) / 1000 : 60;
          this.cooldownUntil = Date.now() + Math.min(86400, Math.max(1, seconds)) * 1000;
          await response.body?.cancel(); throw new FutureToolsError('RATE_LIMITED', 'FutureTools rate limit reached; no automatic retry.', Math.ceil((this.cooldownUntil - Date.now()) / 1000));
        }
        if (response.status === 404) { await response.body?.cancel(); throw new FutureToolsError('PAGE_NOT_FOUND', 'FutureTools returned HTTP 404 for this exact page.'); }
        if (!response.ok) { await response.body?.cancel(); throw new FutureToolsError('UPSTREAM_HTTP_ERROR', `FutureTools returned HTTP ${response.status}.`); }
        if (!response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); throw new FutureToolsError('UNEXPECTED_CONTENT', 'Expected a public HTML page.'); }
        const reader = response.body?.getReader(); if (!reader) throw new FutureToolsError('EMPTY_RESPONSE', 'No page body was returned.');
        const chunks: Uint8Array[] = []; let size = 0; const max = this.options.maxBodyBytes ?? 2 * 1024 * 1024;
        try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
          if (size > max) { await reader.cancel(); throw new FutureToolsError('RESPONSE_TOO_LARGE', 'Public page exceeded the configured body limit.'); } chunks.push(part.value); } }
        finally { reader.releaseLock(); }
        let html: string;
        try { html = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
        catch { throw new FutureToolsError('INVALID_ENCODING', 'Page was not valid UTF-8; text was not silently corrupted.'); }
        if (/just a moment|verify (?:that )?you are human|challenge-platform|cf-chl-/i.test(html.slice(0, 12000))) throw new FutureToolsError('ACCESS_BLOCKED', 'An access challenge was returned instead of directory data.');
        const fetched = Date.now();
        return { html, source: { source: 'FutureTools', source_url: url.href, fetched_at: new Date(fetched).toISOString(), cached: false,
          cache_expires_at: new Date(fetched + (this.options.ttlMs ?? 120000)).toISOString() } };
      } catch (error) {
        if (error instanceof FutureToolsError) throw error;
        throw new FutureToolsError(controller.signal.aborted ? 'UPSTREAM_TIMEOUT' : 'NETWORK_ERROR', controller.signal.aborted ? 'FutureTools read timed out, including its response body.' : 'Could not connect to FutureTools; retry when connectivity is restored.');
      } finally { clearTimeout(timer); }
    }
    throw new FutureToolsError('UPSTREAM_REDIRECT', 'Too many redirects.');
  }
}
