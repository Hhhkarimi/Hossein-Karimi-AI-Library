import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { request as httpRequest } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createEndpoint } from '../dist/endpoint.js';
import { createServer, TOOL_NAMES } from '../dist/server.js';
import { createNodeServer } from '../dist/http.js';
import worker from '../dist/worker.js';
import { A, B, fixtureService } from './fixtures.mjs';

test('official SDK client connects over HTTP and invokes every registered tool', async () => {
  const { service } = fixtureService();
  const endpoint = createEndpoint({ service });
  const client = new Client({ name: 'torob-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), {
    fetch: (input, init) => endpoint.fetch(new Request(input, init)),
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(t => t.name), [...TOOL_NAMES]);
    assert.ok(tools.tools.every(t => t.annotations.readOnlyHint));
    for (const [name, args] of [
      ['search_torob', { query: 'phone' }], ['torob_suggest', { query: 'phone' }],
      ['search_filters', { query: 'phone' }], ['browse_category', { category_id: 94 }],
      ['product_details', { product: A }], ['product_sellers', { product: A }],
      ['similar_products', { product: A }], ['get_products_batch', { products: [A, B] }],
      ['compare_products', { products: [A, B] }], ['find_cheapest', { query: 'phone', pages: 1 }],
    ]) {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`);
      assert.ok(result.structuredContent);
    }
  } finally { await client.close(); await endpoint.close(); }
});
test('HTTP supports 2025 initialization and tool errors keep a machine-readable code', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service });
  const request = body => endpoint.fetch(new Request('http://127.0.0.1/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  }));
  const readRpc = async response => {
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const body = await response.text();
      return JSON.parse(body.split('\n').find(line => line.startsWith('data:')).slice(5));
    }
    return response.json();
  };
  try {
    const init = await request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-test', version: '1' },
    } });
    assert.equal((await readRpc(init)).result.protocolVersion, '2025-11-25');
    const result = await readRpc(await request({ jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'product_details', arguments: { product: 'https://evil.test' } } }));
    assert.equal(result.result.isError, true);
    assert.equal(JSON.parse(result.result.content[0].text).error.code, 'INVALID_PRODUCT');
    const invalid = await readRpc(await request({ jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'search_torob', arguments: { query: 'phone', limit: 999 } } }));
    assert.ok(invalid.error || invalid.result?.isError);
  } finally { await endpoint.close(); }
});
test('stdio transport emits parseable JSON lines and handles initialize/list/call', async () => {
  const input = new PassThrough(), output = new PassThrough();
  const received = [], waiting = new Map();
  let buffered = '';
  output.on('data', chunk => {
    buffered += chunk.toString();
    let index;
    while ((index = buffered.indexOf('\n')) >= 0) {
      const message = JSON.parse(buffered.slice(0, index)); buffered = buffered.slice(index + 1);
      received.push(message); waiting.get(message.id)?.(message);
    }
  });
  const handle = serveStdio(() => createServer(fixtureService().service), {
    transport: new StdioServerTransport(input, output, { maxBufferSize: 65536 }),
  });
  const send = message => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('stdio response timeout')), 3000);
    waiting.set(message.id, value => { clearTimeout(timeout); resolve(value); });
    input.write(`${JSON.stringify(message)}\n`);
  });
  try {
    const init = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'stdio-test', version: '1' },
    } });
    assert.equal(init.result.serverInfo.name, 'torob-mcp');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const tools = await send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    assert.equal(tools.result.tools.length, 10);
    const call = await send({ jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'search_torob', arguments: { query: 'سامسونگ' } } });
    assert.ok(!call.result.isError); assert.equal(received.length, 3);
  } finally { await handle.close(); input.destroy(); output.destroy(); }
});
test('Node listener rejects foreign Host/Origin, requires configured bearer and caps body size', async () => {
  const app = createNodeServer({ service: fixtureService().service, token: 'test-token' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    const status = await new Promise((resolve, reject) => {
      const request = httpRequest(`${url}/health`, { headers: { host: 'evil.test' } }, response => {
        response.resume(); response.on('end', () => resolve(response.statusCode));
      });
      request.on('error', reject); request.end();
    });
    assert.equal(status, 403);
    assert.equal((await fetch(`${url}/mcp`, { headers: { origin: 'https://evil.test' } })).status, 403);
    assert.equal((await fetch(`${url}/mcp`, { method: 'POST' })).status, 401);
    const large = await fetch(`${url}/mcp`, { method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json',
        accept: 'application/json, text/event-stream' }, body: JSON.stringify({ data: 'x'.repeat(70000) }) });
    assert.equal(large.status, 413);
  } finally { await app.close(); }
});
test('Worker entry requires a secret and serves metadata when configured', async () => {
  assert.equal((await worker.fetch(new Request('https://worker.example/mcp'), {})).status, 503);
  const env = { MCP_TOKEN: 'a'.repeat(32) };
  assert.equal((await worker.fetch(new Request('https://worker.example/health'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://worker.example/mcp', { method: 'POST' }), env)).status, 401);
});
