import type { CatalogItem, PublicKnowledge, Signal } from './contracts.js';

const SITE_HOST = 'sulemanji.com';
const SITE_REPO_PATH = /^\/ssmanji89\/sulemanji-port(?:\/|$)/i;

export function isSiteOutput(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return host === SITE_HOST || host.endsWith('.' + SITE_HOST) ||
      ((host === 'github.com' || host === 'raw.githubusercontent.com') && SITE_REPO_PATH.test(decodeURIComponent(url.pathname))) ||
      (host === 'api.github.com' && /^\/repos\//i.test(url.pathname) && SITE_REPO_PATH.test(decodeURIComponent(url.pathname.slice(6)))) ||
      (host === 'ssmanji89.github.io' && /^\/sulemanji-port(?:\/|$)/i.test(decodeURIComponent(url.pathname))) ||
      (host === 'sulemanji-site-staging.ssmanji89.workers.dev' || host === 'sulemanji-editorial-fixture-site.ssmanji89.workers.dev');
  } catch {
    return false;
  }
}

function normalize(text?: string): string {
  return text?.normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function isPublishedCopy(title: string, summary: string, catalog: CatalogItem[]): boolean {
  const copiedTitle = normalize(title);
  const copiedSummary = normalize(summary);
  return Boolean(copiedTitle && copiedSummary) && catalog.some((item) => {
    if (!item.summary || normalize(item.title) !== copiedTitle || normalize(item.summary) !== copiedSummary) return false;
    const url = new URL(item.url, 'https://www.sulemanji.com');
    return isSiteOutput(url.toString()) && url.pathname.startsWith('/notes/');
  });
}

export function isRecycledSignal(signal: Signal, catalog: CatalogItem[]): boolean {
  return signal.evidence?.some(({ url }) => isSiteOutput(url)) === true || isPublishedCopy(signal.title, signal.summary, catalog);
}

export function isRecycledKnowledge(item: PublicKnowledge, catalog: CatalogItem[]): boolean {
  // An opaque summary cannot attribute individual claims when one of its sources is our own output.
  return item.public_sources.some(({ url, title }) => isSiteOutput(url) || isPublishedCopy(title, item.summary, catalog));
}

export function independentKnowledge(items: PublicKnowledge[], catalog: CatalogItem[]): PublicKnowledge[] {
  return items.filter((item) => !isRecycledKnowledge(item, catalog));
}
