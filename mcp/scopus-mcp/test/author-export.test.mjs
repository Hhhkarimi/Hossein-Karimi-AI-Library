import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createEndpoint } from '../dist/endpoint.js';
import { fixtureService, authorEntry, documentEntry, searchResponse } from './fixtures.mjs';
import ExcelJS from 'exceljs';
import { ExportStore, exportAuthorPublications } from '../dist/author-export.js';
import { ScopusService } from '../dist/service.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const candidate = { id: '11111111111', name: 'Ada Example', university: 'Example University', url: 'https://www.scopus.com/pages/author/11111111111' };
const input = { name: candidate.name, university: candidate.university, mode: 'public', max_documents: 1000 };
const publicSource = {
  findAuthors: async () => [candidate],
  publications: async () => ({ items: [{ id: '85000000001', title: '=HYPERLINK("https://invalid.test")', citation_count: 0, url: 'https://www.scopus.com/pages/publications/85000000001' }],
    total: 20, complete: false, coverage: 'Public Scopus Preview', warnings: ['Only publicly visible records.'], fetched_at: '2026-10-19T00:00:00.000Z' }),
};

test('name and university deliver a real downloadable Excel workbook through MCP', async () => {
  const { service } = fixtureService(url => {
    if (url.pathname === '/content/search/author') return searchResponse([authorEntry()]);
    if (url.pathname === '/content/search/scopus') return searchResponse([documentEntry()]);
  });
  const endpoint = createEndpoint({ service });
  const client = new Client({ name: 'excel-regression', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), {
      fetch: (input, init) => endpoint.fetch(new Request(input, init)),
    }));
    const result = await client.callTool({ name: 'export_author_publications', arguments: {
      name: 'Ada Example', university: 'Example University', mode: 'api',
    } });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.equal(result.structuredContent.status, 'exported');
    assert.equal(result.structuredContent.exported, 1);
    assert.equal(result.structuredContent.complete, true);
    const response = await endpoint.fetch(new Request(result.structuredContent.download_url));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'XLSX must be a ZIP workbook, not CSV renamed .xlsx');
  } finally { await client.close(); await endpoint.close(); }
});

test('default public mode needs no key and returns Excel bytes through downloads and MCP resources', async () => {
  const endpoint = createEndpoint({ service: new ScopusService(), publicSource, token: 'fixture-token' });
  const client = new Client({ name: 'no-api-key', version: '1' });
  const auth = { authorization: 'Bearer fixture-token' };
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), {
      requestInit: { headers: auth }, fetch: (i, init) => endpoint.fetch(new Request(i, init)),
    }));
    const result = await client.callTool({ name: 'export_author_publications', arguments: { name: input.name, university: input.university } });
    assert.ok(!result.isError, JSON.stringify(result));
    const data = result.structuredContent;
    assert.equal(data.mode, 'public'); assert.equal(data.complete, false); assert.equal(data.exported, 1); assert.equal(data.reported_total, 20);
    assert.equal((await endpoint.fetch(new Request(data.download_url))).status, 401);
    assert.equal((await endpoint.fetch(new Request(data.download_url, { headers: { ...auth, origin: 'https://evil.test' } }))).status, 403);
    const response = await endpoint.fetch(new Request(data.download_url, { headers: auth }));
    assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /attachment.*xlsx/);
    const buffer = Buffer.from(await response.arrayBuffer());
    const resource = await client.readResource({ uri: data.resource_uri });
    assert.deepEqual(Buffer.from(resource.contents[0].blob, 'base64'), buffer);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(buffer);
    assert.deepEqual(book.worksheets.map(s => s.name), ['Publications', 'Coverage']);
    assert.equal(book.getWorksheet('Publications').getCell('A2').value, '=HYPERLINK("https://invalid.test")');
    assert.equal(book.getWorksheet('Publications').getCell('A2').type, ExcelJS.ValueType.String);
    assert.equal(book.getWorksheet('Publications').getCell('H2').value, 0);
    assert.equal(book.getWorksheet('Coverage').getCell('B11').value, 'No / not established');
  } finally { await client.close(); await endpoint.close(); }
});

