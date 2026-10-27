import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer, TOOL_NAMES, VERSION } from './server.js';
import { FutureToolsService } from './service.js';
import { ExportStore } from './export.js';
export type EndpointOptions = { service?: FutureToolsService; token?: string; publicUrl?: string };
export function createEndpoint(options: EndpointOptions = {}) {
  const service = options.service ?? new FutureToolsService(), exports = new ExportStore();
  const handler = createMcpHandler(context => createServer(service, { exports,
    downloadBaseUrl: options.publicUrl ?? (context.requestInfo ? new URL(context.requestInfo.url).origin : undefined) }), { maxRequestBodySize: 65536 });
  return {
    close: async () => { exports.clear(); await handler.close(); },
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') return Response.json({ status: 'ok', version: VERSION });
      if (request.method === 'GET' && url.pathname === '/') return Response.json({ name: 'futuretools-mcp', version: VERSION,
        endpoint: '/mcp', tools: TOOL_NAMES, source: 'FutureTools public website', api_key_required: false, creates_local_exports: true });
      if (url.pathname !== '/mcp' && !url.pathname.startsWith('/exports/')) return Response.json({ error: 'Not found' }, { status: 404 });
      const origin = request.headers.get('origin'), publicOrigin = options.publicUrl ? new URL(options.publicUrl).origin : url.origin;
      if (origin && origin !== publicOrigin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
      if (options.token && request.headers.get('authorization') !== `Bearer ${options.token}`) return Response.json({ error: 'Unauthorized' },
        { status: 401, headers: { 'www-authenticate': 'Bearer realm="futuretools-mcp"' } });
      if (url.pathname.startsWith('/exports/')) {
        const id = /^\/exports\/([a-f0-9-]{36})$/.exec(url.pathname)?.[1], file = id ? exports.get(id) : undefined;
        if (!file) return Response.json({ error: 'Export expired or not found' }, { status: 404 });
        if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
        return new Response(new Uint8Array(file.bytes), { headers: { 'content-type': file.mime, 'content-disposition': `attachment; filename="${file.filename}"`,
          'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
      }
      if (!['GET', 'POST', 'DELETE'].includes(request.method)) return new Response(null, { status: 405, headers: { allow: 'GET, POST, DELETE' } });
      try { return await handler.fetch(request); } catch { return Response.json({ error: 'Internal server error' }, { status: 500 }); }
    },
  };
}
