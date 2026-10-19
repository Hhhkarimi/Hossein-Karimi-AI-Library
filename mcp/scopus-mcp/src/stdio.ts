import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { configuredService } from './config.js';
import { createServer } from './server.js';
import { ExportStore } from './author-export.js';
const service = configuredService();
const exports = new ExportStore(process.env.SCOPUS_EXPORT_DIR ?? 'exports');
const handle = serveStdio(() => createServer(service, { exportStore: exports }), {
  transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 65536 }),
});
process.once('SIGINT', () => { void handle.close(); });
process.once('SIGTERM', () => { void handle.close(); });
