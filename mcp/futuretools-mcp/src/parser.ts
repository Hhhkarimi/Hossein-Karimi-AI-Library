import { load, type CheerioAPI } from 'cheerio';
import { ORIGIN, toolSlug, type Category, type Tool, type SearchInput } from './contracts.js';
import { FutureToolsError } from './errors.js';
type Row = Record<string, unknown>;
const row = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const str = (v: unknown, max = 1000) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
const bool = (v: unknown) => typeof v === 'boolean' ? v : null;
function safeLink(v: unknown) {
  if (typeof v !== 'string') return null;
  try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
function clean($: CheerioAPI, selector: string) { return $(selector).first().text().replace(/\s+/g, ' ').trim(); }
function challenge($: CheerioAPI) {
  if (/just a moment|access denied|verify.*human/i.test($('title').text())) throw new FutureToolsError('ACCESS_BLOCKED', 'An access challenge was returned instead of directory content.');
}
// Flight payloads are public render data. Parse JSON only: never evaluate page scripts or fetch private APIs.
function flightRows($: CheerioAPI): Row[] {
  const strings: string[] = [];
  $('script').each((_, element) => {
    const script = $(element).text();
    for (const m of script.matchAll(/self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)/g)) {
      try { const pair = JSON.parse(m[1]!); if (typeof pair[1] === 'string') strings.push(pair[1]); } catch { /* Not a complete data frame. */ }
    }
  });
  const found: Row[] = []; let budget = 100000;
  function visit(value: unknown, depth: number) {
    if (--budget < 0 || depth > 35 || !value || typeof value !== 'object') return;
    if (!Array.isArray(value)) found.push(value as Row);
    for (const child of Object.values(value)) visit(child, depth + 1);
  }
  for (const line of strings.join('').split('\n')) {
    const at = line.indexOf(':'); if (at < 0) continue;
    try { visit(JSON.parse(line.slice(at + 1)), 0); } catch { /* Text/reference frames are not JSON records. */ }
  }
  return found;
}
function category(raw: unknown): Category | null {
  const r = row(raw), id = str(r.slug, 160), name = str(r.name, 160);
  return id && /^[a-z0-9][a-z0-9-]{0,159}$/.test(id) && name ? { slug: id, name } : null;
}
export function normalizeCard(raw: Row): Tool {
  const id = str(raw.slug, 160), name = str(raw.name, 240);
  if (!id || !name) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Tool render data lacked its slug or name.');
  toolSlug(id);
  return { slug: id, name, url: `${ORIGIN}/tools/${id}`, website_url: safeLink(raw.website_url),
    description: str(raw.description_short, 3000), pricing: str(raw.pricing_tier, 80), upvotes: number(raw.upvotes),
    categories: Array.isArray(raw.categories) ? raw.categories.map(category).filter((c): c is Category => c !== null).slice(0, 30) : [],
    is_matts_pick: bool(raw.is_matts_pick), is_featured: bool(raw.is_featured), published_at: str(raw.published_at, 80),
    tags: Array.isArray(raw.search_tags) ? raw.search_tags.map(v => str(v, 120)).filter((v): v is string => v !== null).slice(0, 30) : [] };
}
export function parseDirectory(html: string) {
  const $ = load(html); challenge($);
  if (clean($, 'h1') !== 'The AI Tools Database') throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Expected the FutureTools directory heading.');
  const rows = flightRows($), props = rows.find(r => Array.isArray(r.categories) && row(r.initial).query !== undefined);
  if (!props) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Directory filter state was not returned in recognized public render data.');
  const categories = (props.categories as unknown[]).map(category).filter((c): c is Category => c !== null);
  const initial = row(props.initial);
  const applied = { query: str(initial.query, 300) ?? '', categories: Array.isArray(initial.categories) ? initial.categories : [],
    filters: Array.isArray(initial.filters) ? initial.filters : [], sort: str(initial.sort, 40) ?? 'newest' };
  const records = new Map<string, Tool>();
  for (const r of rows) if (typeof r.slug === 'string' && typeof r.name === 'string' && 'pricing_tier' in r && 'description_short' in r) records.set(r.slug, normalizeCard(r));
  const slugs: string[] = [];
  $('main a[href^="/tools/"]').each((_, a) => {
    if (!/^View\s+/.test($(a).text().trim())) return;
    try { slugs.push(toolSlug(new URL($(a).attr('href')!, ORIGIN).href)); } catch { /* Ignore a non-tool navigation link. */ }
  });
  const items = [...new Set(slugs)].map(id => {
    const item = records.get(id); if (!item) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'A visible result had no matching public tool data.'); return item;
  });
  const showing = $('main p').toArray().map(e => $(e).text()).find(t => /^Showing\s/.test(t));
  const match = showing?.replace(/,/g, '').match(/^Showing\s+(?:(\d+)\s*[–-]\s*(\d+)|(0))\s+of\s+(\d+)\s+tools/);
  if (!match) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'The directory did not report a recognized result total.');
  const start = Number(match[1] ?? 0), end = Number(match[2] ?? 0), total = Number(match[4]);
  if (total === 0 && (items.length || !/No tools found/.test($('main').text()))) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Empty-result indicators did not agree.');
  if (total > 0 && (!items.length || end - start + 1 !== items.length)) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Visible page range and recognized cards did not agree.');
  const nextHref = $('a').toArray().find(a => $(a).text().trim() === 'Next');
  const nextUrl = nextHref ? new URL($(nextHref).attr('href') ?? '', ORIGIN) : null;
  const nextPage = nextUrl?.origin === ORIGIN && nextUrl.pathname === '/tools' ? Number(nextUrl.searchParams.get('page')) || null : null;
  return { items, total, start, end, next_page: nextPage, categories, applied,
    coverage: 'one_live_directory_page', classification_note: 'Categories and price labels are reported by FutureTools, not independently verified vendor facts.' };
}
export function verifyApplied(applied: ReturnType<typeof parseDirectory>['applied'], wanted: SearchInput) {
  const same = (a: unknown[], b: string[]) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
  if (applied.query !== wanted.query || applied.sort !== wanted.sort || !same(applied.filters, wanted.filters) || !same(applied.categories, wanted.categories)) {
    throw new FutureToolsError('FILTER_NOT_APPLIED', 'The returned directory state did not match the requested query/filter/sort. Results were not presented as correctly filtered.');
  }
}
export function parseDetail(html: string, expectedSlug: string): Tool {
  const $ = load(html); challenge($);
  let application: Row | undefined;
  $('script[type="application/ld+json"]').each((_, e) => {
    try { const data = JSON.parse($(e).text()); const all = Array.isArray(data) ? data : Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const v of all) if (row(v)['@type'] === 'SoftwareApplication') application = row(v); } catch { /* Not a usable application schema. */ }
  });
  const name = clean($, 'main h1');
  if (!name || !application || application.name !== name) throw new FutureToolsError('UPSTREAM_LAYOUT_CHANGED', 'Tool heading and SoftwareApplication data were missing or inconsistent.');
  const crumb = $('script[type="application/ld+json"]').toArray().map(e => { try { return JSON.parse($(e).text()); } catch { return {}; } }).find(r => r['@type'] === 'BreadcrumbList');
  const last = Array.isArray(crumb?.itemListElement) ? crumb.itemListElement.at(-1) : undefined;
  if (!last?.item || toolSlug(last.item) !== expectedSlug) throw new FutureToolsError('TOOL_IDENTITY_CHANGED', 'The returned page identifies a different tool. Use its canonical slug explicitly.');
  const facts = new Map<string, string>();
  $('main dt').each((_, e) => { facts.set($(e).text().trim().toLowerCase(), $(e).next('dd').text().trim()); });
  const hero = $('main section').first();
  hero.find('p').each((_, p) => { const label = $(p).text().trim().toLowerCase();
    if (['pricing', 'upvotes', 'category', 'in the database since'].includes(label)) facts.set(label, $(p).next('p').text().trim()); });
  const about = $('main section').filter((_, e) => /^About\s/.test($(e).find('h2').first().text().trim())).first();
  const description = about.find('p').toArray().map(e => $(e).text().trim()).filter(t => t && t !== 'Overview').join('\n');
  const categories: Category[] = [];
  $('main a[href^="/tools?categories="]').each((_, a) => {
    const u = new URL($(a).attr('href')!, ORIGIN), id = u.searchParams.get('categories');
    if (id && /^[a-z0-9-]+$/.test(id)) categories.push({ slug: id, name: $(a).text().trim() || id });
  });
  const upvotes = facts.get('upvotes')?.replace(/,/g, '');
  const yn = (v: string | undefined) => v && /^(?:yes|available)$/i.test(v) ? true : v && /^(?:no|not available)$/i.test(v) ? false : null;
  const videos = $('main iframe[src]').toArray().map(e => safeLink($(e).attr('src'))).filter((v): v is string => !!v && /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\//.test(v)).slice(0, 10);
  const pricing = facts.get('pricing') || null;
  const result: Tool = { slug: expectedSlug, name, url: `${ORIGIN}/tools/${expectedSlug}`, website_url: safeLink(application.url),
    description: description.slice(0, 12000) || str(application.description, 3000), pricing,
    upvotes: upvotes && /^\d+$/.test(upvotes) ? Number(upvotes) : null,
    categories: [...new Map(categories.map(c => [c.slug, c])).values()], category_text: facts.get('category') ?? str(application.applicationCategory),
    is_matts_pick: /^Matt's Pick$/m.test(hero.text()) || hero.text().includes("Matt's Pick") ? true : null,
    is_featured: null, published_at: null, listed_text: facts.get('listed') ?? facts.get('in the database since') ?? null,
    api_available: yn(facts.get('api')), open_source: yn(facts.get('open source')), tags: [], videos };
  result.field_status = Object.fromEntries(['pricing', 'upvotes', 'website_url', 'api_available', 'open_source', 'published_at', 'is_featured'].map(key => [key, result[key as keyof Tool] === null ? 'not_returned' : 'reported']));
  return result;
}
