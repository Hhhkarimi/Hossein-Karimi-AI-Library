import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureService, directory, detail, rawTool } from './fixtures.mjs';
test('search passes category, pricing, sort and page to the actual directory URL', async () => {
  const { service, calls } = fixtureService(); const p = await service.search({ query: 'research', categories: ['research'], filters: ['free'], sort: 'popular' });
  assert.equal(p.query.query, 'research'); assert.equal(p.total_results, 2); assert.equal(calls[0].url.searchParams.get('filters'), 'free');
  assert.equal(calls[0].url.searchParams.get('categories'), 'research'); assert.equal(p.source, 'FutureTools');
});
test('taxonomy uses the source category labels, not derived guesses', async () => {
  const { service } = fixtureService(); const p = await service.categories(); assert.equal(p.count, 2); assert.equal(p.categories[0].slug, 'research');
});
test('server clamping to page one is detected', async () => {
  const { service } = fixtureService(() => directory()); await assert.rejects(service.search({ page: 2 }), { code: 'PAGE_NOT_APPLIED' });
});
test('batch deduplicates references and retains partial 404 failures', async () => {
  const { service, calls } = fixtureService(u => u.pathname.endsWith('/missing') ? new Response(null, { status: 404 }) : undefined);
  const p = await service.batch(['synthetic-a', 'https://futuretools.io/tools/synthetic-a', 'missing']);
  assert.equal(p.requested, 2); assert.equal(p.complete, false); assert.equal(p.items[0].ok, true); assert.equal(p.items[1].error.code, 'PAGE_NOT_FOUND'); assert.equal(calls.length, 2);
});
test('blocked batch stops new reads and marks later records unattempted', async () => {
  const { service, calls } = fixtureService(() => new Response(null, { status: 403 })); const p = await service.batch(['synthetic-a', 'synthetic-b']);
  assert.equal(p.items[1].error.code, 'NOT_ATTEMPTED'); assert.equal(calls.length, 1);
});
test('comparison requires distinct tools and preserves source facts, not a fabricated ranking', async () => {
  const { service } = fixtureService(); await assert.rejects(service.compare(['synthetic-a', 'synthetic-a']), { code: 'DISTINCT_TOOLS_REQUIRED' });
  const c = await service.compare(['synthetic-a', 'synthetic-b']); assert.equal(c.complete, true); assert.equal(c.comparison[0].upvotes, 0); assert.equal(c.comparison[0].open_source, false);
});
test('alternatives resolve the exact seed card category and exclude the seed', async () => {
  const { service } = fixtureService(); const p = await service.alternatives('synthetic-a', ['free'], 10);
  assert.equal(p.status, 'ok'); assert.equal(p.category, 'research'); assert.deepEqual(p.items.map(t => t.slug), ['synthetic-b']); assert.equal(p.returned, 1); assert.equal(p.candidates_on_page, 2);
});
test('alternatives do not guess a category when the exact seed is absent from search', async () => {
  const { service } = fixtureService(u => u.pathname === '/tools' ? directory({ items: [rawTool('synthetic-b')], state: { query: u.searchParams.get('search') ?? '' } }) : undefined);
  assert.equal((await service.alternatives('synthetic-a', [], 10)).status, 'needs_category');
});
test('bounded collection paginates without claiming the full query', async () => {
  const { service } = fixtureService(u => u.pathname === '/tools' ? directory({ items: Array.from({ length: 24 }, (_, i) => rawTool(`synthetic-${i}`)), total: 30 }) : undefined);
  const p = await service.collect({ search: { query: '' }, max_pages: 1, include_details: false });
  assert.equal(p.exported, 24); assert.equal(p.reported_total, 30); assert.equal(p.selection_complete, true); assert.equal(p.entire_query_complete, false);
});
test('two-page collection retrieves all unique records and verifies complete query coverage', async () => {
  const { service } = fixtureService(u => { if (u.pathname !== '/tools') return; const page = Number(u.searchParams.get('page') ?? 1);
    return directory({ page, items: Array.from({ length: page === 1 ? 24 : 6 }, (_, i) => rawTool(`synthetic-${(page - 1) * 24 + i}`)), total: 30 }); });
  const p = await service.collect({ search: {}, max_pages: 2, include_details: false }); assert.equal(p.exported, 30); assert.equal(p.entire_query_complete, true);
});
test('later-page failure preserves earlier records and discloses incomplete selection', async () => {
  const { service } = fixtureService(u => u.searchParams.has('page') ? new Response(null, { status: 403 }) : directory({ total: 30 }));
  const p = await service.collect({ search: {}, max_pages: 2, include_details: false }); assert.equal(p.exported, 2); assert.equal(p.selection_complete, false); assert.equal(p.errors[0].error.code, 'ACCESS_BLOCKED');
});
test('selected-reference exports have distinct selection coverage and preserve real details', async () => {
  const { service } = fixtureService(); const p = await service.collect({ tools: ['synthetic-a'], max_pages: 1, include_details: false });
  assert.equal(p.exported, 1); assert.equal(p.selection_complete, true); assert.equal(p.entire_query_complete, false); assert.equal(p.records[0].api_available, true);
});
