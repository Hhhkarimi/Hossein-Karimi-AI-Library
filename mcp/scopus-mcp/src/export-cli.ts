import { parseArgs } from 'node:util';
import { ExportStore, exportAuthorPublications } from './author-export.js';
import { configuredPublicSource } from './public-scopus.js';
import { configuredService } from './config.js';
import { errorData } from './errors.js';
const { values } = parseArgs({ options: { name: { type: 'string' }, university: { type: 'string' },
  author: { type: 'string' }, 'family-name': { type: 'string' }, 'given-name': { type: 'string' },
  'output-dir': { type: 'string' }, mode: { type: 'string', default: 'public' }, 'max-documents': { type: 'string', default: '1000' } } });
try {
  if (!values.name || !values.university || !['public', 'api'].includes(values.mode!)) throw new Error('Usage: npm run export:author -- --name "Ada Example" --university "Example University" [--author SCOPUS_ID] [--output-dir ./exports]');
  const max = Number(values['max-documents']);
  if (!Number.isInteger(max) || max < 1 || max > 1000) throw new Error('max-documents must be 1–1000.');
  const result = await exportAuthorPublications({ name: values.name, university: values.university,
    family_name: values['family-name'], given_name: values['given-name'], author: values.author,
    mode: values.mode as 'public' | 'api', max_documents: max }, configuredService(), configuredPublicSource(),
  new ExportStore(values['output-dir'] ?? process.env.SCOPUS_EXPORT_DIR ?? 'exports'));
  console.log(JSON.stringify(result, null, 2)); if (result.status !== 'exported') process.exitCode = 2;
} catch (error) {
  const detail = error instanceof Error && error.name !== 'ScopusError' ? { code: 'CLI_ERROR', message: error.message } : errorData(error);
  console.error(JSON.stringify({ error: detail, data_absence_confirmed: false })); process.exitCode = 1;
}
