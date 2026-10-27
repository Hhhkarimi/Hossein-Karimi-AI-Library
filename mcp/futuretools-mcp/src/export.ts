import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FutureToolsService } from './service.js';
import { FutureToolsError } from './errors.js';
export const MIME = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv; charset=utf-8', json: 'application/json' };
type Collection = Awaited<ReturnType<FutureToolsService['collect']>>;
export type ExportFormat = keyof typeof MIME;
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[\s\uFEFF]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
function rows(collection: Collection) {
  return collection.records.map(t => ({ name: t.name, slug: t.slug, description: t.description, pricing: t.pricing,
    categories: t.category_text || t.categories.map(c => c.name).join('; '), upvotes: t.upvotes, matts_pick: t.is_matts_pick,
    open_source: t.open_source ?? null, api_available: t.api_available ?? null, website_url: t.website_url,
    directory_url: t.url, published_at: t.published_at, listed_text: t.listed_text ?? null,
    source_url: t.provenance.source_url, fetched_at: t.provenance.fetched_at, cached: t.provenance.cached }));
}
const columns = [
  ['name', 'Name', 26], ['slug', 'Slug', 30], ['description', 'Description', 85], ['pricing', 'Directory pricing label', 22],
  ['categories', 'Categories', 34], ['upvotes', 'Directory upvotes', 18], ['matts_pick', "Matt's pick", 16],
  ['open_source', 'Open source (if reported)', 20], ['api_available', 'API available (if reported)', 20],
  ['website_url', 'Vendor URL', 55], ['directory_url', 'FutureTools URL', 55], ['published_at', 'Directory publication time', 28],
  ['listed_text', 'Listed text (if reported)', 24], ['source_url', 'Page retrieved', 65], ['fetched_at', 'Retrieved UTC', 28], ['cached', 'From cache', 16],
] as const;
export async function formatExport(collection: Collection, format: ExportFormat): Promise<Buffer> {
  if (format === 'json') return Buffer.from(JSON.stringify(collection, null, 2));
  const values = rows(collection);
  if (format === 'csv') return Buffer.from('\uFEFF' + [columns.map(c => csvCell(c[0])).join(','), ...values.map(r => columns.map(c => csvCell(r[c[0]])).join(','))].join('\r\n'));
  const book = new ExcelJS.Workbook(); book.creator = 'FutureTools MCP';
  const sheet = book.addWorksheet('Tools', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(([key, header, width]) => ({ key, header, width }));
  for (const r of values) sheet.addRow(r);
  sheet.autoFilter = { from: 'A1', to: 'P1' }; sheet.getColumn('upvotes').numFmt = '0';
  sheet.getColumn('description').alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF193A49' } };
  const meta = book.addWorksheet('Coverage'); meta.columns = [{ width: 30 }, { width: 110 }];
  meta.addRows([
    ['Source', 'FutureTools public website'], ['Created UTC', collection.created_at], ['Exported', collection.exported],
    ['Reported query/selection total', collection.reported_total], ['Pages retrieved', collection.pages_read],
    ['Requested selection complete', collection.selection_complete], ['Entire query complete', collection.entire_query_complete],
    ['Scope', collection.scope], ['Limits', collection.note],
    ['Blank cells', 'Not reported in the accessible source view; never a fabricated zero or absence claim.'],
    ['Pricing', 'FutureTools labels, not independently verified current vendor subscription prices.'],
    ...collection.errors.map(e => ['Partial error', JSON.stringify(e)]),
  ]);
  meta.getColumn(1).font = { bold: true }; meta.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  return Buffer.from(await book.xlsx.writeBuffer());
}
export class ExportStore {
  private readonly files = new Map<string, { bytes: Buffer; mime: string; filename: string; expires: number }>();
  constructor(private readonly directory?: string, private readonly ttlMs = 3600000) {}
  async put(bytes: Buffer, format: ExportFormat) {
    for (const [id, file] of this.files) if (file.expires <= Date.now()) this.files.delete(id);
    if (bytes.length > 8 * 1024 * 1024) throw new FutureToolsError('EXPORT_TOO_LARGE', 'Export exceeds 8 MB. Reduce its page count.');
    while (this.files.size >= 10 || [...this.files.values()].reduce((n, f) => n + f.bytes.length, 0) + bytes.length > 32 * 1024 * 1024) this.files.delete(this.files.keys().next().value!);
    const id = randomUUID(), filename = `futuretools-${id}.${format}`, expires = Date.now() + this.ttlMs;
    const mime = MIME[format]; let local: string | undefined;
    if (this.directory) { const directory = resolve(this.directory); await mkdir(directory, { recursive: true });
      local = join(directory, filename); await writeFile(local, bytes, { flag: 'wx', mode: 0o600 }); }
    this.files.set(id, { bytes, filename, mime, expires });
    return { id, filename, mime_type: mime, size: bytes.length, resource_uri: `futuretools-export:///${id}`,
      expires_at: new Date(expires).toISOString(), ...(local ? { local_path: local, file_uri: pathToFileURL(local).href } : {}) };
  }
  get(id: string) { const file = this.files.get(id); if (!file || file.expires <= Date.now()) { this.files.delete(id); return undefined; } return file; }
  clear() { this.files.clear(); }
}
