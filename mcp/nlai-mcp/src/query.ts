import { z } from 'zod';

export const origin = 'https://opac.nlai.ir';
export const catalogPath = '/opac-prod/';
export const paths = {
  form: 'search/bibliographicAdvancedSearch.do',
  advanced: 'search/bibliographicAdvancedSearchProcess.do',
  multiForm: 'search/bibliographicMultifieldSearch.do',
  multi: 'search/bibliographicMultifieldSearchProcess.do',
  brief: 'search/briefListSearch.do'
} as const;

export const indexes = {
  all: '', title: '220885', creator: '220901', subject: '220909',
  corporate_body: '221107', publication: '10070', publication_date: '10080',
  classification: '10300', call_number: '10310', series: '220924',
  isbn_issn: '221091', article_source: '10320', document_number: '10330',
  note: '10340', other: '12730', material_designation: '11700',
  special_collection: '12000', description_level: '12590', donor: '12720'
} as const;

export const databases = { all: '', holdings: 'holding', national_bibliography: 'nli', lendable: 'lendable' } as const;
export const materialTypes = {
  all: '', book: 'BF', document: 'DF', article: 'AF', audiovisual: 'VF',
  cartographic: 'CF', object: 'EF', thesis: 'TF', lithograph: 'LF', latin_serial: 'PL',
  manuscript: 'MF', oral_history: 'HF', other_print: 'OF', serial: 'PF', letterpress: 'YF'
} as const;
const sortKeys = {
  none: 'sortkey_', title: 'sortkey_title', creator: 'sortkey_author',
  publisher: 'sortkey_publisher', publication_year: 'sortkey_publishDate',
  publication_place: 'sortkey_publishPlace', lc: 'sortkey_lc', dewey: 'sortkey_dewey',
  call_number: 'sortkey_callnumber', subject: 'sortkey_subject', document_number: 'sortkey_docno'
} as const;
const calendarCodes = {
  catalog_default: '', solar_hijri: '5', yazdegerdi: '6', lunar_hijri: 'ق',
  gregorian: 'م', imperial: '4', bce: '8', before_hijra: '7'
} as const;
const catalogingCodes = { all: '', fipa: '2', in_process: '1', incomplete: '3' } as const;
const booleanCodes = { and: '0', or: '1', except: '2' } as const;
const queryText = z.string().trim().min(1).max(300);
export const sort = z.enum(sortKeysForSchema()).default('none');
function sortKeysForSchema() {
  return Object.keys(sortKeys) as [keyof typeof sortKeys, ...(keyof typeof sortKeys)[]];
}
export const paging = {
  page: z.number().int().min(1).max(9999).default(1),
  page_size: z.union([z.literal(15), z.literal(25), z.literal(35), z.literal(50)]).default(15),
  sort,
  secondary_sort: sort
};

export function digits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, ch => String(ch.charCodeAt(0) % 16));
}

export function persianDigits(value: string): string {
  return digits(value).replace(/[0-9]/g, ch => '۰۱۲۳۴۵۶۷۸۹'[Number(ch)]!);
}

export const yearInput = z.union([z.string(), z.number().int()])
  .transform(value => digits(String(value).trim()))
  .pipe(z.string().regex(/^\d{4}$/, 'Use a four-digit year'));

const publicationDate = z.object({
  operator: z.enum(['eq', 'between', 'gt', 'lt']).default('eq'),
  from: yearInput,
  to: yearInput.optional(),
  calendar: z.enum(Object.keys(calendarCodes) as [keyof typeof calendarCodes]).default('catalog_default'),
  digit_style: z.enum(['persian', 'latin']).default('persian')
}).strict().refine(date => date.operator === 'between'
  ? date.to !== undefined && date.from <= date.to
  : date.to === undefined, 'Use a valid to year only with between');

const field = z.enum(Object.keys(indexes) as [keyof typeof indexes]);
export const clause = z.object({
  field: field.default('all'),
  value: queryText,
  match: z.enum(['words', 'exact']).default('words'),
  join: z.enum(['and', 'or', 'except']).default('and')
}).strict();

const filters = {
  material: z.enum(Object.keys(materialTypes) as [keyof typeof materialTypes]).default('book'),
  database: z.enum(Object.keys(databases) as [keyof typeof databases]).default('all'),
  language: z.string().regex(/^[a-z]{3}$/).optional(),
  cataloging: z.enum(Object.keys(catalogingCodes) as [keyof typeof catalogingCodes]).default('all'),
  gmd: z.string().max(300).refine(value => value.trim().length > 0).optional(),
  publication_date: publicationDate.optional()
};
export const advanced = z.object({
  clauses: z.array(clause).max(3).default([]),
  ...filters
}).strict().refine(query => query.clauses.length > 0 || query.publication_date?.operator === 'eq',
  'Provide at least one clause or an exact publication year')
  .refine(query => query.clauses[0]?.join === undefined || query.clauses[0]?.join === 'and',
    'join connects a clause to the preceding clause')
  .refine(query => query.clauses.length > 0 || query.publication_date?.calendar === 'catalog_default',
    'For a calendar filter supply a search clause. Year-only searches use the date index.');

export const multiIndexes = ['title', 'creator', 'subject', 'publication', 'publication_date', 'classification', 'isbn_issn'] as const;
const multiTerm = z.object({ value: queryText, match: z.enum(['words', 'exact']).default('words') }).strict();
export const multifield = z.object({
  fields: z.partialRecord(z.enum(multiIndexes), multiTerm).refine(values => Object.keys(values).length > 0,
    'Supply at least one of the seven fields'),
  operator: z.enum(['and', 'or', 'except']).default('and'),
  direction: z.enum(['top_down', 'bottom_up']).default('bottom_up'),
  ...filters
}).strict();

