import { ScopusError } from './errors.js';
export function numericId(value: string, kind = 'identifier'): string {
  const id = value.trim();
  if (!/^\d{1,20}$/.test(id)) throw new ScopusError('INVALID_IDENTIFIER', `${kind} must be a numeric string (1–20 digits).`);
  return id;
}
export function profileId(value: string, kind: 'author' | 'affiliation'): string {
  if (/^\d{1,20}$/.test(value.trim())) return numericId(value);
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['www.scopus.com', 'scopus.com'].includes(url.hostname) ||
      url.port || url.username || url.password) throw new Error();
    const permitted = kind === 'author' ? /^\/authid\/detail\.(uri|url)$/ : /^\/affil\/profile\.(uri|url)$/;
    if (!permitted.test(url.pathname)) throw new Error();
    return numericId(url.searchParams.get(kind === 'author' ? 'authorId' : 'afid') ?? '', kind);
  } catch { throw new ScopusError('INVALID_IDENTIFIER', `Use a Scopus ${kind} ID or its HTTPS Scopus profile URL.`); }
}
export function doiId(value: string) {
  let doi = value.trim().replace(/^doi:\s*/i, '');
  if (/^https?:\/\//i.test(doi)) {
    try {
      const url = new URL(doi);
      if (url.protocol !== 'https:' || !['doi.org', 'dx.doi.org'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) throw new Error();
      doi = decodeURIComponent(url.pathname.slice(1));
    } catch { throw new ScopusError('INVALID_IDENTIFIER', 'Use a DOI or an HTTPS doi.org URL.'); }
  }
  if (!/^10\.\d{4,9}\/[^\s\x00-\x1f]{1,280}$/i.test(doi)) throw new ScopusError('INVALID_IDENTIFIER', 'Invalid DOI.');
  return doi.toLowerCase();
}
export function documentId(value: string, type: 'scopus_id' | 'eid' | 'doi' | 'pubmed_id') {
  if (type === 'doi') return doiId(value);
  if (type === 'eid') {
    const id = value.trim();
    if (!/^2-s2\.0-\d{1,20}$/.test(id)) throw new ScopusError('INVALID_IDENTIFIER', 'Use a Scopus document EID such as 2-s2.0-123456789.');
    return id;
  }
  return numericId(value, type);
}
export function validOrcid(value: string) {
  const id = value.trim().replace(/^https:\/\/orcid\.org\//i, '').toUpperCase();
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) throw new ScopusError('INVALID_IDENTIFIER', 'Invalid ORCID format.');
  const digits = id.replaceAll('-', ''); let total = 0;
  for (const d of digits.slice(0, 15)) total = (total + Number(d)) * 2;
  const check = (12 - total % 11) % 11;
  if (digits[15] !== (check === 10 ? 'X' : String(check))) throw new ScopusError('INVALID_IDENTIFIER', 'Invalid ORCID checksum.');
  return id;
}
export function phrase(value: string) {
  const clean = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!clean || /["{}\\\x00-\x1f]/.test(clean)) throw new ScopusError('INVALID_QUERY_TERM', 'Structured query terms must not contain quotes, braces, backslashes or control characters. Use advanced query for Boolean expressions.');
  return `"${clean}"`;
}
export const authorUrl = (id: string) => `https://www.scopus.com/authid/detail.uri?authorId=${id}`;
export const affiliationUrl = (id: string) => `https://www.scopus.com/affil/profile.uri?afid=${id}`;
export const documentUrl = (eid: string) => `https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(eid)}`;
