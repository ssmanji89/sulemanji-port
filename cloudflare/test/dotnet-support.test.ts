import { describe, expect, it, vi } from 'vitest';
import type { RecentHistory, SourceConfig } from '../src/editorial/contracts.js';
import { DOTNET_CITATION, DOTNET_POLICY_URL, DOTNET_SOURCE_ID, qualifyDotnetRefresh } from '../src/editorial/dotnet-support.js';
import { chooseAction } from '../src/editorial/relevance.js';
import { prepareContent } from '../src/editorial/review.js';
import { textDigest } from '../src/editorial/site-readback.js';
import { collectSignals } from '../src/editorial/sources.js';

const catalog = [{ id: 'dotnet-guide', title: '.NET lifecycle readiness', url: '/notes/dotnet-8-end-of-support-readiness',
  topics: ['infrastructure'] }];
const base = '1'.repeat(40);
const now = new Date('2026-11-28T08:00:00Z');
const overview = 'https://dotnet.microsoft.com/en-us/platform/support/policy';
const notice = 'https://devblogs.microsoft.com/dotnet/dotnet-8-9-end-of-support/';
const source: SourceConfig = { id: DOTNET_SOURCE_ID, url: DOTNET_POLICY_URL, format: 'dotnet-lifecycle',
  topic_ids: ['infrastructure'], allowed_hostnames: ['dotnet.microsoft.com'], min_interval_seconds: 60, max_age_seconds: 1_000, enabled: true };
const row = (version: string, date: string) => '<tr><td>.NET ' + version + '</td><td></td><td></td><td></td><td>' + date + '</td></tr>';
const official = '<table aria-labelledby="supported-versions">' + row('10', 'November 14, 2028') + '</table>' +
  '<table aria-labelledby="out-of-support-versions">' + row('8', 'November 10, 2026') + row('9', 'November 10, 2026') + '</table>';
const history: RecentHistory = { source_revisions: [], episode_ids: [], recent_topic_ids: [], candidates: [] };
const noticeParagraph = '<p><a href="' + notice + '">.NET 8 and .NET 9 both reach end of support</a>.</p>';
const incorrect = '<p>The <a href="' + overview + '">policy</a> lists both releases in maintenance.</p>';
const corrected = '<p>The policy lists both releases as <a href="' + DOTNET_CITATION + '">out of support</a>.</p>';
const article = (paragraph: string) => '<div data-writing-body>' + noticeParagraph + paragraph + '</div>';
const readMode = 'public';

async function publishedSite(body: string, citations: string[], servedBody = body) {
  const identity = { schema_version: 1, source_commit: base, asset_digest: 'sha256:' + 'a'.repeat(64), built_at: now.toISOString() };
  const manifest = JSON.stringify({ ...identity, article_citations: { [catalog[0].url]: citations },
    files: { 'notes/dotnet-8-end-of-support-readiness.html': await textDigest(body) } });
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const response = new Response(url.pathname === '/release.json' ? manifest : servedBody, { headers: {
      'x-site-source-commit': base, 'x-site-asset-digest': identity.asset_digest, 'x-site-built-at': identity.built_at,
    } });
    Object.defineProperty(response, 'url', { value: url.href });
    return response;
  };
  return { fetcher, readDigests: async () => [await textDigest(manifest)] };
}

