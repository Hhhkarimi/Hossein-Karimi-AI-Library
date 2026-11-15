import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { hostHeaderValidation, originValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { Catalog } from './catalog.js';
import { ExportStore } from './export.js';
import { createServer, version } from './server.js';

export function createNodeServer(catalog = new Catalog()) {
  const files = new ExportStore();
  const handler = createMcpHandler(context => {
    const baseUrl = context.requestInfo ? new URL(context.requestInfo.url).origin : undefined;
    return createServer(catalog, files, baseUrl);
  }, { maxRequestBodySize: 65_536 });
  const hosts = ['127.0.0.1', 'localhost', '[::1]'];
  const checkHost = hostHeaderValidation(hosts);
  const checkOrigin = originValidation(hosts);
  const handle = toNodeHandler({
    fetch: async (request: Request) => {
      const url = new URL(request.url);
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
      if (url.pathname === '/health' && request.method === 'GET') return Response.json({ status: 'ok', version });
      if (url.pathname === '/mcp') return handler.fetch(request);
      const id = url.pathname.match(/^\/exports\/([0-9a-f-]{36})$/)?.[1];
      if (!id || request.method !== 'GET') return Response.json({ error: 'Not found' }, { status: 404 });
      const file = files.get(id);
      if (!file) return Response.json({ error: 'Export expired or not found' }, { status: 404 });
      return new Response(new Uint8Array(file.bytes), { headers: {
        'content-type': file.mime, 'content-disposition': `attachment; filename="${file.filename}"`,
        'cache-control': 'no-store', 'x-content-type-options': 'nosniff'
      } });
    }
  }, { maxRequestBodySize: 65_536 });
  const server = createHttpServer((request, response) => {
    if (!checkHost(request, response) || !checkOrigin(request, response)) return;
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
      if (!response.writableEnded) response.end('{"error":"Internal server error"}');
    });
  });
  server.requestTimeout = 60_000;
  server.headersTimeout = 10_000;
  return {
    server,
    async close() {
      await handler.close();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}

async function main() {
  const port = Number(process.env.PORT ?? 8793);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const app = createNodeServer();
  await new Promise<void>((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(port, '127.0.0.1', resolve);
  });
  console.error(`NLAI MCP listening on http://127.0.0.1:${port}/mcp`);
  const stop = () => { void app.close().catch(() => { process.exitCode = 1; }); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
