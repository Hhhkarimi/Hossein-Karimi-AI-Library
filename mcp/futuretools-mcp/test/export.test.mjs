import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatExport, csvCell, ExportStore } from '../dist/export.js';
import { fixtureService, detail } from './fixtures.mjs';
test('real XLSX round-trips Unicode, literal formula-like text, numeric zero and coverage', async () => {
  const { service } = fixtureService(u => detail(u.pathname.split('/').at(-1), { name: '=HYPERLINK("https://invalid.test")', description_short: 'پژوهش نمونه' }));
  const collection = await service.collect({ tools: ['synthetic-a'], max_pages: 1, include_details: false });
  const bytes = await formatExport(collection, 'xlsx'); assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes);
  assert.deepEqual(book.worksheets.map(s => s.name), ['Tools', 'Coverage']); const sheet = book.getWorksheet('Tools');
  assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String); assert.equal(sheet.getCell('A2').value, '=HYPERLINK("https://invalid.test")');
  assert.equal(sheet.getCell('C2').value, 'پژوهش نمونه'); assert.equal(sheet.getCell('F2').value, 0);
  assert.equal(sheet.views[0].ySplit, 1); assert.equal(book.getWorksheet('Coverage').getCell('B7').value, false);
});
test('CSV protects whitespace-prefixed formulas and preserves quotes and newlines', () => {
  assert.equal(csvCell('  =1+1'), '"\'  =1+1"'); assert.equal(csvCell('@command'), '"\'@command"');
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"'); assert.equal(csvCell(0), '"0"'); assert.equal(csvCell(null), '""');
});
test('CSV and JSON exports retain source URLs and timestamps', async () => {
  const p = await fixtureService().service.collect({ tools: ['synthetic-a'], max_pages: 1, include_details: false });
  const csv = (await formatExport(p, 'csv')).toString(); assert.match(csv, /source_url/); assert.match(csv, /https:\/\/futuretools.io\/tools\/synthetic-a/);
  const json = JSON.parse((await formatExport(p, 'json')).toString()); assert.equal(json.records[0].provenance.source, 'FutureTools');
});
test('local artifacts are real files in the configured directory; resource expiry is explicit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'futuretools-export-'));
  try {
    const store = new ExportStore(dir), p = await fixtureService().service.collect({ tools: ['synthetic-a'], max_pages: 1, include_details: false });
    const bytes = await formatExport(p, 'xlsx'), file = await store.put(bytes, 'xlsx');
    assert.deepEqual(await readFile(file.local_path), bytes); assert.ok(file.local_path.startsWith(dir)); assert.match(file.file_uri, /^file:/);
    assert.equal(store.get('../package.json'), undefined); store.clear(); assert.equal(store.get(file.id), undefined);
    const expired = new ExportStore(undefined, -1), old = await expired.put(Buffer.from('{}'), 'json'); assert.equal(expired.get(old.id), undefined);
  } finally { await rm(dir, { recursive: true }); }
});
