import test from 'node:test';
import assert from 'node:assert/strict';
import { A, B, C, O1, O2, fixtureService, product, offer, detail } from './fixtures.mjs';

test('search removes ads and outside-budget results, uses the observed Torob filter names', async () => {
  const { service, calls } = fixtureService();
  const result = await service.search({ query: 'سامسونگ', category_id: 94, brand_id: 5,
    min_price_toman: 9000, max_price_toman: 11000, sort: 'price_asc' });
  assert.deepEqual(result.items.map(p => p.id), [A]);
  assert.equal(result.price_unit, 'toman'); assert.equal(result.items[0].min_price_toman, 10000);
  assert.equal(calls[0].url.searchParams.get('price__gt'), '9000');
  assert.equal(calls[0].url.searchParams.get('price__lt'), '11000');
  assert.equal(calls[0].url.searchParams.get('brand'), '5');
  assert.equal(calls[0].url.searchParams.get('category'), '94');
  assert.equal(result.coverage, 'single_upstream_page');
});
test('uncertain search matches and unknown availability stay visible', async () => {
  const { service } = fixtureService();
  const result = await service.search({ query: 'samsung' });
  assert.equal(result.items.find(p => p.id === A).availability, null);
  assert.equal(result.items.find(p => p.id === B).low_confidence, true);
  assert.deepEqual(result.items.find(p => p.id === B).unmatched_terms, ['samsung']);
});
test('price sorting does not put missing prices ahead of actual prices', async () => {
  const { service } = fixtureService(() => ({ results: [product(A, { price: null }), product(B), product(C, { price: 20000 })] }));
  const result = await service.search({ query: 'phone', sort: 'price_desc' });
  assert.deepEqual(result.items.map(p => p.id), [C, B, A]);
});
test('seller lists are loaded, sorted and deduplicated, with shop scores separate from product ratings', async () => {
  const { service } = fixtureService();
  const result = await service.sellers({ product: A, limit: 1 });
  assert.equal(result.loaded_list_complete, true); assert.equal(result.returned, 1);
  assert.equal(result.items[0].price_toman, 9000); assert.equal(result.truncated, true);
  assert.equal(result.items[0].shop_score, 4.5); assert.equal(result.items[0].rating_stars, undefined);
  assert.equal(result.items[0].warranty_or_description, 'گارانتی نمونه');
});
test('partial seller lists are labelled and offline contact endpoints are never fetched', async () => {
  const { service, calls } = fixtureService(url => url.pathname.endsWith('/details/') ? detail(A, {
    products_in_store_info: { result: [offer(O1)], count: 30 },
  }) : undefined);
  const result = await service.sellers({ product: A, shop_type: 'offline' });
  assert.equal(result.loaded_list_complete, false); assert.equal(result.items[0].offer_url, null);
  assert.equal(calls.length, 1);
});
test('a seller-list URL cannot redirect the client to another origin or another product', async () => {
  const { service, calls } = fixtureService(() => detail(A, {
    products_info: { result: [], count: 1, sellers_url: 'https://evil.test/v4/base-product/sellers/' },
  }));
  await assert.rejects(service.sellers({ product: A }), { code: 'UPSTREAM_SCHEMA_CHANGED' });
  assert.equal(calls.length, 1);
});
test('comparison returns differing specs and null for missing values', async () => {
  const { service } = fixtureService();
  const result = await service.compare([A, B]);
  assert.deepEqual(result.differing_specifications.map(s => s.name), ['RAM', 'رنگ']);
  assert.equal(result.differing_specifications[1].values[1].value, null);
  await assert.rejects(service.compare([A, A]), { code: 'INVALID_PRODUCTS' });
});
test('batch results expose partial failures rather than replacing failed items', async () => {
  const { service } = fixtureService(url => url.searchParams.get('prk') === B ? new Response('', { status: 404 }) : undefined);
  const result = await service.batch([A, B]);
  assert.equal(result.succeeded, 1); assert.equal(result.items[1].error.code, 'NOT_FOUND');
});
test('cheapest scans bounded pages and deduplicates products', async () => {
  const { service, calls } = fixtureService();
  const result = await service.cheapest({ query: 'phone', max_price_toman: 15000 }, 2);
  assert.equal(result.pages_read, 2); assert.equal(result.unique_candidates, 1);
  assert.equal(result.items[0].id, A); assert.equal(result.coverage, 'bounded_search_pages');
  assert.equal(calls.length, 2);
});
test('filter discovery and category browsing preserve usable IDs', async () => {
  const { service } = fixtureService();
  const filters = await service.filters('phone');
  assert.equal(filters.attributes[0].items[0].id, 5);
  const browse = await service.browse({ category_id: 94 });
  assert.equal(browse.categories[0].id, 94);
});
