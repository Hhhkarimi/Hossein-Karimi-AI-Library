import test from 'node:test';
import assert from 'node:assert/strict';
import { toolSlug, searchUrl, assertPublicUrl } from '../dist/contracts.js';
import { FutureToolsClient } from '../dist/client.js';
import { parseDirectory, parseDetail, verifyApplied } from '../dist/parser.js';
import { searchInput } from '../dist/contracts.js';
import { directory, detail, rawTool, fixtureService } from './fixtures.mjs';
test('tool references allow exact directory hosts and reject arbitrary URLs, ports and credentials', () => {
  assert.equal(toolSlug('claude'), 'claude'); assert.equal(toolSlug('https://www.futuretools.io/tools/claude'), 'claude');
  for (const v of ['https://futuretools.io.evil.test/tools/claude', 'https://u:p@futuretools.io/tools/a', 'http://futuretools.io/tools/a', 'https://futuretools.io:444/tools/a', 'https://futuretools.io/tools/a?token=secret', '../admin']) assert.throws(() => toolSlug(v));
});
test('query construction encodes literal text and uses only observed public parameters', () => {
  const u = searchUrl({ query: 'research & writing فارسی', categories: ['research', 'research'], filters: ['free'], sort: 'popular', page: 2 });
  assert.equal(u.origin, 'https://futuretools.io'); assert.equal(u.searchParams.get('search'), 'research & writing فارسی');
  assert.equal(u.searchParams.get('categories'), 'research'); assert.equal(u.searchParams.get('page'), '2'); assertPublicUrl(u);
  assert.throws(() => assertPublicUrl(new URL('https://futuretools.io/api/private'))); assert.throws(() => assertPublicUrl(new URL('https://futuretools.io/go/a')));
  assert.throws(() => searchUrl({ query: 'a', unsupported: true }));
});
test('public render data preserves genuine zero, false, Unicode and category names', () => {
  const p = parseDirectory(directory({ items: [rawTool('synthetic-a', { name: 'پژوهش & Research' })] }));
  assert.equal(p.items[0].upvotes, 0); assert.equal(p.items[0].is_matts_pick, false); assert.equal(p.items[0].name, 'پژوهش & Research'); assert.equal(p.categories.length, 2);
});
test('unrelated recommendations and ads are excluded from the result list', () => {
  const html = directory().replace('<h1>', '<a href="/tools/not-a-result">Recommended tool</a><h1>');
  assert.deepEqual(parseDirectory(html).items.map(t => t.slug), ['synthetic-a', 'synthetic-b']);
});
test('a valid empty page differs from a broken layout or blocked response', () => {
  assert.equal(parseDirectory(directory({ items: [], total: 0 })).total, 0);
  assert.throws(() => parseDirectory('<html><title>Just a moment...</title></html>'), { code: 'ACCESS_BLOCKED' });
  assert.throws(() => parseDirectory('<h1>The AI Tools Database</h1><p>No tools found</p>'), { code: 'UPSTREAM_LAYOUT_CHANGED' });
  assert.throws(() => parseDirectory(directory().replace('Showing 1–2 of 2', 'Showing 1–3 of 2')), { code: 'UPSTREAM_LAYOUT_CHANGED' });
});
test('ignored filters are detected instead of mislabeled as applied', () => {
  const p = parseDirectory(directory()); assert.throws(() => verifyApplied(p.applied, searchInput.parse({ filters: ['free'] })), { code: 'FILTER_NOT_APPLIED' });
});
test('page scripts are parsed only as JSON and are never executed', () => {
  globalThis.__ftExecuted = false;
  parseDirectory(directory().replace('</main>', '</main><script>globalThis.__ftExecuted=true</script>'));
  assert.equal(globalThis.__ftExecuted, false); delete globalThis.__ftExecuted;
});
test('detail metadata preserves reported API/no-open-source and not-returned dates', () => {
  const p = parseDetail(detail(), 'synthetic-a'); assert.equal(p.api_available, true); assert.equal(p.open_source, false);
  assert.equal(p.upvotes, 0); assert.equal(p.published_at, null); assert.equal(p.field_status.published_at, 'not_returned');
  assert.equal(p.is_matts_pick, null); assert.equal(p.website_url, 'https://vendor.invalid/');
});
test('detail identity changes and missing application metadata fail explicitly', () => {
  assert.throws(() => parseDetail(detail(), 'different-tool'), { code: 'TOOL_IDENTITY_CHANGED' });
  assert.throws(() => parseDetail('<h1>Synthetic</h1>', 'synthetic-a'), { code: 'UPSTREAM_LAYOUT_CHANGED' });
});
test('identical concurrent reads coalesce; cache preserves original fetch timestamp', async () => {
  const { client, calls } = fixtureService(); const url = searchUrl({});
  const [a, b] = await Promise.all([client.get(url), client.get(url)]); const c = await client.get(url);
  assert.equal(calls.length, 1); assert.equal(c.source.cached, true); assert.equal(a.source.fetched_at, c.source.fetched_at); assert.equal(a.source.fetched_at, b.source.fetched_at);
});
test('requests use no credentials and do not fetch vendor, tracking or private API URLs', async () => {
  const { service, calls } = fixtureService(); await service.detail('synthetic-a');
  assert.equal(calls.length, 1); assert.equal(calls[0].url.pathname, '/tools/synthetic-a'); assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.redirect, 'manual'); assert.equal(Object.keys(calls[0].init.headers).some(k => /key|authorization|cookie/i.test(k)), false);
});
for (const code of [401, 403, 404, 500]) test(`HTTP ${code} is an explicit error, never an empty catalog or a retry flood`, async () => {
  const { service, calls } = fixtureService(() => new Response('denied', { status: code }));
  await assert.rejects(service.search({})); assert.equal(calls.length, 1);
});
test('429 cooldown prevents a second upstream request and exposes retry delay', async () => {
  const { client, calls } = fixtureService(() => new Response('rate limited', { status: 429, headers: { 'retry-after': '2' } }));
  await assert.rejects(client.get(searchUrl({})), e => e.code === 'RATE_LIMITED' && e.retryAfterSeconds === 2);
  await assert.rejects(client.get(searchUrl({ query: 'other' })), { code: 'RATE_LIMITED' }); assert.equal(calls.length, 1);
});
test('cross-origin redirect is rejected before another fetch; same-origin tool redirects are bounded', async () => {
  const { client, calls } = fixtureService(() => new Response(null, { status: 302, headers: { location: 'https://evil.test/' } }));
  await assert.rejects(client.get(searchUrl({})), { code: 'URL_NOT_ALLOWED' }); assert.equal(calls.length, 1);
  const loop = fixtureService(() => new Response(null, { status: 302, headers: { location: '/tools/loop' } }));
  await assert.rejects(loop.client.get(searchUrl({})), { code: 'UPSTREAM_REDIRECT' }); assert.equal(loop.calls.length, 3);
});
test('unexpected MIME, invalid UTF-8 and oversized bodies are not silently parsed', async () => {
  for (const [response, code] of [[new Response('{}', { headers: { 'content-type': 'application/json' } }), 'UNEXPECTED_CONTENT'],
    [new Response(new Uint8Array([255]), { headers: { 'content-type': 'text/html' } }), 'INVALID_ENCODING'],
    [new Response('x'.repeat(300), { headers: { 'content-type': 'text/html' } }), 'RESPONSE_TOO_LARGE']]) {
    const { client } = fixtureService(() => response, { maxBodyBytes: 100 }); await assert.rejects(client.get(searchUrl({})), { code });
  }
});
test('network failures are sanitized and do not leak upstream exception text', async () => {
  const { client } = fixtureService(() => { throw new Error('private-key-value'); });
  await assert.rejects(client.get(searchUrl({})), e => e.code === 'NETWORK_ERROR' && !e.message.includes('private-key-value'));
});
test('timeout covers response body consumption', async () => {
  const client = new FutureToolsClient({ intervalMs: 0, timeoutMs: 15, fetcher: async (_, init) => new Response(new ReadableStream({
    start(controller) { init.signal.addEventListener('abort', () => controller.error(new Error('aborted'))); },
  }), { headers: { 'content-type': 'text/html' } }) });
  await assert.rejects(client.get(searchUrl({})), { code: 'UPSTREAM_TIMEOUT' });
});
