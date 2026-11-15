import { CatalogError, parseBrief, parseBrowse, parseOptions, parseRecord, verifyPrinting } from './parse.js';
import {
  advanced, canonicalRecord, catalogPath, databases, indexes, isbnForms, origin, pagingRequest,
  paths, persianDigits, searchRequest, type Advanced, type Multi, type Paging
} from './query.js';

const timeoutMs = 12_000;
const maxBody = 4 * 1024 * 1024;
const intervalMs = 350;
const browsePath = 'search/bibliographicBrowse.do';
const browseProcess = 'search/bibliographicBrowseProcess.do';

type Ticket = { cookie?: string };
type Page = ReturnType<typeof parseBrief>;
type SearchState = { ticket: Ticket; pageStatus: string; first: Page; source: string; fetched_at: string };

export function describeError(error: unknown) {
  if (error instanceof CatalogError) {
    return { code: error.code, message: error.message, source_url: error.source_url, data_absence_confirmed: false };
  }
  return { code: 'REQUEST_FAILED', message: error instanceof Error ? error.message : 'Unexpected failure', data_absence_confirmed: false };
}

function urlFor(path: string) {
  return new URL(catalogPath + path, origin);
}

export class Catalog {
  #tail = Promise.resolve();
  #queued = 0;
  #nextRequest = 0;
  #blockedUntil = 0;
  #details = new Map<string, { fetched_at: string; expires: number; record: ReturnType<typeof parseRecord> }>();
  #optionsCache?: { expires: number; value: ReturnType<typeof parseOptions> & { fetched_at: string; source_url: string } };

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async #fetch(url: URL, ticket?: Ticket, body?: URLSearchParams, signal?: AbortSignal) {
    if (this.#queued >= 24) throw new CatalogError('BUSY', 'The OPAC request queue is full.', url.href);
    this.#queued++;
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>(done => { release = done; });
    try {
      await previous;
      signal?.throwIfAborted();
      if (Date.now() < this.#blockedUntil) {
        throw new CatalogError('RATE_LIMITED', 'The catalog is cooling down after HTTP 429.', url.href);
      }
      const delay = this.#nextRequest - Date.now();
      if (delay > 0) await new Promise(done => setTimeout(done, delay));
      this.#nextRequest = Date.now() + intervalMs;
      const headers = new Headers({ 'accept-language': 'fa,en;q=0.5', 'user-agent': 'NLAI-MCP/0.1 (public catalog client)' });
      if (ticket?.cookie) headers.set('cookie', ticket.cookie);
      const deadline = AbortSignal.timeout(timeoutMs);
      const response = await this.fetcher(url, {
        method: body ? 'POST' : 'GET', body, headers, redirect: 'manual',
        signal: signal ? AbortSignal.any([signal, deadline]) : deadline
      });
      const cookie = response.headers.getSetCookie().map(value => value.split(';')[0])
        .find(value => /^JSESSIONID=[a-z0-9._-]+$/i.test(value ?? ''));
      if (ticket && cookie) ticket.cookie = cookie;
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry ?? '') - Date.now();
        this.#blockedUntil = Date.now() + Math.max(15_000, Number.isFinite(seconds) ? seconds : 30_000);
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new CatalogError(response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_HTTP',
          `OPAC returned HTTP ${response.status}.`, url.href);
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBody) {
            await reader.cancel();
            throw new CatalogError('RESPONSE_TOO_LARGE', 'The OPAC response exceeded 4 MiB.', url.href);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      return {
        bytes: Buffer.concat(chunks, size), contentType: response.headers.get('content-type') ?? '',
        source_url: url.href, fetched_at: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      const stopped = signal?.aborted;
      throw new CatalogError(stopped ? 'CANCELLED' : 'NETWORK_ERROR',
        stopped ? 'OPAC request cancelled.' : 'Could not read the public OPAC response (network or deadline).', url.href);
    } finally {
      this.#queued--;
      release();
    }
  }

