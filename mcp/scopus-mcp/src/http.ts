import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { hostHeaderValidation, originValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { configuredService } from './config.js';
import { createEndpoint } from './endpoint.js';
import type { ScopusService } from './service.js';
export function createNodeServer(options: { service?: ScopusService; token?: string; allowedHostnames?: string[] } = {}) {
  const endpoint = createEndpoint(options), names = options.allowedHostnames ?? ['localhost', '127.0.0.1', '[::1]'];
  const validateHost = hostHeaderValidation(names), validateOrigin = originValidation(names);
  const handler = toNodeHandler(endpoint, { maxRequestBodySize: 65536 });
  const server = createHttpServer((request, response) => {
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;
    void handler(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
      if (!response.writableEnded) response.end('{"error":"Internal server error"}');
    });
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000;
  return { server, close: async () => {
    await endpoint.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
export async function main() {
  const host = process.env.HOST ?? '127.0.0.1', port = Number(process.env.PORT ?? 8790), token = process.env.MCP_TOKEN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  let allowedHostnames: string[] | undefined;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    if (!token || token.length < 24 || !process.env.PUBLIC_URL) throw new Error('Remote hosting requires MCP_TOKEN (24+ characters) and PUBLIC_URL.');
    const url = new URL(process.env.PUBLIC_URL);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('PUBLIC_URL must be an HTTPS origin.');
    allowedHostnames = [url.hostname];
  }
  const app = createNodeServer({ service: configuredService(), token, allowedHostnames });
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(port, host, resolve); });
  console.error(`Scopus MCP listening on http://${host}:${port}/mcp`);
  const close = () => { void app.close().catch(() => { process.exitCode = 1; }); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Startup failed'); process.exitCode = 1; });
}
