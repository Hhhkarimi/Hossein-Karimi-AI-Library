import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { Catalog } from './catalog.js';
import { ExportStore } from './export.js';
import { createServer } from './server.js';

const catalog = new Catalog();
const files = new ExportStore(process.env.NLAI_EXPORT_DIR ?? 'exports');
const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 65_536 });
const handle = serveStdio(() => createServer(catalog, files), { transport });
process.once('SIGINT', () => { void handle.close(); });
process.once('SIGTERM', () => { void handle.close(); });
