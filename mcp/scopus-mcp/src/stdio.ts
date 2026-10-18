import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { configuredService } from './config.js';
import { createServer } from './server.js';
const service = configuredService();
const handle = serveStdio(() => createServer(service), {
  transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 65536 }),
});
process.once('SIGINT', () => { void handle.close(); });
process.once('SIGTERM', () => { void handle.close(); });
