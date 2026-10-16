import test from 'node:test';
import assert from 'node:assert/strict';
import * as z from 'zod/v4';
import { TorobClient } from '../dist/torob-client.js';
import { normalizePersian, positivePrice, productId } from '../dist/normalize.js';
import { searchInputSchema } from '../dist/contracts.js';
import { A } from './fixtures.mjs';
const schema = z.object({ value: z.number() });
const path = '/suggestion2/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('Persian/Arabic characters, digits and invisible separators normalize consistently', () => {
  assert.equal(normalizePersian('  گوشي\u200cسامسونگ كد ۱۲٣  '), 'گوشی سامسونگ کد 123');
  assert.equal(positivePrice(0), null);
  assert.equal(positivePrice(-10), null);
  assert.equal(positivePrice(NaN), null);
});
test('product references are extracted without fetching arbitrary hosts', () => {
  assert.equal(productId(`https://torob.com/p/${A}/test/?q=1`), A);
  assert.equal(productId(A.toUpperCase()), A);
  for (const ref of [`https://torob.com.evil.test/p/${A}/`, `https://torob.com@evil.test/p/${A}/`,
    `http://torob.com/p/${A}/`, `https://torob.com:8443/p/${A}/`, 'http://127.0.0.1', '../details/']) {
    assert.throws(() => productId(ref), { code: 'INVALID_PRODUCT' });
  }
});
test('input validation rejects invalid ranges, unknown fields and excessive limits', () => {
  for (const args of [{ query: '' }, { query: 'phone', limit: 31 }, { query: 'phone', page: -1 },
    { query: 'phone', min_price_toman: 200, max_price_toman: 100 }, { query: 'phone', url: 'https://evil.test' }]) {
    assert.equal(searchInputSchema.safeParse(args).success, false);
  }
});
test('identical concurrent reads coalesce, cache keeps original timestamp, TTL expires', async () => {
  let calls = 0;
  const client = new TorobClient({ intervalMs: 0, ttlMs: 20, fetcher: async () => {
    calls++; await sleep(5); return Response.json({ value: calls });
  } });
  const [a, b] = await Promise.all([client.get(path, { q: 'x' }, schema), client.get(path, { q: 'x' }, schema)]);
  assert.equal(calls, 1); assert.equal(a.provenance.fetched_at, b.provenance.fetched_at);
  const c = await client.get(path, { q: 'x' }, schema);
  assert.equal(c.provenance.cached, true); assert.equal(c.provenance.fetched_at, a.provenance.fetched_at);
  await sleep(30);
  assert.equal((await client.get(path, { q: 'x' }, schema)).data.value, 2);
});
test('invalid upstream structure is reported and evicted from cache', async () => {
  let calls = 0;
  const client = new TorobClient({ intervalMs: 0, fetcher: async () => Response.json(++calls === 1 ? {} : { value: 1 }) });
  await assert.rejects(client.get(path, {}, schema), { code: 'UPSTREAM_SCHEMA_CHANGED' });
  assert.equal((await client.get(path, {}, schema)).data.value, 1);
});
test('cache eviction respects both entry and response-byte bounds', async () => {
  let calls = 0;
  const client = new TorobClient({ intervalMs: 0, maxCacheBytes: 20, maxEntries: 1,
    fetcher: async () => Response.json({ value: ++calls }) });
  await client.get(path, { q: 'a' }, schema);
  await client.get(path, { q: 'b' }, schema);
  assert.equal((await client.get(path, { q: 'a' }, schema)).provenance.cached, false);
  assert.equal(calls, 3);
});
test('the client refuses external origins and write/redirect paths', async () => {
  const client = new TorobClient({ fetcher: async () => { throw new Error('must never fetch'); } });
  for (const url of ['https://evil.test/suggestion2/', '/v4/product-page/redirect/', '/v4/account/login/']) {
    await assert.rejects(client.get(url, {}, schema), { code: 'INVALID_UPSTREAM_URL' });
  }
});
test('403/429 responses are not retried and pause queued requests', async () => {
  for (const status of [403, 429]) {
    let calls = 0;
    const client = new TorobClient({ intervalMs: 0, fetcher: async () => {
      calls++; return new Response('', { status, headers: { 'retry-after': '10' } });
    } });
    await assert.rejects(client.get(path, {}, schema), { code: 'UPSTREAM_BLOCKED', retryAfterSeconds: 10 });
    await assert.rejects(client.get(path, { q: 'other' }, schema), { code: 'UPSTREAM_BLOCKED' });
    assert.equal(calls, 1);
  }
});
test('timeouts, non-JSON responses and oversize bodies have distinct errors', async () => {
  const timeout = new TorobClient({ timeoutMs: 10, fetcher: async (_, init) => new Promise((_, reject) =>
    init.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  await assert.rejects(timeout.get(path, {}, schema), { code: 'UPSTREAM_TIMEOUT' });
  const html = new TorobClient({ fetcher: async () => new Response('<html>challenge</html>', { headers: { 'content-type': 'text/html' } }) });
  await assert.rejects(html.get(path, {}, schema), { code: 'UPSTREAM_NON_JSON' });
  const large = new TorobClient({ maxResponseBytes: 5, fetcher: async () => Response.json({ value: 1000 }) });
  await assert.rejects(large.get(path, {}, schema), { code: 'UPSTREAM_RESPONSE_TOO_LARGE' });
});
test('a transient 5xx retries once and the upstream gate serializes calls', async () => {
  let calls = 0, running = 0, maxRunning = 0;
  const client = new TorobClient({ intervalMs: 2, fetcher: async () => {
    calls++; running++; maxRunning = Math.max(maxRunning, running); await sleep(2); running--;
    return calls === 1 ? new Response('', { status: 503 }) : Response.json({ value: calls });
  } });
  await Promise.all([client.get(path, { q: 'a' }, schema), client.get(path, { q: 'b' }, schema)]);
  assert.equal(calls, 3); assert.equal(maxRunning, 1);
});