describe('exact published support claims', () => {
  it('collects only the exact approved authority and identifies ambiguous data as a source failure', async () => {
    const fetcher = vi.fn(async () => new Response(official));
    const unknown = await collectSignals([{ ...source, url: DOTNET_POLICY_URL + '?other=1' }], now, fetcher);
    expect(unknown.failures[0]?.code).toBe('FORBIDDEN');
    expect(fetcher).not.toHaveBeenCalled();
    const ambiguous = await collectSignals([source], now, async () => new Response(official.replace('.NET 10', '.NET 8')));
    expect(ambiguous.failures[0]?.code).toBe('INVALID');
    expect(ambiguous.signals).toEqual([]);
    const moved = await collectSignals([source], now, async () => Response.redirect(DOTNET_POLICY_URL + '/mirror'));
    expect(moved.failures[0]?.code).toBe('FORBIDDEN');
  });

  it('admits an exact contradictory claim and changes only its factual phrase and citation', async () => {
    const [signal] = (await collectSignals([source], now, async () => new Response(official))).signals;
    const { fetcher, readDigests } = await publishedSite(article(incorrect), [notice, overview]);
    const match = await qualifyDotnetRefresh(signal, catalog, base, now, fetcher, readMode, readDigests);
    expect(match).toMatchObject({ action: 'REFRESH', base_commit: base });
    const selected = chooseAction(signal, catalog, [], history, now, match);
    if (selected.action !== 'REFRESH' || !('candidate' in selected)) throw new Error('No factual correction was admitted');
    const path = 'notes/dotnet-8-end-of-support-readiness.md';
    const front = '---\nwriting_schema: 2\npublished: true\npublished_on: "2026-10-26"\n' +
      'title: ".NET lifecycle readiness"\npermalink: "' + catalog[0].url + '"\n---\n';
    const original = front + '[.NET 8 and .NET 9 both reach end of support](' + notice + ').\n\n' +
      'The [policy](' + overview + ') lists both releases in maintenance.\n\nThis next paragraph stays verbatim.\n';
    const model = { generate: vi.fn() };
    const proposal = await prepareContent(selected.candidate, { catalog, sources: signal.evidence, knowledge: [],
      policy_revision: 'active', knowledge_revision: 'none', base_commit: base, owner_epoch: 1, dotnet_refresh: true,
      existing_paths: [path], existing_files: { [path]: original } }, model);
    expect(proposal.files[0].content).toBe(original.replace('lists both releases in maintenance',
      'lists both releases as [out of support](' + DOTNET_CITATION + ')'));
    expect(proposal.expected_content[0].required_citations).toEqual([notice, overview, DOTNET_CITATION].sort());
    expect(model.generate).not.toHaveBeenCalled();
    const heldAgain = chooseAction(signal, catalog, [], { ...history, candidates: [selected.candidate] }, now, match);
    expect(heldAgain).toMatchObject({ action: 'NO_CHANGE', reason: expect.stringContaining('already considered') });
  });

  it('does no refresh work with equal values, future facts, changed bytes, or citations from a mirror', async () => {
    const [signal] = (await collectSignals([source], now, async () => new Response(official))).signals;
    const current = await publishedSite(article(corrected), [notice, DOTNET_CITATION]);
    await expect(qualifyDotnetRefresh(signal, catalog, base, now, current.fetcher, readMode, current.readDigests))
      .resolves.toMatchObject({ action: 'NO_CHANGE', reason: expect.stringContaining('already agrees') });
    const early = new Date('2026-11-09T08:00:00Z');
    const [earlySignal] = (await collectSignals([source], early, async () => new Response(official))).signals;
    const never = vi.fn();
    await expect(qualifyDotnetRefresh(earlySignal, catalog, base, early, never, readMode, current.readDigests))
      .resolves.toMatchObject({ action: 'NO_CHANGE', reason: expect.stringContaining('effective') });
    expect(never).not.toHaveBeenCalled();
    const changed = await publishedSite(article(incorrect), [notice, overview], article(corrected));
    await expect(qualifyDotnetRefresh(signal, catalog, base, now, changed.fetcher, readMode, changed.readDigests))
      .rejects.toThrow('DOTNET_ARTICLE_RELEASE_MISMATCH');
    const mirror = await publishedSite(article(incorrect), [notice, 'https://mirror.example.test/policy']);
    await expect(qualifyDotnetRefresh(signal, catalog, base, now, mirror.fetcher, readMode, mirror.readDigests))
      .resolves.toMatchObject({ action: 'NO_CHANGE', reason: expect.stringContaining('does not cite') });
  });
});
