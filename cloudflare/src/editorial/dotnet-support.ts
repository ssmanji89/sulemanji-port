import * as parse5 from 'parse5';
import type { CatalogItem, Signal } from './contracts.js';
import { articleCitationsFromManifest, readVerifiedReleaseManifest, type ReleaseDigests } from './release-proof.js';
import { articleCitations, bytesDigest, CANONICAL_SITE_ORIGIN, htmlAttribute, MAX_SITE_DOCUMENT_BYTES,
  normalizeNodeText, readBoundedSiteBytes, textDigest, type HtmlNode } from './site-readback.js';

export const DOTNET_SOURCE_ID = 'microsoft-dotnet-lifecycle';
export const DOTNET_POLICY_URL = 'https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core';
export const DOTNET_CITATION = DOTNET_POLICY_URL + '#out-of-support-versions';
const POLICY_OVERVIEW = 'https://dotnet.microsoft.com/en-us/platform/support/policy';
const SUPPORT_NOTICE = 'https://devblogs.microsoft.com/dotnet/dotnet-8-9-end-of-support/';
const OLD_CLAIM = 'lists both releases in maintenance';
const CURRENT_CLAIM = 'lists both releases as out of support';
const CURRENT_POLICY = 'The current .NET support policy ';
const SUPPORT_SUCCESSOR = ' and lists .NET 10 as the supported Long Term Support successor through November 2028.';
const POLICY_EXPLANATION = ' That policy also requires supported installations to stay current on released patches during their lifecycle. Reaching a supported major version while retaining an old patch is therefore not the finish line.';
const NOTICE_CLAIM = 'Microsoft announced the November 10, 2026 end of support for .NET 8 and .NET 9 and now ';
const TARGET_PATH = '/notes/dotnet-8-end-of-support-readiness';

export type DotnetSupport = Array<{ version: string; ended_on: string }>;
export type DotnetRefresh = { action: 'REFRESH'; target: CatalogItem; base_commit: string; article_digest: string } |
  { action: 'NO_CHANGE'; reason: string };

function nodes(node: HtmlNode, where: (child: HtmlNode) => boolean): HtmlNode[] {
  if (['script', 'style', 'noscript', 'template'].includes(node.nodeName ?? '')) return [];
  return [...(where(node) ? [node] : []), ...(node.childNodes ?? []).flatMap((child) => nodes(child, where))];
}

function englishDate(value: string): string {
  if (!/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(value)) throw new Error('INVALID');
  const date = new Date(value + ' 00:00:00 UTC');
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID');
  const canonical = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  if (canonical !== value) throw new Error('INVALID');
  return date.toISOString().slice(0, 10);
}

export function parseDotnetSupport(html: string): DotnetSupport {
  const page = parse5.parse(html) as unknown as HtmlNode;
  const tables = nodes(page, (row) => row.tagName === 'table' && htmlAttribute(row, 'aria-labelledby') === 'out-of-support-versions');
  const active = nodes(page, (row) => row.tagName === 'table' && htmlAttribute(row, 'aria-labelledby') === 'supported-versions');
  if (tables.length !== 1 || active.length !== 1) throw new Error('INVALID');
  const activeVersions = new Set(nodes(active[0], (item) => item.tagName === 'tr')
    .map((row) => nodes(row, (item) => item.tagName === 'td').map(normalizeNodeText)[0]));
  const results: DotnetSupport = [];
  for (const row of nodes(tables[0], (item) => item.tagName === 'tr')) {
    const cells = nodes(row, (cell) => cell.tagName === 'td').map(normalizeNodeText);
    if (!/^\.NET \d+$/.test(cells[0] ?? '')) continue;
    if (cells.length !== 5 || activeVersions.has(cells[0])) throw new Error('INVALID');
    results.push({ version: cells[0], ended_on: englishDate(cells[4]) });
  }
  if (!results.length || results.length > 50 || new Set(results.map(({ version }) => version)).size !== results.length) throw new Error('INVALID');
  return results.sort((a, b) => a.version.localeCompare(b.version));
}

export function isDotnetSupport(signal: Signal): boolean {
  return signal.source_id === DOTNET_SOURCE_ID && signal.evidence.length === 1 &&
    signal.evidence[0].url === DOTNET_CITATION && Array.isArray(signal.dotnet_support);
}

export function dotnetSnapshotDigest(support: DotnetSupport): Promise<string> {
  return textDigest(JSON.stringify(support));
}

