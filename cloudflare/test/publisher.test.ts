import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { canPublish, publishContent, verifyPublicationDetailed, type GitHubPublisher, type PullRequestState, type PublishEffect, type PublishEffectStore } from '../src/editorial/publisher.js';
import type { ContentProposal, PublicationState, PublishAttempt, ReviewReceipt } from '../src/editorial/contracts.js';

async function sha(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
const baselineCitation = 'https://vendor.example.test/original-guide';
const incomingCitation = 'https://vendor.example.test/current-evidence';
const previousArticle = `---\nwriting_schema: 2\n---\nA source-backed reader explanation. [Original guide](${baselineCitation}).`;

async function fixture() {
  const path = 'notes/reviewed-article.md';
  const content = `${previousArticle} [Current evidence](${incomingCitation}).`;
  const file = { path, operation: 'update' as const, encoding: 'utf-8' as const, content, content_sha256: await sha(content) };
  const content_digest = await sha(`${path}\n${file.content_sha256}`);
  const source_digest = 'a'.repeat(64);
  const proposal: ContentProposal = { candidate_id: 'candidate-42', author_run_id: 'author-run', content_digest, source_digest, policy_revision: 'policy-v1', knowledge_revision: 'knowledge-v1',
    base_commit: 'b'.repeat(40), owner_epoch: 7, files: [file], public_sources: [{ url: incomingCitation, title: 'Current evidence',
      retrieved_at: '2026-11-28T00:00:00Z', source_date: '2026-11-28T00:00:00Z', content_sha256: 'a'.repeat(64) }],
    required_media_paths: [], public_urls: ['/notes/reviewed-article'], expected_content: [{ url: '/notes/reviewed-article', title: 'Reviewed title', text_sha256: 'c'.repeat(64) }] };
  const receipt: ReviewReceipt = { candidate_id: proposal.candidate_id, reviewer_run_id: 'review-run', author_run_id: proposal.author_run_id, content_digest, source_digest,
    policy_revision: proposal.policy_revision, knowledge_revision: proposal.knowledge_revision, base_commit: proposal.base_commit, owner_epoch: 7, decision: 'CLEAR', findings: [] };
  const state: PublicationState = { owner_epoch: 7, paused: false, base_commit: proposal.base_commit, policy_revision: proposal.policy_revision, knowledge_revision: proposal.knowledge_revision,
    source_digest, allowed_paths: [path], author_run_id: proposal.author_run_id };
  return { proposal, receipt, state };
}

class FakeStore implements PublishEffectStore {
  value: Record<string, unknown> | null = null;
  allowMerge = true;
  capacityReleased = 0;
  loseCapacityResponse = false;
  capacityRequests: Array<{ new_articles: number; refreshes: number }> = [];
  async ensureIntent(candidateId: string, effectId: string, branch: string, ownerEpoch: number, contentDigest: string) {
    if (this.value && this.value.content_digest !== contentDigest) throw new Error('conflicting intent');
    this.value ??= { candidate_id: candidateId, effect_id: effectId, branch, owner_epoch: ownerEpoch, content_digest: contentDigest, state: 'INTENT' };
  }
  async read() { return this.value as PublishEffect | null; }
  async record(_candidateId: string, patch: Record<string, unknown>) { Object.assign(this.value ?? {}, patch); }
  async hasMergeDispatch() { return true; }
  async releaseUndispatchedMerge() { this.capacityReleased += 1; }
  async reserveMergeCapacity(_candidateId: string, counts: { new_articles: number; refreshes: number }) {
    this.capacityRequests.push(counts);
    if (this.loseCapacityResponse) throw new Error('D1 admission response was lost');
    return this.allowMerge;
  }
}
class FakeGitHub implements GitHubPublisher {
  pr: PullRequestState | null = null;
  creates = 0;
  merges = 0;
  loseMergeResponse = false;
  strictMergeChecks = true;
  originals: Array<{ path: string; ref: string }> = [];
  async readTextFile(path: string, ref: string) { this.originals.push({ path, ref }); return previousArticle; }
  async findPullRequest() { return this.pr; }
  async createReviewedBranchAndPullRequest() { this.creates += 1; this.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'pending' }; return this.pr; }
  async hasStrictMergeChecks() { return this.strictMergeChecks; }
  async mergePullRequest(_number: number, _head: string, authorize: () => Promise<boolean>) {
    if (!(await authorize())) return { refused: true as const };
    this.merges += 1;
    this.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'closed', merged: true, merge_commit_sha: 'e'.repeat(40), checks: 'success' };
    if (this.loseMergeResponse) throw new Error('response lost');
    return { merge_commit_sha: this.pr.merge_commit_sha! };
  }
}

