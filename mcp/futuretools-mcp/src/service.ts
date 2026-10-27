import { FutureToolsClient } from './client.js';
import { ORIGIN, searchInput, searchUrl, toolSlug, type SearchInput, type Tool, type Source } from './contracts.js';
import { FutureToolsError, errorData } from './errors.js';
import { parseDetail, parseDirectory, verifyApplied } from './parser.js';
const stopCodes = new Set(['ACCESS_BLOCKED', 'RATE_LIMITED', 'UPSTREAM_TIMEOUT', 'NETWORK_ERROR']);
export type SourcedTool = Tool & { provenance: Source };
export class FutureToolsService {
  constructor(private readonly client = new FutureToolsClient()) {}
  status() { return this.client.status(); }
  async search(raw: unknown) {
    const input = searchInput.parse(raw), loaded = await this.client.get(searchUrl(input));
    const parsed = parseDirectory(loaded.html); verifyApplied(parsed.applied, input);
    if (parsed.items.length && parsed.start !== (input.page - 1) * 24 + 1) throw new FutureToolsError('PAGE_NOT_APPLIED', 'The server returned a different page range. It was not silently accepted as the requested page.');
    if (input.page > 1 && !parsed.items.length) throw new FutureToolsError('PAGE_OUT_OF_RANGE', 'This page has no results; start with page 1 to establish the query total.');
    return { ...loaded.source, query: input, total_results: parsed.total, returned: parsed.items.length,
      page: input.page, page_size: 24, range: { from: parsed.start, to: parsed.end }, next_page: parsed.next_page,
      coverage: parsed.coverage, applied_filters: parsed.applied, items: parsed.items,
      note: parsed.classification_note, data_absence_confirmed: input.page === 1 && parsed.total === 0 };
  }
  async categories() {
    const loaded = await this.client.get(searchUrl({})), parsed = parseDirectory(loaded.html);
    if (!parsed.categories.length) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'No recognized category taxonomy was returned.');
    return { ...loaded.source, count: parsed.categories.length, categories: parsed.categories };
  }
  async detail(reference: string) {
    const requested = toolSlug(reference), loaded = await this.client.get(new URL(`/tools/${requested}`, ORIGIN));
    const resolved = toolSlug(loaded.source.source_url), item = parseDetail(loaded.html, resolved);
    return { ...loaded.source, requested_slug: requested, resolved_to_different_slug: requested !== resolved,
      ...item, classification_note: 'Detail-page category text/links are preserved as rendered. A combined category slug is not split into invented categories.',
      pricing_note: 'Directory pricing labels can become stale. Open source, free, freemium and paid are distinct. No numerical subscription price is inferred.' };
  }
  async batch(references: string[]) {
    const slugs = [...new Set(references.map(toolSlug))], items = [], started = Date.now(); let stopped = false;
    for (const slug of slugs) {
      if (stopped || Date.now() - started > 35000) { items.push({ slug, ok: false as const, error: { code: 'NOT_ATTEMPTED', message: 'Stopped after an access/rate/network/time limit.' } }); continue; }
      try { items.push({ slug, ok: true as const, tool: await this.detail(slug) }); }
      catch (error) { const detail = errorData(error); items.push({ slug, ok: false as const, error: detail }); if (stopCodes.has(detail.code)) stopped = true; }
    }
    return { source: 'FutureTools', requested: slugs.length, complete: items.every(i => i.ok), items, data_absence_confirmed: false };
  }
  async compare(references: string[]) {
    if (new Set(references.map(toolSlug)).size < 2) throw new FutureToolsError('DISTINCT_TOOLS_REQUIRED', 'Choose at least two distinct tools.');
    const batch = await this.batch(references);
    return { ...batch, comparison_scope: 'Reported directory facts, not a quality ranking or independent vendor verification.',
      comparison: batch.items.map(i => i.ok ? { slug: i.slug, name: i.tool.name, pricing: i.tool.pricing,
        api_available: i.tool.api_available, open_source: i.tool.open_source, upvotes: i.tool.upvotes,
        categories: i.tool.categories, category_text: i.tool.category_text, is_matts_pick: i.tool.is_matts_pick,
        website_url: i.tool.website_url, source_url: i.tool.source_url, fetched_at: i.tool.fetched_at, field_status: i.tool.field_status } : { slug: i.slug, error: i.error }) };
  }
  async alternatives(reference: string, filters: SearchInput['filters'], limit: number, categoryOverride?: string) {
    const seed = await this.detail(reference);
    const matching = await this.search({ query: seed.name });
    const card = matching.items.find(t => t.slug === seed.slug);
    const category = categoryOverride ?? card?.categories[0]?.slug;
    if (!category) return { status: 'needs_category', seed: { slug: seed.slug, name: seed.name },
      note: 'The exact tool card did not provide a category. Supply a category slug from list_categories; no category was guessed.' };
    const page = await this.search({ categories: [category], filters, sort: 'popular' });
    const items = page.items.filter(t => t.slug !== seed.slug).slice(0, limit);
    return { status: 'ok', ...page, seed: { slug: seed.slug, name: seed.name }, category,
      candidates_on_page: page.returned, returned: items.length, items,
      method: 'Other tools on one popular page in the selected category; not an official alternatives list or a global best-tool ranking.' };
  }
  async checkAccess() {
    const result = await this.search({});
    return { source: result.source, source_url: result.source_url, fetched_at: result.fetched_at, cached: result.cached,
      access_verified: true, scope: 'Public directory page and its recognized result data only.', returned: result.returned, total_results: result.total_results,
      api_key_required: false, paid_services_required: false };
  }
  async collect(input: { tools?: string[]; search?: SearchInput; max_pages: number; include_details: boolean }) {
    const records: SourcedTool[] = [], errors: { slug?: string; page?: number; error: ReturnType<typeof errorData> }[] = [];
    let total: number | null = null, selectionComplete = true, pagesRead = 0; const started = Date.now();
    if (input.tools) {
      const batch = await this.batch(input.tools); total = batch.requested;
      for (const item of batch.items) if (item.ok) {
        const { source, source_url, fetched_at, cached, cache_expires_at, ...tool } = item.tool;
        records.push({ ...tool, provenance: { source, source_url, fetched_at, cached, cache_expires_at } });
      } else errors.push({ slug: item.slug, error: item.error });
      selectionComplete = batch.complete;
    } else {
      const query = searchInput.parse(input.search); let pageNumber: number | null = query.page; const seen = new Set<string>();
      for (let n = 0; n < input.max_pages && pageNumber !== null; n++) {
        if (Date.now() - started > 35000) { selectionComplete = false; errors.push({ page: pageNumber, error: { code: 'TIME_LIMIT', message: 'Export stopped at its time limit; more pages may exist.' } }); break; }
        try {
          const page = await this.search({ ...query, page: pageNumber }); pagesRead++;
          if (total !== null && page.total_results !== total) { selectionComplete = false; errors.push({ page: pageNumber, error: { code: 'RESULTS_CHANGED', message: 'The live query total changed during pagination.' } }); }
          total = page.total_results;
          for (const item of page.items) if (!seen.has(item.slug)) { seen.add(item.slug); records.push({ ...item,
            provenance: { source: page.source, source_url: page.source_url, fetched_at: page.fetched_at, cached: page.cached, cache_expires_at: page.cache_expires_at } }); }
          else { selectionComplete = false; errors.push({ slug: item.slug, error: { code: 'DUPLICATE_PAGE_RECORD', message: 'A tool moved across live pages; it was not exported twice.' } }); }
          if (page.next_page !== null && page.next_page <= pageNumber) throw new FutureToolsError('INVALID_PAGINATION', 'The directory repeated or reversed its next page.');
          pageNumber = page.next_page;
        } catch (error) { selectionComplete = false; errors.push({ page: pageNumber ?? undefined, error: errorData(error) }); break; }
      }
      if (input.include_details) for (let i = 0; i < records.length; i++) {
        const current = records[i]!;
        if (Date.now() - started > 35000) { selectionComplete = false; errors.push({ slug: current.slug, error: { code: 'DETAILS_INCOMPLETE', message: 'Detail time limit reached; remaining search-card records were preserved.' } }); break; }
        try { const { source, source_url, fetched_at, cached, cache_expires_at, ...tool } = await this.detail(current.slug);
          records[i] = { ...tool, categories: current.categories, provenance: { source, source_url, fetched_at, cached, cache_expires_at } };
        } catch (error) { selectionComplete = false; const detail = errorData(error); errors.push({ slug: current.slug, error: detail }); if (stopCodes.has(detail.code)) break; }
      }
    }
    if (!records.length && errors.length) throw new FutureToolsError('EXPORT_FAILED', `No records retrieved. ${errors[0]!.error.code}: ${errors[0]!.error.message}`);
    return { records, source: 'FutureTools', exported: records.length, reported_total: total, pages_read: pagesRead,
      selection_complete: selectionComplete && !errors.length,
      entire_query_complete: !input.tools && (input.search?.page ?? 1) === 1 && selectionComplete && !errors.length && records.length === total,
      scope: input.tools ? 'Selected tool references' : `At most ${input.max_pages} live directory page(s), starting at ${input.search?.page ?? 1}`,
      errors, created_at: new Date().toISOString(), note: 'A successful bounded export is not a download of the full FutureTools catalog. Missing fields are not reported, not nonexistent.' };
  }
}
