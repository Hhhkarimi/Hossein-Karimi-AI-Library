import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';
import { FutureToolsService } from './service.js';
import { ExportStore } from './export.js';
const service = new FutureToolsService(), exports = new ExportStore(process.env.FUTURETOOLS_EXPORT_DIR ?? 'exports');
const handle = serveStdio(() => createServer(service, { exports }), { transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 65536 }) });
process.once('SIGINT', () => { void handle.close(); }); process.once('SIGTERM', () => { void handle.close(); });
