import { describe, expect, it, vi } from 'vitest';
import { resolveRoute, serveSite, type RouteRule, type SiteEnv } from '../src/site/routes.js';

const rules: RouteRule[] = [
  { source: '/writing/', kind: 'redirect', target: '/writing', status: 301 },
  { source: '/old-market/', kind: 'redirect', target: '/work/market-systems/', status: 301 },
  { source: '/work-with-me/', kind: 'redirect', target: '/contact/', status: 301 },
  { source: '/workshop-intake/', kind: 'gone', destination: '/contact/' },
];

const makeEnv = (asset: Response | null = new Response('<main>article</main>', { headers: { 'content-type': 'text/html; charset=utf-8' } })): SiteEnv => ({
  ASSETS: { fetch: vi.fn(async () => asset ?? new Response('not found', { status: 404 })) },
  RELEASE: { source_commit: 'abc123', asset_digest: 'sha256:test', built_at: '2026-11-26T00:00:00Z' },
});

describe('site route contract', () => {
  it('keeps Writing canonical and removes only the trailing slash', () => {
    expect(resolveRoute('/writing/', rules)).toEqual({ kind: 'redirect', target: '/writing', status: 301 });
  });

  it('preserves the query string on safe redirects', async () => {
    const response = await serveSite(new Request('https://www.sulemanji.com/old-market/?from=archive'), makeEnv(), rules);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://www.sulemanji.com/work/market-systems/?from=archive');
  });

  it('keeps a retired intake path pointed at public Contact', async () => {
    const response = await serveSite(new Request('https://www.sulemanji.com/workshop-intake/'), makeEnv(), rules);
    expect(response.status).toBe(410);
    expect(response.headers.get('location')).toBe('https://www.sulemanji.com/contact/');
  });

  it('rejects an unsafe redirect destination', () => {
    expect(resolveRoute('/x', [{ source: '/x', kind: 'redirect', target: '//evil.example/', status: 301 }])).toEqual({ kind: 'not-found' });
  });

  it('returns a real 404 for a missing asset and preserves HTML MIME', async () => {
    const missing = await serveSite(new Request('https://www.sulemanji.com/notes/does-not-exist'), makeEnv(null), rules);
    expect(missing.status).toBe(404);
    const note = await serveSite(new Request('https://www.sulemanji.com/writing/example-note'), makeEnv(), rules);
    expect(note.headers.get('content-type')).toContain('text/html');
  });

  it('supports HEAD and applies public cache and release headers', async () => {
    const response = await serveSite(new Request('https://www.sulemanji.com/writing/example-note', { method: 'HEAD' }), makeEnv(), rules);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('cache-control')).toMatch(/public/);
    expect(response.headers.get('x-site-source-commit')).toBe('abc123');
  });
});
