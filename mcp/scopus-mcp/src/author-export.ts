import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ScopusError, errorData } from './errors.js';
import { profileId, phrase } from './identifiers.js';
import type { ScopusService } from './service.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export type AuthorCandidate = { id: string; name: string; university: string | null; url: string };
export type Publication = { id: string | null; eid?: string | null; title: string | null; doi?: string | null;
  first_author?: string | null; publication_name?: string | null; cover_date?: string | null;
  citation_count?: number | null; url: string | null };
export type PublicationResult = { items: Publication[]; total: number | null; complete: boolean;
  coverage: string; warnings: string[]; fetched_at: string };
export interface PublicSource {
  findAuthors(input: { name: string; university: string; family_name?: string; given_name?: string }): Promise<AuthorCandidate[]>;
  publications(author: AuthorCandidate, max: number): Promise<PublicationResult>;
}
export type AuthorExportInput = { name: string; university: string; family_name?: string; given_name?: string;
  author?: string; mode: 'public' | 'api'; max_documents: number };
export function splitName(name: string, family?: string, given?: string) {
  if (family) return { family: family.trim(), given: given?.trim() ?? '' };
  if (name.includes(',')) { const [last, ...rest] = name.split(','); return { family: last!.trim(), given: rest.join(' ').trim() }; }
  const parts = name.trim().split(/\s+/); return { family: parts.pop()!, given: parts.join(' ') };
}
export class ExportStore {
  private readonly files = new Map<string, { filename: string; bytes: Buffer; expires: number }>();
  constructor(private readonly directory?: string, private readonly ttlMs = 3600000) {}
  async put(bytes: Buffer, authorId: string) {
    for (const [id, file] of this.files) if (file.expires <= Date.now()) this.files.delete(id);
    if (bytes.length > 8 * 1024 * 1024) throw new ScopusError('EXPORT_TOO_LARGE', 'Workbook exceeds 8 MB. Reduce max_documents.');
    while (this.files.size >= 20) this.files.delete(this.files.keys().next().value!);
    const id = randomUUID(), filename = `scopus-${profileId(authorId, 'author')}-${id}.xlsx`;
    this.files.set(id, { filename, bytes, expires: Date.now() + this.ttlMs });
    let localPath: string | undefined;
    if (this.directory) {
      await mkdir(resolve(this.directory), { recursive: true });
      localPath = join(resolve(this.directory), filename); await writeFile(localPath, bytes, { flag: 'wx', mode: 0o600 });
    }
    return { id, filename, mime_type: XLSX_MIME, size: bytes.length, resource_uri: `scopus-export:///${id}`,
      ...(localPath ? { local_path: localPath, file_uri: pathToFileURL(localPath).href } : {}),
      expires_at: new Date(Date.now() + this.ttlMs).toISOString() };
  }
  get(id: string) {
    const item = this.files.get(id);
    if (!item || item.expires <= Date.now()) { this.files.delete(id); return undefined; }
    return item;
  }
  clear() { this.files.clear(); }
}
export async function makeWorkbook(author: AuthorCandidate, input: AuthorExportInput, result: PublicationResult) {
  const book = new ExcelJS.Workbook(); book.creator = 'Scopus Profiles MCP';
  const sheet = book.addWorksheet('Publications', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Title', key: 'title', width: 80 }, { header: 'Scopus ID', key: 'id', width: 22 },
    { header: 'EID', key: 'eid', width: 26 }, { header: 'DOI', key: 'doi', width: 38 },
    { header: 'First author (if reported)', key: 'first_author', width: 28 },
    { header: 'Source title', key: 'publication_name', width: 42 }, { header: 'Cover date', key: 'cover_date', width: 16 },
    { header: 'Scopus citations (if reported)', key: 'citation_count', width: 20 },
    { header: 'Scopus URL', key: 'url', width: 70 }, { header: 'Retrieved UTC', key: 'fetched_at', width: 27 },
  ];
  for (const item of result.items) sheet.addRow({ ...item, fetched_at: result.fetched_at });
  sheet.autoFilter = { from: 'A1', to: 'J1' };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
  sheet.getColumn('title').alignment = { wrapText: true, vertical: 'top' };
  sheet.getColumn('citation_count').numFmt = '0';
  const meta = book.addWorksheet('Coverage'); meta.columns = [{ width: 30 }, { width: 110 }];
  meta.addRows([
    ['Source', 'Scopus / Elsevier'], ['Mode', input.mode], ['Requested name', input.name], ['Requested university', input.university],
    ['Selected author', author.name], ['Scopus author ID', author.id], ['Profile URL', author.url],
    ['University on result', author.university], ['Exported publications', result.items.length], ['Reported profile/query total', result.total],
    ['Complete', result.complete ? 'Yes' : 'No / not established'], ['Coverage', result.coverage], ['Retrieved UTC', result.fetched_at],
    ['Blank cells', 'Not returned in the accessible Scopus view; not evidence of nonexistent metadata.'],
    ['Identity', input.author ? 'Author ID explicitly selected by caller.' : 'Single search candidate; name/affiliation match is not independent identity verification.'],
    ...result.warnings.map(w => ['Warning', w]),
  ]);
  meta.getColumn(1).font = { bold: true }; meta.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  return Buffer.from(await book.xlsx.writeBuffer());
}
async function apiPublications(service: ScopusService, author: AuthorCandidate, max: number): Promise<PublicationResult> {
  const items: Publication[] = [], seen = new Set<string>(), warnings: string[] = [];
  let start = 0, total: number | null = null, complete = false; const began = Date.now();
  while (items.length < max && Date.now() - began < 35000) {
    try {
      const page = await service.entityDocuments('author', author.id, start, Math.min(25, max - items.length), 'newest');
      if (total !== null && total !== page.total_results) warnings.push('Scopus total changed during pagination; rerun for a stable snapshot.');
      total = page.total_results;
      if (page.start !== start || page.page_clamped) { warnings.push('Scopus clamped the requested page.'); break; }
      let added = 0;
      for (const row of page.items) {
        const key = row.eid ?? row.id;
        if (!key || seen.has(key)) continue;
        seen.add(key); items.push(row); added++;
      }
      if (items.length === total && warnings.length === 0) { complete = true; break; }
      const next = page.next_start ?? start + page.returned;
      if (added === 0 || next <= start || next > 4999 || next >= total) { warnings.push('Pagination ended before all unique records were verified.'); break; }
      start = next;
    } catch (error) {
      if (!items.length) throw error;
      const detail = errorData(error); warnings.push(`${detail.code}: ${detail.message}`); break;
    }
  }
  if (!complete && !warnings.length) warnings.push('Document or time limit reached. Increase max_documents or retry.');
  return { items, total, complete, coverage: 'Scopus API AU-ID query; all years and affiliations', warnings, fetched_at: new Date().toISOString() };
}
export async function exportAuthorPublications(input: AuthorExportInput, service: ScopusService, source: PublicSource, store: ExportStore) {
  let candidates: AuthorCandidate[];
  if (input.author) candidates = [{ id: profileId(input.author, 'author'), name: input.name, university: input.university, url: `https://www.scopus.com/pages/author/${profileId(input.author, 'author')}` }];
  else if (input.mode === 'public') candidates = await source.findAuthors(input);
  else {
    const name = splitName(input.name, input.family_name, input.given_name);
    const query = `AUTHLASTNAME(${phrase(name.family)})${name.given ? ` AND AUTHFIRST(${phrase(name.given)})` : ''} AND AFFIL(${phrase(input.university)})`;
    const found = await service.searchAuthors({ query, start: 0, count: 25, sort: 'name' });
    candidates = found.items.filter(a => a.id).map(a => ({ id: a.id!, name: a.name.indexed ?? `${a.name.given ?? ''} ${a.name.family ?? ''}`.trim(),
      university: a.current_affiliations.map(af => af.name).filter(Boolean).join('; ') || null, url: a.url! }));
    if (found.total_results > candidates.length) return { status: 'needs_author_selection', candidates, more_candidates: true, data_absence_confirmed: false };
  }
  candidates = [...new Map(candidates.map(a => [a.id, a])).values()];
  if (candidates.length !== 1) return { status: candidates.length ? 'needs_author_selection' : 'no_search_match', candidates,
    data_absence_confirmed: false, next_step: candidates.length ? 'Call again with author set to the verified Scopus author ID.' : 'Try Latin spelling, explicit family_name/given_name, or a Scopus author profile URL. No match does not prove no publications.' };
  const author = candidates[0]!;
  const result = input.mode === 'public' ? await source.publications(author, input.max_documents) : await apiPublications(service, author, input.max_documents);
  // A blocked or unrecognized page must throw, rather than produce a misleading empty workbook.
  if (!result.items.length && !(result.complete && result.total === 0)) throw new ScopusError('PUBLICATIONS_NOT_RETRIEVED', 'No publication rows could be verified in the accessible Scopus view; this is not proof of no publications.');
  const file = await store.put(await makeWorkbook(author, input, result), author.id);
  return { status: 'exported', source: 'Scopus', mode: input.mode, author, exported: result.items.length,
    reported_total: result.total, complete: result.complete, coverage: result.coverage, warnings: result.warnings,
    fetched_at: result.fetched_at, data_absence_confirmed: result.complete && result.total === 0, ...file };
}
