import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { hostHeaderValidation, originValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { createEndpoint, type EndpointOptions } from './endpoint.js';
export function createNodeServer(options: EndpointOptions & { allowedHostnames?: string[] } = {}) {
  const endpoint = createEndpoint(options), names = options.allowedHostnames ?? ['localhost', '127.0.0.1', '[::1]'];
  const validateHost = hostHeaderValidation(names), validateOrigin = originValidation(names), handle = toNodeHandler(endpoint, { maxRequestBodySize: 65536 });
  const server = createHttpServer((request, response) => {
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;
    void handle(request, response).catch(() => { if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
      if (!response.writableEnded) response.end('{"error":"Internal server error"}'); });
  });
  server.requestTimeout = 60000; server.headersTimeout = 10000;
  return { server, close: async () => { await endpoint.close(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); } };
}
export async function main() {
  const host = process.env.HOST ?? '127.0.0.1', port = Number(process.env.PORT ?? 8792), token = process.env.MCP_TOKEN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535.');
  let names: string[] | undefined, publicUrl: string | undefined;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    if (!token || token.length < 24 || !process.env.PUBLIC_URL) throw new Error('Remote hosting requires MCP_TOKEN (24+ characters) and HTTPS PUBLIC_URL.');
    const url = new URL(process.env.PUBLIC_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('PUBLIC_URL must be an HTTPS origin, without credentials/path/query.');
    names = [url.hostname]; publicUrl = url.origin;
  }
  const app = createNodeServer({ token, allowedHostnames: names, publicUrl });
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(port, host, resolve); });
  console.error(`FutureTools MCP listening on http://${host}:${port}/mcp`);
  const shutdown = () => { void app.close().catch(() => { process.exitCode = 1; }); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : 'Startup failed'); process.exitCode = 1; });
