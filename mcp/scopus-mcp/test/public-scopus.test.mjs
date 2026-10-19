import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PublicScopusSource, parsePublicSnapshot } from '../dist/public-scopus.js';
import { splitName } from '../dist/author-export.js';
import { profileId } from '../dist/identifiers.js';

const base = { url: 'https://www.scopus.com/pages/author/11111111111', text: 'Synthetic researcher Documents 20', headings: ['Synthetic researcher'], tabs: ['Documents (20)'] };
test('public parser retains only exact Scopus profile/publication links and explicit titles', () => {
  const rows = parsePublicSnapshot({ ...base, links: [
    { url: '/pages/publications/85000000001', title: 'Synthetic publication', context: '', doi: null },
    { url: '/record/display.uri?eid=2-s2.0-85000000001', title: 'Synthetic publication', context: '', doi: null },
    { url: 'https://scopus.com.evil.test/pages/publications/85000000002', title: 'Untrusted', context: '', doi: null },
    { url: '/pages/publications/85000000003', title: 'Show details', context: '', doi: null },
  ] }, 'publications');
  assert.equal(rows.length, 1); assert.equal(rows[0].id, '85000000001');
  assert.equal(profileId('https://www.scopus.com/pages/author/11111111111', 'author'), '11111111111');
});
test('public access challenges and off-site redirects are errors rather than missing data', () => {
  assert.throws(() => parsePublicSnapshot({ ...base, text: 'Verify that you are human', links: [] }, 'authors'), { code: 'PUBLIC_ACCESS_BLOCKED' });
  assert.throws(() => parsePublicSnapshot({ ...base, url: 'https://elsewhere.test', links: [] }, 'authors'), { code: 'PUBLIC_REDIRECTED' });
});
test('name parsing supports comma order and explicit compound surnames', () => {
  assert.deepEqual(splitName('Ada Example'), { given: 'Ada', family: 'Example' });
  assert.deepEqual(splitName('van Example, Ada'), { given: 'Ada', family: 'van Example' });
  assert.deepEqual(splitName('Ada van Example', 'van Example', 'Ada'), { given: 'Ada', family: 'van Example' });
});

test('real browser traverses synthetic public search and exports only the author Documents section', { skip: process.env.RUN_BROWSER_TESTS !== '1' }, async () => {
  const browser = await chromium.launch({ channel: process.env.SCOPUS_BROWSER_CHANNEL || undefined, headless: true, chromiumSandbox: true });
  try {
    const source = new PublicScopusSource({ contextFactory: async () => {
      const context = await browser.newContext();
      await context.route('https://www.scopus.com/**', route => {
        const url = new URL(route.request().url()); let html;
        if (url.pathname.includes('/freelookup/')) html = `<form action="/results"><label>Enter last name<input name="last"></label><label>Enter first name<input name="first"></label><label>Affiliation name<input name="university"></label><button type="submit">Search</button></form>`;
        else if (url.pathname === '/results') {
          assert.equal(url.searchParams.get('last'), 'Example'); assert.equal(url.searchParams.get('first'), 'Ada'); assert.equal(url.searchParams.get('university'), 'Example University');
          html = `<main><article><a href="/pages/author/11111111111">Example, Ada</a><p>Example University</p></article></main>`;
        } else html = `<main><h1>Example, Ada</h1><button role="tab" aria-controls="docs">Documents (20)</button><section id="docs"><article><a href="/pages/publications/85000000001">Synthetic public paper</a><a href="https://doi.org/10.9999/synthetic">DOI</a></article></section><aside><a href="/pages/publications/85000000002">Unrelated suggested paper</a></aside></main>`;
        return route.fulfill({ contentType: 'text/html', body: html });
      });
      return context;
    } });
    const authors = await source.findAuthors({ name: 'Ada Example', university: 'Example University' });
    assert.equal(authors.length, 1); assert.equal(authors[0].id, '11111111111');
    const result = await source.publications(authors[0], 1000);
    assert.equal(result.items.length, 1); assert.equal(result.items[0].doi, '10.9999/synthetic');
    assert.equal(result.total, 20); assert.equal(result.complete, false); assert.equal(result.warnings.length, 1);
  } finally { await browser.close(); }
});
