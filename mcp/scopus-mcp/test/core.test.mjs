import test from 'node:test';
import assert from 'node:assert/strict';
import * as z from 'zod/v4';
import { ScopusClient } from '../dist/client.js';
import { ScopusService } from '../dist/service.js';
import { documentId, doiId, profileId, validOrcid } from '../dist/identifiers.js';
import { authorProfile as normalizeAuthor, affiliationProfile as normalizeAffiliation, documentDetails, references } from '../dist/normalize.js';
import { buildQuery } from '../dist/query.js';
import { formatDocuments } from '../dist/export.js';
import { AUTHOR_A, AFFIL_A, DOC_A, authorProfile, affiliationProfile, abstractRecord, fixtureService } from './fixtures.mjs';
const schema = z.object({ ok: z.boolean() });
const delay = ms => new Promise(r => setTimeout(r, ms));

test('Scopus profile references accept exact official hosts and preserve numeric strings', () => {
  assert.equal(profileId(`https://www.scopus.com/authid/detail.uri?authorId=${AUTHOR_A}`, 'author'), AUTHOR_A);
  assert.equal(profileId(`https://www.scopus.com/affil/profile.uri?afid=${AFFIL_A}`, 'affiliation'), AFFIL_A);
  assert.equal(profileId('00123', 'author'), '00123');
  for (const value of ['https://scopus.com.evil.test/authid/detail.uri?authorId=1', 'http://www.scopus.com/authid/detail.uri?authorId=1',
    'https://user:pass@www.scopus.com/authid/detail.uri?authorId=1', 'https://www.scopus.com:444/authid/detail.uri?authorId=1', '1.2', '../1']) {
    assert.throws(() => profileId(value, 'author'), { code: 'INVALID_IDENTIFIER' });
  }
});
test('DOI/EID/ORCID validation does not follow arbitrary URLs', () => {
  assert.equal(doiId('https://doi.org/10.1234/ABC'), '10.1234/abc');
  assert.equal(documentId(`2-s2.0-${DOC_A}`, 'eid'), `2-s2.0-${DOC_A}`);
  assert.equal(validOrcid('0000-0002-1825-0097'), '0000-0002-1825-0097');
  assert.throws(() => validOrcid('0000-0002-1825-0098'), { code: 'INVALID_IDENTIFIER' });
  assert.throws(() => doiId('https://evil.test/10.1234/abc'), { code: 'INVALID_IDENTIFIER' });
});
test('structured queries reject incompatible fields and protect literal query terms', () => {
  assert.equal(buildQuery({ target: 'authors', name: 'Example', affiliation_id: AFFIL_A }).query,
    `(AUTHLASTNAME("Example")) AND (AF-ID(${AFFIL_A}))`);
  assert.equal(buildQuery({ target: 'documents', keywords: 'heart attack', year_from: 2020, year_to: 2025 }).query,
    '(TITLE-ABS-KEY("heart attack")) AND (PUBYEAR > 2019) AND (PUBYEAR < 2026)');
  assert.throws(() => buildQuery({ target: 'affiliations', year_from: 2020 }), { code: 'INVALID_QUERY_TERM' });
  assert.throws(() => buildQuery({ target: 'authors', name: 'x") OR AU-ID(123' }), { code: 'INVALID_QUERY_TERM' });
  assert.throws(() => buildQuery({ target: 'authors' }), { code: 'INVALID_QUERY_TERM' });
});
test('an unconfigured key does not trigger profile network calls or imply absent data', async () => {
  let calls = 0;
  const client = new ScopusClient({ fetcher: async () => { calls++; return Response.json({}); } });
  await assert.rejects(client.get(`/content/author/author_id/${AUTHOR_A}`, {}, z.unknown()), { code: 'SCOPUS_API_KEY_REQUIRED' });
  assert.equal(calls, 0); assert.equal(client.status().api_key_configured, false);
});
test('public subject endpoint remains usable without a key, and no undefined credential is sent', async () => {
  let headers;
  const client = new ScopusClient({ fetcher: async (_, init) => { headers = init.headers; return Response.json({ ok: true }); } });
  await client.get('/content/subject/scopus', {}, schema);
  assert.equal(headers['X-ELS-APIKey'], undefined);
});
test('credentials stay in headers, never URLs, returned status or error messages', async () => {
  const secret = 'sensitive-fixture-value'; let seen;
  const client = new ScopusClient({ apiKey: secret, instToken: 'fixture-token', fetcher: async (input, init) => {
    seen = { input: String(input), init }; return new Response(secret, { status: 403 });
  } });
  try { await client.get('/content/search/author', { query: 'AFFIL(test)' }, schema); assert.fail(); }
  catch (e) { assert.equal(e.code, 'ACCESS_DENIED'); assert.ok(!e.message.includes(secret)); }
  assert.equal(seen.init.headers['X-ELS-APIKey'], secret);
  assert.equal(seen.init.headers['X-ELS-Insttoken'], 'fixture-token');
  assert.ok(!seen.input.includes(secret)); assert.ok(!JSON.stringify(client.status()).includes(secret));
});
test('upstream paths and credential query parameters are restricted', async () => {
  const client = new ScopusClient({ apiKey: 'fixture', fetcher: async () => { throw new Error('must not fetch'); } });
  for (const path of ['https://evil.test', '//evil.test/content/search/author', '/content/author/../secret', '/content/article/secret', '/content/search/author?x=1']) {
    await assert.rejects(client.get(path, {}, schema), { code: 'INVALID_UPSTREAM_PATH' });
  }
  await assert.rejects(client.get('/content/search/author', { apiKey: 'key' }, schema), { code: 'INVALID_UPSTREAM_PARAMETER' });
});
test('identical requests coalesce; quota zero and original cache timestamp are retained', async () => {
  let calls = 0;
  const client = new ScopusClient({ apiKey: 'fixture', intervalMs: 0, ttlMs: 25, fetcher: async () => {
    calls++; await delay(5); return Response.json({ ok: true }, { headers: { 'X-RateLimit-Remaining': '0' } });
  } });
  const [a, b] = await Promise.all([client.get('/content/search/author', {}, schema), client.get('/content/search/author', {}, schema)]);
  assert.equal(calls, 1); assert.equal(a.provenance.quota.remaining, 0); assert.equal(a.provenance.fetched_at, b.provenance.fetched_at);
  assert.equal((await client.get('/content/search/author', {}, schema)).provenance.cached, true);
  await delay(35); await client.get('/content/search/author', {}, schema); assert.equal(calls, 2);
});
test('401 and 403 do not retry; HTTP 429 separates weekly quota from throttling', async () => {
  for (const [status, expected, headers] of [[401, 'AUTHENTICATION_FAILED', {}], [403, 'ACCESS_DENIED', {}],
    [429, 'QUOTA_EXCEEDED', { 'X-ELS-Status': 'QUOTA_EXCEEDED', 'retry-after': '5' }],
    [429, 'RATE_LIMITED', { 'retry-after': '5' }]]) {
    let calls = 0;
    const client = new ScopusClient({ apiKey: 'fixture', fetcher: async () => { calls++; return new Response('', { status, headers }); } });
    await assert.rejects(client.get('/content/search/author', {}, schema), { code: expected });
    assert.equal(calls, 1);
    if (status === 429) { await assert.rejects(client.get('/content/search/author', { query: 'other' }, schema), { code: 'RATE_LIMITED' }); assert.equal(calls, 1); }
  }
});
test('non-JSON, malformed JSON, service errors and schema changes are not empty successes', async () => {
  const cases = [
    [() => new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } }), 'UPSTREAM_NON_JSON'],
    [() => new Response('{broken', { headers: { 'content-type': 'application/json' } }), 'UPSTREAM_INVALID_JSON'],
    [() => Response.json({ 'service-error': { secret: 'not echoed' } }), 'UPSTREAM_SERVICE_ERROR'],
    [() => Response.json({ wrong: true }), 'UPSTREAM_SCHEMA_CHANGED'],
  ];
  for (const [response, code] of cases) {
    const client = new ScopusClient({ apiKey: 'fixture', fetcher: async () => response() });
    await assert.rejects(client.get('/content/search/author', {}, schema), { code });
  }
});
test('timeout includes body reading and response size is bounded', async () => {
  const client = new ScopusClient({ apiKey: 'fixture', timeoutMs: 10, fetcher: async (_, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('abort')))) });
  await assert.rejects(client.get('/content/search/author', {}, schema), { code: 'UPSTREAM_TIMEOUT' });
  const large = new ScopusClient({ apiKey: 'fixture', maxResponseBytes: 5, fetcher: async () => Response.json({ ok: true }) });
  await assert.rejects(large.get('/content/search/author', {}, schema), { code: 'RESPONSE_TOO_LARGE' });
});
test('invalid UTF-8 is reported instead of corrupting researcher names', async () => {
  const client = new ScopusClient({ apiKey: 'fixture', fetcher: async () => new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(client.get('/content/search/author', {}, schema), { code: 'UPSTREAM_INVALID_ENCODING' });
});
test('transient server errors retry once and upstream requests remain serialized', async () => {
  let count = 0, running = 0, max = 0;
  const client = new ScopusClient({ apiKey: 'fixture', intervalMs: 0, fetcher: async () => {
    running++; max = Math.max(max, running); await delay(2); running--; count++;
    return count === 1 ? new Response('', { status: 503 }) : Response.json({ ok: true });
  } });
  await Promise.all([client.get('/content/search/author', { query: 'a' }, schema), client.get('/content/search/author', { query: 'b' }, schema)]);
  assert.equal(count, 3); assert.equal(max, 1);
});
test('missing metrics remain not_returned while genuine zero stays reported', () => {
  const raw = authorProfile(); raw.coredata['citation-count'] = '0'; delete raw['h-index'];
  const result = normalizeAuthor(raw);
  assert.equal(result.metrics.citation_count, 0); assert.equal(result.metric_status.citation_count.state, 'reported');
  assert.equal(result.metrics.h_index, null); assert.equal(result.metric_status.h_index.state, 'not_returned');
  assert.notEqual(result.metric_status.h_index.state, 'absent');
});
test('rich affiliation data is not overwritten by a bare ID in another profile section', () => {
  const result = normalizeAuthor(authorProfile());
  assert.equal(result.current_affiliations.length, 1);
  assert.equal(result.current_affiliations[0].name, 'Example University');
  assert.equal(result.affiliation_history[0].name, 'Previous University');
});
test('university profile does not fabricate a ranking, h-index or citation total', () => {
  const result = normalizeAffiliation(affiliationProfile());
  assert.deepEqual(result.metrics, { document_count: 100, author_count: 30 });
  assert.equal(result.metrics.h_index, undefined); assert.equal(result.rank, undefined);
});
test('references support the full bibliography container and distinguish missing lists from empty lists', () => {
  assert.equal(references(abstractRecord(), 10).items[0].scopus_id, '85000000002');
  assert.equal(references({}, 10).list_status, 'not_returned_in_view');
  assert.equal(references({ references: { '@total-references': '0', reference: [] } }, 10).list_status, 'returned');
});
test('bibliography export escapes injected lines, BibTeX characters and spreadsheet formulas', () => {
  const p = documentDetails(abstractRecord());
  p.title = '=cmd\nTY  - BAD {title}';
  const csv = formatDocuments([p], 'csv'); assert.ok(csv.includes("'=cmd TY  - BAD"));
  const ris = formatDocuments([p], 'ris'); assert.equal(ris.split('\n').filter(l => l.startsWith('TY  -')).length, 1);
  const bib = formatDocuments([p], 'bibtex'); assert.ok(bib.includes('\\{title\\}'));
  p.title = 'A \\ B'; assert.ok(formatDocuments([p], 'bibtex').includes('A \\textbackslash{} B'));
});
