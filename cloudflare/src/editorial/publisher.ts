import type { ContentProposal, PublicationReceipt, PublicationState, PublishAttempt, ReviewReceipt } from './contracts.js';
import * as parse5 from 'parse5';
import { articleSourcePath, verifiesContextualLink, verifyRequiredMedia } from './review.js';
import { CANONICAL_SITE_ORIGIN, connectionParagraph, matchesConnectionParagraph, normalizeNodeText, textDigest as sha256, type HtmlNode } from './site-readback.js';
import { encodeSocialCard, isSocialCardPng, MAX_CARD_BYTES, socialCardPath } from './social-card-format.js';
import { readDiscoveryLinks } from './discovery-readback.js';

export type PublishDecision = { allowed: true } | { allowed: false; reasons: string[] };
export type PullRequestState = { number: number; head_sha: string; state: 'open' | 'closed'; merged: boolean; merge_commit_sha: string | null; checks: 'pending' | 'success' | 'failure' };
export interface GitHubPublisher {
  findPullRequest(branch: string): Promise<PullRequestState | null>;
  createReviewedBranchAndPullRequest(input: { candidate_id: string; branch: string; base_commit: string; content_digest: string; files: ContentProposal['files']; title: string; body: string }): Promise<PullRequestState>;
  hasStrictMergeChecks(): Promise<boolean>;
  mergePullRequest(number: number, expectedHead: string, authorize: () => Promise<boolean>): Promise<{ merge_commit_sha: string } | { refused: true }>;
}
export type PublishEffect = {
  effect_id: string; branch: string; owner_epoch: number; content_digest: string;
  pull_request: number | null; source_commit: string | null; merge_commit: string | null; merge_settled_date?: string | null; state: string;
};
export type PublicationCounts = { new_articles: number; refreshes: number };
export interface PublishEffectStore {
  ensureIntent(candidateId: string, effectId: string, branch: string, ownerEpoch: number, contentDigest: string): Promise<void>;
  read(candidateId: string): Promise<PublishEffect | null>;
  reserveMergeCapacity(candidateId: string, counts: PublicationCounts, dispatchId: string): Promise<boolean>;
  hasMergeDispatch(candidateId: string, dispatchId: string): Promise<boolean>;
  releaseUndispatchedMerge(candidateId: string, dispatchId: string): Promise<void>;
  record(candidateId: string, patch: { pull_request?: number; source_commit?: string; merge_commit?: string; state: string }): Promise<void>;
}
type PublicationAuthority = Pick<PublicationState, 'owner_epoch' | 'paused'>;
export type PublishDependencies = {
  store: PublishEffectStore; github: GitHubPublisher;
  readAuthority(): Promise<PublicationAuthority>;
  currentState(): Promise<PublicationState>;
};

const ARTICLE = /^notes\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const MEDIA = /^assets\/images\/articles\/[a-z0-9][a-z0-9._-]{0,150}\.(?:svg|png|webp|jpe?g)$/i;

function safePath(path: string): boolean {
  return !path.startsWith('/') && !path.includes('..') && !path.includes('\\') && !path.includes('\0') && (ARTICLE.test(path) || MEDIA.test(path));
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
  for (const item of proposal.expected_content) {
    if (!item.contextual_link) continue;
    const file = proposal.files.find((change) => change.path === articleSourcePath(item.url));
    const sources = proposal.public_sources.map(({ url }) => url);
    if (!file || item.contextual_link.sources.length !== sources.length ||
        sources.some((url, index) => url !== item.contextual_link?.sources[index]) ||
        !await verifiesContextualLink(file, item.url, item.contextual_link)) reasons.push('Required contextual link is missing or unsafe.');
  }
  if (proposal.files.some((file) => file.operation === 'create' && ARTICLE.test(file.path) &&
      !proposal.expected_content.some((item) => item.social_image && articleSourcePath(item.url) === file.path)) ||
      !verifyRequiredMedia(proposal, state.allowed_paths)) reasons.push('Required media is missing or unsafe.');
  for (const file of proposal.files) {
    if (file.content.length > 262_144 || !/^[0-9a-f]{64}$/.test(file.content_sha256)) { reasons.push(`File payload is invalid or too large: ${file.path}.`); continue; }
    if (await sha256(file.content) !== file.content_sha256) reasons.push(`File digest mismatch: ${file.path}.`);
  }
  const expectedDigest = await sha256(proposal.files.map((file) => `${file.path}\n${file.content_sha256}`).sort().join('\n'));
  if (expectedDigest !== proposal.content_digest) reasons.push('Content digest does not match the proposed files.');
  return reasons.length ? { allowed: false, reasons } : { allowed: true };
}