test('ambiguous authors require selection and never export another person automatically', async () => {
  let reads = 0;
  const source = { ...publicSource, findAuthors: async () => [candidate, { ...candidate, id: '22222222222' }], publications: async () => { reads++; return publicSource.publications(); } };
  const result = await exportAuthorPublications(input, new ScopusService(), source, new ExportStore());
  assert.equal(result.status, 'needs_author_selection'); assert.equal(result.candidates.length, 2); assert.equal(reads, 0);
  const selected = await exportAuthorPublications({ ...input, author: '22222222222' }, new ScopusService(), source, new ExportStore());
  assert.equal(selected.author.id, '22222222222'); assert.equal(reads, 1);
});

test('no match or unreadable publications never becomes a false empty workbook', async () => {
  const result = await exportAuthorPublications(input, new ScopusService(), { ...publicSource, findAuthors: async () => [] }, new ExportStore());
  assert.equal(result.status, 'no_search_match'); assert.equal(result.data_absence_confirmed, false); assert.equal(result.filename, undefined);
  await assert.rejects(exportAuthorPublications(input, new ScopusService(), { ...publicSource, publications: async () => ({ items: [], total: null, complete: false }) }, new ExportStore()), { code: 'PUBLICATIONS_NOT_RETRIEVED' });
});

test('API export paginates all author papers without filtering out previous universities', async () => {
  const { service, calls } = fixtureService(url => {
    if (url.pathname === '/content/search/author') return searchResponse([authorEntry()]);
    if (url.pathname === '/content/search/scopus') {
      const start = Number(url.searchParams.get('start') ?? 0);
      return searchResponse(Array.from({ length: start === 0 ? 25 : 2 }, (_, i) => documentEntry(String(85000000001 + start + i))), 27, start);
    }
  });
  const store = new ExportStore();
  const result = await exportAuthorPublications({ ...input, mode: 'api' }, service, publicSource, store);
  assert.equal(result.exported, 27); assert.equal(result.complete, true);
  const queries = calls.filter(c => c.url.pathname.endsWith('/scopus'));
  assert.equal(queries.length, 2); assert.equal(queries[1].url.searchParams.get('start'), '25');
  assert.equal(queries[0].url.searchParams.get('query'), 'AU-ID(11111111111)');
});

test('local stdio/CLI artifacts are saved as real XLSX and retain stable Unicode text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'scopus-export-test-'));
  try {
    const store = new ExportStore(directory);
    const result = await exportAuthorPublications({ ...input, name: 'پژوهشگر نمونه', author: candidate.id }, new ScopusService(), publicSource, store);
    const bytes = await readFile(result.local_path); assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes);
    assert.equal(book.getWorksheet('Coverage').getCell('B3').value, 'پژوهشگر نمونه');
    assert.ok(result.local_path.startsWith(directory)); assert.match(result.file_uri, /^file:/);
    assert.equal(store.get('../package.json'), undefined); store.clear(); assert.equal(store.get(result.id), undefined);
  } finally { await rm(directory, { recursive: true }); }
});

test('later API access failure preserves retrieved papers and marks the workbook incomplete', async () => {
  const { service } = fixtureService(url => {
    if (url.pathname === '/content/search/author') return searchResponse([authorEntry()]);
    if (url.pathname === '/content/search/scopus') {
      if (Number(url.searchParams.get('start')) > 0) return new Response('{}', { status: 403 });
      return searchResponse([documentEntry()], 5);
    }
  });
  const result = await exportAuthorPublications({ ...input, mode: 'api' }, service, publicSource, new ExportStore());
  assert.equal(result.exported, 1); assert.equal(result.complete, false); assert.equal(result.reported_total, 5);
  assert.match(result.warnings.join(' '), /ACCESS_DENIED/); assert.equal(result.data_absence_confirmed, false);
});

test('expired resources are not served and invalid author URLs are rejected before retrieval', async () => {
  const store = new ExportStore(undefined, -1); const file = await store.put(Buffer.from('synthetic'), candidate.id);
  assert.equal(store.get(file.id), undefined);
  await assert.rejects(exportAuthorPublications({ ...input, author: 'https://untrusted.test/author/11111111111' }, new ScopusService(), publicSource, new ExportStore()), { code: 'INVALID_IDENTIFIER' });
});
