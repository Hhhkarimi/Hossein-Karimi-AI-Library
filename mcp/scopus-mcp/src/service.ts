import * as z from 'zod/v4';
import { ScopusClient, type Provenance } from './client.js';
import { abstractResponseSchema, affiliationResponseSchema, authorResponseSchema, documentSearchInput,
  searchResponseSchema, serialResponseSchema, subjectResponseSchema } from './contracts.js';
import { ScopusError, errorData } from './errors.js';
import { documentId, numericId, profileId } from './identifiers.js';
import { affiliationCard, affiliationProfile, authorCard, authorProfile, documentCard, documentDetails,
  ensureRecord, list, num, obj, references, safeBounded, serialCard, str, type Row } from './normalize.js';
export type SearchKind = 'authors' | 'affiliations' | 'documents';
type AuthorView = 'AUTO' | 'LIGHT' | 'STANDARD' | 'ENHANCED' | 'METRICS';
type AffiliationView = 'AUTO' | 'LIGHT' | 'STANDARD';
type Attempt = { view: string; state: string; error?: ReturnType<typeof errorData> };
const documentSort = { relevance: '-relevancy', newest: '-coverDate', oldest: '+coverDate', citations_desc: '-citedby-count' };
const searchPath = { authors: 'author', affiliations: 'affiliation', documents: 'scopus' };
const stopCodes = new Set(['AUTHENTICATION_FAILED', 'SCOPUS_API_KEY_REQUIRED', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'ACCESS_DENIED']);
export class ScopusService {
  constructor(private readonly client = new ScopusClient()) {}
  status() { return this.client.status(); }
  private async search(kind: SearchKind, params: Record<string, string | number | undefined>) {
    const { data, provenance } = await this.client.get(`/content/search/${searchPath[kind]}`, params, searchResponseSchema);
    const result = data['search-results'], total = Number(result['opensearch:totalResults']);
    const all = list(result.entry);
    const items = all.filter(row => {
      if (!row.error) return true;
      if (total === 0 && /result set was empty/i.test(str(row.error) ?? '')) return false;
      ensureRecord(row); return false;
    });
    const start = Number(result['opensearch:startIndex'] ?? params.start ?? 0);
    const nextLink = list(result.link).find(l => str(l['@ref']) === 'next');
    let nextOffset: number | null = null;
    if (nextLink) {
      try {
        const url = new URL(str(nextLink['@href']) ?? '');
        const candidate = url.searchParams.get('start');
        if (url.hostname === 'api.elsevier.com' && url.pathname === `/content/search/${searchPath[kind]}` &&
          candidate !== null && /^\d+$/.test(candidate) && Number.isSafeInteger(Number(candidate)) && Number(candidate) > start) nextOffset = Number(candidate);
      } catch { /* Do not follow malformed links; use the response page size below. */ }
      if (nextOffset === null) nextOffset = start + Number(result['opensearch:itemsPerPage'] ?? params.count ?? items.length);
    }
    const cursor = obj(result.cursor);
    return { result, items, provenance, total, start, next: Boolean(nextLink), next_offset: nextOffset,
      next_cursor: str(cursor['@next']), cursor_current: str(cursor['@current']),
      page_clamped: params.start !== undefined && Number(params.start) !== start };
  }
  async searchAuthors(input: { query: string; start: number; count: number; sort: string }) {
    const loaded = await this.search('authors', { query: input.query, start: input.start, count: input.count,
      view: 'STANDARD', sort: input.sort === 'documents_desc' ? '-document-count' : '+surname' });
    return { ...loaded.provenance, query: input.query, ...this.page(loaded, input.count),
      items: loaded.items.slice(0, input.count).map(authorCard),
      note: 'Name matches are candidates, not identity proof. Author affiliation filters may match previous affiliations.' };
  }
  async searchAffiliations(input: { query: string; start: number; count: number; sort: string }) {
    const sort = input.sort === 'documents_desc' ? '-document-count' : input.sort === 'name' ? '+affiliation-name' : '-relevancy';
    const loaded = await this.search('affiliations', { query: input.query, start: input.start, count: input.count, sort, view: 'STANDARD' });
    return { ...loaded.provenance, query: input.query, ...this.page(loaded, input.count),
      items: loaded.items.slice(0, input.count).map(affiliationCard) };
  }
  async searchDocuments(raw: unknown) {
    const input = documentSearchInput.parse(raw);
    const loaded = await this.search('documents', { query: input.query, start: input.cursor ? undefined : input.start,
      cursor: input.cursor, count: input.count, view: input.view, sort: documentSort[input.sort] });
    return { ...loaded.provenance, query: input.query, view: input.view, ...this.page(loaded, input.count),
      next_cursor: loaded.next_cursor, cursor_current: loaded.cursor_current,
      next_start: input.cursor ? null : loaded.next_offset,
      items: loaded.items.slice(0, input.count).map(documentCard) };
  }
  private page(loaded: { total: number; start: number; next: boolean; next_offset: number | null; page_clamped: boolean; items: Row[] }, count: number) {
    return { total_results: loaded.total, start: loaded.start, returned: Math.min(count, loaded.items.length),
      next_start: loaded.next_offset,
      page_clamped: loaded.page_clamped, coverage: 'one_upstream_page' };
  }
  private async authorView(id: string, view: Exclude<AuthorView, 'AUTO'>) {
    const { data, provenance } = await this.client.get(`/content/author/author_id/${id}`, { view }, authorResponseSchema);
    const rows = list(data['author-retrieval-response']).map(ensureRecord);
    if (rows.length !== 1) throw new ScopusError('AMBIGUOUS_PROFILE', 'Scopus returned multiple or no author profiles. Resolve the identifier explicitly.');
    return { ...provenance, ...authorProfile(rows[0]!), view };
  }
  async author(reference: string, view: AuthorView = 'AUTO') {
    const id = profileId(reference, 'author');
    const views: Exclude<AuthorView, 'AUTO'>[] = view === 'AUTO' ? ['ENHANCED', 'STANDARD', 'LIGHT'] : [view];
    const attempts: Attempt[] = [];
    let base: Awaited<ReturnType<ScopusService['authorView']>> | undefined;
    for (const candidate of views) {
      try { base = await this.authorView(id, candidate); attempts.push({ view: candidate, state: 'success' }); break; }
      catch (error) {
        attempts.push({ view: candidate, state: 'failed', error: errorData(error) });
        if (!(error instanceof ScopusError) || error.code !== 'ACCESS_DENIED' || view !== 'AUTO') throw error;
      }
    }
    if (!base) throw new ScopusError('ACCESS_DENIED', 'Scopus denied every attempted author view. The profile may exist; access was not granted.');
    const observations: Record<string, { fetched_at: string; cached: boolean }> = {
      [base.view]: { fetched_at: base.fetched_at, cached: base.cached },
    };
    if (view === 'AUTO' && Object.values(base.metrics).some(v => v === null)) {
      try {
        const metrics = await this.authorView(id, 'METRICS');
        if (metrics.id !== base.id) throw new ScopusError('PROFILE_CHANGED', 'Scopus resolved the identifier to different profiles across views. Retry before merging.');
        for (const key of Object.keys(base.metrics) as (keyof typeof base.metrics)[]) {
          if (base.metrics[key] === null && metrics.metrics[key] !== null) {
            base.metrics[key] = metrics.metrics[key]; base.metric_status[key] = { state: 'reported' };
          }
        }
        observations.METRICS = { fetched_at: metrics.fetched_at, cached: metrics.cached };
        attempts.push({ view: 'METRICS', state: 'success' });
      } catch (error) {
        if (!(error instanceof ScopusError) || !['ACCESS_DENIED', 'RATE_LIMITED', 'QUOTA_EXCEEDED'].includes(error.code)) throw error;
        attempts.push({ view: 'METRICS', state: 'failed', error: errorData(error) });
      }
    }
    return { ...base, requested_author_id: id, resolved_to_different_id: base.id !== id,
      requested_view: view, view_attempts: attempts, view_observations: observations,
      data_completeness: Object.values(base.metrics).some(v => v === null) ? 'some_metrics_not_returned' : 'all_exposed_metrics_reported' };
  }
  async authorMetrics(reference: string) {
    const profile = await this.author(reference, 'AUTO');
    return { source: profile.source, provider: profile.provider, fetched_at: profile.fetched_at,
      id: profile.id, name: profile.name, url: profile.url, metrics: profile.metrics, metric_status: profile.metric_status,
      view_attempts: profile.view_attempts, view_observations: profile.view_observations,
      note: 'citation_count is the number of citations; citing_document_count counts citing documents. No h-index is computed from a limited sample.' };
  }
  async authorAffiliations(reference: string) {
    const p = await this.author(reference);
    return { source: p.source, provider: p.provider, id: p.id, url: p.url, fetched_at: p.fetched_at,
      current: p.current_affiliations, history: p.affiliation_history, view_attempts: p.view_attempts,
      list_status: p.current_affiliations.length || p.affiliation_history.length ? 'returned' : 'not_returned_in_view',
      note: 'A missing list is not proof that the author has no affiliations. These are Scopus profile associations.' };
  }
  async authorCoauthors(reference: string, start: number, count: number) {
    const id = profileId(reference, 'author');
    const loaded = await this.search('authors', { 'co-author': id, start, count, view: 'STANDARD' });
    return { ...loaded.provenance, author_id: id, ...this.page(loaded, count), items: loaded.items.slice(0, count).map(authorCard) };
  }
  async affiliation(reference: string, view: AffiliationView = 'AUTO') {
    const id = profileId(reference, 'affiliation');
    const attempts: Attempt[] = [];
    for (const candidate of view === 'AUTO' ? ['STANDARD', 'LIGHT'] : [view]) {
      try {
        const { data, provenance } = await this.client.get(`/content/affiliation/affiliation_id/${id}`, { view: candidate }, affiliationResponseSchema);
        const rows = list(data['affiliation-retrieval-response']).map(ensureRecord);
        if (rows.length !== 1) throw new ScopusError('AMBIGUOUS_PROFILE', 'Scopus returned multiple or no affiliation profiles.');
        attempts.push({ view: candidate, state: 'success' });
        const profile = affiliationProfile(rows[0]!);
        return { ...provenance, ...profile, requested_affiliation_id: id, resolved_to_different_id: profile.id !== id,
          view: candidate, view_attempts: attempts };
      } catch (error) {
        attempts.push({ view: candidate, state: 'failed', error: errorData(error) });
        if (!(error instanceof ScopusError) || error.code !== 'ACCESS_DENIED' || view !== 'AUTO') throw error;
      }
    }
    throw new ScopusError('ACCESS_DENIED', 'Scopus denied every attempted affiliation view. This does not establish that the university profile is absent.');
  }
  async affiliationAuthors(reference: string, start: number, count: number) {
    const id = profileId(reference, 'affiliation');
    const result = await this.searchAuthors({ query: `AF-ID(${id})`, start, count, sort: 'documents_desc' });
    return { ...result, affiliation_id: id,
      membership_scope: 'Scopus AF-ID author search; can include historical affiliations',
      note: 'This is not a current staff directory. Inspect each author profile current_affiliations before claiming current membership.' };
  }
  entityQuery(type: 'author' | 'affiliation', reference: string) {
    return `${type === 'author' ? 'AU-ID' : 'AF-ID'}(${profileId(reference, type)})`;
  }
  async entityDocuments(type: 'author' | 'affiliation', reference: string, start: number, count: number, sort: string) {
    return this.searchDocuments({ query: this.entityQuery(type, reference), start, count, sort });
  }
  async authorCitingDocuments(reference: string, start: number, count: number) {
    return this.searchDocuments({ query: `REFAUID(${profileId(reference, 'author')})`, start, count, sort: 'newest' });
  }
  async document(identifier: string, type: 'scopus_id' | 'eid' | 'doi' | 'pubmed_id', view: 'META' | 'META_ABS' | 'FULL') {
    const id = documentId(identifier, type);
    const { data, provenance } = await this.client.get(`/content/abstract/${type}/${encodeURIComponent(id)}`, { view }, abstractResponseSchema);
    const row = ensureRecord(data['abstracts-retrieval-response']);
    return { ...provenance, ...documentDetails(row), view };
  }
  async documentReferences(identifier: string, type: 'scopus_id' | 'eid' | 'doi' | 'pubmed_id', start: number, count: number) {
    const id = documentId(identifier, type);
    const { data, provenance } = await this.client.get(`/content/abstract/${type}/${encodeURIComponent(id)}`,
      { view: 'REF', startref: start, refcount: count }, abstractResponseSchema);
    return { ...provenance, identifier: id, identifier_type: type, startref: start,
      ...references(ensureRecord(data['abstracts-retrieval-response']), count) };
  }
  async citingDocuments(eid: string, start: number, count: number) {
    const id = documentId(eid, 'eid');
    return this.searchDocuments({ query: `REFEID(${id})`, start, count, sort: 'newest' });
  }
  async facets(query: string, dimensions: string[]) {
    const loaded = await this.search('documents', { query, count: 1, start: 0, view: 'STANDARD',
      facets: dimensions.map(d => `${d}(count=20)`).join(';') });
    return { ...loaded.provenance, query, total_results: loaded.total, requested_dimensions: dimensions,
      facets: safeBounded(loaded.result.facets ?? null),
      facets_status: loaded.result.facets == null ? 'not_returned_in_view' : 'reported',
      note: 'Facet buckets are capped. Missing buckets are not zero; different dimensions may overlap.' };
  }
  async journals(title: string, start: number, count: number) {
    const { data, provenance } = await this.client.get('/content/serial/title', { title, start, count, view: 'ENHANCED' }, serialResponseSchema);
    const rows = list(data['serial-metadata-response'].entry).map(ensureRecord);
    return { ...provenance, title, start, returned: Math.min(count, rows.length), items: rows.slice(0, count).map(serialCard),
      coverage: 'one_upstream_page' };
  }
  async subjectAreas(start = 0, count = 100, code?: string) {
    const { data, provenance } = await this.client.get('/content/subject/scopus', { code }, subjectResponseSchema);
    const rows = list(data['subject-classifications']['subject-classification']);
    const items = rows.slice(start, start + count).map(r => ({ code: str(r.code ?? r['@code']),
      abbreviation: str(r.abbrev ?? r['@abbrev']), name: str(r.description ?? r['$']), detail: str(r.detail) }));
    return { ...provenance, total_results: rows.length, start, returned: items.length,
      next_start: start + items.length < rows.length ? start + items.length : null, items };
  }
  async batch(type: 'author' | 'affiliation', references: string[]) {
    const ids = [...new Set(references.map(r => profileId(r, type)))];
    const results: Record<string, unknown>[] = []; const started = Date.now();
    let stopped: string | undefined;
    for (const id of ids) {
      if (stopped || Date.now() - started > 35000) {
        results.push({ id, ok: false, error: { code: stopped ?? 'BATCH_TIME_LIMIT', message: 'Not attempted after an earlier access/rate/time limit. This is not a missing record.' } }); continue;
      }
      try { results.push({ id, ok: true, profile: type === 'author' ? await this.author(id) : await this.affiliation(id) }); }
      catch (error) { const detail = errorData(error); results.push({ id, ok: false, error: detail }); if (stopCodes.has(detail.code)) stopped = detail.code; }
    }
    return { source: 'Scopus', type, requested: ids.length, succeeded: results.filter(r => r.ok).length, items: results };
  }
  async compare(type: 'author' | 'affiliation', references: string[]) {
    const ids = [...new Set(references.map(r => profileId(r, type)))];
    if (ids.length < 2) throw new ScopusError('INVALID_ARGUMENTS', 'Provide at least two distinct Scopus profile IDs.');
    const result = await this.batch(type, ids);
    return { ...result, comparison_complete: result.succeeded === result.requested,
      note: 'Counts and profile metrics are from Scopus at the reported times. No ranking or cross-discipline quality score is inferred; restricted profiles remain explicit errors.' };
  }
  async trend(type: 'author' | 'affiliation', reference: string, from: number, to: number) {
    const query = this.entityQuery(type, reference); const rows: Record<string, unknown>[] = [];
    let stopped: string | undefined; const started = Date.now();
    for (let year = from; year <= to; year++) {
      if (stopped || Date.now() - started > 35000) { rows.push({ year, document_count: null, state: 'not_attempted', reason: stopped ?? 'TIME_LIMIT' }); continue; }
      try {
        const loaded = await this.search('documents', { query, date: year, count: 1, start: 0, view: 'STANDARD' });
        rows.push({ year, document_count: loaded.total, state: 'reported', fetched_at: loaded.provenance.fetched_at });
      } catch (error) { const detail = errorData(error); rows.push({ year, document_count: null, state: 'request_failed', error: detail }); if (stopCodes.has(detail.code)) stopped = detail.code; }
    }
    return { source: 'Scopus', query, entity_type: type, years: rows,
      complete: rows.every(r => r.state === 'reported'),
      note: 'Counts come from full-query Scopus totals per publication year, not from a sampled page. Restricted or unattempted years are not zero.' };
  }
  async checkAccess(apis: ('authors' | 'affiliations' | 'documents')[]) {
    const checks = [];
    for (const api of [...new Set(apis)]) {
      try { const loaded = await this.search(api, { query: api === 'documents' ? 'TITLE(test)' : 'AFFIL(university)', count: 1, start: 0, view: 'STANDARD' });
        checks.push({ api, state: 'allowed_for_this_request', quota: loaded.provenance.quota, fetched_at: loaded.provenance.fetched_at }); }
      catch (error) { checks.push({ api, state: 'request_failed', error: errorData(error) }); }
    }
    return { source: 'Scopus', checks, note: 'A successful search does not establish access to every profile view, metric or institution. Each check consumes one request unless cached.' };
  }
}