export function correctDotnetClaim(markdown: string): string | null {
  const front = /^---\r?\n[\s\S]+?\r?\n---\r?\n/.exec(markdown)?.[0];
  if (!front) return null;
  const body = markdown.slice(front.length);
  const intro = `The current [.NET support policy](${POLICY_OVERVIEW}) `;
  const oldParagraph = intro + OLD_CLAIM + SUPPORT_SUCCESSOR + POLICY_EXPLANATION;
  const paragraphs = body.split(/(\r?\n\r?\n)/);
  if (paragraphs.filter((part) => part === oldParagraph).length !== 1) return null;
  const fixed = oldParagraph.replace(OLD_CLAIM, `lists both releases as [out of support](${DOTNET_CITATION})`);
  return front + paragraphs.map((part) => part === oldParagraph ? fixed : part).join('');
}

export async function qualifyDotnetRefresh(signal: Signal, catalog: CatalogItem[], baseCommit: string, now: Date,
  fetcher: typeof fetch, readback: 'public' | 'private-binding', readDigests: ReleaseDigests): Promise<DotnetRefresh> {
  const noChange = (reason: string): DotnetRefresh => ({ action: 'NO_CHANGE', reason });
  const targets = catalog.filter((item) => item.url === TARGET_PATH || item.url === CANONICAL_SITE_ORIGIN + TARGET_PATH);
  if (!isDotnetSupport(signal) || targets.length !== 1 || !(Date.parse(signal.expires_at) > now.getTime())) {
    return noChange('No uniquely scoped, current .NET support claim is eligible.');
  }
  const support = signal.dotnet_support!;
  if (await dotnetSnapshotDigest(support) !== signal.evidence[0].content_sha256) {
    return noChange('The .NET support observation does not match its recorded source revision.');
  }
  const currentDay = now.toISOString().slice(0, 10);
  if (!(Date.parse(signal.observed_at) <= now.getTime()) || !['.NET 8', '.NET 9'].every((version) => {
    const matches = support.filter((row) => row.version === version);
    return matches.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(matches[0].ended_on) && matches[0].ended_on <= currentDay;
  })) return noChange('The official table does not establish both support transitions as effective.');

  const manifest = await readVerifiedReleaseManifest(baseCommit, fetcher, readback, readDigests);
  const citations = articleCitationsFromManifest(manifest, TARGET_PATH);
  if (!citations) throw new Error('VERIFIED_RELEASE_CITATION_INDEX_MISSING');
  if (!citations.has(SUPPORT_NOTICE) || ![POLICY_OVERVIEW, DOTNET_CITATION].some((url) => citations.has(url))) {
    return noChange('The published article does not cite the qualified .NET sources.');
  }

  const url = new URL(TARGET_PATH, CANONICAL_SITE_ORIGIN);
  const response = await fetcher(url, { redirect: 'manual' });
  if (!response.ok || (response.url ? response.url !== url.href : readback !== 'private-binding') ||
      response.headers.get('x-site-source-commit') !== baseCommit) throw new Error('DOTNET_ARTICLE_RELEASE_UNAVAILABLE');
  const body = await readBoundedSiteBytes(response, MAX_SITE_DOCUMENT_BYTES, 'article');
  const articleDigest = await bytesDigest(body);
  if (manifest.files[TARGET_PATH.slice(1) + '.html'] !== articleDigest) throw new Error('DOTNET_ARTICLE_RELEASE_MISMATCH');
  const page = parse5.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown as HtmlNode;
  const articles = nodes(page, (row) => row.tagName === 'div' && htmlAttribute(row, 'data-writing-body') !== undefined);
  if (articles.length !== 1) throw new Error('DOTNET_ARTICLE_BODY_UNAVAILABLE');
  const paragraphs = (articles[0].childNodes ?? []).filter((row) => row.tagName === 'p');
  const notices = paragraphs.filter((row) => articleCitations(row).has(SUPPORT_NOTICE) &&
    /(?:end of support.*\.NET 8 and \.NET 9|\.NET 8 and \.NET 9 both reach end of support)/.test(normalizeNodeText(row)));
  const maintenance = paragraphs.filter((row) => articleCitations(row).has(POLICY_OVERVIEW) &&
    normalizeNodeText(row) === CURRENT_POLICY + OLD_CLAIM + SUPPORT_SUCCESSOR + POLICY_EXPLANATION);
  const unsupported = paragraphs.filter((row) => {
    if (!articleCitations(row).has(DOTNET_CITATION)) return false;
    const claim = normalizeNodeText(row);
    return claim === CURRENT_POLICY + CURRENT_CLAIM + SUPPORT_SUCCESSOR + POLICY_EXPLANATION ||
      claim.startsWith(NOTICE_CLAIM + CURRENT_CLAIM + ' .');
  });
  if (notices.length !== 1 || maintenance.length + unsupported.length !== 1) {
    return noChange('The article does not state one unambiguous, cited claim about both releases.');
  }
  return maintenance.length
    ? { action: 'REFRESH', target: targets[0], base_commit: baseCommit, article_digest: articleDigest }
    : noChange('The article already agrees with the official support status for .NET 8 and .NET 9.');
}
