import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer, TOOL_NAMES, VERSION } from './server.js';
import { ScopusService } from './service.js';
import { ExportStore, XLSX_MIME, type PublicSource } from './author-export.js';
import { configuredPublicSource } from './public-scopus.js';
export function createEndpoint(options: { service?: ScopusService; token?: string; publicSource?: PublicSource } = {}) {
  const service = options.service ?? new ScopusService();
  const exports = new ExportStore();
  const publicSource = options.publicSource ?? configuredPublicSource();
  // Set from the actual request origin; never trust a tool argument as a download host.
  const handler = createMcpHandler(request => createServer(service, { publicSource,
    exportStore: exports, downloadBaseUrl: request.requestInfo ? new URL(request.requestInfo.url).origin : undefined }), { maxRequestBodySize: 65536 });
  return {
    close: async () => { exports.clear(); await handler.close(); },
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') return Response.json({ status: 'ok', version: VERSION });
      if (request.method === 'GET' && url.pathname === '/') return Response.json({ name: 'scopus-profiles-mcp', version: VERSION,
        endpoint: '/mcp', transport: 'Streamable HTTP', scopus_read_only: true, creates_exports: true, data_source: 'Scopus', tools: TOOL_NAMES });
      if (url.pathname !== '/mcp' && !url.pathname.startsWith('/exports/')) return Response.json({ error: 'Not found' }, { status: 404 });
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
      if (options.token && request.headers.get('authorization') !== `Bearer ${options.token}`) return Response.json({ error: 'Unauthorized' },
        { status: 401, headers: { 'www-authenticate': 'Bearer realm="scopus-mcp"' } });
      if (url.pathname.startsWith('/exports/')) {
        const id = /^\/exports\/([a-f0-9-]{36})$/.exec(url.pathname)?.[1], file = id ? exports.get(id) : undefined;
        if (!file) return Response.json({ error: 'Export expired or not found' }, { status: 404 });
        if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
        return new Response(new Uint8Array(file.bytes), { headers: { 'content-type': XLSX_MIME,
          'content-disposition': `attachment; filename="${file.filename}"`, 'cache-control': 'no-store',
          'x-content-type-options': 'nosniff' } });
      }
      try { return await handler.fetch(request); }
      catch { return Response.json({ error: 'Internal server error' }, { status: 500 }); }
    },
  };
}