function attemptFor(proposal: ContentProposal, state: PublicationAuthority, branch: string, pullRequest: number | null, sourceCommit: string | null, status: PublishAttempt['status']): PublishAttempt {
  return { id: `publication:${proposal.candidate_id}`, candidate_id: proposal.candidate_id, owner_epoch: state.owner_epoch, branch, pull_request: pullRequest,
    source_commit: sourceCommit, deployment_version: null, public_urls: proposal.public_urls, expected_content: proposal.expected_content, status };
}

export async function publishContent(proposal: ContentProposal, receipt: ReviewReceipt, deps: PublishDependencies): Promise<PublishAttempt> {
  const branch = `editorial/candidate-${proposal.candidate_id.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 80)}`;
  const attemptId = `publication:${proposal.candidate_id}`;
  const recorded = await deps.store.read(proposal.candidate_id);
  let knownPull: PullRequestState | null = null;
  if (recorded && (recorded.state === 'MERGED' || (recorded.pull_request && recorded.source_commit))) {
    const authority = await deps.readAuthority();
    const exact = recorded.pull_request && recorded.effect_id === attemptId && recorded.branch === branch &&
      recorded.owner_epoch === authority.owner_epoch && recorded.content_digest === proposal.content_digest;
    const replay = exact && await canPublish(proposal, receipt, {
      ...authority, base_commit: proposal.base_commit, policy_revision: proposal.policy_revision,
      knowledge_revision: proposal.knowledge_revision, source_digest: proposal.source_digest,
      allowed_paths: proposal.files.map((file) => file.path), author_run_id: proposal.author_run_id,
    });
    if (!replay || !replay.allowed) return attemptFor(proposal, authority, branch, null, null, 'FAILED');
    if (recorded.state === 'FAILED' && recorded.merge_settled_date) return attemptFor(proposal, authority, branch, null, null, 'FAILED');
    if (recorded.state === 'MERGED') return recorded.merge_commit
      ? attemptFor(proposal, authority, branch, recorded.pull_request, recorded.merge_commit, 'SOURCE_PUBLISHED')
      : attemptFor(proposal, authority, branch, null, null, 'FAILED');
    // The merge can advance the base before we record it. This path observes an existing effect only.
    try { knownPull = await deps.github.findPullRequest(branch); }
    catch { return attemptFor(proposal, authority, branch, recorded.pull_request, recorded.source_commit, 'UNCERTAIN'); }
    if (!knownPull) return attemptFor(proposal, authority, branch, recorded.pull_request, recorded.source_commit, 'UNCERTAIN');
    if (knownPull.number === recorded.pull_request && knownPull.head_sha === recorded.source_commit &&
        knownPull.merged && knownPull.merge_commit_sha) {
      await deps.store.record(proposal.candidate_id, { merge_commit: knownPull.merge_commit_sha, state: 'MERGED' });
      return attemptFor(proposal, authority, branch, knownPull.number, knownPull.merge_commit_sha, 'SOURCE_PUBLISHED');
    }
  }
  const state = await deps.currentState();
  const decision = await canPublish(proposal, receipt, state);
  if (!decision.allowed) return attemptFor(proposal, state, branch, null, null, 'FAILED');
  await deps.store.ensureIntent(proposal.candidate_id, attemptId, branch, state.owner_epoch, proposal.content_digest);
  const effect = await deps.store.read(proposal.candidate_id);
  if (effect?.merge_commit) return attemptFor(proposal, state, branch, effect.pull_request, effect.merge_commit, 'SOURCE_PUBLISHED');
  try {
    let pull = knownPull ?? await deps.github.findPullRequest(branch);
    if (!pull) {
      const fresh = await deps.currentState();
      const check = await canPublish(proposal, receipt, fresh);
      if (!check.allowed) { await deps.store.record(proposal.candidate_id, { state: 'FAILED' }); return attemptFor(proposal, fresh, branch, null, null, 'FAILED'); }
      pull = await deps.github.createReviewedBranchAndPullRequest({ candidate_id: proposal.candidate_id, branch, base_commit: proposal.base_commit, content_digest: proposal.content_digest,
        files: proposal.files, title: `Editorial: ${proposal.expected_content[0].title}`, body: `Candidate ${proposal.candidate_id}\nContent digest ${proposal.content_digest}\nIndependent review ${receipt.reviewer_run_id}` });
      await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'SOURCE_PUBLISHED' });
    } else {
      if (!effect || effect.pull_request !== pull.number || effect.source_commit !== pull.head_sha) {
        await deps.store.record(proposal.candidate_id, { state: 'UNCERTAIN' });
        return attemptFor(proposal, state, branch, null, null, 'UNCERTAIN');
      }
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
    if (!(await deps.github.hasStrictMergeChecks())) return attemptFor(proposal, state, branch, pull.number, pull.head_sha, 'BRANCH_UNQUALIFIED');
    const beforeMerge = await deps.currentState();
    const finalDecision = await canPublish(proposal, receipt, beforeMerge);
    if (!finalDecision.allowed) { await deps.store.record(proposal.candidate_id, { pull_request: pull.number, source_commit: pull.head_sha, state: 'FAILED' }); return attemptFor(proposal, beforeMerge, branch, pull.number, pull.head_sha, 'FAILED'); }
    const articleFiles = proposal.files.filter((file) => ARTICLE.test(file.path));
    const newArticles = articleFiles.filter((file) => file.operation === 'create').length;
    const dispatchId = crypto.randomUUID();
    let granted: boolean;
    try {
      granted = await deps.store.reserveMergeCapacity(proposal.candidate_id, {
        new_articles: newArticles, refreshes: articleFiles.length - newArticles,
      }, dispatchId);
    } catch (error) {
      // Admission can commit before its response is lost. No merge call starts on this path.
      await deps.store.releaseUndispatchedMerge(proposal.candidate_id, dispatchId);
      throw error;
    }
    if (!granted) return attemptFor(proposal, beforeMerge, branch, pull.number, pull.head_sha, 'CAPACITY_HELD');
    let mergeCommit: string;
    try {
      const merged = await deps.github.mergePullRequest(pull.number, pull.head_sha, async () => {
        const current = await deps.currentState();
        if (!(await canPublish(proposal, receipt, current)).allowed || !(await deps.store.hasMergeDispatch(proposal.candidate_id, dispatchId))) return false;
        const authority = await deps.readAuthority();
        return !authority.paused && authority.owner_epoch === receipt.owner_epoch;
      });
      if ('refused' in merged) {
        await deps.store.releaseUndispatchedMerge(proposal.candidate_id, dispatchId);
        return attemptFor(proposal, beforeMerge, branch, pull.number, pull.head_sha, 'FAILED');
      }
      mergeCommit = merged.merge_commit_sha;
    } catch {
      const readback = await deps.github.findPullRequest(branch);
      if (!readback?.merged || !readback.merge_commit_sha || readback.number !== pull.number || readback.head_sha !== pull.head_sha) {
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
    const latest = await deps.store.read(proposal.candidate_id);
    const confirmedPull = Boolean(latest && readback && latest.pull_request === readback.number && latest.source_commit === readback.head_sha);
    if (confirmedPull && readback?.merged && readback.merge_commit_sha) {
      await deps.store.record(proposal.candidate_id, { pull_request: readback.number, source_commit: readback.head_sha, merge_commit: readback.merge_commit_sha, state: 'MERGED' });
      return attemptFor(proposal, state, branch, readback.number, readback.merge_commit_sha, 'SOURCE_PUBLISHED');
    }
    if (confirmedPull && readback?.state === 'open') {
      await deps.store.record(proposal.candidate_id, { pull_request: readback.number, source_commit: readback.head_sha, state: 'SOURCE_PUBLISHED' });
      return attemptFor(proposal, state, branch, readback.number, readback.head_sha, readback.checks === 'failure' ? 'FAILED' : 'SOURCE_PUBLISHED');
    }
    await deps.store.record(proposal.candidate_id, { state: 'UNCERTAIN' });
    return attemptFor(proposal, state, branch, latest?.pull_request ?? null, latest?.source_commit ?? null, 'UNCERTAIN');
  }
}

async function readCardBytes(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('social card response body is missing');
  const bytes = new Uint8Array(MAX_CARD_BYTES);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return bytes.subarray(0, size);
      if (size + value.length > MAX_CARD_BYTES) {
        await reader.cancel();
        throw new Error('social card response exceeds bound');
      }
      bytes.set(value, size);
      size += value.length;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function verifyPublicationDetailed(attempt: PublishAttempt, fetcher: typeof fetch,
  readback: 'public' | 'private-binding' = 'public'): Promise<{ receipt: PublicationReceipt; failure?: string }> {
  if (!attempt.source_commit) return { receipt: { candidate_id: attempt.candidate_id, owner_epoch: attempt.owner_epoch, source_commit: '', deployment_version: '', public_urls: attempt.public_urls, verified_at: new Date().toISOString(), outcome: 'UNCERTAIN' }, failure: 'merged source commit missing' };
  try {
    const articleUrls: string[] = [];
    let releaseAssetDigest: string | null = null;
    let releaseBuiltAt: string | null = null;
    for (const url of attempt.public_urls) {
      const expectedUrl = new URL(url, CANONICAL_SITE_ORIGIN);
      if (expectedUrl.origin !== CANONICAL_SITE_ORIGIN || expectedUrl.username || expectedUrl.password ||
          expectedUrl.search || expectedUrl.hash) throw new Error('publication readback URL is outside the canonical origin');
      const response = await fetcher(expectedUrl, { redirect: 'manual' });
      const originMatches = response.url ? new URL(response.url).origin === expectedUrl.origin : readback === 'private-binding';
      if (!response.ok || !originMatches) throw new Error('page unavailable or redirected off canonical host');
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error('article response exceeds bound');
      articleUrls.push(expectedUrl.href);
      const item = attempt.expected_content.find((expected) => expected.url === url);
      if (!item) throw new Error('expected article absent');
      const page = parse5.parse(html) as unknown as HtmlNode;
      const titles: string[] = [];
      const articles: HtmlNode[] = [];
      const canonicalUrls: string[] = [];
      const socialImages: string[] = [];
      const walk = (row: HtmlNode): void => {
        if (row.tagName === 'h1') titles.push(normalizeNodeText(row));
        if (row.tagName === 'div' && row.attrs?.some((attr) => attr.name === 'data-writing-body')) articles.push(row);
        if (row.tagName === 'link' && row.attrs?.some((attr) => attr.name === 'rel' && attr.value === 'canonical')) {
          const href = row.attrs.find((attr) => attr.name === 'href')?.value; if (href) canonicalUrls.push(new URL(href, expectedUrl).toString());
        }
        if (row.tagName === 'meta' && row.attrs?.some((attr) => attr.name === 'property' && attr.value === 'og:image')) {
          socialImages.push(row.attrs.find((attr) => attr.name === 'content')?.value ?? '');
        }
        for (const child of row.childNodes ?? []) walk(child);
      };
      walk(page);
      const context = item.contextual_link;
      const matchingText = await Promise.all(articles.map(async (article) => {
        if (!context) return sha256(normalizeNodeText(article));
        const targetPath = articleSourcePath(context.href);
        if (!targetPath || context.href !== `/${targetPath.slice(0, -3)}` || context.href === expectedUrl.pathname) return null;
        const paragraph = connectionParagraph(article, context.href);
        if (!paragraph || !await matchesConnectionParagraph(paragraph, context)) return null;
        return sha256(normalizeNodeText({ ...article, childNodes: article.childNodes?.filter((child) => child !== paragraph) }));
      }));
      if (!canonicalUrls.includes(expectedUrl.toString()) || !titles.some((title) => title === item.title) ||
          !matchingText.includes(item.text_sha256) || (context && articles.length !== 1)) {
        throw new Error('canonical URL, title, visible article text, or contextual link mismatch');
      }
      const sourceCommit = response.headers.get('x-site-source-commit');
      if (sourceCommit !== attempt.source_commit) throw new Error('deployed source revision mismatch');
      const assetDigest = response.headers.get('x-site-asset-digest');
      const builtAt = response.headers.get('x-site-built-at');
      let canonicalBuiltAt = false;
      if (builtAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(builtAt)) {
        const parsedBuiltAt = new Date(builtAt);
        canonicalBuiltAt = !Number.isNaN(parsedBuiltAt.getTime()) && parsedBuiltAt.toISOString().replace('.000Z', 'Z') === builtAt;
      }
      if (!assetDigest || !/^sha256:[0-9a-f]{64}$/.test(assetDigest) || !canonicalBuiltAt) throw new Error('deployed asset release identity is invalid');
      if (releaseAssetDigest !== null && (releaseAssetDigest !== assetDigest || releaseBuiltAt !== builtAt)) throw new Error('public pages came from different deployed releases');
      releaseAssetDigest = assetDigest;
      releaseBuiltAt = builtAt;
      if (item.social_image) {
        const { path, content_sha256: cardDigest } = item.social_image;
        const articlePath = articleSourcePath(item.url);
        if (!articlePath || path !== socialCardPath(articlePath)) {
          throw new Error('social card path does not match the article');
        }
        const target = new URL(path, CANONICAL_SITE_ORIGIN);
        if (socialImages.length !== 1 || socialImages[0] !== target.href) throw new Error('social card metadata mismatch');
        const card = await fetcher(target, { redirect: 'manual' });
        if (!card.ok || (card.url ? card.url !== target.href : readback !== 'private-binding') ||
            card.headers.get('content-type') !== 'image/png' || card.headers.get('x-site-source-commit') !== sourceCommit ||
            card.headers.get('x-site-asset-digest') !== assetDigest || card.headers.get('x-site-built-at') !== builtAt) {
          throw new Error('social card does not match the deployed release');
        }
        const bytes = await readCardBytes(card);
        if (!isSocialCardPng(bytes) || await sha256(encodeSocialCard(bytes)) !== cardDigest) throw new Error('social card bytes mismatch');
      }
    }
    if (!articleUrls.length || !releaseAssetDigest || !releaseBuiltAt) throw new Error('deployed asset release identity missing');
    for (const [kind, path] of [['writing', '/writing'], ['feed', '/feed.xml'], ['sitemap', '/sitemap.xml']] as const) {
      const target = new URL(path, CANONICAL_SITE_ORIGIN);
      const response = await fetcher(target, { redirect: 'manual' });
      const originMatches = response.url ? new URL(response.url).origin === target.origin : readback === 'private-binding';
      if (!response.ok || !originMatches || response.headers.get('x-site-source-commit') !== attempt.source_commit ||
          response.headers.get('x-site-asset-digest') !== releaseAssetDigest || response.headers.get('x-site-built-at') !== releaseBuiltAt) {
        throw new Error(`${kind} discovery does not match the deployed release`);
      }
      const links = readDiscoveryLinks(kind, await response.text());
      if (articleUrls.some((url) => !links.has(url))) throw new Error(`${kind} discovery does not include the exact article URL`);
    }
    const deploymentVersion = await sha256(`${attempt.source_commit}\n${releaseAssetDigest}\n${releaseBuiltAt}`);
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
