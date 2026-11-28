import type { PublicSource, Signal, SignalBatch, SourceConfig, SourceFailure } from './contracts.js';
import { isSiteOutput } from './evidence-origin.js';

const MAX_SOURCE_BYTES = 1_048_576;
const MAX_ENTRIES_PER_SOURCE = 100;
const REDIRECT_LIMIT = 3;

function safeHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(':')) return false;
  return true;
}

function allowedUrl(raw: string, hosts: string[]): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || !safeHost(url.hostname)) return null;
    if (!hosts.some((host) => url.hostname.toLowerCase() === host.toLowerCase())) return null;
    return url;
  } catch { return null; }
}

async function boundedBody(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_SOURCE_BYTES) throw new Error('LIMIT');
  if (!response.body) throw new Error('INVALID');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SOURCE_BYTES) { await reader.cancel(); throw new Error('LIMIT'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function text(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#8217;|&rsquo;/gi, '’').replace(/\s+/g, ' ').trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!match) return '';
  const cdata = match[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return text(cdata ? cdata[1] : match[1]);
}

type Entry = { title: string; summary: string; url: string; date: string | null; id: string; origin?: unknown[] };

function attribute(tagText: string, name: string): string {
  const match = tagText.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? text(match[2]) : '';
}

function originLinks(block: string): string[] {
  return [...block.matchAll(/<(?:[\w-]+:)?link\b[^>]*>/gi)].flatMap(([link]) =>
    attribute(link, 'rel').toLowerCase().split(/\s+/).some((rel) => ['canonical', 'via', 'self', 'alternate'].includes(rel))
      ? [attribute(link, 'href')] : []);
}

function feedOrigins(block: string): string[] {
  const metadata = block.replace(/<(description|summary|content(?::encoded)?)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const source = metadata.match(/(<source\b[^>]*>)([\s\S]*?)<\/source>/i);
  return [...originLinks(metadata), ...(source ? [attribute(source[1], 'url'), tag(source[2], 'id')] : [])];
}

function entries(body: string, format: SourceConfig['format'], base: URL): Entry[] {
  if (format === 'json') {
    const parsed = JSON.parse(body) as { items?: unknown[]; feed_url?: unknown };
    if (!Array.isArray(parsed.items)) throw new Error('INVALID');
    if (isSiteOutput(parsed.feed_url)) return [];
    return parsed.items.slice(0, MAX_ENTRIES_PER_SOURCE).map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('INVALID');
      const row = item as Record<string, unknown>;
      const url = typeof row.url === 'string' ? new URL(row.url, base).toString() : '';
      return { title: text(String(row.title ?? '')), summary: text(String(row.summary ?? row.content_text ?? '')),
        url, date: typeof row.date_published === 'string' ? row.date_published : null, id: String(row.id ?? url ?? index),
        origin: [row.external_url] };
    });
  }
  if (format === 'nasa-skywatching') {
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed)) throw new Error('INVALID');
    return parsed.slice(0, MAX_ENTRIES_PER_SOURCE).map((row) => {
      const date = typeof row?.date_gmt === 'string' ? new Date(row.date_gmt + 'Z') : null;
      const bodyHtml: unknown = row?.content?.rendered;
      if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== row.date_gmt ||
          typeof row.link !== 'string' || typeof row.title?.rendered !== 'string' ||
          typeof bodyHtml !== 'string') throw new Error('INVALID');
      const list = bodyHtml.match(/<h2\b[^>]*>\s*Skywatching Highlights\s*<\/h2>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1];
      if (!list) throw new Error('INVALID');
      const highlights = Array.from(list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (match) => text(match[1]))
        .filter(Boolean).slice(0, 8);
      if (!highlights.length) throw new Error('INVALID');
      return { title: text(row.title.rendered), summary: highlights.join('\n'), url: row.link,
        date: date.toISOString(), id: row.link };
    });
  }
  if ((format === 'rss' || format === 'atom') &&
      originLinks(body.replace(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi, '')).some(isSiteOutput)) return [];
  if (format === 'rss') {
    const blocks = body.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
    return blocks.slice(0, MAX_ENTRIES_PER_SOURCE).map((block, index) => {
      const link = tag(block, 'link') || block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || '';
      return { title: tag(block, 'title'), summary: tag(block, 'description') || tag(block, 'content:encoded'),
        url: new URL(link, base).toString(), date: tag(block, 'pubDate') || tag(block, 'dc:date') || null, id: tag(block, 'guid') || link || String(index),
        origin: feedOrigins(block) };
    });
  }
  if (format === 'atom') {
    const blocks = body.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) ?? [];
    return blocks.slice(0, MAX_ENTRIES_PER_SOURCE).map((block, index) => {
      const link = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? '';
      return { title: tag(block, 'title'), summary: tag(block, 'summary') || tag(block, 'content'),
        url: new URL(link, base).toString(), date: tag(block, 'updated') || tag(block, 'published') || null, id: tag(block, 'id') || link || String(index),
        origin: feedOrigins(block) };
    });
  }
  const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const description = body.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ?? '';
  const published = body.match(/<meta\b[^>]*(?:property|name)=["'](?:article:published_time|date)["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ?? '';
  const head = body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  return [{ title: text(title), summary: text(description), url: base.toString(), date: published || null, id: base.toString(), origin: originLinks(head) }];
}

async function sha(value: string): Promise<string> {
  const result = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...result].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function sourceSetDigest(sources: PublicSource[]): Promise<string> {
  return sha(sources.map((source) => `${source.url}\n${source.content_sha256}`).sort().join('\n'));
}

async function collectSource(source: SourceConfig, now: Date, fetcher: typeof fetch): Promise<Signal[]> {
  if (!source.enabled || isSiteOutput(source.url)) return [];
  if (!source.id || !Array.isArray(source.topic_ids) || source.topic_ids.length === 0 ||
      !Number.isSafeInteger(source.max_age_seconds) || source.max_age_seconds <= 0 || !Number.isSafeInteger(source.min_interval_seconds) || source.min_interval_seconds < 0) throw new Error('INVALID');
  const url = allowedUrl(source.url, source.allowed_hostnames);
  if (!url) throw new Error('FORBIDDEN');
  let current = url;
  let response: Response | null = null;
  for (let i = 0; i <= REDIRECT_LIMIT; i += 1) {
    response = await fetcher(current, { redirect: 'manual', headers: { accept: 'application/rss+xml, application/atom+xml, application/feed+json, application/json, text/html;q=0.8' } });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    const destination = location ? new URL(location, current).toString() : '';
    if (isSiteOutput(destination)) return [];
    const next = allowedUrl(destination, source.allowed_hostnames);
    if (!next || i === REDIRECT_LIMIT) throw new Error('FORBIDDEN');
    current = next;
  }
  if (!response || !response.ok) throw new Error('NETWORK');
  if (response.status >= 300 && response.status < 400) throw new Error('FORBIDDEN');
  const body = await boundedBody(response);
  const retrievedAt = now.toISOString();
  const parsed = entries(body, source.format, current);
  const signals: Signal[] = [];
  for (const entry of parsed) {
    if (!entry.title || !entry.url || !entry.summary) continue;
    if ([entry.url, entry.id, ...(entry.origin ?? [])].some(isSiteOutput)) continue;
    const evidenceUrl = allowedUrl(entry.url, source.allowed_hostnames);
    if (!evidenceUrl) continue;
    const published = entry.date && Number.isFinite(Date.parse(entry.date)) ? new Date(entry.date).toISOString() : null;
    if (!published || now.getTime() - Date.parse(published) > source.max_age_seconds * 1000 || Date.parse(published) > now.getTime() + 60_000) continue;
    const contentHash = await sha(`${entry.title}\n${entry.summary}\n${evidenceUrl.toString()}`);
    const evidence: PublicSource = { url: evidenceUrl.toString(), title: entry.title.slice(0, 300), retrieved_at: retrievedAt, source_date: published, content_sha256: contentHash };
    // A WordPress post keeps its canonical URL when its title or publication timestamp is corrected.
    const episodeKey = source.format === 'nasa-skywatching'
      ? evidenceUrl.toString() : `${evidenceUrl.toString()}\n${entry.title.toLocaleLowerCase()}\n${published}`;
    const episodeId = await sha(episodeKey);
    const revision = await sha(`${episodeId}\n${contentHash}\n${published}`);
    signals.push({ id: await sha(`${source.id}\n${revision}`), episode_id: episodeId, source_id: source.id, source_revision: revision,
      observed_at: retrievedAt, occurred_at: source.format === 'nasa-skywatching' ? null : published, published_at: published, expires_at: new Date(Date.parse(published) + source.max_age_seconds * 1000).toISOString(),
      topic_ids: [...new Set(source.topic_ids)], title: evidence.title, summary: entry.summary.slice(0, 3000), evidence: [evidence] });
  }
  return signals;
}

export async function collectSignals(registry: SourceConfig[], now: Date, fetcher: typeof fetch = fetch): Promise<SignalBatch> {
  const signals: Signal[] = [];
  const failures: SourceFailure[] = [];
  const seen = new Set<string>();
  for (const source of registry.slice(0, 100)) {
    try {
      for (const signal of await collectSource(source, now, fetcher)) {
        if (seen.has(signal.episode_id)) continue;
        seen.add(signal.episode_id);
        signals.push(signal);
      }
    } catch (error) {
      const code = error instanceof Error && ['LIMIT', 'INVALID', 'FORBIDDEN'].includes(error.message) ? error.message as SourceFailure['code'] : 'NETWORK';
      failures.push({ source_id: source.id, code, detail: code === 'NETWORK' ? 'Public source fetch failed.' : `Source rejected: ${code.toLowerCase()}.` });
    }
  }
  return { signals, failures };
}

export async function revalidateSignalSourceDigest(signal: Signal, registry: SourceConfig[], now: Date, fetcher: typeof fetch = fetch): Promise<string | null> {
  const source = registry.find((item) => item.id === signal.source_id);
  if (!source) return null;
  const current = await collectSignals([source], now, fetcher);
  if (current.failures.length) return null;
  const matching = current.signals.find((item) => item.id === signal.id);
  return matching ? sourceSetDigest(matching.evidence) : null;
}
