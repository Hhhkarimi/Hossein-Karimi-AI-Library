import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createNodeServer } from '../dist/http.js';
import { TOOL_NAMES } from '../dist/server.js';
const report = { started_at: new Date().toISOString(), source: 'FutureTools public website', api_key_required: false,
  paid_services_required: false, transport: 'Real localhost HTTP listener and official MCP client', checks: [] };
const app = createNodeServer(); const client = new Client({ name: 'futuretools-live-verifier', version: '0.1.0' });
try {
  await new Promise((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  const tools = await client.listTools(); assert.deepEqual(tools.tools.map(t => t.name), [...TOOL_NAMES]);
  report.checks.push({ name: 'tool_discovery', count: tools.tools.length, passed: true });
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (result.isError) { const e = JSON.parse(result.content.find(c => c.type === 'text').text); throw new Error(`${name}: ${e.error.code}: ${e.error.message}`); }
    const data = result.structuredContent; report.checks.push({ name, passed: true, ...(data.returned !== undefined ? { returned: data.returned } : {}), ...(data.count !== undefined ? { count: data.count } : {}) }); return data;
  }
  assert.equal((await call('futuretools_status', {})).api_key_required, false);
  assert.equal((await call('check_access', {})).access_verified, true);
  const categories = await call('list_categories', {}); assert.ok(categories.count > 10); assert.ok(categories.categories.some(c => c.slug === 'research'));
  const search = await call('search_tools', { query: 'research', filters: ['free'], sort: 'popular' });
  assert.ok(search.items.length > 0); assert.ok(search.items.every(t => t.pricing === 'free')); assert.equal(search.applied_filters.query, 'research');
  const page2 = await call('search_tools', { query: 'research', filters: ['free'], sort: 'popular', page: 2 });
  assert.equal(page2.page, 2); assert.ok(page2.range.from > search.range.to);
  const item = await call('get_tool', { tool: 'claude' }); assert.equal(item.slug, 'claude'); assert.ok(item.description?.length > 20); assert.ok(item.website_url?.startsWith('https://'));
  assert.equal((await call('get_tools_batch', { tools: ['claude', 'chatgpt-openai'] })).complete, true);
  await call('category_tools', { category: 'research', filters: ['free'] });
  await call('latest_tools', { categories: ['research'] });
  await call('popular_tools', { categories: ['research'], period: '30_days' });
  await call('free_tools', { query: 'research' });
  await call('open_source_tools', { query: 'research' });
  await call('editors_picks', { query: 'research' });
  assert.equal((await call('compare_tools', { tools: ['claude', 'chatgpt-openai'] })).complete, true);
  const alternatives = await call('find_alternatives', { tool: 'claude', category: 'chat', limit: 5 });
  assert.equal(alternatives.status, 'ok'); assert.ok(alternatives.items.every(t => t.slug !== 'claude'));
  const file = await call('export_tools', { search: { query: 'research', filters: ['free'], sort: 'popular' }, format: 'xlsx' });
  assert.equal(file.selection_complete, true); assert.equal(file.exported, search.items.length);
  const download = await fetch(file.download_url); assert.equal(download.status, 200); assert.match(download.headers.get('content-type'), /spreadsheetml/);
  const bytes = Buffer.from(await download.arrayBuffer()), resource = await client.readResource({ uri: file.resource_uri });
  assert.deepEqual(Buffer.from(resource.contents[0].blob, 'base64'), bytes);
  const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes); assert.equal(book.getWorksheet('Tools').rowCount - 1, file.exported);
  assert.equal(book.getWorksheet('Tools').getCell('A2').value, search.items[0].name);
  report.checks.push({ name: 'real_source_to_xlsx_download_and_resource', passed: true, exported: file.exported, bytes: bytes.length, entire_query_complete: file.entire_query_complete });
  report.passed = true;
} catch (error) { report.passed = false; report.error = error instanceof Error ? error.message : 'Verification failed'; process.exitCode = 1; }
finally {
  report.finished_at = new Date().toISOString(); await client.close().catch(() => {}); await app.close().catch(() => {});
  if (process.env.VERIFY_REPORT) await writeFile(process.env.VERIFY_REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
