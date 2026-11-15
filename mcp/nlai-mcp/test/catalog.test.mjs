import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Catalog, readIsoIds } from '../dist/catalog.js';
import { formatExport } from '../dist/export.js';
import { parseBrief, parseRecord, verifyPrinting } from '../dist/parse.js';
import { advanced, isbnForms, isbnInput, lookup, paging, searchRequest } from '../dist/query.js';

const source = 'https://opac.nlai.ir/opac-prod/bibliographic/42';
const year = '1404';
const record = (holdings = '', cataloging = 'فیپا') => `
<table dir="rtl">
<tr><td>عنوان و نام پديدآور</td><td>:</td><td>کتاب نمونه / نویسنده.</td></tr>
<tr><td>شماره کتابشناسی ملی</td><td>:</td><td>م ۷۷-۱۱۳۰۱</td></tr>
<tr><td>شابک</td><td>:</td><td>۹۷۸-۶۲۲-۳۸۷-۸۹۴-۷<br>شابک جلد دیگر</td></tr>
<tr><td>وضعیت فهرست‌نویسی</td><td>:</td><td>${cataloging}</td></tr>
<tr><td>مشخصات نشر</td><td>:</td><td>تهران: ناشر نمونه، ۱۴۰۴.</td></tr>
<tr><td>موضوع</td><td>:</td><td>خط اول<br>خط دوم</td></tr>
</table>
<a href="${source}">کتاب نمونه</a>
<table>${holdings}</table>`;

function holding(index, year, print, copy) {
  return `<tr><td><input name="test[${index}].year" value="${year}"></td>
  <td><input name="test[${index}].publish" value="${print}"></td>
  <td><input name="test[${index}].copy" value="${copy}"></td></tr>`;
}

test('record parser preserves raw bibliographic ID, normalized ISBN, and separate subjects', () => {
  const book = parseRecord(record(), '42', source);
  assert.equal(book.id, '42');
  assert.equal(book.national_bibliography_number, 'م 77-11301');
  assert.equal(book.national_bibliography_number_text, 'م ۷۷-۱۱۳۰۱');
  assert.equal(book.cataloging_kind, 'fipa');
  assert.equal(book.publication_date_text, '۱۴۰۴');
  assert.deepEqual(book.subjects, ['خط اول', 'خط دوم']);
  assert.deepEqual(book.isbns.map(value => [value.value, value.checksum_valid]), [['9786223878947', true]]);
});

test('first printing requires year and print number on the same holdings row', () => {
  const differentRows = holding(0, '۱۴۰۳', '۱', '۱') + holding(1, '۱۴۰۴', '۲', '۱');
  const first = verifyPrinting(parseRecord(record(differentRows, 'فاپا'), '42', source), year);
  assert.equal(first.status, 'only_other_numbered_printings_observed');
  const sameRow = differentRows + holding(2, '۱۴۰۴', '۱', '۲');
  const second = verifyPrinting(parseRecord(record(sameRow, 'فاپا'), '42', source), year);
  assert.equal(second.status, 'confirmed_catalog_printing');
  assert.equal(second.matching_holdings[0].copy, '۲');
  assert.equal(verifyPrinting(parseRecord(record(holding(0, '۱۴۰۴', '۰', '۱')), '42', source), year).status, 'unverified');
  assert.equal(verifyPrinting(parseRecord(record(), '42', source), year).status, 'unverified');
});

test('explicit zero is distinct from an unknown HTML response', () => {
  const zero = parseBrief('<form name="search_BrowseSearchHitsForm"><b>رکوردی برای نمایش وجود ندارد.</b></form>', source);
  assert.equal(zero.total, 0);
  assert.throws(() => parseBrief('<b>Maintenance</b>', source), { code: 'LAYOUT_CHANGED' });
  assert.throws(() => parseRecord(record(), '43', source), { code: 'UNRECOGNIZED_RECORD' });
});

test('exact year without title uses the Persian publication-date index', () => {
  const query = advanced.parse({ publication_date: { from: '۱۴۰۴' }, database: 'holdings' });
  const { params } = searchRequest(query);
  assert.equal(params.get('advancedSearch.simpleSearch[0].indexFieldId'), '10080');
  assert.equal(params.get('advancedSearch.simpleSearch[0].value'), '۱۴۰۴');
  assert.equal(params.get('nliHolding'), 'holding');
  assert.equal(params.get('bibliographicLimitQueryBuilder.biblioDocType'), 'BF');
  assert.equal(params.get('bibliographicLimitQueryBuilder.year'), '');
  assert.equal(advanced.safeParse({ publication_date: { from: 1405, to: 1404, operator: 'between' } }).success, false);
});

test('matches only check-digit-valid ISBNs and calculates but does not merge alternate forms', () => {
  assert.equal(isbnInput.parse('۹۷۸-۶۲۲-۳۸۷-۸۹۴-۷'), '9786223878947');
  assert.equal(isbnInput.safeParse('9786223878948').success, false);
  assert.deepEqual(isbnForms('9786223878947'), ['9786223878947', '622387894X']);
});

test('accepts only public catalog record link shapes as lookup input', () => {
  assert.equal(lookup.parse(source.replace('/42', '/۴۲')), '42');
  assert.equal(lookup.parse('https://opac.nlai.ir/opac-prod/search/briefListSearch.do?command=FULL_VIEW&id=42'), '42');
  assert.equal(lookup.safeParse('https://opac.nlai.ir@other.example/opac-prod/bibliographic/42').success, false);
});

test('CSV neutralizes spreadsheet formulas and preserves Persian characters', async () => {
  const csv = await formatExport([{ id: '42', title: '=1+1', creator: 'نویسنده', source_url: source }], {}, 'csv');
  assert.ok(csv.toString().startsWith('\uFEFF'));
  assert.ok(csv.toString().includes(`"'=1+1","نویسنده"`));
});

test('refuses invalid ISO records and checks catalog field 001', () => {
  const control = Buffer.from('001000300000\x1e42\x1e\x1d', 'ascii');
  const leader = Buffer.from('00041nam0 2200037   4500', 'ascii');
  assert.deepEqual(readIsoIds(Buffer.concat([leader, control]), source), ['42']);
  assert.throws(() => readIsoIds(Buffer.from('<html>'), source), { code: 'INVALID_ISO2709' });
});

test('does not read a redirect response or treat an HTTP access error as a known zero', async () => {
  const fetcher = async (url, init) => {
    assert.equal(new URL(url).origin, 'https://opac.nlai.ir');
    assert.equal(init.redirect, 'manual');
    return new Response(null, { status: 403 });
  };
  const book = new Catalog(fetcher);
  await assert.rejects(book.details('42'), { code: 'UPSTREAM_HTTP' });
});
