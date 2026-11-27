import { describe, expect, it } from 'vitest';

const base = process.env.SITE_PREVIEW_URL;
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
    const manifest = await release.json() as { source_commit: string; asset_digest: string; built_at: string; articles: unknown[] };
    expect(manifest.source_commit).toMatch(/^(local|[0-9a-f]{7,64})$/);
    expect(manifest.asset_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifest.built_at).toBeTruthy();
    expect(manifest.articles).toHaveLength(55);
    expect(release.headers.get('x-site-source-commit')).toBe(manifest.source_commit);
    expect(release.headers.get('x-site-asset-digest')).toBe(manifest.asset_digest);
    expect(release.headers.get('x-site-built-at')).toBe(manifest.built_at);
    const home = await fetch(`${base}/`);
    expect(home.headers.get('x-site-source-commit')).toBe(manifest.source_commit);
    expect(home.headers.get('x-site-asset-digest')).toBe(manifest.asset_digest);
    expect(home.headers.get('x-site-built-at')).toBe(manifest.built_at);
  });
});
