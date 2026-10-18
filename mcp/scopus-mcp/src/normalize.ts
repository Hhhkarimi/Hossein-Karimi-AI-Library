import { affiliationUrl, authorUrl, documentUrl } from './identifiers.js';
import { ScopusError } from './errors.js';
export type Row = Record<string, unknown>;
export const obj = (v: unknown): Row => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
export const list = (v: unknown): Row[] => (Array.isArray(v) ? v : v == null ? [] : [v]).map(obj);
export function str(v: unknown, max = 500): string | null {
  if (typeof v === 'string' || typeof v === 'number') return String(v).slice(0, max);
  const inner = obj(v)['$'];
  return typeof inner === 'string' || typeof inner === 'number' ? String(inner).slice(0, max) : null;
}
export function num(v: unknown): number | null {
  const value = str(v);
  return value !== null && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) <= Number.MAX_SAFE_INTEGER ? Number(value) : null;
}
const numeric = (v: unknown): string | null => { const s = str(v); return s && /^\d{1,20}$/.test(s) ? s : null; };
function identifier(row: Row, prefix: string): string | null {
  const value = str(row['dc:identifier']);
  return value?.startsWith(prefix) ? numeric(value.slice(prefix.length)) : null;
}
export const textContent = (value: unknown, max = 12000) => str(value, max)?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? null;
function name(value: unknown) {
  const row = obj(value);
  return { given: str(row['given-name'] ?? row['ce:given-name']), family: str(row.surname ?? row['ce:surname']),
    initials: str(row.initials ?? row['ce:initials']), indexed: str(row['indexed-name'] ?? row['ce:indexed-name']) };
}
export function subjects(value: unknown) {
  return list(value).slice(0, 60).map(r => ({ code: str(r['@code']), abbreviation: str(r['@abbrev'] ?? r['@abbr']),
    name: str(r['$'] ?? r['subject-area']), frequency: num(r['@frequency']) }));
}
function affiliation(value: unknown) {
  const row = obj(value), ip = obj(row['ip-doc']), address = obj(ip.address ?? row.address);
  const id = numeric(row['@affiliation-id'] ?? row['@id'] ?? row['affiliation-id']);
  return { id, name: str(row['affiliation-name'] ?? ip.afdispname ?? ip['preferred-name']),
    city: str(row['affiliation-city'] ?? address.city), country: str(row['affiliation-country'] ?? address.country),
    parent_id: numeric(row['@parent']), parent_name: str(ip['parent-preferred-name']),
    url: id ? affiliationUrl(id) : null };
}
function affiliations(value: unknown) {
  const row = obj(value);
  return list(row.affiliation ?? value).slice(0, 100).map(affiliation);
}
function dedupeAffiliations(values: ReturnType<typeof affiliations>) {
  const merged = new Map<string, ReturnType<typeof affiliation>>();
  for (const [i, item] of values.entries()) {
    const key = item.id ?? `${item.name}|${item.city}|${i}`;
    const existing = merged.get(key);
    merged.set(key, existing ? Object.fromEntries(Object.entries(item).map(([k, v]) =>
      [k, existing[k as keyof typeof existing] ?? v])) as typeof item : item);
  }
  return [...merged.values()];
}
export function authorCard(row: Row) {
  const id = identifier(row, 'AUTHOR_ID:') ?? numeric(row['@id']);
  if (!id) throw new ScopusError('UPSTREAM_SCHEMA_CHANGED', 'Scopus author record has no usable author ID.');
  return { id, eid: str(row.eid), name: name(row['preferred-name']),
    name_variants: list(row['name-variant']).slice(0, 30).map(name), orcid: str(row.orcid),
    document_count: num(row['document-count']), current_affiliations: affiliations(row['affiliation-current']),
    subject_areas: subjects(row.subject), url: authorUrl(id) };
}
export function authorProfile(row: Row) {
  const core = obj(row.coredata), profile = obj(row['author-profile']);
  const id = identifier(core, 'AUTHOR_ID:') ?? identifier(row, 'AUTHOR_ID:');
  if (!id) throw new ScopusError('UPSTREAM_SCHEMA_CHANGED', 'Scopus author profile has no usable author ID.');
  const preferred = name(profile['preferred-name'] ?? row['preferred-name']);
  const metrics = { document_count: num(core['document-count'] ?? row['document-count']),
    citation_count: num(core['citation-count'] ?? core['citations-count'] ?? row['citation-count']),
    citing_document_count: num(core['cited-by-count'] ?? row['cited-by-count']),
    h_index: num(row['h-index']), coauthor_count: num(row['coauthor-count']) };
  const metricStatus = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key,
    { state: value === null ? 'not_returned' : 'reported',
      ...(value === null ? { explanation: 'Not present in the retrieved view. This does not establish that the metric does not exist.' } : {}) }]));
  return { id, eid: str(core.eid ?? row.eid), name: preferred,
    name_variants: list(profile['name-variant'] ?? row['name-variant']).slice(0, 30).map(name),
    orcid: str(core.orcid ?? row.orcid ?? profile.orcid),
    current_affiliations: dedupeAffiliations([...affiliations(profile['affiliation-current']), ...affiliations(row['affiliation-current'])]),
    affiliation_history: dedupeAffiliations([...affiliations(profile['affiliation-history']), ...affiliations(row['affiliation-history'])]),
    subject_areas: subjects(obj(row['subject-areas'])['subject-area']),
    publication_range: { first_year: num(obj(profile['publication-range'])['@start']), last_year: num(obj(profile['publication-range'])['@end']) },
    metrics, metric_status: metricStatus,
    profile_status: str(profile.status), url: authorUrl(id),
    note: 'Current affiliations are Scopus profile classifications, not a verified employment record. Metrics use the provider scope and may include self-citations.' };
}
export function affiliationCard(row: Row) {
  const id = identifier(row, 'AFFILIATION_ID:');
  if (!id) throw new ScopusError('UPSTREAM_SCHEMA_CHANGED', 'Scopus affiliation record has no usable affiliation ID.');
  return { id, eid: str(row.eid), name: str(row['affiliation-name']), city: str(row.city), country: str(row.country),
    document_count: num(row['document-count']), author_count: num(row['author-count']),
    parent_affiliation_id: numeric(row['parent-affiliation-id']), url: affiliationUrl(id) };
}
export function affiliationProfile(row: Row) {
  const core = obj(row.coredata), profile = obj(row['institution-profile']), address = obj(profile.address);
  const base = affiliationCard({ ...row, ...core });
  const metrics = { document_count: num(core['document-count']), author_count: num(core['author-count']) };
  return { ...base, name: str(row['affiliation-name'] ?? profile['preferred-name']),
    name_variants: list(obj(row['name-variants'])['name-variant'] ?? row['name-variant']).slice(0, 50)
      .map(v => str(v['name-variant'] ?? v['$'])).filter(v => v !== null),
    city: str(row.city ?? address.city), country: str(row.country ?? address.country),
    address: str(row.address ?? address['address-part']), postal_code: str(address['postal-code']),
    organization_type: str(profile['org-type']), metrics,
    metric_status: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, { state: v === null ? 'not_returned' : 'reported' }])),
    note: 'These are Scopus affiliation-profile counts. No university ranking, institutional h-index or citation total is inferred from a publication sample.' };
}
export function documentCard(row: Row) {
  const id = identifier(row, 'SCOPUS_ID:');
  const candidate = str(row.eid); const eid = candidate && /^2-s2\.0-\d{1,20}$/.test(candidate) ? candidate : id ? `2-s2.0-${id}` : null;
  if (!eid) throw new ScopusError('UPSTREAM_SCHEMA_CHANGED', 'Scopus document has no usable Scopus ID or EID.');
  const oa = str(row.openaccess);
  const creator = list(obj(row['dc:creator']).author)[0];
  return { id, eid, title: str(row['dc:title'], 2000), doi: str(row['prism:doi']),
    first_author: str(row['dc:creator']) ?? str(creator?.['ce:indexed-name'] ?? obj(creator?.['preferred-name'])['ce:indexed-name']),
    publication_name: str(row['prism:publicationName']), cover_date: str(row['prism:coverDate']),
    document_type: str(row.subtypeDescription ?? row['prism:aggregationType']),
    citation_count: num(row['citedby-count']), open_access: oa === '1' || oa === 'true' ? true : oa === '0' || oa === 'false' ? false : null,
    authors: list(row.author).slice(0, 100).map(a => ({ id: numeric(a.authid), name: str(a.authname), orcid: str(a.orcid) })),
    affiliations: affiliations(row.affiliation), url: documentUrl(eid) };
}
export function documentDetails(row: Row) {
  const core = obj(row.coredata), item = obj(row.item), bib = obj(item.bibrecord), head = obj(bib.head);
  const card = documentCard(core);
  const authorRows = list(obj(row.authors).author).length ? list(obj(row.authors).author) : list(obj(core['dc:creator']).author);
  return { ...card, abstract: textContent(core['dc:description']),
    authors: authorRows.slice(0, 100).map(a => ({ id: numeric(a['@auid']), ...name(a['preferred-name'] ?? a),
      affiliation_ids: list(a.affiliation).map(v => numeric(v['@id'])).filter(v => v !== null) })),
    affiliations: affiliations(row.affiliation),
    keywords: list(obj(row.authkeywords)['author-keyword']).slice(0, 100).map(v => str(v)).filter(v => v !== null),
    subject_areas: subjects(obj(row['subject-areas'])['subject-area']),
    volume: str(core['prism:volume']), issue: str(core['prism:issueIdentifier']), pages: str(core['prism:pageRange']),
    language: str(obj(row.language)['@xml:lang'] ?? obj(obj(head['citation-info'])['citation-language'])['@xml:lang']),
    abstract_status: core['dc:description'] == null ? 'not_returned_in_view' : 'reported',
    authors_truncated: authorRows.length > 100 };
}
export function references(row: Row, limit: number) {
  const bib = obj(obj(obj(row.item).bibrecord).tail).bibliography;
  const container = obj(row.references ?? bib);
  const refs = list(container.reference);
  return { total_reported: num(container['@total-references'] ?? container['@refcount']), loaded: refs.length,
    returned: Math.min(limit, refs.length), truncated: refs.length > limit,
    items: refs.slice(0, limit).map(r => {
      const info = obj(r['ref-info']);
      const ids = list(obj(info['refd-itemidlist']).itemid);
      const scopus = ids.find(v => str(v['@idtype']) === 'SGR');
      const id = numeric(scopus?.['$'] ?? r['scopus-id']);
      return { reference_number: str(r['@id'] ?? r.position), scopus_id: id,
        doi: str(ids.find(v => str(v['@idtype']) === 'DOI')?.['$'] ?? r.doi),
        title: str(obj(info['ref-title'])['ref-titletext'] ?? r.title, 2000),
        source_title: str(info['ref-sourcetitle'] ?? r.sourcetitle), year: num(obj(info['ref-publicationyear'])['@first'] ?? r['publication-year']),
        authors: list(obj(info['ref-authors']).author ?? obj(r['author-list']).author).slice(0, 30).map(name),
        text: textContent(r['ref-fulltext'] ?? r['ref-text'], 3000), url: id ? documentUrl(`2-s2.0-${id}`) : null };
    }),
    list_status: Object.keys(container).length ? 'returned' : 'not_returned_in_view',
    note: 'A reference can be unresolved or lack a DOI. An omitted reference container is not proof that the document has no references.' };
}
export function serialCard(row: Row) {
  const id = numeric(row['source-id']);
  const metrics = (v: unknown) => list(v).slice(0, 20).map(r => ({ year: num(r['@year']), value: num(r['$']) }));
  const cs = obj(row.citeScoreYearInfoList);
  return { source_id: id, title: str(row['dc:title']), publisher: str(row['dc:publisher']),
    issn: str(row['prism:issn']), eissn: str(row['prism:eIssn']), type: str(row['prism:aggregationType']),
    subject_areas: subjects(row['subject-area']), sjr: metrics(obj(row.SJRList).SJR), snip: metrics(obj(row.SNIPList).SNIP),
    citescore: { value: num(cs.citeScoreCurrentMetric), year: num(cs.citeScoreCurrentMetricYear),
      tracker: num(cs.citeScoreTracker), tracker_year: num(cs.citeScoreTrackerYear) },
    url: id ? `https://www.scopus.com/sourceid/${id}` : null,
    note: 'Metrics are the values and years returned by Elsevier; no current-year value is inferred.' };
}
export function ensureRecord(row: Row) {
  if (row.error || row['service-error'] || row['error-response']) throw new ScopusError('UPSTREAM_ENTRY_ERROR', 'Scopus returned an error record, not a profile or document.');
  return row;
}
export function safeBounded(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth limit]';
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 50).map(v => safeBounded(v, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 30).map(([k, v]) => [k, safeBounded(v, depth + 1)]));
  return value;
}
