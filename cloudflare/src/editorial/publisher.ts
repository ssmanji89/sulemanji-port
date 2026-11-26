import type { ContentProposal, PublicationReceipt, PublicationState, PublishAttempt, ReviewReceipt } from './contracts.js';
import * as parse5 from 'parse5';
import { verifyRequiredMedia } from './review.js';

export type PublishDecision = { allowed: true } | { allowed: false; reasons: string[] };
export type PullRequestState = { number: number; head_sha: string; state: 'open' | 'closed'; merged: boolean; merge_commit_sha: string | null; checks: 'pending' | 'success' | 'failure' };
export interface GitHubPublisher {
  findPullRequest(branch: string): Promise<PullRequestState | null>;
  createReviewedBranchAndPullRequest(input: { candidate_id: string; branch: string; base_commit: string; content_digest: string; files: ContentProposal['files']; title: string; body: string }): Promise<PullRequestState>;
  mergePullRequest(number: number, expectedHead: string): Promise<{ merge_commit_sha: string }>;
}
export interface PublishEffectStore {
  ensureIntent(candidateId: string, effectId: string, branch: string, ownerEpoch: number, contentDigest: string): Promise<void>;
  read(candidateId: string): Promise<{ pull_request: number | null; source_commit: string | null; merge_commit: string | null; state: string } | null>;
  record(candidateId: string, patch: { pull_request?: number; source_commit?: string; merge_commit?: string; state: string }): Promise<void>;
}
export type PublishDependencies = { store: PublishEffectStore; github: GitHubPublisher; currentState(): Promise<PublicationState>; now?: () => Date };

const ARTICLE = /^notes\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const MEDIA = /^assets\/images\/articles\/[a-z0-9][a-z0-9._-]{0,150}\.(?:svg|png|webp|jpe?g)$/i;

