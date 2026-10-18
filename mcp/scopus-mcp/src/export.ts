import { ScopusError } from './errors.js';
import type { documentDetails } from './normalize.js';
type Document = ReturnType<typeof documentDetails>;
const line = (v: unknown) => v == null ? '' : String(v).replace(/[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
const bib = (v: unknown) => line(v).replace(/[\\{}%&#_$]/g, c => c === '\\' ? '\\textbackslash{}' : `\\${c}`);
function authorNames(p: Document) {
  const names = p.authors.map(a => a.family ? `${a.family}${a.given ? `, ${a.given}` : ''}` : a.indexed ?? '').filter(Boolean);
  return names.length ? names : p.first_author ? [p.first_author] : [];
}
function csv(value: unknown) {
  let v = line(value);
  // Prevent spreadsheet formula execution when users open exported metadata.
  if (/^[\s]*[=+\-@\t]/.test(v)) v = `'${v}`;
  return `"${v.replaceAll('"', '""')}"`;
}
export function formatDocuments(documents: Document[], format: 'bibtex' | 'ris' | 'csv') {
  if (documents.some(d => !d.title)) throw new ScopusError('MISSING_EXPORT_METADATA', 'A retrieved record lacks a title; inspect it before exporting.');
  if (format === 'csv') return ['scopus_id,eid,title,doi,authors,publication,cover_date,citation_count,url',
    ...documents.map(p => [p.id, p.eid, p.title, p.doi, authorNames(p).join('; '), p.publication_name, p.cover_date, p.citation_count, p.url].map(csv).join(','))].join('\n') + '\n';
  if (format === 'ris') return documents.map(p => {
    const type = /journal|article/i.test(p.document_type ?? '') ? 'JOUR' : 'GEN';
    const fields = [['TY', type], ['ID', p.id ?? p.eid], ['TI', p.title], ...authorNames(p).map(a => ['AU', a]),
      ['JO', p.publication_name], ['PY', p.cover_date?.slice(0, 4)], ['DO', p.doi], ['VL', p.volume], ['IS', p.issue], ['SP', p.pages], ['UR', p.url]];
    return fields.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}  - ${line(v)}`).join('\n') + '\nER  -\n';
  }).join('\n');
  return documents.map(p => {
    const fields = { title: p.title, author: authorNames(p).join(' and '), journal: p.publication_name,
      year: p.cover_date?.slice(0, 4), doi: p.doi, volume: p.volume, number: p.issue, pages: p.pages, url: p.url };
    return `@${/journal|article/i.test(p.document_type ?? '') ? 'article' : 'misc'}{scopus${p.id ?? p.eid.replace(/[^\d]/g, '')},\n`
      + Object.entries(fields).filter(([, v]) => v != null && v !== '').map(([k, v]) => `  ${k} = {${bib(v)}}`).join(',\n') + '\n}';
  }).join('\n\n') + '\n';
}
