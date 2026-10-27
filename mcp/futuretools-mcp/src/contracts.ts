import * as z from 'zod/v4';
import { FutureToolsError } from './errors.js';
export const ORIGIN = 'https://futuretools.io';
export const slug = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,159}$/);
export const reference = z.string().trim().min(1).max(500);
export function toolSlug(value: string): string {
  const direct = slug.safeParse(value); if (direct.success) return direct.data;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['futuretools.io', 'www.futuretools.io'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) throw new Error();
    const m = /^\/tools\/([a-z0-9][a-z0-9-]{0,159})\/?$/.exec(url.pathname); if (!m) throw new Error(); return m[1]!;
  } catch { throw new FutureToolsError('INVALID_TOOL_REFERENCE', 'Use a tool slug or its exact HTTPS futuretools.io/tools/slug URL.'); }
}
export const sort = z.enum(['newest', 'oldest', 'popular', 'popular_30d', 'name']).default('newest');
export const filter = z.enum(['free', 'freemium', 'paid', 'open_source', 'matts_picks']);
export const searchInput = z.strictObject({ query: z.string().trim().max(300).default(''),
  categories: z.array(slug).max(5).default([]), filters: z.array(filter).max(5).default([]), sort,
  page: z.number().int().min(1).max(1000).default(1) });
export type SearchInput = z.output<typeof searchInput>;
export function searchUrl(raw: unknown) {
  const input = searchInput.parse(raw), url = new URL('/tools', ORIGIN);
  if (input.query) url.searchParams.set('search', input.query);
  if (input.categories.length) url.searchParams.set('categories', [...new Set(input.categories)].sort().join(','));
  if (input.filters.length) url.searchParams.set('filters', [...new Set(input.filters)].sort().join(','));
  if (input.sort !== 'newest') url.searchParams.set('sort', input.sort);
  if (input.page !== 1) url.searchParams.set('page', String(input.page));
  return url;
}
export function assertPublicUrl(url: URL) {
  if (url.origin !== ORIGIN || url.username || url.password || url.hash || !/^\/tools(?:\/[a-z0-9][a-z0-9-]{0,159})?$/.test(url.pathname)) throw new FutureToolsError('URL_NOT_ALLOWED', 'Only public FutureTools directory/detail pages are permitted.');
  for (const key of url.searchParams.keys()) if (!['search', 'categories', 'filters', 'sort', 'page'].includes(key)) throw new FutureToolsError('URL_NOT_ALLOWED', 'Unsupported directory parameter.');
}
export type Category = { slug: string; name: string };
export type Tool = { slug: string; name: string; url: string; website_url: string | null;
  description: string | null; pricing: string | null; upvotes: number | null; categories: Category[];
  is_matts_pick: boolean | null; is_featured: boolean | null; published_at: string | null;
  tags: string[]; api_available?: boolean | null; open_source?: boolean | null; listed_text?: string | null;
  category_text?: string | null; videos?: string[]; field_status?: Record<string, string> };
export type Source = { source: 'FutureTools'; source_url: string; fetched_at: string; cached: boolean; cache_expires_at: string };