function safePath(path: string): boolean {
  return !path.startsWith('/') && !path.includes('..') && !path.includes('\\') && !path.includes('\0') && (ARTICLE.test(path) || MEDIA.test(path));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function canPublish(proposal: ContentProposal, receipt: ReviewReceipt, state: PublicationState): Promise<PublishDecision> {
  const reasons: string[] = [];
  if (receipt.decision !== 'CLEAR' || receipt.findings.length !== 0) reasons.push('Independent review did not clear the exact proposal.');
  if (!receipt.reviewer_run_id || receipt.reviewer_run_id === receipt.author_run_id || receipt.author_run_id !== proposal.author_run_id) reasons.push('Reviewer identity is not independent.');
  if (receipt.candidate_id !== proposal.candidate_id || receipt.content_digest !== proposal.content_digest || receipt.source_digest !== proposal.source_digest) reasons.push('Review receipt does not bind to this candidate content and source set.');
  if (proposal.base_commit !== state.base_commit || receipt.base_commit !== state.base_commit) reasons.push('Base commit changed after review.');
  if (proposal.owner_epoch !== state.owner_epoch || receipt.owner_epoch !== state.owner_epoch) reasons.push('Publication owner epoch changed after review.');
  if (proposal.policy_revision !== state.policy_revision || receipt.policy_revision !== state.policy_revision) reasons.push('Editorial policy changed after review.');
  if (proposal.knowledge_revision !== state.knowledge_revision || receipt.knowledge_revision !== state.knowledge_revision) reasons.push('Authorized knowledge changed after review.');
  if (proposal.source_digest !== state.source_digest || receipt.source_digest !== state.source_digest) reasons.push('Public source set changed after review.');
  if (state.paused) reasons.push('Editorial publishing is paused.');
  if (receipt.candidate_id !== proposal.candidate_id || !Number.isSafeInteger(state.owner_epoch) || state.owner_epoch < 1) reasons.push('Publication owner epoch is invalid.');
  if (!proposal.files.length || proposal.files.some((file) => !safePath(file.path) || !state.allowed_paths.includes(file.path) || !['create', 'update'].includes(file.operation))) reasons.push('Changed path is outside the guarded publication allowlist.');
  if (new Set(proposal.files.map((file) => file.path)).size !== proposal.files.length) reasons.push('Proposal contains duplicate paths.');
  if (!proposal.public_urls.length || proposal.expected_content.length !== proposal.public_urls.length || proposal.expected_content.some((item) => !proposal.public_urls.includes(item.url) || !item.title || !/^[0-9a-f]{64}$/.test(item.text_sha256))) reasons.push('Expected public content is incomplete.');
  if (!verifyRequiredMedia(proposal, state.allowed_paths)) reasons.push('Required media is missing or unsafe.');
  for (const file of proposal.files) {
    if (file.content.length > 262_144 || !/^[0-9a-f]{64}$/.test(file.content_sha256)) { reasons.push(`File payload is invalid or too large: ${file.path}.`); continue; }
    if (await sha256(file.content) !== file.content_sha256) reasons.push(`File digest mismatch: ${file.path}.`);
  }
  const expectedDigest = await sha256(proposal.files.map((file) => `${file.path}\n${file.content_sha256}`).sort().join('\n'));
  if (expectedDigest !== proposal.content_digest) reasons.push('Content digest does not match the proposed files.');
  return reasons.length ? { allowed: false, reasons } : { allowed: true };
}

function attemptFor(proposal: ContentProposal, state: PublicationState, branch: string, pullRequest: number | null, sourceCommit: string | null, status: PublishAttempt['status']): PublishAttempt {
  return { id: `publication:${proposal.candidate_id}`, candidate_id: proposal.candidate_id, owner_epoch: state.owner_epoch, branch, pull_request: pullRequest,
    source_commit: sourceCommit, deployment_version: null, public_urls: proposal.public_urls, expected_content: proposal.expected_content, status };
}

export async function publishContent(proposal: ContentProposal, receipt: ReviewReceipt, deps: PublishDependencies): Promise<PublishAttempt> {
  const state = await deps.currentState();
  const decision = await canPublish(proposal, receipt, state);
  const branch = `editorial/candidate-${proposal.candidate_id.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 80)}`;
  const attemptId = `publication:${proposal.candidate_id}`;
  if (!decision.allowed) return attemptFor(proposal, state, branch, null, null, 'FAILED');
  await deps.store.ensureIntent(proposal.candidate_id, attemptId, branch, state.owner_epoch, proposal.content_digest);
  const effect = await deps.store.read(proposal.candidate_id);
  if (effect?.merge_commit) return attemptFor(proposal, state, branch, effect.pull_request, effect.merge_commit, 'SOURCE_PUBLISHED');
  try {
    let pull = await deps.github.findPullRequest(branch);
    if (!pull) {
      const fresh = await deps.currentState();
      const check = await canPublish(proposal, receipt, fresh);
      if (!check.allowed) { await deps.store.record(proposal.candidate_id, { state: 'FAILED' }); return attemptFor(proposal, fresh, branch, null, null, 'FAILED'); }
      pull = await deps.github.createReviewedBranchAndPullRequest({ candidate_id: proposal.candidate_id, branch, base_commit: proposal.base_commit, content_digest: proposal.content_digest,
        files: proposal.files, title: `Editorial: ${proposal.expected_content[0].title}`, body: `Candidate ${proposal.candidate_id}\nContent digest ${proposal.content_digest}\nIndependent review ${receipt.reviewer_run_id}` });
      await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'SOURCE_PUBLISHED' });
    } else {
      await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'SOURCE_PUBLISHED' });
    }
    if (pull.merged && pull.merge_commit_sha) {
      await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, merge_commit: pull.merge_commit_sha, state: 'MERGED' });
      return attemptFor(proposal, state, branch, pull.number, pull.merge_commit_sha, 'SOURCE_PUBLISHED');
    }
    if (pull.checks === 'pending') return attemptFor(proposal, state, branch, pull.number, pull.head_sha, 'SOURCE_PUBLISHED');
    if (pull.checks !== 'success' || pull.state !== 'open') {
      await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'FAILED' });
      return attemptFor(proposal, state, branch, pull.number, pull.head_sha, 'FAILED');
    }
    const beforeMerge = await deps.currentState();
    const finalDecision = await canPublish(proposal, receipt, beforeMerge);
    if (!finalDecision.allowed) { await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'FAILED' }); return attemptFor(proposal, beforeMerge, branch, pull.number, pull.head_sha, 'FAILED'); }
    let mergeCommit: string;
    try { mergeCommit = (await deps.github.mergePullRequest(pull.number, pull.head_sha)).merge_commit_sha; }
    catch {
      const readback = await deps.github.findPullRequest(branch);
      if (!readback?.merged || !readback.merge_commit_sha) {
        await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'UNCERTAIN' });
        return attemptFor(proposal, state, branch, pull.number, pull.head_sha, 'UNCERTAIN');
      }
      mergeCommit = readback.merge_commit_sha;
    }
    await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, merge_commit: mergeCommit, state: 'MERGED' });
    return attemptFor(proposal, beforeMerge, branch, pull.number, mergeCommit, 'SOURCE_PUBLISHED');
  } catch {
    let readback: PullRequestState | null = null;
    try { readback = await deps.github.findPullRequest(branch); } catch { /* Preserve the uncertain intent for later reconciliation. */ }
    if (readback?.merged && readback.merge_commit_sha) {
      await deps.store.record(proposal.candidate_id, { pull_request: readback.number, source_commit: readback.head_sha, merge_commit: readback.merge_commit_sha, state: 'MERGED' });
      return attemptFor(proposal, state, branch, readback.number, readback.merge_commit_sha, 'SOURCE_PUBLISHED');
    }
    if (readback?.state === 'open') {
      await deps.store.record(proposal.candidate_id, { pull_request: readback.number, source_commit: readback.head_sha, state: 'SOURCE_PUBLISHED' });
      return attemptFor(proposal, state, branch, readback.number, readback.head_sha, readback.checks === 'failure' ? 'FAILED' : 'SOURCE_PUBLISHED');
    }
    await deps.store.record(proposal.candidate_id, { state: 'UNCERTAIN' });
    return attemptFor(proposal, state, branch, effect?.pull_request ?? null, effect?.source_commit ?? null, 'UNCERTAIN');
  }
}

