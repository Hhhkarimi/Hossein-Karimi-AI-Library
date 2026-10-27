import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { request } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createEndpoint } from '../dist/endpoint.js';
import { createNodeServer } from '../dist/http.js';
import { createServer, TOOL_NAMES } from '../dist/server.js';
import { fixtureService } from './fixtures.mjs';
const inputs = {
  futuretools_status: {}, check_access: {}, search_tools: { query: 'research' }, list_categories: {},
  get_tool: { tool: 'synthetic-a' }, get_tools_batch: { tools: ['synthetic-a', 'synthetic-b'] }, category_tools: { category: 'research' },
  latest_tools: {}, popular_tools: {}, free_tools: {}, open_source_tools: {}, editors_picks: {},
  compare_tools: { tools: ['synthetic-a', 'synthetic-b'] }, find_alternatives: { tool: 'synthetic-a' },
  export_tools: { tools: ['synthetic-a'], format: 'xlsx' },
};
test('official SDK client invokes all 15 tools through Streamable HTTP', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service }), client = new Client({ name: 'protocol-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), { fetch: (i, init) => endpoint.fetch(new Request(i, init)) }));
    const tools = await client.listTools(); assert.deepEqual(tools.tools.map(t => t.name), [...TOOL_NAMES]); assert.equal(tools.tools.length, 15);
    for (const [name, args] of Object.entries(inputs)) { const result = await client.callTool({ name, arguments: args }); assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`); assert.ok(result.structuredContent); }
    assert.equal(tools.tools.find(t => t.name === 'export_tools').annotations.readOnlyHint, false);
  } finally { await client.close(); await endpoint.close(); }
});
test('download and resources/read return identical XLSX bytes under the same bearer/Origin rules', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service, token: 'fixture-token' }), client = new Client({ name: 'download-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), { requestInit: { headers: { authorization: 'Bearer fixture-token' } }, fetch: (i, init) => endpoint.fetch(new Request(i, init)) }));
    const result = await client.callTool({ name: 'export_tools', arguments: { search: {}, format: 'xlsx' } }); const data = result.structuredContent;
    assert.equal((await endpoint.fetch(new Request(data.download_url))).status, 401);
    assert.equal((await endpoint.fetch(new Request(data.download_url, { headers: { authorization: 'Bearer fixture-token', origin: 'https://evil.test' } }))).status, 403);
    const response = await endpoint.fetch(new Request(data.download_url, { headers: { authorization: 'Bearer fixture-token' } }));
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /spreadsheetml/); assert.match(response.headers.get('content-disposition'), /attachment.*xlsx/);
    const bytes = Buffer.from(await response.arrayBuffer()), resource = await client.readResource({ uri: data.resource_uri });
    assert.equal(bytes.subarray(0, 2).toString(), 'PK'); assert.deepEqual(Buffer.from(resource.contents[0].blob, 'base64'), bytes);
  } finally { await client.close(); await endpoint.close(); }
});
test('invalid exports and unknown or excessive arguments are rejected', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service }), client = new Client({ name: 'invalid-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), { fetch: (i, init) => endpoint.fetch(new Request(i, init)) }));
    for (const [name, args] of [['export_tools', {}], ['export_tools', { tools: ['synthetic-a'], search: {} }], ['export_tools', { search: {}, max_pages: 100 }], ['search_tools', { page: 0 }], ['get_tool', { tool: 'synthetic-a', api_key: 'not-allowed' }]]) {
      let failed = false; try { failed = Boolean((await client.callTool({ name, arguments: args })).isError); } catch { failed = true; } assert.equal(failed, true, JSON.stringify(args));
    }
  } finally { await client.close(); await endpoint.close(); }
});
test('access errors retain data_absence_confirmed=false through MCP', async () => {
  const endpoint = createEndpoint({ service: fixtureService(() => new Response(null, { status: 403 })).service });
  const client = new Client({ name: 'blocked-test', version: '1' });
  try { await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), { fetch: (i, init) => endpoint.fetch(new Request(i, init)) }));
    const r = await client.callTool({ name: 'search_tools', arguments: {} }); assert.equal(r.isError, true);
    const e = JSON.parse(r.content[0].text); assert.equal(e.error.code, 'ACCESS_BLOCKED'); assert.equal(e.data_absence_confirmed, false);
  } finally { await client.close(); await endpoint.close(); }
});
test('legacy stdio framing supports initialize, 15 tools, and real tool calls', async () => {
  const input = new PassThrough(), output = new PassThrough(), pending = new Map(); let buffer = '';
  output.on('data', b => { buffer += b.toString(); let i; while ((i = buffer.indexOf('\n')) >= 0) { const r = JSON.parse(buffer.slice(0, i)); buffer = buffer.slice(i + 1); pending.get(r.id)?.(r); } });
  const handle = serveStdio(() => createServer(fixtureService().service), { transport: new StdioServerTransport(input, output) });
  const send = msg => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('stdio timeout')), 3000); pending.set(msg.id, r => { clearTimeout(timer); resolve(r); }); input.write(JSON.stringify(msg) + '\n'); });
  try {
    const init = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'stdio-test', version: '1' } } }); assert.equal(init.result.serverInfo.name, 'futuretools-mcp');
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    assert.equal((await send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })).result.tools.length, 15);
    const call = await send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_tool', arguments: { tool: 'synthetic-a' } } }); assert.equal(call.result.structuredContent.name, 'Synthetic Alpha');
  } finally { await handle.close(); input.destroy(); output.destroy(); }
});
test('real Node HTTP server enforces Host, bearer, Origin and body size', async () => {
  const app = createNodeServer({ service: fixtureService().service, token: 'fixture-token' }); await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200); assert.equal((await fetch(`${base}/mcp`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { origin: 'https://evil.test' } })).status, 403);
    const status = await new Promise((resolve, reject) => { const req = request(`${base}/health`, { headers: { host: 'evil.test' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); }); req.on('error', reject); req.end(); }); assert.equal(status, 403);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ a: 'x'.repeat(70000) }) })).status, 413);
  } finally { await app.close(); }
});
