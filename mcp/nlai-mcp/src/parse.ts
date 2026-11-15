import { load } from 'cheerio';
import { canonicalRecord, digits, isbnDigits, isbnValid, origin } from './query.js';

export class CatalogError extends Error {
  constructor(public readonly code: string, message: string, public readonly source_url?: string) {
    super(message);
  }
}

export function clean(value: string): string {
  return value.normalize('NFC').replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069\u200d]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function normalized(value: string): string {
  return clean(value.normalize('NFKC')).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/\u200c/g, '').toLowerCase();
}

export function labelKey(value: string): string {
  return normalized(value).replace(/[\s:]+/g, '');
}

export function parseOptions(html: string, source: string) {
  const $ = load(html);
  const form = $('form[name="search_AdvancedSearchForm"]');
  if (!form.length) throw new CatalogError('LAYOUT_CHANGED', 'OPAC advanced search form was not found.', source);
  const options = (name: string) => form.find('select').filter((_, node) => $(node).attr('name') === name)
    .find('option').map((_, node) => ({ code: $(node).attr('value') ?? '', label: clean($(node).text()) })).get();
  return {
    indexes: options('advancedSearch.simpleSearch[0].indexFieldId'),
    databases: options('nliHolding'),
    material_types: options('bibliographicLimitQueryBuilder.biblioDocType'),
    languages: options('bibliographicLimitQueryBuilder.language'),
    calendars: options('bibliographicLimitQueryBuilder.calendar'),
    cataloging_statuses: options('bibliographicLimitQueryBuilder.codingLevel'),
    material_designations: options('bibliographicLimitQueryBuilder.gmd')
  };
}

export function parseBrief(html: string, source: string) {
  const $ = load(html);
  const form = $('form[name="search_BrowseSearchHitsForm"]');
  const noRecords = $('b').toArray().some(node =>
    normalized($(node).text()).includes('رکوردی برای نمایش وجود ندارد'));
  if (noRecords) return {
    total: 0, page: 0, total_pages: 0, page_size: null, items: [], query_echo: null, applied_sort_keys: []
  };
  const rows = form.find('input[name^="renderer["][name$=".title"]').toArray();
  const items = rows.map(node => {
    const enclosing = $(node).closest('tr');
    const anchor = enclosing.find('a[href*="command=FULL_VIEW"][href*="id="]').first().attr('href');
    const id = anchor && new URL(anchor.replace(/\s+/g, ''), origin).searchParams.get('id');
    const prefix = $(node).attr('name')!.split('.')[0]!;
    const val = (field: string) => clean(enclosing.find('input').filter((_, el) =>
      $(el).attr('name') === prefix + '.' + field).attr('value') ?? '') || null;
    if (!id || !/^\d+$/.test(id) || !val('title')) {
      throw new CatalogError('LAYOUT_CHANGED', 'An OPAC result row has no usable title or ID.', source);
    }
    return {
      id, source_url: canonicalRecord(id), title: val('title')!, creator: val('author'),
      publication_date_text: val('publisherDate'), material: val('documentType'),
      selection_name: prefix + '.checkBox'
    };
  });
  const summary = form.find('#table5 tr');
  const summaryValue = (label: string) => {
    const row = summary.filter((_, el) => labelKey($(el).children('td').first().text()) === labelKey(label)).first();
    return clean(row.children('td').last().text());
  };
  const total = digits(summaryValue('تعداد رکوردها')).match(/^([\d,٬]+)\s+از/);
  const pager = digits(clean(form.find('.gridfooter').text())).match(/صفحه\s+(\d+)\s+از\s+(\d+)\b/);
  const pageSize = Number(form.find('select[name="pageSize"]').val());
  if (!items.length || !total || !pager || ![15, 25, 35, 50].includes(pageSize)) {
    throw new CatalogError('LAYOUT_CHANGED', 'The OPAC results or their pagination could not be recognized.', source);
  }
  return {
    total: Number(total[1]!.replace(/[,٬]/g, '')),
    page: Number(pager[1]), total_pages: Number(pager[2]), page_size: pageSize, items,
    query_echo: summaryValue('مورد جستجو') || null,
    applied_sort_keys: ['sortKeyValue1', 'sortKeyValue2'].map(name => String(form.find(`select[name="${name}"]`).val() ?? ''))
  };
}