export async function verifyPublicationDetailed(attempt: PublishAttempt, fetcher: typeof fetch): Promise<{ receipt: PublicationReceipt; failure?: string }> {
  if (!attempt.source_commit) return { receipt: { candidate_id: attempt.candidate_id, owner_epoch: attempt.owner_epoch, source_commit: '', deployment_version: '', public_urls: attempt.public_urls, verified_at: new Date().toISOString(), outcome: 'UNCERTAIN' }, failure: 'merged source commit missing' };
  try {
    const pages: Array<{ url: string; html: string }> = [];
    for (const url of attempt.public_urls) {
      const expectedUrl = new URL(url, 'https://www.sulemanji.com');
      const response = await fetcher(expectedUrl, { redirect: 'follow' });
      if (!response.ok || new URL(response.url).origin !== expectedUrl.origin) throw new Error('page unavailable or redirected off canonical host');
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error('article response exceeds bound');
      pages.push({ url, html });
      const item = attempt.expected_content.find((expected) => expected.url === url);
      if (!item) throw new Error('expected article absent');
      const page = parse5.parse(html) as unknown as { childNodes?: Array<{ tagName?: string; childNodes?: unknown[] }> };
      const titles: string[] = [];
      const articles: string[] = [];
      const canonicalUrls: string[] = [];
      const walk = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        const row = node as { tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: unknown[] };
        if (row.tagName === 'h1') titles.push(normalizeNodeText(node));
        if (row.tagName === 'div' && row.attrs?.some((attr) => attr.name === 'data-writing-body')) articles.push(normalizeNodeText(node));
        if (row.tagName === 'link' && row.attrs?.some((attr) => attr.name === 'rel' && attr.value === 'canonical')) {
          const href = row.attrs.find((attr) => attr.name === 'href')?.value; if (href) canonicalUrls.push(new URL(href, expectedUrl).toString());
        }
        for (const child of row.childNodes ?? []) walk(child);
      };
      walk(page);
      const matchingText = await Promise.all(articles.map((text) => sha256(text)));
      if (!canonicalUrls.includes(expectedUrl.toString()) || !titles.some((title) => title === item.title) || !matchingText.includes(item.text_sha256)) throw new Error('canonical URL, title, or visible article text mismatch');
      const sourceCommit = response.headers.get('x-site-source-commit');
      if (sourceCommit !== attempt.source_commit) throw new Error('deployed source revision mismatch');
    }
    const first = pages[0];
    const siteOrigin = new URL(first.url, 'https://www.sulemanji.com').origin;
    const writing = await fetcher(new URL('/writing/', siteOrigin));
    const feed = await fetcher(new URL('/feed.xml', siteOrigin));
    const sitemap = await fetcher(new URL('/sitemap.xml', siteOrigin));
    if (!writing.ok || !feed.ok || !sitemap.ok) throw new Error('writing, feed, or sitemap unavailable');
    const writingHtml = await writing.text(); const feedXml = await feed.text(); const sitemapXml = await sitemap.text();
    for (const page of pages) {
      const route = new URL(page.url, siteOrigin).pathname.replace(/\/$/, '');
      if (!writingHtml.includes(route) || !feedXml.includes(route) || !sitemapXml.includes(route)) throw new Error('article discovery, feed, or sitemap readback mismatch');
    }
    const deploymentVersion = await sha256(pages.map(({ url, html }) => `${url}\n${html}`).join('\n'));
    return { receipt: { candidate_id: attempt.candidate_id, owner_epoch: attempt.owner_epoch, source_commit: attempt.source_commit, deployment_version: deploymentVersion,
      public_urls: attempt.public_urls, verified_at: new Date().toISOString(), outcome: 'VERIFIED' } };
  } catch (error) {
    return { receipt: { candidate_id: attempt.candidate_id, owner_epoch: attempt.owner_epoch, source_commit: attempt.source_commit, deployment_version: '',
      public_urls: attempt.public_urls, verified_at: new Date().toISOString(), outcome: 'UNCERTAIN' }, failure: error instanceof Error ? error.message : 'verification failed' };
  }
}

export async function verifyPublication(attempt: PublishAttempt, fetcher: typeof fetch): Promise<PublicationReceipt> {
  return (await verifyPublicationDetailed(attempt, fetcher)).receipt;
}

function normalizeNodeText(node: unknown): string {
  const extract = (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const row = value as { nodeName?: string; value?: string; childNodes?: unknown[] };
    if (['script', 'style', 'noscript'].includes(row.nodeName ?? '')) return '';
    return (row.value ?? '') + (row.childNodes ?? []).map(extract).join(' ');
  };
  return extract(node).replace(/\s+/g, ' ').trim();
}