describe('guarded source publication effects', () => {
  it('rejects protected files, changed source, and stale base before any GitHub call', async () => {
    const { proposal, receipt, state } = await fixture();
    const protectedProposal = { ...proposal, files: [{ ...proposal.files[0], path: 'worker/src/index.ts' }] };
    expect(await canPublish(protectedProposal, receipt, { ...state, allowed_paths: ['worker/src/index.ts'] })).toMatchObject({ allowed: false });
    const github = new FakeGitHub();
    const attempt = await publishContent(proposal, receipt, { store: new FakeStore(), github, readAuthority: async () => state, currentState: async () => ({ ...state, base_commit: 'f'.repeat(40) }) });
    expect(attempt.status).toBe('FAILED');
    expect(github.creates).toBe(0);
  });

  it('records intent and waits for required checks before merge', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    const attempt = await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });
    expect(attempt).toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12 });
    expect(github.creates).toBe(1);
    expect(github.merges).toBe(0);
    expect(store.capacityRequests).toEqual([]);
    expect(store.value).toMatchObject({ state: 'SOURCE_PUBLISHED', pull_request: 12 });
    expect(github.originals).toEqual([{ path: 'notes/reviewed-article.md', ref: proposal.base_commit }]);
    expect(attempt.expected_content[0].required_citations).toEqual([incomingCitation, baselineCitation]);
  });

  it('rejects legacy reviewed refreshes that dropped citations before any branch or merge effect', async () => {
    const { proposal, receipt, state } = await fixture();
    const file = proposal.files[0];
    file.content = file.content.replace(`[Original guide](${baselineCitation})`, 'Original guide');
    file.content_sha256 = await sha(file.content);
    proposal.content_digest = await sha(`${file.path}\n${file.content_sha256}`);
    receipt.content_digest = proposal.content_digest;
    const github = new FakeGitHub(); const store = new FakeStore();
    const result = await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });
    expect(result.status).toBe('FAILED');
    expect(store.value).toBeNull();
    expect(github.creates).toBe(0);
    expect(github.merges).toBe(0);
  });

  it('holds an exact reviewed pull request before merge when its daily allowance is exhausted', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    const store = new FakeStore();
    const deps = { store, github, readAuthority: async () => state, currentState: async () => state };
    await publishContent(proposal, receipt, deps);
    github.pr!.checks = 'success';
    store.allowMerge = false;

    const result = await publishContent(proposal, receipt, deps);

    expect(result).toMatchObject({ status: 'CAPACITY_HELD', pull_request: 12 });
    expect(store.capacityRequests).toEqual([{ new_articles: 0, refreshes: 1 }]);
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ state: 'SOURCE_PUBLISHED' });
  });

  it('releases the exact admission attempt if its D1 response is lost before dispatch', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    const store = new FakeStore();
    const deps = { store, github, readAuthority: async () => state, currentState: async () => state };
    await publishContent(proposal, receipt, deps);
    github.pr!.checks = 'success';
    store.loseCapacityResponse = true;

    await publishContent(proposal, receipt, deps);
    expect(store.capacityRequests).toHaveLength(1);
    expect(store.capacityReleased).toBe(1);
    expect(github.merges).toBe(0);
  });

  it('requires strict branch checks and rereads the reviewed base after capacity is reserved', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    const store = new FakeStore();
    const deps = { store, github, readAuthority: async () => state, currentState: async () =>
      ({ ...state, base_commit: store.capacityRequests.length ? 'f'.repeat(40) : state.base_commit }) };
    await publishContent(proposal, receipt, deps);
    github.pr!.checks = 'success';
    github.strictMergeChecks = false;
    await expect(publishContent(proposal, receipt, deps)).resolves.toMatchObject({ status: 'BRANCH_UNQUALIFIED' });
    expect(store.capacityRequests).toHaveLength(0);

    github.strictMergeChecks = true;
    await expect(publishContent(proposal, receipt, deps)).resolves.toMatchObject({ status: 'FAILED' });
    expect(store.capacityRequests).toHaveLength(1);
    expect(store.capacityReleased).toBe(1);
    expect(github.merges).toBe(0);
  });

  it('reconciles a successful merge when the merge response is lost', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });
    github.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };
    github.loseMergeResponse = true;
    const attempt = await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });
    expect(attempt).toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12, source_commit: 'e'.repeat(40) });
    expect(github.creates).toBe(1);
    expect(github.merges).toBe(1);
    expect(store.value).toMatchObject({ state: 'MERGED', merge_commit: 'e'.repeat(40) });
    const replay = await publishContent(proposal, receipt, {
      store, github, currentState: async () => { throw new Error('Source temporarily unavailable after the merge'); },
      readAuthority: async () => ({ owner_epoch: 7, paused: false }),
    });
    expect(replay).toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12, source_commit: 'e'.repeat(40) });
    expect(github.merges).toBe(1);
    const paused = await publishContent(proposal, receipt, {
      store, github, currentState: async () => { throw new Error('Source temporarily unavailable after the merge'); },
      readAuthority: async () => ({ owner_epoch: 7, paused: true }),
    });
    expect(paused.status).toBe('FAILED');
    expect(github.merges).toBe(1);
  });

  it('settles an unresolved exact merge after the merge advances the reviewed base', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    const deps = { store, github, readAuthority: async () => state, currentState: async () => state };
    await publishContent(proposal, receipt, deps);
    await store.record(proposal.candidate_id, { state: 'UNCERTAIN' });
    github.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'closed', merged: true, merge_commit_sha: 'e'.repeat(40), checks: 'success' };

    await expect(publishContent(proposal, receipt, { ...deps,
      currentState: async () => ({ ...state, base_commit: 'e'.repeat(40) }),
    })).resolves.toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12, source_commit: 'e'.repeat(40) });
    expect(store.value).toMatchObject({ state: 'MERGED', merge_commit: 'e'.repeat(40) });
    expect(github.merges).toBe(0);
  });

  it('does not adopt or merge a preexisting branch PR without a matching durable source head', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    github.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };
    const store = new FakeStore();
    const attempt = await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });

    expect(attempt.status).toBe('UNCERTAIN');
    expect(github.creates).toBe(0);
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ state: 'UNCERTAIN' });
    expect(store.value).not.toHaveProperty('source_commit');
  });

  it('holds when a previously recorded publication branch has been edited', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });
    github.pr = { number: 12, head_sha: 'f'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };

    const attempt = await publishContent(proposal, receipt, { store, github, readAuthority: async () => state, currentState: async () => state });

    expect(attempt.status).toBe('UNCERTAIN');
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ source_commit: 'd'.repeat(40), state: 'UNCERTAIN' });
  });

  it('invalidates the reviewed attempt if the owner epoch pauses or changes', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    const attempt = await publishContent(proposal, receipt, { store: new FakeStore(), github, readAuthority: async () => ({ paused: true, owner_epoch: 8 }), currentState: async () => ({ ...state, paused: true, owner_epoch: 8 }) });
    expect(attempt.status).toBe('FAILED');
    expect(github.creates).toBe(0);
  });
});

