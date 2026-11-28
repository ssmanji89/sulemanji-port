import { describe, expect, it } from 'vitest';
import { collectSignals, revalidateSignalSourceDigest, sourceSetDigest } from '../src/editorial/sources.js';
import publicSources from '../config/public-sources.json' with { type: 'json' };
import type { SourceConfig } from '../src/editorial/contracts.js';

const now = new Date('2026-11-26T18:00:00.000Z');
const xml = `<?xml version="1.0"?><rss xmlns:atom="http://www.w3.org/2005/Atom"><channel><item><title>Workers SDK releases version 4.2</title><link>https://blog.example.test/releases/42</link><guid>release-42</guid><pubDate>Thu, 26 Nov 2026 17:00:00 GMT</pubDate><description>New release improves durable workflow support.</description></item></channel></rss>`;
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

  it('collects the registered NASA posts with a UTC publication date and no inferred observation date', async () => {
    const registry = publicSources.filter(({ id }) => id === 'nasa-skywatching') as SourceConfig[];
    const url = 'https://science.nasa.gov/solar-system/skywatching/whats-up-november-2026-skywatching-tips-from-nasa/';
    const posts = [{ link: url, date_gmt: '2026-11-26T17:00:00',
      title: { rendered: 'What&#8217;s Up: November 2026 Skywatching Tips from NASA' },
      content: { rendered: '<p>A teaser about the Moon.</p><h2>Skywatching Highlights</h2>\n<ul><li><strong>Nov. 27:</strong> Watch the Moon after sunset.</li></ul><div>An unrelated transcript uses other phrases.</div>' } }];
    const batch = await collectSignals(registry, now, async () => Response.json(posts));
    expect(batch.failures).toEqual([]);
    expect(batch.signals).toHaveLength(1);
    expect(batch.signals[0]).toMatchObject({
      source_id: 'nasa-skywatching', title: 'What’s Up: November 2026 Skywatching Tips from NASA',
      observed_at: now.toISOString(), published_at: '2026-11-26T17:00:00.000Z', occurred_at: null,
      summary: 'Nov. 27: Watch the Moon after sunset.',
      evidence: [{ url, source_date: '2026-11-26T17:00:00.000Z' }],
    });
    await expect(revalidateSignalSourceDigest(batch.signals[0], registry, now, async () => Response.json(posts)))
      .resolves.toBe(await sourceSetDigest(batch.signals[0].evidence));

    const corrected = [{ ...posts[0], date_gmt: '2026-11-26T16:00:00',
      title: { rendered: "What's Up: November 2026 Skywatching Tips from NASA" } }];
    const [correction] = (await collectSignals(registry, now, async () => Response.json(corrected))).signals;
    expect(correction.episode_id).toBe(batch.signals[0].episode_id);
    expect(correction.source_revision).not.toBe(batch.signals[0].source_revision);

    const malformed = [{ ...posts[0], date_gmt: '2026-11-26' }];
    await expect(collectSignals(registry, now, async () => Response.json(malformed)))
      .resolves.toMatchObject({ signals: [], failures: [{ code: 'INVALID' }] });
  });

  it('deduplicates an episode repeated across registered feeds', async () => {
    const batch = await collectSignals([config({ id: 'feed-a' }), config({ id: 'feed-b' })], now, async () => new Response(xml));
    expect(batch.signals).toHaveLength(1);
  });

  it('drops republished entries with fresh IDs but a Sulemanji origin', async () => {
    const base = { title: 'An updated release note', date_published: '2026-11-26T17:00:00.000Z', summary: 'Updated workflow API guidance.' };
    const batch = await collectSignals([config({ format: 'json' })], now, async () => Response.json({ items: [
      { ...base, id: 'unrelated-new-id', url: 'https://blog.example.test/reposts/91',
        external_url: 'https://SULEMANJI.COM./notes/updated-workflow-guide?utm_source=feed' },
      { ...base, id: 'vendor-edition', url: 'https://blog.example.test/releases/42' },
    ] }));
    expect(batch.failures).toEqual([]);
    expect(batch.signals.map((signal) => signal.evidence[0].url)).toEqual(['https://blog.example.test/releases/42']);
  });

  it('drops syndication with quoted RSS source and Atom origin metadata', async () => {
    const syndicated = xml.replace('<guid>release-42</guid>', '<guid>new-id</guid><source url="https://www.sulemanji.com/feed.xml">Sulemanji</source>');
    const atom = '<feed><entry><id>new-id</id><title>Fresh title</title><link href="https://blog.example.test/repost"/><source><id>https://www.sulemanji.com/feed.xml</id></source><updated>2026-11-26T17:00:00Z</updated><summary>Copied summary</summary></entry></feed>';
    expect((await collectSignals([config()], now, async () => new Response(syndicated))).signals).toEqual([]);
    expect((await collectSignals([config({ format: 'atom' })], now, async () => new Response(atom))).signals).toEqual([]);
  });

  it('recognizes namespaced links, Atom source self URLs and JSON Feed identity', async () => {
    const rss = xml.replace('</item>', '<atom:link rel="canonical" href="https://sulemanji.com/notes/release"/></item>');
    const atom = '<feed><entry><title>Adapted title</title><link href="https://blog.example.test/repost"/><summary>New excerpt</summary><updated>2026-11-26T17:00:00Z</updated><source><id>urn:opaque:feed</id><link rel="self" href="//www.sulemanji.com/feed.xml"/></source></entry></feed>';
    const json = { feed_url: 'https://www.sulemanji.com/feed.json', items: [{
      id: 'new', title: 'Adapted title', summary: 'New excerpt', url: 'https://blog.example.test/repost', date_published: '2026-11-26T17:00:00Z',
    }] };
    for (const [format, value] of [['rss', rss], ['atom', atom], ['json', JSON.stringify(json)]] as const) {
      const batch = await collectSignals([config({ format })], now, async () => new Response(value));
      expect(batch).toEqual({ signals: [], failures: [] });
    }
  });

  it('keeps independent Atom reporting even when it links to a translation', async () => {
    const atom = '<feed><entry><title>Primary report</title><link href="https://blog.example.test/original"/><link rel="alternate" hreflang="fr" href="https://sulemanji.com/notes/translation"/><summary>The publisher reports a new fact.</summary><updated>2026-11-26T17:00:00Z</updated></entry></feed>';
    const { signals, failures } = await collectSignals([config({ format: 'atom' })], now, async () => new Response(atom));
    expect(failures).toEqual([]);
    expect(signals.map(({ evidence }) => evidence[0].url)).toEqual(['https://blog.example.test/original']);
  });

  it('treats Atom external content and scoped XML bases as provenance instead of a new publisher', async () => {
    const feed = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:fixture:repost</id><title>A changed title</title>' +
      '<summary>The article is presented under a fresh summary.</summary><updated>2026-11-26T17:00:00Z</updated>' +
      '<link href="https://blog.example.test/repost"/><content xml:base="https://www.sulemanji.com/notes/" src="original"/></entry>' +
      '<entry><id>urn:fixture:original</id><title>Primary source</title><summary>An original report.</summary><updated>2026-11-26T17:00:00Z</updated>' +
      '<link rel="alternate" href="https://blog.example.test/primary"/></entry></feed>';
    const batch = await collectSignals([config({ format: 'atom' })], now, async () => new Response(feed));
    expect(batch.failures).toEqual([]);
    expect(batch.signals.map(({ evidence }) => evidence[0].url)).toEqual(['https://blog.example.test/primary']);
  });

  it('reads the primary link from namespaced Atom without using self and enclosing links as the article', async () => {
    const feed = '<a:feed xmlns:a="http://www.w3.org/2005/Atom" xml:base="https://blog.example.test/">' +
      '<a:entry><a:id>urn:primary</a:id><a:title>Primary assertion</a:title><a:link rel="self" href="api/entry"/>' +
      '<a:link rel="enclosure" href="download.zip"/><a:link rel="alternate" href="articles/primary"/>' +
      '<a:summary>The primary authority published new measurements.</a:summary><a:updated>2026-11-26T17:00:00Z</a:updated></a:entry></a:feed>';
    const batch = await collectSignals([config({ format: 'atom' })], now, async () => new Response(feed));
    expect(batch.failures).toEqual([]);
    expect(batch.signals.map(({ evidence }) => evidence[0].url)).toEqual(['https://blog.example.test/articles/primary']);
  });

  it('reads scoped XHTML attribution while excluding hidden markup from the evidence text', async () => {
    const article = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:primary</id><title>New findings</title>' +
      '<updated>2026-11-26T17:00:00Z</updated><link href="https://blog.example.test/findings"/>' +
      '<summary type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml" xml:base="https://www.sulemanji.com/notes/">' +
      '<p>New findings alongside an <a rel="via" href="old">article</a>.</p><script>Excluded</script></div></summary></entry></feed>';
    expect(await collectSignals([config({ format: 'atom' })], now, async () => new Response(article))).toEqual({ signals: [], failures: [] });
    const independent = await collectSignals([config({ format: 'atom' })], now, async () => new Response(article.replace(' rel="via"', '')));
    expect(independent.signals).toHaveLength(1);
    expect(independent.signals[0].summary).not.toContain('Excluded');
  });

  it('rejects explicitly attributed copies and preserves ordinary site references in independent reporting', async () => {
    const owned = 'https://www.sulemanji.com/notes/released-note';
    const reference = '<p>We ran an independent test. <a href="' + owned + '">Related reading</a>.</p>';
    const declared = '<p>Rewritten account <a rel="via" href="' + owned + '">from the original</a>.</p>';
    const quoted = '<blockquote cite="' + owned + '">An edited excerpt from the original.</blockquote>';
    function rss(html: string, additional = '') {
      return xml.replace('<rss xmlns:', '<rss xmlns:meta="http://purl.org/dc/terms/" xmlns:r="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:')
        .replace(/<description>[^<]+<\/description>/, '<description><![CDATA[' + html + ']]></description>' + additional);
    }
    for (const mirrored of [rss(declared), rss(quoted), rss('Fresh prose', '<meta:source r:resource="' + owned + '"/>')]) {
      const batch = await collectSignals([config()], now, async () => new Response(mirrored));
      expect(batch).toEqual({ signals: [], failures: [] });
    }
    const ordinary = await collectSignals([config()], now, async () => new Response(rss(reference)));
    expect(ordinary.failures).toEqual([]);
    expect(ordinary.signals).toHaveLength(1);
    const json = (content_html: string) => ({ items: [{ id: 'original', title: 'A different title', content_html,
      url: 'https://blog.example.test/story', date_published: '2026-11-26T17:00:00Z' }] });
    await expect(collectSignals([config({ format: 'json' })], now, async () => Response.json(json(declared))))
      .resolves.toEqual({ signals: [], failures: [] });
    expect((await collectSignals([config({ format: 'json' })], now, async () => Response.json(json(reference)))).signals).toHaveLength(1);
  });

  it('distinguishes unreadable XML from empty independent-source coverage', async () => {
    for (const body of ['<rss><channel>', '<html>Incorrect response</html>', '<!DOCTYPE rss><rss><channel/></rss>']) {
      const result = await collectSignals([config()], now, async () => new Response(body));
      expect(result.failures).toMatchObject([{ code: 'INVALID' }]);
      expect(result.signals).toEqual([]);
    }
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
