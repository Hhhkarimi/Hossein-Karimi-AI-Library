import { FutureToolsClient } from '../dist/client.js';
import { FutureToolsService } from '../dist/service.js';
export const categories = [{ slug: 'research', name: 'Research', sort_order: 1 }, { slug: 'productivity', name: 'Productivity', sort_order: 2 }];
export const rawTool = (slug = 'synthetic-a', extras = {}) => ({ slug, name: slug === 'synthetic-a' ? 'Synthetic Alpha' : 'Synthetic Beta',
  description_short: 'Synthetic research helper', website_url: 'https://vendor.invalid/', pricing_tier: 'free', upvotes: 0,
  categories: [categories[0]], is_matts_pick: false, is_featured: false, published_at: '2026-01-01T00:00:00Z', search_tags: ['synthetic'], ...extras });
const escape = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function directory({ items = [rawTool(), rawTool('synthetic-b')], total = items.length, page = 1, state = {}, next = undefined } = {}) {
  const initial = { query: '', categories: [], filters: [], sort: 'newest', ...state };
  const start = items.length ? (page - 1) * 24 + 1 : 0, end = start ? start + items.length - 1 : 0;
  const data = [JSON.stringify(['$', '$L', null, { categories, initial }]), ...items.map(tool => JSON.stringify(['$', '$L', null, { tool }]))].map((s, i) => `${i.toString(16)}:${s}\n`).join('');
  const payload = JSON.stringify([1, data]).replaceAll('<', '\\u003c');
  const nextPage = next === undefined ? end < total && end > 0 ? page + 1 : null : next;
  return `<!doctype html><html><head><title>FutureTools directory</title></head><body><main><h1>The AI Tools Database</h1><p>Showing ${start ? `${start}–${end}` : '0'} of ${total} tools</p>
    ${items.map(t => `<article><a href="/tools/${t.slug}"><span>View ${escape(t.name)}</span></a><h3>${escape(t.name)}</h3></article>`).join('')}
    ${total === 0 ? '<p>No tools found</p>' : ''}${nextPage ? `<a href="/tools?page=${nextPage}">Next</a>` : ''}</main><script>self.__next_f.push(${payload})</script></body></html>`;
}
export function detail(slug = 'synthetic-a', extras = {}) {
  const tool = rawTool(slug, extras);
  return `<!doctype html><html><head><title>${escape(tool.name)}</title></head><body><main>
  <script type="application/ld+json">${JSON.stringify({ '@type': 'SoftwareApplication', name: tool.name, description: tool.description_short, url: tool.website_url, applicationCategory: 'Research' }).replaceAll('<', '\\u003c')}</script>
  <script type="application/ld+json">${JSON.stringify({ '@type': 'BreadcrumbList', itemListElement: [{ item: `https://futuretools.io/tools/${slug}` }] })}</script>
  <section><h1>${escape(tool.name)}</h1><p>Pricing</p><p>${escape(tool.pricing_tier)}</p><p>Upvotes</p><p>${tool.upvotes}</p><p>Category</p><p>Research</p></section>
  <section><h2>About ${escape(tool.name)}</h2><p>${escape(tool.description_short)}</p></section>
  <dl><dt>API</dt><dd>Available</dd><dt>Open source</dt><dd>No</dd><dt>Listed</dt><dd>Jan 2026</dd></dl>
  <a href="/tools?categories=research">Research</a></main></body></html>`;
}
export function fixtureService(custom, options = {}) {
  const calls = [];
  const fetcher = async (input, init) => {
    const url = new URL(input); calls.push({ url, init }); const overridden = custom ? await custom(url, init) : undefined;
    if (overridden !== undefined) return overridden instanceof Response ? overridden : new Response(overridden, { headers: { 'content-type': 'text/html' } });
    const html = url.pathname === '/tools' ? directory({ state: { query: url.searchParams.get('search') ?? '', categories: (url.searchParams.get('categories') ?? '').split(',').filter(Boolean),
      filters: (url.searchParams.get('filters') ?? '').split(',').filter(Boolean), sort: url.searchParams.get('sort') ?? 'newest' }, page: Number(url.searchParams.get('page') ?? 1) }) : detail(url.pathname.split('/').at(-1));
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  };
  const client = new FutureToolsClient({ fetcher, intervalMs: 0, ...options });
  return { calls, client, service: new FutureToolsService(client) };
}