export const lookup = z.string().trim().min(1).max(240).transform((value, ctx) => {
  let id = digits(value);
  if (!/^\d+$/.test(id)) {
    try {
      const url = new URL(value);
      if (url.hostname !== 'opac.nlai.ir' || !['http:', 'https:'].includes(url.protocol) ||
          url.username || url.password || url.port) throw new Error();
      const path = url.pathname.replace(/;jsessionid=[a-z\d]+/ig, '');
      if (path === catalogPath + paths.brief && url.searchParams.get('command') === 'FULL_VIEW') {
        id = digits(url.searchParams.get('id') ?? '');
      } else {
        id = digits(decodeURIComponent(path.match(/^\/opac-prod\/bibliographic\/([^/]+)\/?$/)?.[1] ?? ''));
      }
    } catch { id = ''; }
  }
  if (!/^\d{1,12}$/.test(id) || /^0+$/.test(id)) {
    ctx.addIssue({ code: 'custom', message: 'Supply an NLAI bibliographic ID or public record URL' });
    return z.NEVER;
  }
  return id.replace(/^0+/, '');
});

export function canonicalRecord(id: string) {
  return origin + catalogPath + 'bibliographic/' + id;
}

export function isbnDigits(value: string): string {
  return digits(value).toUpperCase().replace(/[\s\p{Pd}\u00ad\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '');
}

export function isbnValid(value: string): boolean {
  if (/^97[89]\d{10}$/.test(value)) {
    return [...value].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    return [...value].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
  }
  return false;
}

export function isbnKey(value: string): string {
  if (value.length !== 10) return value;
  const body = '978' + value.slice(0, 9);
  const total = [...body].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0);
  return body + ((10 - total % 10) % 10);
}

export function isbnForms(value: string): string[] {
  const key = isbnKey(value);
  if (!key.startsWith('978')) return [value];
  const body = key.slice(3, 12);
  const total = [...body].reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const digit = (11 - total % 11) % 11;
  return [...new Set([value, key, body + (digit === 10 ? 'X' : digit)])];
}

export const isbnInput = z.string().min(1).max(100).transform(isbnDigits)
  .refine(isbnValid, 'Use a valid ISBN-10 or ISBN-13 including check digit');

export type Advanced = z.output<typeof advanced>;
export type Multi = z.output<typeof multifield>;
export type Paging = z.output<z.ZodObject<typeof paging>>;

function setFilters(params: URLSearchParams, query: Advanced | Multi, omitDate = false) {
  params.set('nliHolding', databases[query.database]);
  const prefix = 'bibliographicLimitQueryBuilder.';
  const date = omitDate ? undefined : query.publication_date;
  const format = date?.digit_style === 'latin' ? digits : persianDigits;
  const values = {
    biblioDocType: materialTypes[query.material], language: query.language ?? '',
    codingLevel: catalogingCodes[query.cataloging], gmd: query.gmd ?? '',
    calendar: calendarCodes[date?.calendar ?? 'catalog_default'],
    dateComparisonOperator: date?.operator === 'between' ? 'bt' : date?.operator ?? 'eq',
    useDateRange: date && date.operator !== 'eq' ? 'true' : 'false',
    year: date?.operator === 'eq' ? format(date.from) : '',
    from: date ? format(date.from) : ''
  };
  for (const [key, value] of Object.entries(values)) params.set(prefix + key, value);
  if (date?.to) params.set(prefix + 'to', format(date.to));
}

export function searchRequest(query: Advanced | Multi) {
  const isMulti = 'fields' in query;
  const pageStatus = isMulti ? '2' : '1';
  const params = new URLSearchParams({ command: 'I', classType: '0', pageStatus, 'attributes.locale': 'fa' });
  if (isMulti) {
    multiIndexes.forEach((field, index) => {
      const term = query.fields[field];
      params.set(`indexField[${index}].id`, indexes[field]);
      params.set(`multiFieldSearch.simpleSearch[${index}].value`, term?.value ?? '');
      params.set(`multiFieldSearch.simpleSearch[${index}].tokenized`, String(term?.match !== 'exact'));
    });
    params.set('multiFieldSearch.operator', booleanCodes[query.operator]);
    params.set('multiFieldSearch.downward', String(query.direction === 'top_down'));
    setFilters(params, query);
    return { path: paths.multi, params, pageStatus };
  }

  const date = query.publication_date;
  const indexOnly = query.clauses.length === 0 && date?.operator === 'eq';
  const clauses = indexOnly ? [{
    value: date.digit_style === 'latin' ? date.from : persianDigits(date.from),
    field: 'publication_date', match: 'words', join: 'and'
  }] as const : query.clauses;
  for (let index = 0; index < 3; index++) {
    const term = clauses[index];
    const prefix = `advancedSearch.simpleSearch[${index}].`;
    params.set(prefix + 'indexFieldId', term ? indexes[term.field] : '');
    params.set(prefix + 'value', term?.value ?? '');
    params.set(prefix + 'tokenized', String(term?.match !== 'exact'));
    if (index < 2) params.set(`advancedSearch.operator[${index}]`, booleanCodes[clauses[index + 1]?.join ?? 'and']);
  }
  setFilters(params, query, indexOnly);
  return { path: paths.advanced, params, pageStatus };
}

export function pagingRequest(
  pageStatus: string, options: Paging, command: 'SORT_BY' | 'BRIEF_LIST_SETUP' | 'GOTO_PAGE' | 'SAVE_PRINT'
) {
  return new URLSearchParams({
    command, classType: '0', pageStatus, pageSize: String(options.page_size), pageNum: String(options.page),
    sortKeyValue1: sortKeys[options.sort], sortKeyValue2: sortKeys[options.secondary_sort]
  });
}
