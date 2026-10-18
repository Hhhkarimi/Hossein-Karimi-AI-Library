import type * as z from 'zod/v4';
import { buildQueryInput } from './contracts.js';
import { phrase, validOrcid } from './identifiers.js';
import { ScopusError } from './errors.js';
export function buildQuery(raw: unknown) {
  const input = buildQueryInput.parse(raw);
  const allowed: Record<string, string[]> = {
    authors: ['name', 'first_name', 'affiliation_name', 'author_id', 'affiliation_id', 'orcid'],
    affiliations: ['name', 'affiliation_name', 'affiliation_id'],
    documents: ['name', 'first_name', 'affiliation_name', 'author_id', 'affiliation_id', 'keywords', 'country', 'year_from', 'year_to'],
  };
  const unsupported = Object.entries(input).filter(([k, v]) => k !== 'target' && v !== undefined && !allowed[input.target]!.includes(k));
  if (unsupported.length) throw new ScopusError('INVALID_QUERY_TERM', `Fields not supported for ${input.target}: ${unsupported.map(([k]) => k).join(', ')}.`);
  const clauses: string[] = [];
  if (input.name) clauses.push(`${input.target === 'affiliations' ? 'AFFIL' : 'AUTHLASTNAME'}(${phrase(input.name)})`);
  if (input.first_name) clauses.push(`AUTHFIRST(${phrase(input.first_name)})`);
  if (input.affiliation_name) clauses.push(`AFFIL(${phrase(input.affiliation_name)})`);
  if (input.author_id) clauses.push(`AU-ID(${input.author_id})`);
  if (input.affiliation_id) clauses.push(`AF-ID(${input.affiliation_id})`);
  if (input.orcid) clauses.push(`ORCID(${validOrcid(input.orcid)})`);
  if (input.keywords) clauses.push(`TITLE-ABS-KEY(${phrase(input.keywords)})`);
  if (input.country) clauses.push(`AFFILCOUNTRY(${phrase(input.country)})`);
  if (input.year_from !== undefined) clauses.push(`PUBYEAR > ${input.year_from - 1}`);
  if (input.year_to !== undefined) clauses.push(`PUBYEAR < ${input.year_to + 1}`);
  if (!clauses.length) throw new ScopusError('INVALID_QUERY_TERM', 'Supply at least one search condition.');
  return { target: input.target, query: clauses.map(c => `(${c})`).join(' AND '), network_used: false,
    note: 'Author AFFIL/AF-ID searches can include historical affiliations. Resolve identity by Scopus ID, not by name alone.' };
}
