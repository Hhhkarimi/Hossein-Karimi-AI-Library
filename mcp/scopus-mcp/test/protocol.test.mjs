import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { request as httpRequest } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createEndpoint } from '../dist/endpoint.js';
import { createNodeServer } from '../dist/http.js';
import { createServer, TOOL_NAMES } from '../dist/server.js';
import { ScopusService } from '../dist/service.js';
import { ScopusClient } from '../dist/client.js';
import { AUTHOR_A, AUTHOR_B, AFFIL_A, AFFIL_B, DOC_A, fixtureService } from './fixtures.mjs';
const inputs = {
  scopus_status: {}, check_scopus_access: {}, build_scopus_query: { target: 'authors', name: 'Example' },
  search_authors: { query: 'AUTHLASTNAME(Example)' }, author_profile: { author: AUTHOR_A },
  author_metrics: { author: AUTHOR_A }, author_affiliations: { author: AUTHOR_A },
  author_documents: { author: AUTHOR_A }, author_coauthors: { author: AUTHOR_A }, author_citing_documents: { author: AUTHOR_A },
  search_affiliations: { query: 'AFFIL(Example)' }, affiliation_profile: { affiliation: AFFIL_A },
  affiliation_authors: { affiliation: AFFIL_A }, affiliation_documents: { affiliation: AFFIL_A },
  compare_authors: { profiles: [AUTHOR_A, AUTHOR_B] }, compare_affiliations: { profiles: [AFFIL_A, AFFIL_B] },
  get_profiles_batch: { profile_type: 'author', profiles: [AUTHOR_A, AUTHOR_B] },
  publication_trend: { entity_type: 'author', entity: AUTHOR_A, year_from: 2024, year_to: 2025 },
  search_documents: { query: 'TITLE(test)' }, document_details: { identifier: DOC_A },
  document_references: { identifier: DOC_A }, document_citing: { eid: `2-s2.0-${DOC_A}` },
  search_facets: { query: 'TITLE(test)' }, search_journals: { title: 'Synthetic' }, subject_areas: {},
  export_documents: { scopus_ids: [DOC_A], format: 'bibtex' },
  export_author_publications: { name: 'Ada Example', university: 'Example University', author: AUTHOR_A, mode: 'api', max_documents: 1 },
};
test('official SDK client invokes all 27 tools through Streamable HTTP using synthetic data', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service });
  const client = new Client({ name: 'test-client', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), {
      fetch: (input, init) => endpoint.fetch(new Request(input, init)),
    }));
    const tools = await client.listTools(); assert.deepEqual(tools.tools.map(t => t.name), [...TOOL_NAMES]);
    assert.equal(tools.tools.length, 27); assert.ok(tools.tools.filter(t => t.name !== 'export_author_publications').every(t => t.annotations.readOnlyHint));
    for (const [name, args] of Object.entries(inputs)) {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`); assert.ok(result.structuredContent);
    }
  } finally { await client.close(); await endpoint.close(); }
});
test('missing-key tool errors say access/configuration failure, never data absence', async () => {
  const endpoint = createEndpoint({ service: new ScopusService(new ScopusClient()) });
  try {
    const response = await endpoint.fetch(new Request('http://127.0.0.1/mcp', { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'author_profile', arguments: { author: AUTHOR_A } } }) }));
    const body = await response.text(); const data = JSON.parse(body.startsWith('event:') ? body.split('\n').find(l => l.startsWith('data:')).slice(5) : body);
    assert.equal(data.result.isError, true);
    const error = JSON.parse(data.result.content[0].text);
    assert.equal(error.error.code, 'SCOPUS_API_KEY_REQUIRED'); assert.equal(error.data_absence_confirmed, false);
  } finally { await endpoint.close(); }
});
test('stdio JSON framing supports 2025 initialize, listing and tool calls', async () => {
  const input = new PassThrough(), output = new PassThrough(); let buffer = ''; const pending = new Map();
  output.on('data', chunk => { buffer += chunk.toString(); let i;
    while ((i = buffer.indexOf('\n')) >= 0) { const msg = JSON.parse(buffer.slice(0, i)); buffer = buffer.slice(i + 1); pending.get(msg.id)?.(msg); }
  });
  const handle = serveStdio(() => createServer(fixtureService().service), { transport: new StdioServerTransport(input, output) });
  const send = message => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stdio timeout')), 3000);
    pending.set(message.id, value => { clearTimeout(timer); resolve(value); }); input.write(`${JSON.stringify(message)}\n`);
  });
  try {
    const init = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    assert.equal(init.result.serverInfo.name, 'scopus-profiles-mcp');
    input.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
    assert.equal((await send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })).result.tools.length, 27);
    const call = await send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'author_profile', arguments: { author: AUTHOR_A } } });
    assert.equal(call.result.structuredContent.metrics.h_index, 8);
  } finally { await handle.close(); input.destroy(); output.destroy(); }
});
test('Node HTTP guards Host, Origin, bearer token and body size', async () => {
  const app = createNodeServer({ service: fixtureService().service, token: 'fixture-http-token' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const hostStatus = await new Promise((resolve, reject) => {
      const req = httpRequest(`${base}/health`, { headers: { host: 'evil.test' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.end();
    });
    assert.equal(hostStatus, 403);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { origin: 'https://evil.test' } })).status, 403);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { authorization: 'Bearer fixture-http-token', 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ payload: 'a'.repeat(70000) }) })).status, 413);
  } finally { await app.close(); }
});
test('tool schemas reject unknown fields, excessive counts, duplicate-only comparisons and long trends', async () => {
  const endpoint = createEndpoint({ service: fixtureService().service });
  const client = new Client({ name: 'invalid-test', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), { fetch: (i, init) => endpoint.fetch(new Request(i, init)) }));
    for (const [name, args] of [['search_authors', { query: 'x', count: 2000 }], ['author_profile', { author: AUTHOR_A, apiKey: 'not allowed' }],
      ['publication_trend', { entity_type: 'author', entity: AUTHOR_A, year_from: 2000, year_to: 2026 }]]) {
      let failed = false;
      try { failed = Boolean((await client.callTool({ name, arguments: args })).isError); } catch { failed = true; }
      assert.equal(failed, true);
    }
    assert.equal((await client.callTool({ name: 'compare_authors', arguments: { profiles: [AUTHOR_A, AUTHOR_A] } })).isError, true);
  } finally { await client.close(); await endpoint.close(); }
});
