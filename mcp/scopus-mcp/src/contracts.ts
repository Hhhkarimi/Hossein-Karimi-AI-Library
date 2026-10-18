import * as z from 'zod/v4';
export const objectSchema = z.record(z.string(), z.unknown());
export const oneOrMany = z.union([objectSchema, z.array(objectSchema)]);
const numericValue = z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]);
export const searchResponseSchema = z.object({ 'search-results': z.looseObject({
  'opensearch:totalResults': numericValue,
  'opensearch:startIndex': numericValue.optional(),
  'opensearch:itemsPerPage': numericValue.optional(),
  entry: oneOrMany.nullish(), link: oneOrMany.nullish(), facets: z.unknown().optional(),
  cursor: objectSchema.optional(),
}) });
export const authorResponseSchema = z.object({ 'author-retrieval-response': oneOrMany });
export const affiliationResponseSchema = z.object({ 'affiliation-retrieval-response': oneOrMany });
export const abstractResponseSchema = z.object({ 'abstracts-retrieval-response': objectSchema });
export const serialResponseSchema = z.object({ 'serial-metadata-response': z.looseObject({ entry: oneOrMany.nullish() }) });
export const subjectResponseSchema = z.object({ 'subject-classifications': z.looseObject({ 'subject-classification': oneOrMany.nullish() }) });
export const query = z.string().trim().min(1).max(2000);
export const reference = z.string().trim().min(1).max(600);
export const offset = z.number().int().min(0).max(4999).default(0);
export const count = z.number().int().min(1).max(25).default(10);
export const profileView = z.enum(['AUTO', 'LIGHT', 'STANDARD', 'ENHANCED', 'METRICS']).default('AUTO');
export const affiliationView = z.enum(['AUTO', 'LIGHT', 'STANDARD']).default('AUTO');
export const documentView = z.enum(['META', 'META_ABS', 'FULL']).default('META_ABS');
export const documentType = z.enum(['scopus_id', 'eid', 'doi', 'pubmed_id']).default('scopus_id');
export const documentSort = z.enum(['relevance', 'newest', 'oldest', 'citations_desc']).default('relevance');
export const authorSort = z.enum(['name', 'documents_desc']).default('name');
export const affiliationSort = z.enum(['relevance', 'name', 'documents_desc']).default('relevance');
export const documentSearchInput = z.strictObject({ query, start: offset, count, sort: documentSort,
  view: z.enum(['STANDARD', 'COMPLETE']).default('STANDARD'),
  cursor: z.string().min(1).max(2000).optional().describe('Cursor token returned by Scopus, or * to start. Do not combine with start > 0.'),
}).refine(x => !x.cursor || x.start === 0, { message: 'Cursor pagination requires start=0.' });
export const documentRefInput = z.strictObject({ identifier: reference, identifier_type: documentType, view: documentView });
export const buildQueryInput = z.strictObject({
  target: z.enum(['authors', 'affiliations', 'documents']),
  name: z.string().trim().min(1).max(200).optional(),
  first_name: z.string().trim().min(1).max(100).optional(),
  affiliation_name: z.string().trim().min(1).max(200).optional(),
  author_id: z.string().regex(/^\d{1,20}$/).optional(),
  affiliation_id: z.string().regex(/^\d{1,20}$/).optional(),
  orcid: reference.optional(),
  keywords: z.string().trim().min(1).max(300).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  year_from: z.number().int().min(1500).max(2200).optional(),
  year_to: z.number().int().min(1500).max(2200).optional(),
}).refine(x => !x.year_from || !x.year_to || x.year_from <= x.year_to, { message: 'Invalid year range.' });
