import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { createNodeServer } from '../dist/http.js';
import { configuredService } from '../dist/config.js';
import { TOOL_NAMES } from '../dist/server.js';
const report = { started_at: new Date().toISOString(), source: 'Scopus/Elsevier', checks: [],
  profile_api_validation: 'not_run', data_absence_confirmed: false };
const client = new Client({ name: 'scopus-live-verifier', version: '0.2.0' });
let app;
try {
  let transport;
  if (process.argv.includes('--stdio')) {
    transport = new StdioClientTransport({ command: process.execPath,
      args: [fileURLToPath(new URL('../dist/stdio.js', import.meta.url))],
      env: Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === 'string')), stderr: 'inherit' });
  } else {
    let url = process.env.MCP_URL;
    if (!url) {
      app = createNodeServer({ service: configuredService() });
      await new Promise((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
      url = `http://127.0.0.1:${app.server.address().port}/mcp`;
    }
    transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: process.env.MCP_TOKEN ? { authorization: `Bearer ${process.env.MCP_TOKEN}` } : {} },
    });
  }
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(new Set(tools.tools.map(t => t.name)), new Set(TOOL_NAMES));
  report.checks.push({ name: 'protocol_and_tools', passed: true, count: tools.tools.length });
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (result.isError) {
      const error = JSON.parse(result.content.find(c => c.type === 'text').text).error;
      const failure = new Error(`${name}: ${error.code}: ${error.message}`); failure.code = error.code; throw failure;
    }
    report.checks.push({ name, passed: true });
    return result.structuredContent ?? JSON.parse(result.content.find(c => c.type === 'text').text);
  }
  const status = await call('scopus_status', {});
  const subjects = await call('subject_areas', { count: 10 });
  assert.ok(subjects.items.length > 0); assert.ok(subjects.items.every(s => s.code && s.name));
  await call('build_scopus_query', { target: 'authors', name: 'Smith' });
  if (!status.api_key_configured) {
    const response = await client.callTool({ name: 'author_profile', arguments: { author: '7202909704' } });
    assert.equal(response.isError, true);
    const error = JSON.parse(response.content.find(c => c.type === 'text').text);
    assert.equal(error.error.code, 'SCOPUS_API_KEY_REQUIRED'); assert.equal(error.data_absence_confirmed, false);
    report.checks.push({ name: 'missing_key_is_not_missing_profile', passed: true });
    report.profile_api_validation = 'not_run_no_key';
    report.note = 'Protocol and the public subject endpoint passed. Researcher/university APIs were NOT live-validated; no key was configured.';
  } else {
    const authorId = process.env.SCOPUS_TEST_AUTHOR_ID ?? '7202909704';
    const affiliationId = process.env.SCOPUS_TEST_AFFILIATION_ID ?? '60016849';
    const author = await call('author_profile', { author: authorId });
    const affiliation = await call('affiliation_profile', { affiliation: affiliationId });
    assert.ok(author.id && affiliation.id);
    await call('author_metrics', { author: authorId });
    await call('author_affiliations', { author: authorId });
    report.profile_api_validation = 'author_and_affiliation_reads_passed';
    report.profile_views = { author: author.view_attempts, affiliation: affiliation.view_attempts };
    if (process.argv.includes('--full')) {
      await call('check_scopus_access', {});
      await call('search_authors', { query: `AU-ID(${author.id})`, count: 1 });
      await call('search_affiliations', { query: `AF-ID(${affiliation.id})`, count: 1 });
      await call('author_coauthors', { author: authorId, count: 1 });
      await call('affiliation_authors', { affiliation: affiliationId, count: 1 });
      await call('affiliation_documents', { affiliation: affiliationId, count: 1 });
      await call('publication_trend', { entity_type: 'author', entity: authorId, year_from: 2024, year_to: 2025 });
      const documents = await call('author_documents', { author: authorId, count: 1 });
      if (documents.items[0]?.id) {
        const id = documents.items[0].id;
        await call('document_details', { identifier: id });
        await call('document_references', { identifier: id, count: 1 });
        await call('document_citing', { eid: `2-s2.0-${id}`, count: 1 });
        await call('export_documents', { scopus_ids: [id], format: 'bibtex' });
      }
    }
    report.note = 'Only the checks listed here were live-validated. This does not establish every API/view entitlement.';
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error instanceof Error ? error.message : String(error);
  report.error_code = error.code; process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined); if (app) await app.close();
  report.finished_at = new Date().toISOString();
  if (process.env.VERIFY_REPORT) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(process.env.VERIFY_REPORT, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
}
