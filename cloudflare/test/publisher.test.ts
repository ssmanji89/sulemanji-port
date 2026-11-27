import { describe, expect, it } from 'vitest';
import { canPublish, publishContent, verifyPublicationDetailed, type GitHubPublisher, type PullRequestState, type PublishEffectStore } from '../src/editorial/publisher.js';
import type { ContentProposal, PublicationState, PublishAttempt, ReviewReceipt } from '../src/editorial/contracts.js';

async function sha(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function fixture() {
  const path = 'notes/reviewed-article.md';
  const content = '---\nwriting_schema: 2\n---\nA source-backed reader explanation.';
  const file = { path, operation: 'create' as const, encoding: 'utf-8' as const, content, content_sha256: await sha(content) };
  const content_digest = await sha(`${path}\n${file.content_sha256}`);
  const source_digest = 'a'.repeat(64);
  const proposal: ContentProposal = { candidate_id: 'candidate-42', author_run_id: 'author-run', content_digest, source_digest, policy_revision: 'policy-v1', knowledge_revision: 'knowledge-v1',
    base_commit: 'b'.repeat(40), owner_epoch: 7, files: [file], public_sources: [], required_media_paths: [], public_urls: ['/notes/reviewed-article'], expected_content: [{ url: '/notes/reviewed-article', title: 'Reviewed title', text_sha256: 'c'.repeat(64) }] };
  const receipt: ReviewReceipt = { candidate_id: proposal.candidate_id, reviewer_run_id: 'review-run', author_run_id: proposal.author_run_id, content_digest, source_digest,
    policy_revision: proposal.policy_revision, knowledge_revision: proposal.knowledge_revision, base_commit: proposal.base_commit, owner_epoch: 7, decision: 'CLEAR', findings: [] };
  const state: PublicationState = { owner_epoch: 7, paused: false, base_commit: proposal.base_commit, policy_revision: proposal.policy_revision, knowledge_revision: proposal.knowledge_revision,
    source_digest, allowed_paths: [path], author_run_id: proposal.author_run_id };
  return { proposal, receipt, state };
}

class FakeStore implements PublishEffectStore {
  value: Record<string, unknown> | null = null;
  async ensureIntent(candidateId: string, effectId: string, branch: string, ownerEpoch: number, contentDigest: string) {
    if (this.value && this.value.content_digest !== contentDigest) throw new Error('conflicting intent');
    this.value ??= { candidate_id: candidateId, effect_id: effectId, branch, owner_epoch: ownerEpoch, content_digest: contentDigest, state: 'INTENT' };
  }
  async read() { return this.value as { pull_request: number | null; source_commit: string | null; merge_commit: string | null; state: string } | null; }
  async record(_candidateId: string, patch: Record<string, unknown>) { Object.assign(this.value ?? {}, patch); }
}
class FakeGitHub implements GitHubPublisher {
  pr: PullRequestState | null = null;
  creates = 0;
  merges = 0;
  loseMergeResponse = false;
  async findPullRequest() { return this.pr; }
  async createReviewedBranchAndPullRequest() { this.creates += 1; this.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'pending' }; return this.pr; }
  async mergePullRequest() {
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
    const attempt = await publishContent(proposal, receipt, { store: new FakeStore(), github, currentState: async () => ({ ...state, base_commit: 'f'.repeat(40) }) });
    expect(attempt.status).toBe('FAILED');
    expect(github.creates).toBe(0);
  });

  it('records intent and waits for required checks before merge', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    const attempt = await publishContent(proposal, receipt, { store, github, currentState: async () => state });
    expect(attempt).toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12 });
    expect(github.creates).toBe(1);
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ state: 'SOURCE_PUBLISHED', pull_request: 12 });
  });

  it('reconciles a successful merge when the merge response is lost', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    await publishContent(proposal, receipt, { store, github, currentState: async () => state });
    github.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };
    github.loseMergeResponse = true;
    const attempt = await publishContent(proposal, receipt, { store, github, currentState: async () => state });
    expect(attempt).toMatchObject({ status: 'SOURCE_PUBLISHED', pull_request: 12, source_commit: 'e'.repeat(40) });
    expect(github.creates).toBe(1);
    expect(github.merges).toBe(1);
    expect(store.value).toMatchObject({ state: 'MERGED', merge_commit: 'e'.repeat(40) });
  });

  it('does not adopt or merge a preexisting branch PR without a matching durable source head', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    github.pr = { number: 12, head_sha: 'd'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };
    const store = new FakeStore();
    const attempt = await publishContent(proposal, receipt, { store, github, currentState: async () => state });

    expect(attempt.status).toBe('UNCERTAIN');
    expect(github.creates).toBe(0);
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ state: 'UNCERTAIN' });
    expect(store.value).not.toHaveProperty('source_commit');
  });

  it('holds when a previously recorded publication branch has been edited', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub(); const store = new FakeStore();
    await publishContent(proposal, receipt, { store, github, currentState: async () => state });
    github.pr = { number: 12, head_sha: 'f'.repeat(40), state: 'open', merged: false, merge_commit_sha: null, checks: 'success' };

    const attempt = await publishContent(proposal, receipt, { store, github, currentState: async () => state });

    expect(attempt.status).toBe('UNCERTAIN');
    expect(github.merges).toBe(0);
    expect(store.value).toMatchObject({ source_commit: 'd'.repeat(40), state: 'UNCERTAIN' });
  });

  it('invalidates the reviewed attempt if the owner epoch pauses or changes', async () => {
    const { proposal, receipt, state } = await fixture();
    const github = new FakeGitHub();
    const attempt = await publishContent(proposal, receipt, { store: new FakeStore(), github, currentState: async () => ({ ...state, paused: true, owner_epoch: 8 }) });
    expect(attempt.status).toBe('FAILED');
    expect(github.creates).toBe(0);
  });
});

