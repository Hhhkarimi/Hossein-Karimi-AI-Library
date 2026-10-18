import test from 'node:test';
import assert from 'node:assert/strict';
import { authorResponseSchema, searchResponseSchema } from '../dist/contracts.js';
import { AUTHOR_A, AUTHOR_B, AFFIL_A, AFFIL_B, DOC_A, fixtureService, authorProfile, authorEntry, searchResponse } from './fixtures.mjs';

test('AUTO author profile tries official lower views only after a 403 and discloses every attempt', async () => {
  const { service, calls } = fixtureService(url => url.searchParams.get('view') === 'ENHANCED' ? new Response('', { status: 403 }) : undefined);
  const result = await service.author(AUTHOR_A);
  assert.equal(result.view, 'STANDARD');
  assert.deepEqual(result.view_attempts.map(a => [a.view, a.state]), [['ENHANCED', 'failed'], ['STANDARD', 'success']]);
  assert.equal(calls.length, 2);
});
test('explicit views never silently downgrade after access denial', async () => {
  const { service, calls } = fixtureService(() => new Response('', { status: 403 }));
  await assert.rejects(service.author(AUTHOR_A, 'ENHANCED'), { code: 'ACCESS_DENIED' });
  assert.equal(calls.length, 1);
});
test('AUTO profile fills missing metrics from METRICS with a separate timestamp observation', async () => {
  const { service } = fixtureService(url => {
    if (!url.pathname.startsWith('/content/author/')) return;
    const row = authorProfile();
    if (url.searchParams.get('view') !== 'METRICS') delete row['h-index'];
    return { 'author-retrieval-response': row };
  });
  const result = await service.author(AUTHOR_A);
  assert.equal(result.metrics.h_index, 8); assert.equal(result.metric_status.h_index.state, 'reported');
  assert.ok(result.view_observations.METRICS.fetched_at);
});
test('a denied metric view keeps successful profile data and never labels the metric absent', async () => {
  const { service } = fixtureService(url => {
    if (!url.pathname.startsWith('/content/author/')) return;
    if (url.searchParams.get('view') === 'METRICS') return new Response('', { status: 403 });
    const row = authorProfile(); delete row['h-index']; return { 'author-retrieval-response': [row] };
  });
  const result = await service.author(AUTHOR_A);
  assert.equal(result.metrics.h_index, null); assert.equal(result.metric_status.h_index.state, 'not_returned');
  assert.equal(result.view_attempts.at(-1).error.code, 'ACCESS_DENIED');
  assert.ok(result.name.family);
});
test('a different resolved ID cannot be silently merged across author views', async () => {
  const { service } = fixtureService(url => {
    if (!url.pathname.startsWith('/content/author/')) return;
    const row = authorProfile(url.searchParams.get('view') === 'METRICS' ? AUTHOR_B : AUTHOR_A);
    if (url.searchParams.get('view') !== 'METRICS') delete row['h-index'];
    return { 'author-retrieval-response': row };
  });
  await assert.rejects(service.author(AUTHOR_A), { code: 'PROFILE_CHANGED' });
});
test('authentication errors do not trigger repeated profile view probes', async () => {
  const { service, calls } = fixtureService(() => new Response('', { status: 401 }));
  await assert.rejects(service.author(AUTHOR_A), { code: 'AUTHENTICATION_FAILED' }); assert.equal(calls.length, 1);
});
test('coauthors use the documented co-author parameter and no inferred publication sample', async () => {
  const { service, calls } = fixtureService();
  await service.authorCoauthors(AUTHOR_A, 0, 10);
  assert.equal(calls[0].url.searchParams.get('co-author'), AUTHOR_A);
  assert.equal(calls[0].url.searchParams.has('query'), false);
});
test('affiliation authors retain historical-membership scope', async () => {
  const { service, calls } = fixtureService();
  const result = await service.affiliationAuthors(AFFIL_A, 0, 10);
  assert.equal(calls[0].url.searchParams.get('query'), `AF-ID(${AFFIL_A})`);
  assert.ok(result.membership_scope.includes('historical'));
});
test('affiliation AUTO can read LIGHT after STANDARD access denial', async () => {
  const { service } = fixtureService(url => url.pathname.startsWith('/content/affiliation/') && url.searchParams.get('view') === 'STANDARD' ? new Response('', { status: 403 }) : undefined);
  const result = await service.affiliation(AFFIL_A); assert.equal(result.view, 'LIGHT'); assert.equal(result.metrics.author_count, 30);
});
test('profile batches expose restricted/unattempted records instead of empty profiles', async () => {
  const { service, calls } = fixtureService(() => new Response('', { status: 403 }));
  const result = await service.batch('author', [AUTHOR_A, AUTHOR_B]);
  assert.equal(result.succeeded, 0); assert.equal(result.items[0].error.code, 'ACCESS_DENIED');
  assert.equal(result.items[1].error.code, 'ACCESS_DENIED'); assert.equal(calls.length, 3);
});
test('comparisons deduplicate IDs and preserve partial-success profiles', async () => {
  const { service } = fixtureService(url => url.pathname.endsWith(AUTHOR_B) ? new Response('', { status: 404 }) : undefined);
  const result = await service.compare('author', [AUTHOR_A, AUTHOR_B]);
  assert.equal(result.comparison_complete, false); assert.equal(result.succeeded, 1);
  await assert.rejects(service.compare('affiliation', [AFFIL_A, AFFIL_A]), { code: 'INVALID_ARGUMENTS' });
});
test('annual trends use full search totals and the date parameter, not page length', async () => {
  const { service, calls } = fixtureService();
  const result = await service.trend('affiliation', AFFIL_A, 2024, 2025);
  assert.equal(result.years[0].document_count, 200); assert.equal(result.complete, true);
  assert.deepEqual(calls.map(c => c.url.searchParams.get('date')), ['2024', '2025']);
  assert.ok(calls.every(c => c.url.searchParams.get('count') === '1'));
});
test('restricted annual counts remain unknown rather than zero', async () => {
  const { service, calls } = fixtureService(() => new Response('', { status: 403 }));
  const result = await service.trend('author', AUTHOR_A, 2023, 2025);
  assert.equal(result.complete, false); assert.equal(result.years[0].document_count, null);
  assert.equal(result.years[1].state, 'not_attempted'); assert.equal(calls.length, 1);
});
test('the Scopus empty-result sentinel is accepted only when total=0', async () => {
  const empty = { 'search-results': { 'opensearch:totalResults': '0', entry: [{ error: 'Result set was empty' }] } };
  const { service } = fixtureService(() => empty);
  assert.equal((await service.searchAuthors({ query: 'AUTHLASTNAME(x)', start: 0, count: 10, sort: 'name' })).items.length, 0);
  empty['search-results']['opensearch:totalResults'] = '1';
  const broken = fixtureService(() => empty).service;
  await assert.rejects(broken.searchAuthors({ query: 'x', start: 0, count: 10, sort: 'name' }), { code: 'UPSTREAM_ENTRY_ERROR' });
});
test('singleton author search entries and clamped pages remain explicit', async () => {
  const { service } = fixtureService(() => ({ 'search-results': { 'opensearch:totalResults': '1', 'opensearch:startIndex': '0', entry: authorEntry() } }));
  const result = await service.searchAuthors({ query: 'x', start: 2, count: 10, sort: 'name' });
  assert.equal(result.items.length, 1); assert.equal(result.page_clamped, true);
});
test('next offset uses the official next-link start rather than skipping a capped page', async () => {
  const response = searchResponse([authorEntry()], 100, 0);
  response['search-results'].link = [{ '@ref': 'next', '@href': 'https://api.elsevier.com/content/search/author?start=1&query=test' }];
  const { service } = fixtureService(() => response);
  const result = await service.searchAuthors({ query: 'x', start: 0, count: 25, sort: 'name' });
  assert.equal(result.next_start, 1);
});
test('cursor pagination preserves opaque cursor tokens and rejects conflicting offsets', async () => {
  const { service, calls } = fixtureService(() => ({ 'search-results': { 'opensearch:totalResults': '1', entry: [], cursor: { '@current': '*', '@next': 'NEXT+/' } } }));
  const result = await service.searchDocuments({ query: 'TITLE(test)', cursor: '*', count: 1 });
  assert.equal(result.next_cursor, 'NEXT+/'); assert.equal(calls[0].url.searchParams.get('cursor'), '*');
  await assert.rejects(service.searchDocuments({ query: 'x', cursor: '*', start: 1 }));
});
test('API embedded errors and ambiguous retrieval arrays are never read as a valid profile', async () => {
  const error = fixtureService(() => ({ 'author-retrieval-response': [{ error: 'not allowed' }] })).service;
  await assert.rejects(error.author(AUTHOR_A), { code: 'UPSTREAM_ENTRY_ERROR' });
  const ambiguous = fixtureService(() => ({ 'author-retrieval-response': [authorProfile(), authorProfile(AUTHOR_B)] })).service;
  await assert.rejects(ambiguous.author(AUTHOR_A), { code: 'AMBIGUOUS_PROFILE' });
});
test('Scopus reference and cited-by routes encode identifiers and direction explicitly', async () => {
  const { service, calls } = fixtureService();
  await service.documentReferences(DOC_A, 'scopus_id', 5, 10);
  assert.equal(calls[0].url.searchParams.get('view'), 'REF'); assert.equal(calls[0].url.searchParams.get('startref'), '5');
  await service.citingDocuments(`2-s2.0-${DOC_A}`, 0, 10);
  assert.equal(calls[1].url.searchParams.get('query'), `REFEID(2-s2.0-${DOC_A})`);
});
test('journal metric years remain the provider-reported years', async () => {
  const result = await fixtureService().service.journals('Synthetic', 0, 10);
  assert.equal(result.items[0].citescore.value, 3.2); assert.equal(result.items[0].citescore.year, 2024);
});
