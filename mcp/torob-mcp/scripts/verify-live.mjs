import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createNodeServer } from '../dist/http.js';
import { TOOL_NAMES } from '../dist/server.js';

const query = process.env.TOROB_TEST_QUERY ?? 'galaxy a56';
let app;
const client = new Client({ name: 'torob-live-verifier', version: '0.1.0' });
const report = { started_at: new Date().toISOString(), transport: 'http', checks: [] };
try {
  let transport;
  if (process.argv.includes('--stdio')) {
    report.transport = 'stdio';
    transport = new StdioClientTransport({ command: process.execPath,
      args: [fileURLToPath(new URL('../dist/stdio.js', import.meta.url))], stderr: 'inherit' });
  } else {
    let endpoint = process.env.MCP_URL;
    if (!endpoint) {
      app = createNodeServer();
      await new Promise((resolve, reject) => {
        app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve);
      });
      endpoint = `http://127.0.0.1:${app.server.address().port}/mcp`;
    }
    transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: { headers: process.env.MCP_TOKEN ? { authorization: `Bearer ${process.env.MCP_TOKEN}` } : {} },
    });
  }
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(new Set(tools.tools.map(t => t.name)), new Set(TOOL_NAMES));
  assert.ok(tools.tools.every(t => t.annotations?.readOnlyHint));
  report.server = client.getServerVersion();
  report.checks.push({ name: 'handshake_and_tools', passed: true, tool_count: tools.tools.length });
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (result.isError) throw new Error(`${name}: ${result.content?.find(c => c.type === 'text')?.text}`);
    const data = result.structuredContent ?? JSON.parse(result.content.find(c => c.type === 'text').text);
    report.checks.push({ name, passed: true, returned: data.returned ?? data.succeeded ?? data.suggestions?.length });
    console.log(`PASS ${name}`);
    return data;
  };
  const search = await call('search_torob', { query, limit: 5 });
  assert.ok(search.items.length >= 2, 'The live query must return two products; set TOROB_TEST_QUERY if necessary.');
  assert.equal(search.price_unit, 'toman');
  assert.ok(search.items.every(p => !p.is_ad && p.url.startsWith('https://torob.com/p/')));
  const ids = [...new Set(search.items.map(p => p.id))].slice(0, 2);
  await call('torob_suggest', { query, limit: 3 });
  const filters = await call('search_filters', { query });
  const detail = await call('product_details', { product: ids[0] });
  const category = detail.category_id ?? filters.parent_categories.at(-1)?.id ?? filters.categories[0]?.id;
  assert.ok(category, 'Torob did not supply a category ID.');
  await call('browse_category', { category_id: category, limit: 3 });
  const sellers = await call('product_sellers', { product: ids[0], limit: 3 });
  assert.ok(sellers.items.length > 0, 'The selected product has no online offers.');
  const prices = sellers.items.map(o => o.price_toman).filter(p => p !== null);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  await call('similar_products', { product: ids[0], limit: 3 });
  const batch = await call('get_products_batch', { products: ids });
  assert.equal(batch.succeeded, 2);
  await call('compare_products', { products: ids });
  const cheapest = await call('find_cheapest', { query, pages: 1, limit: 3,
    ...(detail.min_price_toman ? { max_price_toman: detail.min_price_toman * 2 } : {}) });
  assert.equal(cheapest.pages_read, 1);
  const bad = await client.callTool({ name: 'product_details', arguments: { product: 'https://example.com/p/invalid' } });
  assert.equal(bad.isError, true);
  report.checks.push({ name: 'invalid_product_error', passed: true });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
  if (app) await app.close();
  report.finished_at = new Date().toISOString();
  if (process.env.VERIFY_REPORT) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(process.env.VERIFY_REPORT, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
}
