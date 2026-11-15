import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';

export type Format = 'xlsx' | 'csv' | 'json';
type FileFormat = Format | 'mrc';
const types: Record<FileFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8', json: 'application/json; charset=utf-8', mrc: 'application/marc'
};

export type Row = {
  id: string; title: string; source_url: string; creator?: string | null; publication_date_text?: string | null;
  isbns?: { value: string }[]; publication?: string[]; main_entries?: string[]; subjects?: string[];
  national_bibliography_number?: string | null; cataloging_kind?: string; printing?: unknown;
};
type Stored = { id: string; bytes: Buffer; filename: string; mime: string; expires: number };

export class ExportStore {
  #files = new Map<string, Stored>();
  #size = 0;
  constructor(private readonly directory?: string) {}

  #delete(id: string) {
    const file = this.#files.get(id);
    if (file) this.#size -= file.bytes.length;
    this.#files.delete(id);
  }

  async put(bytes: Buffer, format: FileFormat) {
    const id = randomUUID();
    const filename = `nlai-${id}.${format}`;
    const mime = types[format];
    if (bytes.length > 6 * 1024 * 1024) throw new Error('Export exceeds 6 MiB.');
    const local_path = this.directory !== undefined ? resolve(this.directory, filename) : undefined;
    if (local_path) {
      await mkdir(resolve(this.directory!), { recursive: true });
      await writeFile(local_path, bytes, { flag: 'wx' });
    }
    for (const [key, file] of this.#files) if (file.expires <= Date.now()) this.#delete(key);
    while (this.#files.size >= 10 || this.#size + bytes.length > 24 * 1024 * 1024) {
      this.#delete(this.#files.keys().next().value!);
    }
    this.#files.set(id, { bytes, id, filename, mime, expires: Date.now() + 60 * 60 * 1000 });
    this.#size += bytes.length;
    return {
      id, filename, mime_type: mime, size: bytes.length, resource_uri: `nlai-export:///${id}`,
      ...(local_path ? { local_path, file_uri: pathToFileURL(local_path).href } : {})
    };
  }

  get(id: string) {
    const file = this.#files.get(id);
    if (file && file.expires > Date.now()) return file;
    this.#delete(id);
    return undefined;
  }
}

const columns = [
  ['ID', 15], ['Title', 64], ['Creator', 40], ['Publication date', 19], ['Imprint', 38], ['ISBNs', 32],
  ['National bibliography number', 28], ['Cataloging kind', 16], ['Subjects', 46], ['Source URL', 63], ['Printing evidence', 65]
] as const;

function cells(row: Row) {
  return [
    row.id, row.title, row.main_entries?.join(' | ') || row.creator || null, row.publication_date_text ?? null,
    row.publication?.join(' | ') || null, row.isbns?.map(isbn => isbn.value).join(' | ') || null,
    row.national_bibliography_number ?? null, row.cataloging_kind ?? null, row.subjects?.join(' | ') || null,
    row.source_url, row.printing ? JSON.stringify(row.printing) : null
  ];
}

function csvCell(value: string | null) {
  const text = value ?? '';
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\x00-\x1f]/u.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export async function formatExport(rows: Row[], coverage: Record<string, unknown>, format: Format) {
  if (format === 'json') return Buffer.from(JSON.stringify({ coverage, records: rows }, null, 2) + '\n');
  const header = columns.map(([label]) => label);
  if (format === 'csv') {
    return Buffer.from('\uFEFF' + [header, ...rows.map(cells)].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n');
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Books', { views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }] });
  sheet.columns = columns.map(([head, width]) => ({ header: head, width, style: { numFmt: '@' } }));
  for (const row of rows) sheet.addRow(cells(row));
  sheet.autoFilter = { from: 'A1', to: 'K1' };
  const scope = workbook.addWorksheet('Coverage');
  scope.columns = [{ header: 'Field', width: 36 }, { header: 'Value', width: 100 }];
  for (const [field, value] of Object.entries(coverage)) {
    const text = value == null ? null : typeof value === 'object' ? JSON.stringify(value) : String(value);
    const chunks = text?.match(/[\s\S]{1,16000}/g) ?? [null];
    for (const [index, chunk] of chunks.entries()) scope.addRow([index ? field + ' (continued)' : field, chunk]);
  }
  for (const tab of [sheet, scope]) {
    tab.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tab.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF193E38' } };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
