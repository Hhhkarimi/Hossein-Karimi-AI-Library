import { TorobClient } from '../dist/torob-client.js';
import { TorobService } from '../dist/service.js';
export const A = '11111111-1111-4111-8111-111111111111';
export const B = '22222222-2222-4222-8222-222222222222';
export const C = '33333333-3333-4333-8333-333333333333';
export const O1 = '44444444-4444-4444-8444-444444444444';
export const O2 = '55555555-5555-4555-8555-555555555555';
export const O3 = '66666666-6666-4666-8666-666666666666';
export function product(id = A, overrides = {}) {
  return { random_key: id, name1: 'گوشی سامسونگ', name2: 'Samsung phone', price: 10000,
    price_text: '۱۰٫۰۰۰ تومان', is_adv: false, ...overrides };
}
export function offer(id = O1, overrides = {}) {
  return { prk: id, shop_id: 1, shop_name: 'فروشگاه آزمایشی', shop_name2: 'تهران', name1: 'گوشی',
    name2: 'گارانتی نمونه', price: 10000, availability: true, is_adv: false,
    shop_score: 4.5, page_url: `https://api.torob.com/v4/product-page/redirect/?prk=${id}`,
    last_price_change_date: 'دیروز', ...overrides };
}
export function detail(id = A, overrides = {}) {
  return product(id, { availability: true, min_price: 10000, max_price: 20000,
    products_info: { result: [offer()], count: 3,
      sellers_url: `https://api.torob.com/v4/base-product/sellers/?prk=${id}&list_type=products_info` },
    products_in_store_info: { result: [offer(O2, { availability: undefined })], count: 1 },
    key_specs: [{ header: 'مشخصات', items: [{ key: 'RAM', value: [id === A ? '8 GB' : '12 GB'] },
      { key: 'NFC', value: ['دارد'] }, ...(id === A ? [{ key: 'رنگ', value: ['آبی'] }] : [])] }],
    ...overrides });
}
export function fixtureFetcher(custom) {
  const calls = [];
  const fetcher = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    const result = custom ? await custom(url, init, calls.length) : undefined;
    if (result !== undefined) return result instanceof Response ? result : Response.json(result);
    if (url.pathname === '/suggestion2/') return Response.json([{ text: 'سامسونگ a56' }, { text: 'سامسونگ a16' }]);
    if (url.pathname.endsWith('/details/')) return Response.json(detail(url.searchParams.get('prk') ?? A));
    if (url.pathname.endsWith('/sellers/')) return Response.json({ results: [
      offer(O1, { price: 15000 }), offer(O2, { price: 9000, shop_id: 2 }),
      offer(O3, { price: 1000, is_adv: true }),
    ], count: 3 });
    return Response.json({ results: [product(C, { is_adv: true, price: 5000 }),
      product(A), product(B, { name1: 'هدفون', name2: 'headphone', price: 20000 })],
    count: 100, next: url.searchParams.get('page') === '1' ? null : 'https://api.torob.com/v4/base-product/search/?page=1',
    categories: [{ cat_id: 94, title: 'گوشی موبایل' }], min_price: 5000, max_price: 20000,
    attributes: [{ title: 'انتخاب برند', slug: 'brand', type: 'brand',
      items: [{ id: 5, name1: 'سامسونگ', name2: 'Samsung' }] }] });
  };
  return { calls, fetcher };
}
export function fixtureService(custom) {
  const fixture = fixtureFetcher(custom);
  const client = new TorobClient({ fetcher: fixture.fetcher, intervalMs: 0 });
  return { ...fixture, client, service: new TorobService(client) };
}
