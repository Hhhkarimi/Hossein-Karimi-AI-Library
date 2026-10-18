import { ScopusClient } from '../dist/client.js';
import { ScopusService } from '../dist/service.js';
export const AUTHOR_A = '11111111111', AUTHOR_B = '22222222222', AFFIL_A = '60000001', AFFIL_B = '60000002';
export const DOC_A = '85000000001', DOC_B = '85000000002';
export function authorProfile(id = AUTHOR_A, overrides = {}) {
  return { coredata: { 'dc:identifier': `AUTHOR_ID:${id}`, 'document-count': '20', 'citation-count': '200', 'cited-by-count': '150' },
    'h-index': '8', 'coauthor-count': '30', orcid: '0000-0002-1825-0097',
    'author-profile': { status: 'update', 'preferred-name': { surname: 'Example', 'given-name': id === AUTHOR_A ? 'Ada' : 'Ben' },
      'name-variant': { surname: 'Example', 'given-name': 'A' }, 'publication-range': { '@start': '2000', '@end': '2026' },
      'affiliation-current': { affiliation: { '@affiliation-id': AFFIL_A, '@parent': AFFIL_B,
        'ip-doc': { afdispname: 'Example University', address: { city: 'Example City', country: 'Example Country' } } } },
      'affiliation-history': { affiliation: [{ '@affiliation-id': AFFIL_B, 'ip-doc': { afdispname: 'Previous University' } }] } },
    'affiliation-current': { '@id': AFFIL_A },
    'subject-areas': { 'subject-area': { '@code': '1700', '@abbrev': 'COMP', '$': 'Computer Science' } }, ...overrides };
}
export function authorEntry(id = AUTHOR_A) {
  return { 'dc:identifier': `AUTHOR_ID:${id}`, eid: `9-s2.0-${id}`, 'preferred-name': { surname: 'Example', 'given-name': 'Ada' },
    'document-count': '20', 'affiliation-current': { 'affiliation-id': AFFIL_A, 'affiliation-name': 'Example University' } };
}
export function affiliationProfile(id = AFFIL_A) {
  return { coredata: { 'dc:identifier': `AFFILIATION_ID:${id}`, 'document-count': '100', 'author-count': '30' },
    'affiliation-name': 'Example University', 'name-variants': { 'name-variant': { 'name-variant': 'Example Univ.' } },
    city: 'Example City', country: 'Example Country', address: 'Example Street',
    'institution-profile': { 'preferred-name': 'Example University', 'org-type': 'univ' } };
}
export function affiliationEntry(id = AFFIL_A) {
  return { 'dc:identifier': `AFFILIATION_ID:${id}`, 'affiliation-name': 'Example University', city: 'Example City', country: 'Example Country', 'document-count': '100' };
}
export function documentEntry(id = DOC_A, overrides = {}) {
  return { 'dc:identifier': `SCOPUS_ID:${id}`, eid: `2-s2.0-${id}`, 'dc:title': 'Synthetic research record',
    'dc:creator': 'Example, Ada', 'prism:doi': '10.9999/synthetic', 'prism:coverDate': '2025-01-01',
    'prism:publicationName': 'Synthetic Journal', 'prism:aggregationType': 'Journal', 'citedby-count': '10', openaccess: '0', ...overrides };
}
export function abstractRecord(id = DOC_A) {
  return { coredata: documentEntry(id, { 'dc:description': '<p>Synthetic abstract.</p>' }),
    authors: { author: { '@auid': AUTHOR_A, 'preferred-name': { 'ce:surname': 'Example', 'ce:given-name': 'Ada' }, affiliation: { '@id': AFFIL_A } } },
    affiliation: { '@id': AFFIL_A, 'affiliation-name': 'Example University' },
    authkeywords: { 'author-keyword': [{ '$': 'test' }] },
    item: { bibrecord: { tail: { bibliography: { '@refcount': '1', reference: { '@id': '1', 'ref-info': {
      'refd-itemidlist': { itemid: { '@idtype': 'SGR', '$': DOC_B } }, 'ref-title': { 'ref-titletext': 'Synthetic reference' },
      'ref-publicationyear': { '@first': '2020' }, 'ref-sourcetitle': 'Synthetic Journal' } } } } } } };
}
export function searchResponse(entries, total = entries.length, start = 0) {
  return { 'search-results': { 'opensearch:totalResults': String(total), 'opensearch:startIndex': String(start),
    'opensearch:itemsPerPage': String(entries.length), entry: entries,
    link: total > start + entries.length ? [{ '@ref': 'next', '@href': 'https://api.elsevier.com/not-followed' }] : [],
    facets: { facet: [{ '@name': 'pubyear', category: [{ '@value': '2025', '$': '10' }] }] } } };
}
export function fixtureService(custom, options = {}) {
  const calls = [];
  const fetcher = async (input, init) => {
    const url = new URL(input); calls.push({ url, init });
    const overridden = custom ? await custom(url, init, calls.length) : undefined;
    if (overridden !== undefined) return overridden instanceof Response ? overridden : Response.json(overridden);
    let data;
    if (url.pathname === '/content/search/author') data = searchResponse([authorEntry()], 50, Number(url.searchParams.get('start') ?? 0));
    else if (url.pathname === '/content/search/affiliation') data = searchResponse([affiliationEntry()], 5, Number(url.searchParams.get('start') ?? 0));
    else if (url.pathname === '/content/search/scopus') data = searchResponse([documentEntry()], 200, Number(url.searchParams.get('start') ?? 0));
    else if (url.pathname.startsWith('/content/author/')) data = { 'author-retrieval-response': [authorProfile(url.pathname.split('/').at(-1))] };
    else if (url.pathname.startsWith('/content/affiliation/')) data = { 'affiliation-retrieval-response': affiliationProfile(url.pathname.split('/').at(-1)) };
    else if (url.pathname.startsWith('/content/abstract/')) data = { 'abstracts-retrieval-response': abstractRecord(/^\d+$/.test(url.pathname.split('/').at(-1)) ? url.pathname.split('/').at(-1) : DOC_A) };
    else if (url.pathname === '/content/serial/title') data = { 'serial-metadata-response': { entry: [{ 'source-id': '1234', 'dc:title': 'Synthetic Journal',
      citeScoreYearInfoList: { citeScoreCurrentMetric: '3.2', citeScoreCurrentMetricYear: '2024' } }] } };
    else if (url.pathname === '/content/subject/scopus') data = { 'subject-classifications': { 'subject-classification': [{ code: '1700', abbrev: 'COMP', description: 'Computer Science', detail: 'Computer Science (all)' }] } };
    else throw new Error(`Unexpected fixture path: ${url.pathname}`);
    return Response.json(data, { headers: { 'X-RateLimit-Limit': '5000', 'X-RateLimit-Remaining': '4999', 'X-RateLimit-Reset': '1793000000' } });
  };
  const client = new ScopusClient({ apiKey: 'fixture-key-never-valid', instToken: 'fixture-institution-token', intervalMs: 0, fetcher, ...options });
  return { calls, client, service: new ScopusService(client) };
}
