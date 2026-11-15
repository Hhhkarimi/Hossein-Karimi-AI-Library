import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { Catalog } from '../dist/catalog.js';
import { advanced, clause, paging, yearInput } from '../dist/query.js';

const { values } = parseArgs({
  options: {
    year: { type: 'string' },
    out: { type: 'string' },
    query: { type: 'string' },
    'max-batches': { type: 'string', default: '10' },
    'scan-limit': { type: 'string', default: '50' }
  }
});
if (!values.year || !values.out) {
  throw new Error('Usage: npm run harvest:year -- --year 1404 --out path [--query file.json] [--max-batches 10] [--scan-limit 50]');
}
const integer = (value, max) => z.coerce.number().int().min(1).max(max).parse(value);
const maxBatches = integer(values['max-batches'], 10000);
const limit = integer(values['scan-limit'], 50);
const year = yearInput.parse(values.year);
const input = z.strictObject({
  database: z.enum(['all', 'holdings', 'national_bibliography', 'lendable']).default('holdings'),
  language: z.string().regex(/^[a-z]{3}$/).optional(),
  clauses: z.array(clause).max(2).default([])
}).parse(values.query ? JSON.parse(await readFile(values.query, 'utf8')) : {});
if (input.clauses.some(term => term.join !== 'and')) throw new Error('Use AND clauses for first-print extraction.');
const query = advanced.parse({
  ...input, publication_date: input.clauses.length ? undefined : { from: year }
});
const config = {
  year, clauses: query.clauses, database: query.database, language: query.language ?? null,
  page_size: 50, scan_limit: limit
};
const baseOptions = z.object(paging).parse({ page_size: 50 });
const directory = resolve(values.out);
const piecesDir = join(directory, 'batches');
await mkdir(piecesDir, { recursive: true });
const lockPath = join(directory, '.running');
const lock = await open(lockPath, 'wx').catch(error => {
  if (error.code === 'EEXIST') throw new Error('This directory is locked. After verifying no process is using it, remove .running to resume.');
  throw error;
});

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function writeAtomic(path, write) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  try {
    await write(temporary);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

const writeJson = (path, data) => writeAtomic(path,
  temp => writeFile(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }));
const candidateQuery = { clauses: config.clauses, database: config.database, language: config.language ?? undefined };
const first = { page: 1, start_at: 1 };
const nameOf = ({ page, start_at }) => 'page-' + page + '-position-' + start_at + '.json';
const catalog = new Catalog();
let stopped = undefined;
try {
  const manifestPath = join(directory, 'query.json');
  const oldConfig = await readJson(manifestPath);
  if (oldConfig && JSON.stringify(oldConfig) !== JSON.stringify(config)) {
    throw new Error('This output directory belongs to a different query or scan limit.');
  }
  if (!oldConfig) await writeJson(manifestPath, config);
  let cursor = first;
  let newBatches = 0;
  const paths = [];
  while (cursor) {
    const path = join(piecesDir, nameOf(cursor));
    let part = await readJson(path);
    if (!part) {
      if (newBatches >= maxBatches) break;
      try {
        part = await catalog.firstPrintings(year, candidateQuery, { ...baseOptions, page: cursor.page },
          cursor.start_at, limit, false, AbortSignal.timeout(180000));
      } catch (error) {
        stopped = { code: error.code ?? 'FAILED', message: error.message };
        break;
      }
      const transient = part.errors.find(item =>
        ['RATE_LIMITED', 'NETWORK_ERROR', 'BUSY', 'CANCELLED', 'UPSTREAM_HTTP'].includes(item.error.code));
      if (transient) {
        stopped = transient.error;
        break;
      }
      await writeJson(path, part);
      newBatches++;
      console.error(JSON.stringify({ ...cursor, scanned: part.scanned_candidates, confirmed: part.confirmed_count, errors: part.errors.length }));
    }
    paths.push(path);
    const next = part.next;
    if (next && (next.page < cursor.page || (next.page === cursor.page && next.start_at <= cursor.start_at))) {
      throw new Error('The saved batch has an invalid continuation.');
    }
    cursor = next;
  }

  let scanned = 0;
  let detailErrors = 0;
  let unverified = 0;
  const seen = new Set();
  const totals = new Set();
  async function* merge() {
    for (const path of paths) {
      const part = await readJson(path);
      totals.add(part.candidate_total);
      scanned += part.scanned_candidates;
      detailErrors += part.errors.length;
      unverified += part.unverified_count;
      for (const row of part.confirmed) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        yield JSON.stringify(row) + '\n';
      }
    }
  }
  await writeAtomic(join(directory, 'first-printings.jsonl'), path => pipeline(merge(), createWriteStream(path, { flags: 'wx' })));
  const summary = {
    config, new_batches: newBatches, saved_batches: paths.length, scanned, confirmed_unique: seen.size,
    detail_errors: detailErrors, unverified, candidate_totals_observed: [...totals], next: cursor,
    reached_end_without_observed_count_change_or_detail_error: cursor === null && totals.size === 1 &&
      totals.has(scanned) && detailErrors === 0,
    ...(stopped ? { stopped } : {})
  };
  await writeJson(join(directory, 'summary.json'), summary);
  console.log(JSON.stringify(summary));
  if (stopped) process.exitCode = 1;
} finally {
  await lock.close();
  await rm(lockPath, { force: true });
}
