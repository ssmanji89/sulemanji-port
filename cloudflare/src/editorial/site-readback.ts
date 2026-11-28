import * as parse5 from 'parse5';
import type { ContextualLink } from './contracts.js';

export const CANONICAL_SITE_ORIGIN = 'https://www.sulemanji.com';
export const MAX_SITE_DOCUMENT_BYTES = 2_000_000;

export type EditorialFixtureSite = Pick<Fetcher, 'fetch'>;

export function fixtureSiteFetcher(binding: EditorialFixtureSite | undefined): typeof fetch {
  return async (input, init) => {
    if (!binding) throw new Error('EDITORIAL_FIXTURE_SITE_NOT_BOUND');
    const request = new Request(input, { ...init, redirect: 'manual' });
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== CANONICAL_SITE_ORIGIN ||
        url.username || url.password || url.search || url.hash) {
      throw new Error('EDITORIAL_FIXTURE_SITE_REQUEST_REJECTED');
    }
    return binding.fetch(request);
  };
}

export type HtmlNode = { nodeName?: string; tagName?: string; value?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: HtmlNode[] };

export function htmlAttribute(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((attr) => attr.name === name)?.value;
}

export function normalizeNodeText(node: HtmlNode): string {
  const extract = (row: HtmlNode): string => {
    if (['script', 'style', 'noscript', 'template'].includes(row.nodeName ?? '')) return '';
    return row.value ?? (row.childNodes ?? []).map(extract).join(' ');
  };
  return extract(node).replace(/\s+/g, ' ').trim();
}

export function articleLinks(node: HtmlNode, tag: 'a' | 'img' = 'a'): string[] {
  if (['script', 'style', 'noscript', 'template'].includes(node.nodeName ?? '')) return [];
  const href = node.tagName === tag ? htmlAttribute(node, tag === 'a' ? 'href' : 'src') : undefined;
  return [...(href === undefined ? [] : [href]), ...(node.childNodes ?? []).flatMap((child) => articleLinks(child, tag))];
}

export function publicCitationUrl(href: string): string | null {
  if (!/^https:\/\//i.test(href) || /[\x00-\x20\x7f<>\\]/.test(href)) return null;
  try {
    const url = new URL(href);
    return !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function articleCitations(node: HtmlNode): Set<string> {
  return new Set(articleLinks(node).map(publicCitationUrl).filter((url): url is string => url !== null));
}

export function connectionParagraph(body: HtmlNode, href: string): HtmlNode | undefined {
  const paragraphs = (body.childNodes ?? []).filter((node) => node.tagName === 'p' && articleLinks(node).includes(href));
  return paragraphs.length === 1 ? paragraphs[0] : undefined;
}

export async function textDigest(text: string): Promise<string> {
  return bytesDigest(new TextEncoder().encode(text).buffer as ArrayBuffer);
}

export async function bytesDigest(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readBoundedSiteBytes(response: Response, maximum: number, label: string): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`${label} response body is missing`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.length > maximum) {
        await reader.cancel();
        throw new Error(`${label} response exceeds bound`);
      }
      chunks.push(value);
      size += value.length;
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}

export async function matchesConnectionParagraph(paragraph: HtmlNode, expected: ContextualLink): Promise<boolean> {
  const links = articleLinks(paragraph);
  return links.length === 1 + expected.sources.length && links[0] === expected.href &&
    expected.sources.every((url, index) => url === links[index + 1]) &&
    await textDigest(normalizeNodeText(paragraph)) === expected.text_sha256;
}

export async function readConnectionBaseline(fetcher: typeof fetch, articleUrl: string, relatedUrl: string, baseCommit: string, staging: boolean) {
  const url = new URL(articleUrl, CANONICAL_SITE_ORIGIN);
  const peer = new URL(relatedUrl, CANONICAL_SITE_ORIGIN);
  if ([url, peer].some((item) => item.origin !== CANONICAL_SITE_ORIGIN ||
      !/^\/notes\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.pathname) || item.search || item.hash || item.username || item.password)) return null;
  const response = await fetcher(url, { redirect: 'manual' });
  if (!response.ok || (response.url ? response.url !== url.href : !staging) ||
      response.headers.get('x-site-source-commit') !== baseCommit) return null;
  const html = await response.text();
  if (html.length > 2_000_000) return null;
  const bodies: HtmlNode[] = [];
  const walk = (node: HtmlNode): void => {
    if (node.tagName === 'div' && htmlAttribute(node, 'data-writing-body') !== undefined) bodies.push(node);
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(parse5.parse(html) as unknown as HtmlNode);
  if (bodies.length !== 1) return null;
  const text = normalizeNodeText(bodies[0]);
  if (!text) return null;
  const alreadyLinked = articleLinks(bodies[0]).some((href) => {
    try { return new URL(href, url).href === peer.href; } catch { return false; }
  });
  return { text_sha256: await textDigest(text), already_linked: alreadyLinked };
}