describe('public publication identity verification', () => {
  it('compares canonical article bytes to the authenticated Jekyll artifact', async () => {
    const url = 'https://www.sulemanji.com/notes/reviewed-article';
    const commit = 'd'.repeat(40);
    const assetDigest = `sha256:${'a'.repeat(64)}`;
    const builtAt = '2026-11-28T08:00:00Z';
    const article = `<html><head><link rel="canonical" href="${url}"></head><body><h1>Reviewed title</h1><div data-writing-body><p>NIST’s source-backed guidance.</p></div></body></html>`;
    const listing = {
      '/writing': `<a href="${url}">Article</a>`,
      '/feed.xml': `<feed xmlns="http://www.w3.org/2005/Atom"><entry><link href="${url}"/></entry></feed>`,
      '/sitemap.xml': `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`,
    };
    const manifest = JSON.stringify({ schema_version: 1, source_commit: commit, asset_digest: assetDigest, built_at: builtAt,
      files: { 'notes/reviewed-article.html': await sha(article) } });
    const digest = await sha(manifest);
    const path = '/notes/reviewed-article';
    const attempt: PublishAttempt = { id: 'attempt-42', candidate_id: 'candidate-42', owner_epoch: 7, branch: 'editorial/candidate-42',
      pull_request: 12, source_commit: commit, deployment_version: null, public_urls: [path], status: 'SOURCE_PUBLISHED',
      expected_content: [{ url: path, title: 'Reviewed title', text_sha256: await sha("NIST's source-backed guidance.") }] };
    let damaged: 'none' | 'html' | 'manifest' | 'headers' | 'oversized-manifest' | 'oversized-article' = 'none';
    let cancelled = 0;
    function oversizedBody() {
      let chunks = 0;
      return new ReadableStream<Uint8Array>({
        pull(controller) {
          if (++chunks < 4) controller.enqueue(new Uint8Array(1_100_000));
          else controller.close();
        },
        cancel() { cancelled += 1; },
      });
    }
    const fetcher: typeof fetch = async (input) => {
      const uri = new URL(String(input));
      const oversize = (uri.pathname === '/release.json' && damaged === 'oversized-manifest') || (uri.pathname === path && damaged === 'oversized-article');
      const content = uri.pathname === '/release.json' ? manifest + (damaged === 'manifest' ? ' ' : '') :
        uri.pathname === path ? article.replace('guidance', damaged === 'html' ? 'fiction' : 'guidance') : listing[uri.pathname as keyof typeof listing];
      const response = new Response(oversize ? oversizedBody() : content,
      { headers: { 'x-site-source-commit': commit, 'x-site-asset-digest': assetDigest,
        'x-site-built-at': uri.pathname === path && damaged === 'headers' ? '2026-11-28T09:00:00Z' : builtAt } });
      Object.defineProperty(response, 'url', { value: uri.href });
      return response;
    };
    const trusted = async (sha: string) => { expect(sha).toBe(commit); return [digest]; };
    await expect(verifyPublicationDetailed(attempt, fetcher, 'public', trusted)).resolves.toMatchObject({ receipt: { outcome: 'VERIFIED' } });
    await expect(verifyPublicationDetailed(attempt, fetcher, 'public', async () => [])).resolves.toMatchObject({ receipt: { outcome: 'UNCERTAIN' } });
    for (const kind of ['html', 'manifest', 'headers'] as const) {
      damaged = kind;
      await expect(verifyPublicationDetailed(attempt, fetcher, 'public', trusted)).resolves.toMatchObject({ receipt: { outcome: 'UNCERTAIN' } });
    }
    for (const kind of ['oversized-manifest', 'oversized-article'] as const) {
      damaged = kind;
      await expect(verifyPublicationDetailed(attempt, fetcher, 'public', trusted)).resolves.toMatchObject({
        receipt: { outcome: 'UNCERTAIN' }, failure: expect.stringContaining('response exceeds bound'),
      });
    }
    expect(cancelled).toBe(2);
  });
  it('accepts the digest and timestamp formats emitted by the Jekyll release manifest', async () => {
    const body = 'A source-backed reader explanation.';
    const related = '/notes/related-article';
    const citation = 'https://vendor.example.test/evidence';
    const appendixText = "A reader's next step. Related guide ( source 1 ).";
    const url = 'https://www.sulemanji.com/notes/reviewed-article';
    const attempt: PublishAttempt = {
      id: 'attempt-42', candidate_id: 'candidate-42', owner_epoch: 7, branch: 'editorial/candidate-42', pull_request: 12,
      source_commit: 'd'.repeat(40), deployment_version: null, public_urls: ['/notes/reviewed-article'],
      expected_content: [{ url: '/notes/reviewed-article', title: 'Reviewed title', text_sha256: await sha(body), contextual_link: { href: related, text_sha256: await sha(appendixText), sources: [citation] } }], status: 'SOURCE_PUBLISHED',
    };
    const card = await readFile(new URL('../../assets/images/articles/agent-safety-social.png', import.meta.url));
    const cardPath = '/assets/images/articles/reviewed-article-social.png';
    Object.assign(attempt.expected_content[0], { social_image: { path: cardPath, content_sha256: await sha(card.toString('base64')) } });
    let damage: 'none' | 'metadata' | 'card' | 'release' | 'wrong-link' | 'outside-link' | 'wrong-source' | 'changed-body' = 'none';
    const digest = `sha256:${'a'.repeat(64)}`;
    const builtAt = '2026-11-27T14:00:00Z';
    const appendix = () => `<p>A reader's next step. <a href="${damage === 'wrong-link' ? '/notes/unrelated' : related}">Related guide</a> (<a href="${damage === 'wrong-source' ? 'https://other.example.test/' : citation}">source 1</a>).</p>`;
    const article = () => `<html><head><link rel="canonical" href="${url}"><meta property="og:image" content="https://www.sulemanji.com${damage === 'metadata' ? '/wrong.png' : cardPath}"></head>
      <body><h1>Reviewed title</h1><div data-writing-body><p>${damage === 'changed-body' ? 'The original body changed.' : body}</p>${damage !== 'outside-link' ? appendix() : ''}</div>
      ${damage === 'outside-link' ? `<nav>${appendix()}</nav>` : ''}</body></html>`;
    const response = (content: BodyInit, responseUrl: string, headers?: HeadersInit) => {
      const result = new Response(content, { headers });
      Object.defineProperty(result, 'url', { value: responseUrl });
      return result;
    };
    const fetcher: typeof fetch = async (input) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      const headers = {
        'x-site-source-commit': attempt.source_commit!, 'x-site-asset-digest': digest, 'x-site-built-at': builtAt,
      };
      if (requestUrl.pathname === '/notes/reviewed-article') return response(article(), url, headers);
      if (requestUrl.pathname === cardPath) return response(damage === 'card' ? Uint8Array.of(0) : Uint8Array.from(card), requestUrl.href,
        { ...headers, 'content-type': 'image/png', 'x-site-asset-digest': damage === 'release' ? `sha256:${'b'.repeat(64)}` : digest });
      if (requestUrl.pathname === '/writing') return response(`<a href="${url}">Article</a>`, requestUrl.href, headers);
      if (requestUrl.pathname === '/feed.xml') return response(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><link href="${url}"/></entry></feed>`, requestUrl.href, headers);
      if (requestUrl.pathname === '/sitemap.xml') return response(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`, requestUrl.href, headers);
      return response('missing', requestUrl.toString());
    };

    const result = await verifyPublicationDetailed(attempt, fetcher);

    expect(result.failure).toBeUndefined();
    expect(result.receipt.outcome).toBe('VERIFIED');
    for (const change of ['metadata', 'card', 'release', 'wrong-link', 'outside-link', 'wrong-source', 'changed-body'] as const) {
      damage = change;
      expect((await verifyPublicationDetailed(attempt, fetcher)).receipt.outcome).toBe('UNCERTAIN');
    }
    damage = 'none';
    attempt.expected_content[0].required_citations = [citation];
    expect((await verifyPublicationDetailed(attempt, fetcher)).receipt.outcome).toBe('VERIFIED');
    attempt.expected_content[0].required_citations = ['https://vendor.example.test/missing'];
    expect((await verifyPublicationDetailed(attempt, fetcher)).receipt.outcome).toBe('UNCERTAIN');
  });
});