describe('public publication identity verification', () => {
  it('accepts the digest and timestamp formats emitted by the Jekyll release manifest', async () => {
    const body = 'A source-backed reader explanation.';
    const url = 'https://www.sulemanji.com/notes/reviewed-article';
    const attempt: PublishAttempt = {
      id: 'attempt-42', candidate_id: 'candidate-42', owner_epoch: 7, branch: 'editorial/candidate-42', pull_request: 12,
      source_commit: 'd'.repeat(40), deployment_version: null, public_urls: ['/notes/reviewed-article'],
      expected_content: [{ url: '/notes/reviewed-article', title: 'Reviewed title', text_sha256: await sha(body) }], status: 'SOURCE_PUBLISHED',
    };
    const digest = `sha256:${'a'.repeat(64)}`;
    const builtAt = '2026-11-27T14:00:00Z';
    const article = `<html><head><link rel="canonical" href="${url}"></head><body><h1>Reviewed title</h1><div data-writing-body>${body}</div></body></html>`;
    const response = (content: string, responseUrl: string, headers?: HeadersInit) => {
      const result = new Response(content, { headers });
      Object.defineProperty(result, 'url', { value: responseUrl });
      return result;
    };
    const fetcher: typeof fetch = async (input) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
      if (requestUrl.pathname === '/notes/reviewed-article') return response(article, url, {
        'x-site-source-commit': attempt.source_commit!, 'x-site-asset-digest': digest, 'x-site-built-at': builtAt,
      });
      if (requestUrl.pathname === '/writing/') return response('/notes/reviewed-article', requestUrl.toString());
      if (requestUrl.pathname === '/feed.xml' || requestUrl.pathname === '/sitemap.xml') return response('/notes/reviewed-article', requestUrl.toString());
      return response('missing', requestUrl.toString());
    };

    const result = await verifyPublicationDetailed(attempt, fetcher);

    expect(result.failure).toBeUndefined();
    expect(result.receipt.outcome).toBe('VERIFIED');
  });
});
