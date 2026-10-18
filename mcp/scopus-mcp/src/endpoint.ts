import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer, TOOL_NAMES, VERSION } from './server.js';
import { ScopusService } from './service.js';
export function createEndpoint(options: { service?: ScopusService; token?: string } = {}) {
  const service = options.service ?? new ScopusService();
  const handler = createMcpHandler(() => createServer(service), { maxRequestBodySize: 65536 });
  return {
    close: () => handler.close(),
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') return Response.json({ status: 'ok', version: VERSION });
      if (request.method === 'GET' && url.pathname === '/') return Response.json({ name: 'scopus-profiles-mcp', version: VERSION,
        endpoint: '/mcp', transport: 'Streamable HTTP', read_only: true, data_source: 'Scopus', tools: TOOL_NAMES });
      if (url.pathname !== '/mcp') return Response.json({ error: 'Not found' }, { status: 404 });
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
      if (options.token && request.headers.get('authorization') !== `Bearer ${options.token}`) return Response.json({ error: 'Unauthorized' },
        { status: 401, headers: { 'www-authenticate': 'Bearer realm="scopus-mcp"' } });
      try { return await handler.fetch(request); }
      catch { return Response.json({ error: 'Internal server error' }, { status: 500 }); }
    },
  };
}
