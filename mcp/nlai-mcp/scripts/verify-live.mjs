import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import ExcelJS from 'exceljs';
import { readIsoIds } from '../dist/catalog.js';
import { createNodeServer } from '../dist/http.js';

const sampleId = '10027591';
const fipaId = '10288541';
const isbnClause = { field: 'isbn_issn', value: '9786223878947', match: 'exact' };
const query = { clauses: [isbnClause] };
const timeout = { timeout: 120000 };

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args }, timeout);
  assert.ok(!result.isError, name + ': ' + JSON.stringify(result.content));
  assert.ok(result.structuredContent, name + ' did not return structured content');
  return result.structuredContent;
}

const app = createNodeServer();
const http = new Client({ name: 'nlai-live-verifier-http', version: '0.1.0' });
try {
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  const base = 'http://127.0.0.1:' + app.server.address().port;
  await http.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
  const { tools } = await http.listTools();
  assert.equal(tools.length, 15);
  assert.equal((await call(http, 'nlai_status')).api_key_required, false);
  assert.equal((await call(http, 'check_access')).id, sampleId);
  const options = await call(http, 'list_catalog_options');
  assert.ok(options.languages.some(option => option.code === 'per'));
  const isbn = await call(http, 'lookup_isbn', { isbn: '۹۷۸-۶۲۲-۳۸۷-۸۹۴-۷' });
  assert.equal(isbn.records[0].match, 'literal');
  assert.equal(isbn.records[0].id, sampleId);
  const batch = await call(http, 'get_books_batch', { records: [sampleId, fipaId, '999999999'] });
  assert.equal(batch.errors.length, 1);
  assert.equal(batch.errors[0].error.data_absence_confirmed, false);
  const fipa = await call(http, 'get_book', { record: 'https://opac.nlai.ir/opac-prod/bibliographic/' + fipaId });
  assert.equal(fipa.cataloging_kind, 'fipa');
  assert.equal(fipa.holdings.length, 0);
  const national = await call(http, 'lookup_national_bibliography', { number: '10288541' });
  assert.ok(national.records.some(book => book.id === fipaId));
  const byDate = await call(http, 'search_books', {
    query: { publication_date: { from: '۱۴۰۴' }, database: 'holdings' }, page: 2, page_size: 25
  });
  assert.equal(byDate.page, 2);
  assert.equal(byDate.page_size, 25);
  assert.equal(byDate.items.length, 25);
  const zero = await call(http, 'search_books', {
    query: { clauses: [{ field: 'title', value: 'zzzxxyyzzqewwooe', match: 'exact' }] }
  });
  assert.equal(zero.total, 0);
  const multi = await call(http, 'search_multifield', {
    query: { fields: {
      title: { value: 'اوتیسم' }, publication: { value: 'حوزه مشق' }, publication_date: { value: '۱۴۰۴' }
    } }
  });
  assert.ok(multi.items.some(item => item.id === sampleId));
  const browsed = await call(http, 'browse_index', { field: 'title', value: 'اوتیسم' });
  assert.ok(browsed.items.some(item => item.text === 'اوتیسم'));
  const print = await call(http, 'verify_first_printing', { record: sampleId, year: 1404 });
  assert.equal(print.status, 'confirmed_catalog_printing');
  assert.ok(print.matching_holdings.every(holding => holding.year_text === '۱۴۰۴' && holding.printing_text === '۱'));
  const notConfirmed = await call(http, 'verify_first_printing', { record: fipaId, year: 1404 });
  assert.equal(notConfirmed.status, 'unverified');
  const printingArgs = { year: '۱۴۰۴', clauses: [isbnClause], scan_limit: 5 };
  const firstPrintings = await call(http, 'find_first_printings', printingArgs);
  assert.equal(firstPrintings.confirmed[0].id, sampleId);
  const yearScan = await call(http, 'find_first_printings', { year: 1404, database: 'holdings', scan_limit: 2 });
  assert.equal(yearScan.scanned_candidates, 2);
  assert.deepEqual(yearScan.next, { page: 1, start_at: 3 });
  const exported = await call(http, 'export_books', { records: [sampleId, fipaId] });
  const download = await fetch(exported.download_url);
  assert.equal(download.status, 200);
  const xlsx = Buffer.from(await download.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx);
  assert.equal(workbook.getWorksheet('Books').getCell('F2').value, '9786223878947');
  assert.equal(workbook.getWorksheet('Books').getCell('H3').value, 'fipa');
  assert.ok(workbook.getWorksheet('Coverage').rowCount >= 2);
  const blob = await http.readResource({ uri: exported.resource_uri });
  assert.deepEqual(Buffer.from(blob.contents[0].blob, 'base64'), xlsx);
  const printExport = await call(http, 'export_first_printings', { ...printingArgs, format: 'json' });
  const json = await (await fetch(printExport.download_url)).json();
  assert.equal(json.records[0].id, sampleId);
  assert.equal(json.coverage.confirmed_count, 1);
  const iso = await call(http, 'export_unimarc', { query, records: [sampleId] });
  const bytes = Buffer.from(await (await fetch(iso.download_url)).arrayBuffer());
  assert.deepEqual(readIsoIds(bytes, iso.source_url), [sampleId]);
  console.log(JSON.stringify({
    transport: 'HTTP', tools: tools.length, live_year_candidates: byDate.total, year_page: byDate.page,
    first_print_record: sampleId, preliminary_fipa_record: fipaId, xlsx_bytes: xlsx.length, iso_bytes: bytes.length
  }));
} finally {
  await http.close();
  await app.close();
}

if (!process.argv.includes('--http-only')) {
  const temporary = await mkdtemp(join(tmpdir(), 'nlai-mcp-live-'));
  const stdio = new Client({ name: 'nlai-live-verifier-stdio', version: '0.1.0' });
  try {
    await stdio.connect(new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../dist/stdio.js', import.meta.url))],
      env: { ...process.env, NLAI_EXPORT_DIR: temporary }
    }));
    const status = await call(stdio, 'nlai_status');
    assert.equal(status.name, 'nlai-mcp');
    const exported = await call(stdio, 'export_books', { search: { query }, format: 'csv' });
    const local = await readFile(exported.local_path, 'utf8');
    assert.ok(local.includes(sampleId));
    console.log(JSON.stringify({ transport: 'stdio', exported: exported.exported }));
  } finally {
    await stdio.close();
    await rm(temporary, { recursive: true, force: true });
  }
}