  async #html(url: URL, ticket?: Ticket, body?: URLSearchParams, signal?: AbortSignal) {
    const response = await this.#fetch(url, ticket, body, signal);
    if (!response.contentType.includes('text/html')) {
      throw new CatalogError('UNEXPECTED_RESPONSE', 'OPAC returned a response other than HTML.', url.href);
    }
    return { html: response.bytes.toString('utf8'), source_url: response.source_url, fetched_at: response.fetched_at };
  }

  async options(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const saved = this.#optionsCache;
    if (saved && saved.expires > Date.now()) return { ...saved.value, cached: true };
    const url = urlFor(paths.form + '?command=NEW_SEARCH&classType=0&pageStatus=1');
    const { html, source_url, fetched_at } = await this.#html(url, undefined, undefined, signal);
    const value = { source_url, fetched_at, ...parseOptions(html, source_url) };
    this.#optionsCache = { expires: Date.now() + 120_000, value };
    return { ...value, cached: false };
  }

  async browse(field: Exclude<keyof typeof indexes, 'all'>, value: string, database: keyof typeof databases, signal?: AbortSignal) {
    const ticket: Ticket = {};
    await this.#html(urlFor(browsePath + '?command=BROWSE_SETUP&classType=0&pageStatus=3'), ticket, undefined, signal);
    const body = new URLSearchParams({
      classType: '0', pageStatus: '3', command: 'BROWSE', 'attributes.locale': 'fa',
      'simpleSearch.indexFieldId': indexes[field], 'simpleSearch.tokenized': 'false',
      'simpleSearch.value': value, nliHolding: databases[database]
    });
    const { html, source_url, fetched_at } = await this.#html(urlFor(browseProcess), ticket, body, signal);
    return { source_url, fetched_at, field, value, database, ...parseBrowse(html, source_url) };
  }

  async #begin(query: Advanced | Multi, options: Paging, signal?: AbortSignal): Promise<SearchState> {
    if (query.language || query.gmd) {
      const available = await this.options(signal);
      if (query.language && !available.languages.some(option => option.code === query.language)) {
        throw new CatalogError('UNSUPPORTED_LANGUAGE', 'Use a language code from list_catalog_options.', available.source_url);
      }
      if (query.gmd && !available.material_designations.some(option => option.code === query.gmd)) {
        throw new CatalogError('UNSUPPORTED_GMD', 'Use a material designation code from list_catalog_options.', available.source_url);
      }
    }
    const ticket: Ticket = {};
    const { path, params, pageStatus } = searchRequest(query);
    const response = await this.#html(urlFor(path), ticket, params, signal);
    let first = parseBrief(response.html, response.source_url);
    if (first.items.length && !ticket.cookie) {
      throw new CatalogError('SESSION_MISSING', 'OPAC did not supply its anonymous search session.', response.source_url);
    }
    const firstPage = { ...options, page: 1 };
    const state = { ticket, pageStatus, source: response.source_url, fetched_at: response.fetched_at };
    if (first.items.length && (options.sort !== 'none' || options.secondary_sort !== 'none')) {
      if (first.total > 500) throw new CatalogError('SORT_NOT_AVAILABLE', 'OPAC disables catalog sorting above 500 results. Narrow the query or keep default order.', state.source);
      first = await this.#openPage(state, firstPage, 'SORT_BY', signal);
    }
    if (first.items.length && first.page_size !== options.page_size) {
      first = await this.#openPage(state, firstPage, 'BRIEF_LIST_SETUP', signal);
    }
    if (first.items.length && first.page_size !== options.page_size) {
      throw new CatalogError('PAGE_SIZE_MISMATCH', 'OPAC did not apply the requested page size.', response.source_url);
    }
    if (first.items.length && (options.sort !== 'none' || options.secondary_sort !== 'none')) {
      const keys = pagingRequest(pageStatus, options, 'SORT_BY');
      if (first.applied_sort_keys.some((key, index) => key !== keys.get('sortKeyValue' + (index + 1)))) {
        throw new CatalogError('SORT_MISMATCH', 'OPAC did not echo the requested sort keys.', state.source);
      }
    }
    return { ...state, first };
  }

  async #openPage(state: Omit<SearchState, 'first'>, options: Paging,
    command: 'SORT_BY' | 'BRIEF_LIST_SETUP' | 'GOTO_PAGE', signal?: AbortSignal) {
    const response = await this.#html(urlFor(paths.brief), state.ticket,
      pagingRequest(state.pageStatus, options, command), signal);
    const page = parseBrief(response.html, response.source_url);
    if (page.page !== options.page || (command === 'GOTO_PAGE' && page.page_size !== options.page_size)) {
      throw new CatalogError('PAGINATION_MISMATCH', 'OPAC did not return the requested result page.', response.source_url);
    }
    return page;
  }

  async #page(state: SearchState, options: Paging, signal?: AbortSignal) {
    if (options.page === 1 || state.first.total === 0) return state.first;
    if (options.page > state.first.total_pages) {
      throw new CatalogError('PAGE_OUT_OF_RANGE', `OPAC has ${state.first.total_pages} result pages for this query.`, state.source);
    }
    return this.#openPage(state, options, 'GOTO_PAGE', signal);
  }

  #presentation(page: Page, state: SearchState, options: Paging) {
    const { items, ...meta } = page;
    return {
      ...meta, source_url: state.source, fetched_at: state.fetched_at, requested_page: options.page,
      next_page: page.page < Math.min(9999, page.total_pages) ? page.page + 1 : null,
      entire_query_covered: page.page <= 1 && page.total_pages <= 1 && items.length === page.total,
      returned: items.length, items: items.map(({ selection_name: _, ...entry }) => entry)
    };
  }

  async search(query: Advanced | Multi, options: Paging, signal?: AbortSignal) {
    const state = await this.#begin(query, options, signal);
    const page = await this.#page(state, options, signal);
    return { query, ...this.#presentation(page, state, options) };
  }

  async harvest(query: Advanced, options: Paging, maxPages: number, signal?: AbortSignal) {
    const state = await this.#begin(query, options, signal);
    const seen = new Map<string, Omit<Page['items'][number], 'selection_name'>>();
    const errors: { page: number; error: ReturnType<typeof describeError> }[] = [];
    const pages: number[] = [];
    let next_page: number | null = options.page;
    for (let index = 0; index < maxPages && next_page !== null; index++) {
      const current = next_page;
      try {
        const page = await this.#page(state, { ...options, page: current }, signal);
        const summary = this.#presentation(page, state, options);
        for (const item of summary.items) seen.set(item.id, item);
        if (page.page) pages.push(page.page);
        next_page = summary.next_page;
      } catch (error) {
        errors.push({ page: current, error: describeError(error) });
        break;
      }
    }
    return {
      items: [...seen.values()], source_url: state.source, fetched_at: state.fetched_at,
      candidate_total: state.first.total, pages, next_page, errors,
      entire_query_covered: options.page === 1 && next_page === null && seen.size === state.first.total && !errors.length
    };
  }

  async details(id: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const saved = this.#details.get(id);
    if (saved && saved.expires > Date.now()) {
      return { ...saved.record, fetched_at: saved.fetched_at, cached: true };
    }
    const response = await this.#html(new URL(canonicalRecord(id)), undefined, undefined, signal);
    const record = parseRecord(response.html, id, response.source_url);
    // Bound the cache by entry count. Search sessions and cookies are never shared.
    if (this.#details.size >= 100) this.#details.delete(this.#details.keys().next().value!);
    this.#details.set(id, { record, fetched_at: response.fetched_at, expires: Date.now() + 120_000 });
    return { ...record, fetched_at: response.fetched_at, cached: false };
  }

  async batch(ids: string[], signal?: AbortSignal) {
    const records: Awaited<ReturnType<Catalog['details']>>[] = [];
    const errors: { id: string; error: ReturnType<typeof describeError> }[] = [];
    for (const id of new Set(ids)) {
      signal?.throwIfAborted();
      try { records.push(await this.details(id, signal)); }
      catch (error) {
        errors.push({ id, error: describeError(error) });
      }
    }
    return { requested: new Set(ids).size, returned: records.length, complete: errors.length === 0, records, errors };
  }

  async isbn(value: string, tryEquivalent: boolean, signal?: AbortSignal) {
    const forms = tryEquivalent ? isbnForms(value) : [value];
    const attempts = [];
    const records = new Map<string, Awaited<ReturnType<Catalog['details']>> & { match: 'literal' | 'alternate_isbn_form' }>();
    for (const form of forms) {
      const query = advanced.parse({ clauses: [{ field: 'isbn_issn', value: form, match: 'exact' }] });
      const page = await this.search(query, { page: 1, page_size: 15, sort: 'none', secondary_sort: 'none' }, signal);
      const detail = await this.batch(page.items.map(item => item.id), signal);
      const matches = detail.records.filter(book => book.isbns.some(isbn => isbn.value === form));
      for (const book of matches) {
        if (!records.has(book.id)) records.set(book.id, { ...book, match: form === value ? 'literal' : 'alternate_isbn_form' });
      }
      attempts.push({
        queried_isbn: form, fetched_at: page.fetched_at, source_url: page.source_url,
        reported_candidates: page.total, complete: page.entire_query_covered && detail.complete,
        excluded_candidate_ids: detail.records.filter(book => !matches.includes(book)).map(book => book.id),
        errors: detail.errors
      });
    }
    return { input_isbn: value, entire_query_covered: attempts.every(item => item.complete), attempts, records: [...records.values()] };
  }

  async firstPrintings(year: string, query: Pick<Advanced, 'clauses' | 'database' | 'language'>,
    options: Paging, startAt: number, scanLimit: number, includeUnknown: boolean, signal?: AbortSignal) {
    const search = advanced.parse({
      ...query,
      clauses: [...query.clauses, { field: 'publication_date', value: persianDigits(year) }],
      material: 'book'
    });
    const state = await this.#begin(search, options, signal);
    const page = await this.#page(state, options, signal);
    const offset = startAt - 1;
    if (offset && offset >= page.items.length) throw new CatalogError('OFFSET_OUT_OF_RANGE', 'Candidate offset is outside the current page.', state.source);
    const selection = page.items.slice(offset, offset + scanLimit);
    const batch = await this.batch(selection.map(item => item.id), signal);
    const checks = batch.records.map(record => ({
      id: record.id, title: record.title, source_url: record.source_url, fetched_at: record.fetched_at,
      national_bibliography_number: record.national_bibliography_number, isbns: record.isbns,
      cataloging_kind: record.cataloging_kind, publication: record.publication,
      main_entries: record.main_entries, subjects: record.subjects, publication_date_text: record.publication_date_text,
      printing: verifyPrinting(record, year)
    }));
    const confirmed = checks.filter(book => book.printing.status === 'confirmed_catalog_printing');
    const nextOffset = offset + selection.length;
    const next = nextOffset < page.items.length ? { page: options.page, start_at: nextOffset + 1 }
      : page.page < Math.min(9999, page.total_pages) ? { page: options.page + 1, start_at: 1 } : null;
    return {
      year, source_url: state.source, fetched_at: state.fetched_at,
      candidate_query: search, candidate_total: page.total, candidate_page: page.page,
      total_pages: page.total_pages, page_size: page.page_size,
      scanned_candidates: selection.length, verified_detail_records: checks.length, confirmed_count: confirmed.length,
      other_numbered_printings_observed: checks.filter(book => book.printing.status === 'only_other_numbered_printings_observed').length,
      unverified_count: checks.filter(book => book.printing.status === 'unverified').length,
      next, full_candidate_scan: next === null && options.page === 1 && offset === 0 &&
        selection.length === page.total && batch.complete,
      confirmed, ...(includeUnknown ? { unverified: checks.filter(book => book.printing.status === 'unverified') } : {}),
      errors: batch.errors
    };
  }

  async iso(query: Advanced, options: Paging, requested: string[] | undefined, signal?: AbortSignal) {
    const state = await this.#begin(query, options, signal);
    const page = await this.#page(state, options, signal);
    const ids = requested ? [...new Set(requested)] : page.items.map(item => item.id);
    const rows = ids.map(id => page.items.find(item => item.id === id));
    if (!ids.length || rows.some(row => !row)) {
      throw new CatalogError('SELECTION_NOT_ON_PAGE', 'Provide IDs present on the selected OPAC result page.', state.source);
    }
    const body = pagingRequest(state.pageStatus, options, 'SAVE_PRINT');
    body.set('selectionFormat', '5');
    body.set('selectionRows', '2');
    for (const row of rows) body.set(row!.selection_name, 'on');
    const response = await this.#fetch(urlFor(paths.brief), state.ticket, body, signal);
    const outputIds = readIsoIds(response.bytes, response.source_url);
    if (outputIds.length !== ids.length || ids.some(id => !outputIds.includes(id))) {
      throw new CatalogError('ISO_SELECTION_MISMATCH', 'The returned UNIMARC IDs do not match the selected result IDs.', response.source_url);
    }
    return { bytes: response.bytes, ids: outputIds, fetched_at: response.fetched_at, source_url: response.source_url };
  }
}

export function readIsoIds(bytes: Buffer, source: string) {
  const ids: string[] = [];
  const malformed = () => new CatalogError('INVALID_ISO2709', 'OPAC did not return recognizable UNIMARC ISO 2709 records with field 001.', source);
  let offset = 0;
  while (offset < bytes.length) {
    const lengthText = bytes.toString('ascii', offset, offset + 5);
    if (!/^\d{5}$/.test(lengthText)) throw malformed();
    const length = Number(lengthText);
    const base = Number(bytes.toString('ascii', offset + 12, offset + 17));
    if (length < 26 || offset + length > bytes.length || bytes[offset + length - 1] !== 0x1d ||
        base < 25 || base >= length || (base - 25) % 12 || bytes[offset + base - 1] !== 0x1e) throw malformed();
    let id: string | undefined;
    for (let pos = offset + 24; pos < offset + base - 1; pos += 12) {
      if (bytes.toString('ascii', pos, pos + 3) !== '001') continue;
      const size = Number(bytes.toString('ascii', pos + 3, pos + 7));
      const start = offset + base + Number(bytes.toString('ascii', pos + 7, pos + 12));
      if (!Number.isInteger(start) || !Number.isInteger(size) || size < 2 || start < offset + base ||
          start + size >= offset + length || bytes[start + size - 1] !== 0x1e) throw malformed();
      id = bytes.toString('utf8', start, start + size - 1).trim();
    }
    if (!id || !/^\d+$/.test(id)) throw malformed();
    ids.push(id);
    offset += length;
  }
  if (!ids.length) throw malformed();
  return ids;
}