export function parseRecord(html: string, id: string, source: string) {
  const $ = load(html);
  const bibliographic_fields = $('table[dir="rtl"] tr').map((_, node) => {
    const cells = $(node).children('td');
    if (cells.length !== 3 || clean(cells.eq(1).text()) !== ':') return;
    const label = clean(cells.first().text());
    const cell = cells.eq(2).clone();
    cell.find('br').replaceWith('␞');
    const values = cell.text().split('␞').map(clean).filter(Boolean);
    if (label && values.length) return { label, values };
  }).get();
  const values = (...labels: string[]) => {
    const keys = new Set(labels.map(labelKey));
    return bibliographic_fields.filter(row => keys.has(labelKey(row.label))).flatMap(row => row.values);
  };
  const title_statement = values('عنوان و نام پدیدآور', 'عنوان و نام پدیدآورنده', 'عنوان')[0] ?? null;
  const direct = $('a[href*="/opac-prod/bibliographic/"]').toArray().find(node =>
    ($(node).attr('href') ?? '').replace(/\/$/, '').endsWith('/' + id));
  const nationalNumber = values('شماره کتابشناسی ملی', 'شماره کتاب‌شناسی ملی')[0];
  const national_bibliography_number = nationalNumber ? digits(nationalNumber) : null;
  if (!title_statement || (!direct && national_bibliography_number !== id)) {
    throw new CatalogError('UNRECOGNIZED_RECORD', 'The requested OPAC record could not be verified from the detail page.', source);
  }
  const isbns = values('شابک', 'ISBN', 'شاپا / شابک').flatMap(text => {
    const separator = '[\\s\\p{Pd}]*';
    const isbnPattern = new RegExp(`(?<![0-9])(?:9${separator}7${separator}[89](?:${separator}[0-9]){10}|[0-9](?:${separator}[0-9]){8}${separator}[0-9X])(?![0-9X])`, 'giu');
    return [...digits(text).matchAll(isbnPattern)].map(match => {
      const value = isbnDigits(match[0]);
      return { value, checksum_valid: isbnValid(value), source_text: text };
    });
  });
  const holdings = $('tr').filter((_, node) => $(node).children('td').children('input[name^="test["][name$=".publish"]').length > 0)
    .map((_, node) => {
      const inputs = $(node).children('td').children('input');
      const value = (key: string) => clean(inputs.filter((_, el) => $(el).attr('name')?.endsWith('.' + key) === true)
        .attr('value') ?? '') || null;
      return {
        location: value('location'), permanent_register: value('permanentRegister'),
        call_number: value('retreiveNo'), volume: value('volume'), copy: value('copy'),
        year_text: value('year'), printing_text: value('publish'), availability: value('availability')
      };
    }).get();
  const record_status = values('اطلاعات رکورد کتابشناسی', 'اطلاعات رکورد کتاب‌شناسی')[0] ?? null;
  const cataloging_status = values('وضعیت فهرست نویسی', 'وضعیت فهرستنویسی')[0] ?? null;
  const statusLabel = labelKey(cataloging_status ?? record_status ?? '');
  const cataloging_kind = statusLabel.includes('فیپا') ? 'fipa' : statusLabel.includes('فاپا') ? 'fapa'
    : statusLabel ? 'other' : 'unreported';
  const plainTitle = direct ? clean($(direct).text()) : null;
  const publication = values('مشخصات نشر', 'مشخصات انتشار');
  const publication_dates = values('تاریخ نشر', 'سال نشر', 'تاریخ انتشار');
  const imprintDates = publication.map(text => text.match(/(?:^|[،,])\s*([\[\]۰-۹٠-٩0-9?؟ـ–\-\s]+(?:ش\.?|م\.?|ق\.?))\.?$/u)?.[1]
    ?? text.match(/(?:^|[،,])\s*([\[\]۰-۹٠-٩0-9?؟ـ–\-\s]*[۰-۹٠-٩0-9][\[\]۰-۹٠-٩0-9?؟ـ–\-\s]*)\.?$/u)?.[1])
    .filter((value): value is string => value !== undefined && /\d/.test(digits(value))).map(clean);
  return {
    id, source_url: canonicalRecord(id), national_bibliography_number,
    national_bibliography_number_text: nationalNumber ?? null,
    title: plainTitle || title_statement, title_statement,
    main_entries: values('سرشناسه'), added_entries: values('شناسه افزوده', 'شناسه‌های افزوده'),
    publication, publication_date_text: publication_dates[0] ?? imprintDates[0] ?? null,
    physical_description: values('مشخصات ظاهری'),
    edition_statements: values('وضعیت ویراست', 'وضعیت ویرایش', 'ویراست', 'ویرایش', 'شماره ویراست', 'نوبت چاپ', 'چاپ'),
    series: values('فروست', 'نام مجموعه'), subjects: values('موضوع', 'موضوع‌ها', 'کلیدواژه'),
    notes: values('یادداشت', 'یادداشت ها'),
    lc_classification: values('رده بندی کنگره'), dewey_classification: values('رده بندی دیویی'),
    isbn_statements: values('شابک', 'ISBN', 'شاپا / شابک'),
    isbns: isbns.filter((isbn, index) => isbns.findIndex(entry => entry.value === isbn.value) === index),
    cataloging_status, record_status, cataloging_kind,
    fipa_tracking_code: values('کد پیگیری', 'شماره پیگیری')[0] ?? null,
    holdings, bibliographic_fields
  };
}

export type Book = ReturnType<typeof parseRecord>;

export function parseBrowse(html: string, source: string) {
  const $ = load(html);
  const form = $('form[name="search_BrowseTermForm"]');
  if (!form.length) throw new CatalogError('LAYOUT_CHANGED', 'The OPAC index browse form was not found.', source);
  const items = form.find('input[name^="renderer["][name$=".value"]').map((_, node) => {
    const row = $(node).closest('tr');
    const text = clean($(node).attr('value') ?? '');
    const index_code = row.find('input[name$=".indexId"]').attr('value') ?? null;
    return text ? { text, index_code } : null;
  }).get();
  if (!items.length) throw new CatalogError('UNRECOGNIZED_BROWSE', 'There are no recognizable index rows in the response.', source);
  return { items, upstream_next_page: form.find('[onclick*="nextPage()"]').length > 0 };
}

export function verifyPrinting(book: Book, year: string) {
  const explicit = book.holdings.filter(holding => holding.year_text && digits(holding.year_text) === year);
  const matches = explicit.filter(holding =>
    /^(?:0*1|اول|یک|چاپ اول)$/.test(normalized(digits(holding.printing_text ?? ''))));
  const unknown = explicit.some(holding => !/^0*[1-9]\d*$/.test(digits(holding.printing_text ?? '')));
  const status = matches.length ? 'confirmed_catalog_printing'
    : explicit.length && !unknown ? 'only_other_numbered_printings_observed' : 'unverified';
  return { year, status, matching_holdings: matches, holdings_with_requested_year: explicit.length };
}
