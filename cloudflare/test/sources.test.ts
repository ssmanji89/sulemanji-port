import { describe, expect, it } from 'vitest';
import { collectSignals, revalidateSignalSourceDigest, sourceSetDigest } from '../src/editorial/sources.js';
import type { SourceConfig } from '../src/editorial/contracts.js';

const now = new Date('2026-11-26T18:00:00.000Z');
const xml = `<?xml version="1.0"?><rss><channel><item><title>Workers SDK releases version 4.2</title><link>https://blog.example.test/releases/42</link><guid>release-42</guid><pubDate>Thu, 26 Nov 2026 17:00:00 GMT</pubDate><description>New release improves durable workflow support.</description></item></channel></rss>`;
const config = (overrides: Partial<SourceConfig> = {}): SourceConfig => ({ id: 'vendor', url: 'https://blog.example.test/feed.xml', format: 'rss',
  topic_ids: ['infrastructure'], allowed_hostnames: ['blog.example.test'], min_interval_seconds: 3600, max_age_seconds: 86400, enabled: true, ...overrides });

describe('bounded public signal collection', () => {
  it('keeps publication, event, and retrieval times distinct', async () => {
    const batch = await collectSignals([config()], now, async () => new Response(xml, { status: 200 }));
    expect(batch.failures).toEqual([]);
    expect(batch.signals).toHaveLength(1);
    expect(batch.signals[0]).toMatchObject({ observed_at: now.toISOString(), occurred_at: '2026-11-26T17:00:00.000Z', published_at: '2026-11-26T17:00:00.000Z' });
    expect(batch.signals[0].expires_at).toBe('2026-11-27T17:00:00.000Z');
  });

  it('deduplicates an episode repeated across registered feeds', async () => {
    const batch = await collectSignals([config({ id: 'feed-a' }), config({ id: 'feed-b' })], now, async () => new Response(xml));
    expect(batch.signals).toHaveLength(1);
  });

  it('rejects redirects outside the registered host allowlist', async () => {
    const batch = await collectSignals([config()], now, async () => new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/secret' } }));
    expect(batch.signals).toHaveLength(0);
    expect(batch.failures).toMatchObject([{ source_id: 'vendor', code: 'FORBIDDEN' }]);
  });

  it('rejects private destinations before making a request', async () => {
    let called = false;
    const batch = await collectSignals([config({ url: 'https://127.0.0.1/feed.xml', allowed_hostnames: ['127.0.0.1'] })], now, async () => { called = true; return new Response(xml); });
    expect(called).toBe(false);
    expect(batch.failures).toMatchObject([{ code: 'FORBIDDEN' }]);
  });

  it('rejects a body that exceeds the bounded response size', async () => {
    const oversized = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1_048_577)); controller.close(); } }));
    const batch = await collectSignals([config()], now, async () => oversized);
    expect(batch.failures).toMatchObject([{ code: 'LIMIT' }]);
  });

  it('does not promote stale or future events to current signals', async () => {
    const old = xml.replace('Thu, 26 Nov 2026 17:00:00 GMT', 'Thu, 01 Jan 2020 17:00:00 GMT');
    const future = xml.replace('Thu, 26 Nov 2026 17:00:00 GMT', 'Thu, 01 Jan 2027 17:00:00 GMT');
    expect((await collectSignals([config()], now, async () => new Response(old))).signals).toHaveLength(0);
    expect((await collectSignals([config()], now, async () => new Response(future))).signals).toHaveLength(0);
  });

  it('recomputes the reviewed source digest and fails closed when the source changed or disappeared', async () => {
    const original = await collectSignals([config()], now, async () => new Response(xml));
    expect(original.signals).toHaveLength(1);
    const reviewed = original.signals[0];
    const unchanged = await revalidateSignalSourceDigest(reviewed, [config()], now, async () => new Response(xml));
    expect(unchanged).toBe(await sourceSetDigest(reviewed.evidence));

    const changed = xml.replace('New release improves durable workflow support.', 'The release now changes its behavior.');
    await expect(revalidateSignalSourceDigest(reviewed, [config()], now, async () => new Response(changed))).resolves.toBeNull();
    await expect(revalidateSignalSourceDigest(reviewed, [config()], now, async () => new Response('unavailable', { status: 503 }))).resolves.toBeNull();
  });
});
