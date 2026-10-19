import { chromium, type Page, type BrowserContext } from 'playwright';
import { ScopusError } from './errors.js';
import { profileId } from './identifiers.js';
import { splitName, type AuthorCandidate, type PublicationResult, type PublicSource } from './author-export.js';

export type PublicSnapshot = { url: string; text: string; links: { url: string; title: string; context: string; doi: string | null }[];
  headings: string[]; tabs: string[]; publication_scope?: boolean };
const official = (url: URL) => url.protocol === 'https:' && ['scopus.com', 'www.scopus.com'].includes(url.hostname) && !url.port && !url.username && !url.password;
export function parsePublicSnapshot(snapshot: PublicSnapshot, kind: 'authors' | 'publications') {
  if (!official(new URL(snapshot.url))) throw new ScopusError('PUBLIC_REDIRECTED', 'Scopus redirected away from the public Scopus site. No data absence is established.');
  if (/verify (?:that )?you are human|captcha|access denied|just a moment|unusual traffic|checking your browser|request unsuccessful/i.test(snapshot.text.slice(0, 15000))) {
    throw new ScopusError('PUBLIC_ACCESS_BLOCKED', 'Scopus presented a browser/access challenge. It was not bypassed. Retry from a network where the public page opens normally.');
  }
  const rows = [];
  for (const link of snapshot.links) {
    try {
      const url = new URL(link.url, snapshot.url); if (!official(url)) continue;
      let id: string | undefined;
      if (kind === 'authors') id = /^\/pages\/author\/(\d{1,20})\/?$/.exec(url.pathname)?.[1]
        ?? (/^\/authid\/detail\.(?:uri|url)$/.test(url.pathname) ? url.searchParams.get('authorId') ?? undefined : undefined);
      else id = /^\/pages\/publications\/(\d{1,20})\/?$/.exec(url.pathname)?.[1]
        ?? (/^\/record\/display\.uri$/.test(url.pathname) ? /^2-s2\.0-(\d{1,20})$/.exec(url.searchParams.get('eid') ?? '')?.[1] : undefined);
      const title = link.title.replace(/\s+/g, ' ').trim();
      if (!id || !/^\d{1,20}$/.test(id) || title.length < 3 || /^(show|view|details|profile|documents|[\d,]+)\b/i.test(title)) continue;
      rows.push({ id, title, url: kind === 'authors' ? `https://www.scopus.com/pages/author/${id}` : `https://www.scopus.com/pages/publications/${id}`,
        context: link.context, doi: link.doi });
    } catch (error) { if (error instanceof ScopusError) throw error; }
  }
  return [...new Map(rows.map(row => [row.id, row])).values()];
}
async function snapshot(page: Page, publications = false): Promise<PublicSnapshot> {
  return page.evaluate(publications => {
    let root: Element | Document = document;
    if (publications) {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(e => /\bdocuments?\b/i.test(e.textContent ?? ''));
      const panel = tab?.getAttribute('aria-controls');
      const region = Array.from(document.querySelectorAll('section,[role="region"]')).find(e => /^documents?(?:\s*\(?[\d,]+\)?)?$/i.test(e.getAttribute('aria-label') ?? e.querySelector('h2,h3')?.textContent?.trim() ?? ''));
      const scoped = (panel ? document.getElementById(panel) : null) ?? region;
      if (scoped) root = scoped;
    }
    return { url: location.href, text: document.body.innerText.slice(0, 200000), publication_scope: !publications || root !== document,
    headings: Array.from(document.querySelectorAll('h1')).map(e => e.textContent?.trim() ?? ''),
    tabs: Array.from(document.querySelectorAll('[role="tab"]')).map(e => e.textContent?.trim() ?? ''),
    links: Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).slice(0, 5000).map(a => {
      const row = a.closest('tr,li,article,[data-testid*="result-item"],[data-testid*="document-card"],[data-testid*="author-card"]');
      return { url: a.href, title: a.innerText.trim(), context: row?.textContent?.trim().slice(0, 3000) ?? '',
        doi: row?.querySelector<HTMLAnchorElement>('a[href^="https://doi.org/"]')?.href?.replace('https://doi.org/', '') ?? null };
    }) };
  }, publications);
}
export class PublicScopusSource implements PublicSource {
  private busy = false;
  constructor(private readonly options: { channel?: string; headless?: boolean; sandbox?: boolean;
    contextFactory?: () => Promise<BrowserContext> } = {}) {}
  private async withPage<T>(run: (page: Page) => Promise<T>): Promise<T> {
    if (this.busy) throw new ScopusError('PUBLIC_BROWSER_BUSY', 'Another public Scopus lookup is running; retry after it completes.');
    this.busy = true;
    let context: BrowserContext | undefined;
    let closeBrowser: (() => Promise<void>) | undefined;
    try {
      try {
        if (this.options.contextFactory) context = await this.options.contextFactory();
        else {
          const browser = await chromium.launch({ channel: this.options.channel, headless: this.options.headless ?? true, chromiumSandbox: this.options.sandbox ?? true });
          closeBrowser = () => browser.close(); context = await browser.newContext({ locale: 'en-US' });
        }
      } catch (error) {
        if (error instanceof Error && /spawn EPERM|permission denied/i.test(error.message)) throw new ScopusError('BROWSER_EXECUTION_DENIED', 'This runtime denied permission to start the browser. Run on a host that permits browser processes. This is not missing Scopus data and does not require an API key.');
        throw new ScopusError('BROWSER_UNAVAILABLE', 'The browser could not start. Install Chromium with: npx playwright install chromium and set SCOPUS_BROWSER_CHANNEL=chromium, or select an installed msedge/chrome channel. No API key is needed.');
      }
      const page = await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(15000);
      // Never follow a main-frame navigation to an arbitrary site or an authentication provider.
      await page.route('**/*', route => {
        if (route.request().isNavigationRequest() && route.request().frame() === page.mainFrame() && !official(new URL(route.request().url()))) return route.abort();
        return route.fallback();
      });
      return await run(page);
    } catch (error) {
      if (error instanceof ScopusError) throw error;
      throw new ScopusError('PUBLIC_SCOPUS_UNREACHABLE', 'The public Scopus page did not load or its layout was not recognized. No publication absence is established. Try the exact author profile URL or retry where Scopus Preview is reachable.');
    } finally { await context?.close().catch(() => {}); await closeBrowser?.().catch(() => {}); this.busy = false; }
  }
  private async open(page: Page, url: string) {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (response && [401, 403, 429].includes(response.status())) throw new ScopusError('PUBLIC_ACCESS_BLOCKED', `Scopus returned HTTP ${response.status()} for the public page. No API request or challenge bypass was attempted.`);
    if (response && response.status() >= 400) throw new ScopusError('PUBLIC_HTTP_ERROR', `Public Scopus returned HTTP ${response.status()}; this does not prove no publications.`);
    const cookie = page.getByRole('button', { name: /^(accept all cookies|accept all)$/i }).first();
    if (await cookie.isVisible()) await cookie.click();
    parsePublicSnapshot(await snapshot(page), 'authors');
  }
  async findAuthors(input: { name: string; university: string; family_name?: string; given_name?: string }) {
    return this.withPage(async page => {
      await this.open(page, 'https://www.scopus.com/freelookup/form/author.uri');
      const name = splitName(input.name, input.family_name, input.given_name);
      await page.getByRole('textbox', { name: /last name|surname/i }).first().fill(name.family);
      if (name.given) await page.getByRole('textbox', { name: /first name|given name/i }).first().fill(name.given);
      await page.getByRole('textbox', { name: /affiliation|organization|organisation/i }).first().fill(input.university);
      await page.getByRole('button', { name: /^search$/i }).first().click();
      await page.waitForFunction(() => !!document.querySelector('a[href*="/pages/author/"],a[href*="/authid/detail"]') || /no (?:authors|results)|0 authors|captcha|access denied|verify.*human/i.test(document.body.innerText));
      const data = await snapshot(page), rows = parsePublicSnapshot(data, 'authors');
      if (!rows.length && !/no (?:authors|results)|0 authors/i.test(data.text)) throw new ScopusError('PUBLIC_LAYOUT_CHANGED', 'The public author result layout could not be recognized.');
      return rows.map(row => ({ id: row.id, name: row.title, university: null, search_result_context: row.context || null, url: row.url }));
    });
  }
  async publications(author: AuthorCandidate, max: number): Promise<PublicationResult> {
    return this.withPage(async page => {
      const id = profileId(author.id, 'author');
      await this.open(page, `https://www.scopus.com/pages/author/${id}`);
      await page.waitForFunction(() => !!document.querySelector('a[href*="/pages/publications/"],a[href*="/record/display.uri"]') || /captcha|access denied|verify.*human|0 documents|documents\s*\(?0\)?|no documents/i.test(document.body.innerText));
      const data = await snapshot(page, true);
      if (profileId(data.url, 'author') !== id) throw new ScopusError('PUBLIC_PROFILE_CHANGED', 'Scopus resolved a different author profile. Select the correct author ID before exporting.');
      if (!data.publication_scope) throw new ScopusError('PUBLIC_LAYOUT_CHANGED', 'The author Documents section could not be identified. Unrelated publication links were not exported.');
      const rows = parsePublicSnapshot(data, 'publications');
      // Only read a reported total from the Documents tab; never infer it from page size.
      const label = data.tabs.find(t => /\bdocuments?\b/i.test(t));
      const match = label?.match(/(?:documents?\s*\(?\s*([\d,]+)|([\d,]+)\s*\)?\s*documents?)/i);
      const total = match ? Number((match[1] ?? match[2])!.replaceAll(',', '')) : null;
      if (!rows.length && total !== 0) throw new ScopusError('PUBLIC_LAYOUT_CHANGED', 'No Scopus publication links could be verified in this public profile. It may be access limited or the page layout may have changed.');
      const items = rows.slice(0, max).map(row => ({ id: row.id, eid: `2-s2.0-${row.id}`, title: row.title, doi: row.doi, url: row.url }));
      const complete = total !== null && total === items.length;
      return { items, total, complete, coverage: 'Public Scopus Preview; only publication links visible on the author profile were exported.',
        warnings: complete ? [] : ['Elsevier documents that non-subscribers see only the first 10 publications and limited metadata. This is a partial/unknown-coverage export, not all papers.'],
        fetched_at: new Date().toISOString() };
    });
  }
}
export function configuredPublicSource(env: NodeJS.ProcessEnv = process.env) {
  const channel = env.SCOPUS_BROWSER_CHANNEL === 'chromium' ? undefined : env.SCOPUS_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
  return new PublicScopusSource({ channel, headless: env.SCOPUS_HEADLESS !== 'false', sandbox: env.SCOPUS_BROWSER_SANDBOX !== 'false' });
}
