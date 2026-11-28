import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as parse5 from 'parse5';
import { describe, expect, it } from 'vitest';
import { articleCitationsFromManifest } from '../src/editorial/release-proof.js';
import { articleCitations, type HtmlNode } from '../src/editorial/site-readback.js';

const base = process.env.SITE_PREVIEW_URL;
type ArticleIdentity = { url: string; published_on: string | null };

describe.skipIf(!base)('built site in Wrangler Worker runtime', () => {
  it('serves the canonical Writing page and redirects the trailing-slash variant', async () => {
    const canonical = await fetch(`${base}/writing`, { redirect: 'manual' });
    expect(canonical.status).toBe(200);
    expect(canonical.headers.get('content-type')).toContain('text/html');
    const alias = await fetch(`${base}/writing/`, { redirect: 'manual' });
    expect(alias.status).toBe(301);
    expect(new URL(alias.headers.get('location')!).pathname).toBe('/writing');
  });

  it('serves an existing note and work case without changing their paths', async () => {
    for (const path of ['/notes/late-october-skywatching-binoculars-telescope', '/work/market-systems/']) {
      const response = await fetch(`${base}${path}`, { redirect: 'manual' });
      expect(response.status, path).toBe(200);
      expect(response.headers.get('content-type'), path).toContain('text/html');
    }
  });

  it('keeps retired routes closed and sends visitors to the public contact route', async () => {
    const oldOffer = await fetch(`${base}/work-with-me/`, { redirect: 'manual' });
    expect(oldOffer.status).toBe(301);
    expect(new URL(oldOffer.headers.get('location')!).pathname).toBe('/contact/');
    const intake = await fetch(`${base}/workshop-intake/`, { redirect: 'manual' });
    expect(intake.status).toBe(410);
    expect(new URL(intake.headers.get('location')!).pathname).toBe('/contact/');
  });

  it('returns a real 404, supports HEAD, and publishes release metadata', async () => {
    expect((await fetch(`${base}/notes/does-not-exist`, { redirect: 'manual' })).status).toBe(404);
    const head = await fetch(`${base}/writing`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const release = await fetch(`${base}/release.json`);
    expect(release.status).toBe(200);
    const manifest = await release.json() as { source_commit: string; asset_digest: string; built_at: string; articles: ArticleIdentity[] };
    expect(manifest.source_commit).toMatch(/^(local|[0-9a-f]{7,64})$/);
    expect(manifest.asset_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifest.built_at).toBeTruthy();
    const baselineUrl = new URL('../../docs/redevelopment/2026-11-26/article-baseline.json', import.meta.url);
    const baseline = JSON.parse(readFileSync(baselineUrl, 'utf8')) as { articles: ArticleIdentity[] };
    const datesByUrl = new Map(manifest.articles.map(({ url, published_on }) => [url, published_on]));
    expect(datesByUrl.size).toBe(manifest.articles.length);
    for (const { url, published_on } of baseline.articles) {
      expect(datesByUrl.get(url), url).toBe(published_on);
    }
    expect(release.headers.get('x-site-source-commit')).toBe(manifest.source_commit);
    expect(release.headers.get('x-site-asset-digest')).toBe(manifest.asset_digest);
    expect(release.headers.get('x-site-built-at')).toBe(manifest.built_at);
    const home = await fetch(`${base}/`);
    expect(home.headers.get('x-site-source-commit')).toBe(manifest.source_commit);
    expect(home.headers.get('x-site-asset-digest')).toBe(manifest.asset_digest);
    expect(home.headers.get('x-site-built-at')).toBe(manifest.built_at);
  });

  it('serves immutable asset URLs with the exact manifest bytes in versioned builds', async () => {
    const release = await fetch(`${base}/release.json`);
    const manifest = await release.json() as { files: Record<string, string> };
    const assets = Object.entries(manifest.files).filter(([path]) => path.startsWith('_site-assets/'));
    if (process.env.SITE_VERSION_ASSETS === '1') expect(assets.length).toBeGreaterThan(0);
    if (!assets.length) return;

    const home = await fetch(`${base}/`);
    const html = await home.text();
    expect(html).toMatch(/href="\/_site-assets\/[a-f0-9]{64}\/assets\/css\/style\.css"/);
    expect(html).toMatch(/src="\/_site-assets\/[a-f0-9]{64}\/assets\/js\/theme-toggle\.js"/);
    for (const [path, digest] of assets) {
      const urlPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(`${base}/${urlPath}`, { redirect: 'manual' });
      expect(response.status, path).toBe(200);
      expect(response.headers.get('cache-control'), path).toBe('public, max-age=31536000, immutable');
      const body = Buffer.from(await response.arrayBuffer());
      expect(createHash('sha256').update(body).digest('hex'), path).toBe(digest);
    }
  });

  it('publishes the same citation index the editorial Worker reads from rendered articles', async () => {
    const release = await fetch(`${base}/release.json`);
    const manifest = await release.json() as Parameters<typeof articleCitationsFromManifest>[0] & {
      articles: Array<ArticleIdentity & { indexable: boolean }>;
    };
    const articleRoutes = manifest.articles.filter((article) => article.indexable).map((article) => article.url);
    expect(Object.keys(manifest.article_citations ?? {}).sort()).toEqual([...articleRoutes].sort());

    function articleBody(node: HtmlNode): HtmlNode[] {
      if (node.tagName === 'div' && node.attrs?.some(({ name }) => name === 'data-writing-body')) return [node];
      return (node.childNodes ?? []).flatMap(articleBody);
    }
    for (const route of articleRoutes) {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      expect(response.status, route).toBe(200);
      const bodies = articleBody(parse5.parse(await response.text()) as unknown as HtmlNode);
      expect(bodies.length, route).toBe(1);
      expect(articleCitationsFromManifest(manifest, route), route).toEqual(articleCitations(bodies[0]));
    }
  });
});
