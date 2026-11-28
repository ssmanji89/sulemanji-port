import type { Candidate, CatalogItem, ContentProposal, PreparationContext, PublicationReceipt, PublicKnowledge, PublishAttempt, ReviewReceipt, Signal } from './contracts.js';
import { ModelAdmissionHoldError, type ModelGateway } from './models.js';
import { nextChicagoBudgetDay, type EditorialPolicy } from './scheduler.js';
import { SocialCardContentError, type SocialCardRenderer } from './social-card-format.js';
import { articleSourcePath, attachSocialCard, connectionArticles, ContextualLinkHold, prepareContent, reviewContent, reviseContent } from './review.js';
import type { CandidateProcessOutcome, DurableStep } from './workflow-core.js';
import { independentKnowledge, isRecycledSignal } from './evidence-origin.js';

const PUBLICATION_WAIT_MS = [30_000, 60_000, 90_000, 120_000, 180_000];
type CandidatePipelineInput = {
  candidate: Candidate;
  signal: Signal;
  catalog: CatalogItem[];
  knowledge: PublicKnowledge[];
  policy: EditorialPolicy;
  owner_epoch: number;
  step: DurableStep;
  resumeCapacity?: DeferredReview;
};
export type ReviewedPublication = { proposal: ContentProposal; review: ReviewReceipt; attempt: PublishAttempt };
export type DeferredReview = ReviewedPublication & { claim: string };
type PublicationResult = { attempt: PublishAttempt; merged: boolean };
type ModelStepHold = { modelHoldReason: string; continue_after_hold?: true; checkpoint_owner?: true };
export type CandidateCheckpoint = { proposal?: ContentProposal; review?: ReviewReceipt; attempt?: PublishAttempt; publication?: PublicationReceipt; retry_after?: string; signal?: Signal; reason?: string };
export type CandidateCheckpointState = 'DRAFTED' | 'REVIEWED' | 'NEEDS_OWNER' | 'SOURCE_PUBLISHED' | 'CAPACITY_HELD' | 'VERIFIED' | 'NO_CHANGE';
export type CandidatePipelineDependencies = {
  modelsFor(candidate: Candidate, ownerEpoch: number, policy: EditorialPolicy): ModelGateway;
  renderSocialCard: SocialCardRenderer;
  preparationContext(input: CandidatePipelineInput): Promise<PreparationContext | { refresh_hold: string }>;
  publish(proposal: ContentProposal, review: ReviewReceipt, signal: Signal, catalog: CatalogItem[], claim?: string): Promise<PublicationResult>;
  verify(attempt: PublishAttempt): Promise<{ receipt: PublicationReceipt; failure?: string }>;
  persist(candidateId: string, ownerEpoch: number, state: CandidateCheckpointState, checkpoint: CandidateCheckpoint, claim?: string): Promise<boolean>;
};

function stepPart(candidateId: string): string {
  return candidateId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
}

async function runModelStep<T>(step: DurableStep, name: string, generate: () => Promise<T>): Promise<T | ModelStepHold> {
  return step.do(name, async () => {
    try {
      return await generate();
    } catch (error) {
      if (error instanceof ContextualLinkHold) return { modelHoldReason: error.message, continue_after_hold: true, checkpoint_owner: true };
      if (error instanceof ModelAdmissionHoldError) {
        // Only limits specific to this candidate leave unrelated model work qualified.
        const candidateLimit = error.message === 'MODEL_CALL_LIMIT_HOLD' || error.message === 'MODEL_REVIEW_ROUND_LIMIT_HOLD' ||
          error.message === 'MODEL_REQUEST_LIMIT';
        return { modelHoldReason: error.reason, ...(candidateLimit ? { continue_after_hold: true as const } : {}) };
      }
      throw error;
    }
  });
}

function modelHoldOutcome(hold: ModelStepHold): CandidateProcessOutcome {
  return { status: 'held', reason: hold.modelHoldReason, ...(hold.continue_after_hold ? { continue_after_hold: true } : {}) };
}

export function createEditorialCandidatePipeline(deps: CandidatePipelineDependencies) {
  return {
    async processCandidate(input: CandidatePipelineInput): Promise<CandidateProcessOutcome> {
      const { candidate, policy, owner_epoch: ownerEpoch, step } = input;
      if (candidate.action === 'REPAIR' || candidate.action === 'PROPOSE') {
        return { status: 'held', reason: 'This candidate action requires an owner decision.', continue_after_hold: true };
      }
      if (!Number.isSafeInteger(ownerEpoch) || ownerEpoch < 1 || !Number.isSafeInteger(policy.max_review_rounds_per_candidate) ||
          policy.max_review_rounds_per_candidate < 1 || policy.max_review_rounds_per_candidate > 3) {
        return { status: 'held', reason: 'Candidate publication context is not qualified.' };
      }
      const key = stepPart(candidate.id);
      const connection = connectionArticles(candidate, input.catalog);
      const holdConnection = async (reason: string, label: string, checkpoint: CandidateCheckpoint): Promise<CandidateProcessOutcome> => {
        const claim = input.resumeCapacity?.claim;
        const recorded = await step.do(`persist-candidate-${key}-NEEDS_OWNER-connect-${label}`, () =>
          deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', checkpoint, claim));
        if (!recorded) return { status: 'held', reason: 'Could not checkpoint the contextual link hold.' };
        return { status: 'held', reason, continue_after_hold: true };
      };
      const qualifiedConnection = (proposal: ContentProposal): boolean => {
        if (!connection) return false;
        const [file] = proposal.files;
        const [expected] = proposal.expected_content;
        const relatedUrl = new URL(connection.to.url, 'https://www.sulemanji.com').pathname;
        return proposal.files.length === 1 && file.operation === 'update' && file.path === connection.path &&
          proposal.expected_content.length === 1 && expected.url === connection.from.url && expected.contextual_link?.href === relatedUrl;
      };
      const deferred = input.resumeCapacity;
      if (isRecycledSignal(input.signal, input.catalog)) {
        const reason = 'A published site article cannot serve as independent evidence.';
        const checkpoint = deferred
          ? { proposal: deferred.proposal, review: deferred.review, attempt: deferred.attempt, reason }
          : { reason };
        const recorded = await step.do(`persist-candidate-${key}-NO_CHANGE-recycled-source`, () =>
          deps.persist(candidate.id, ownerEpoch, 'NO_CHANGE', checkpoint, deferred?.claim));
        if (!recorded) return { status: 'held', reason: 'Could not checkpoint the recycled evidence decision.' };
        return { status: 'no_change', reason };
      }
      if (candidate.action === 'CONNECT' && (!connection || (deferred && !qualifiedConnection(deferred.proposal)))) {
        const checkpoint = deferred ? { proposal: deferred.proposal, review: deferred.review, attempt: deferred.attempt } : {};
        return holdConnection('The contextual link requires two qualified article identities and an existing-article update.', deferred ? 'deferred' : 'targets', checkpoint);
      }
      if (deferred) return publishReviewed(input, deferred.proposal, deferred.review, deps);
      if (candidate.action === 'REFRESH') {
        const target = input.catalog.find((item) => item.id === candidate.target_id);
        if (target && !articleSourcePath(target.url)) {
          const recorded = await step.do(`persist-candidate-${key}-NEEDS_OWNER-target`, () =>
            deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', {}));
          if (!recorded) return { status: 'held', reason: 'Could not checkpoint the portfolio refresh hold.' };
          return { status: 'held', reason: 'A portfolio refresh requires owner review.', continue_after_hold: true };
        }
      }
      const prepared = await step.do(`prepare-context-${key}`, () => deps.preparationContext(input));
      if ('refresh_hold' in prepared) {
        const recorded = await step.do(`persist-candidate-${key}-NEEDS_OWNER-claim`, () =>
          deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', { reason: prepared.refresh_hold }));
        return { status: 'held', reason: recorded ? prepared.refresh_hold : 'Could not checkpoint the factual claim hold.', continue_after_hold: true };
      }
      const context = { ...prepared, knowledge: independentKnowledge(prepared.knowledge, input.catalog) };
      if (connection && context.connection_baseline?.already_linked) {
        return { status: 'no_change', reason: 'The exact related article is already linked from the deployed article body.' };
      }
      const models = deps.modelsFor(candidate, ownerEpoch, policy);
      const draftProposal = await runModelStep(step, `prepare-content-${key}`,
        () => prepareContent(candidate, context, models, `author:${candidate.id}`));
      if ('modelHoldReason' in draftProposal) {
        return draftProposal.checkpoint_owner ? holdConnection(draftProposal.modelHoldReason, 'draft', {}) : modelHoldOutcome(draftProposal);
      }
      if (candidate.action === 'CONNECT' && !qualifiedConnection(draftProposal)) {
        return holdConnection('The contextual link draft does not update the reviewed article.', 'draft-shape', { proposal: draftProposal });
      }
      let proposal = draftProposal;
      if (proposal.files[0]?.operation === 'create') {
        const draft = proposal;
        const card = await step.do(`attach-social-card-${key}`, async () => {
          try {
            return { proposal: await attachSocialCard(draft, deps.renderSocialCard) };
          } catch (error) {
            if (error instanceof SocialCardContentError) return { failure: error.message };
            throw error;
          }
        });
        if (!card.proposal) {
          const recorded = await step.do(`persist-candidate-${key}-NEEDS_OWNER-card`, () =>
            deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', { proposal: draft }));
          if (!recorded) return { status: 'held', reason: 'Workflow authority changed before the social card hold could be checkpointed.' };
          return { status: 'held', reason: `Social card requires owner review (${card.failure}).`, continue_after_hold: true };
        }
        proposal = card.proposal;
      }
      let checkpoint: CandidateCheckpoint = { proposal };
      if (!(await step.do(`persist-candidate-${key}-DRAFTED`, () => deps.persist(candidate.id, ownerEpoch, 'DRAFTED', checkpoint)))) {
        return { status: 'held', reason: 'Workflow authority changed before the draft could be checkpointed.' };
      }

      let cleared: ReviewReceipt | null = null;
      const maximumRounds = Math.min(3, policy.max_review_rounds_per_candidate);
      for (let round = 1; round <= maximumRounds; round += 1) {
        const reviewerRunId = `review:${candidate.id}:round-${round}`;
        const reviewContext = { ...context, reviewer_run_id: reviewerRunId };
        const receipt = await runModelStep(step, `review-content-${key}-round-${round}`, () => reviewContent(proposal, reviewContext, models));
        if ('modelHoldReason' in receipt) return modelHoldOutcome(receipt);
        checkpoint = { proposal, review: receipt };
        if (receipt.decision === 'CLEAR') {
          if (receipt.findings.length !== 0 || receipt.reviewer_run_id === proposal.author_run_id || receipt.content_digest !== proposal.content_digest ||
              receipt.candidate_id !== candidate.id || receipt.owner_epoch !== ownerEpoch) {
            return { status: 'held', reason: 'Independent clearance did not bind to the exact current proposal.' };
          }
          if (!(await step.do(`persist-candidate-${key}-REVIEWED`, () => deps.persist(candidate.id, ownerEpoch, 'REVIEWED', checkpoint)))) {
            return { status: 'held', reason: 'Workflow authority changed before review clearance could be checkpointed.' };
          }
          cleared = receipt;
          break;
        }
        if (receipt.decision === 'HOLD' || context.dotnet_refresh || round === maximumRounds) {
          const recorded = await step.do(`persist-candidate-${key}-NEEDS_OWNER-round-${round}`, () => deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', checkpoint));
          if (!recorded) return { status: 'held', reason: 'Could not checkpoint the independent review hold.' };
          return { status: 'held', reason: receipt.decision === 'HOLD' || context.dotnet_refresh
            ? 'Independent review requires an owner decision.' : 'Review rounds were exhausted before clearance.', continue_after_hold: true };
        }
        const revision = await runModelStep(step, `revise-content-${key}-round-${round}`, () => reviseContent(proposal, candidate, context, receipt.findings,
          models, `author:${candidate.id}:revision-${round}`));
        if ('modelHoldReason' in revision) {
          return revision.checkpoint_owner ? holdConnection(revision.modelHoldReason, `revision-${round}`, checkpoint) : modelHoldOutcome(revision);
        }
        if (candidate.action === 'CONNECT' && !qualifiedConnection(revision)) {
          return holdConnection('The contextual link revision changed the article identities.', `revision-shape-${round}`, checkpoint);
        }
        proposal = revision;
        checkpoint = { proposal, review: receipt };
        if (!(await step.do(`persist-candidate-${key}-DRAFTED-round-${round}`, () => deps.persist(candidate.id, ownerEpoch, 'DRAFTED', checkpoint)))) {
          return { status: 'held', reason: 'Workflow authority changed before the revision could be checkpointed.' };
        }
      }
      if (!cleared) return { status: 'held', reason: 'Independent review did not clear the candidate.' };

      return publishReviewed(input, proposal, cleared, deps);
    },
  };
}

async function publishReviewed(input: CandidatePipelineInput, proposal: ContentProposal, review: ReviewReceipt,
  deps: CandidatePipelineDependencies): Promise<CandidateProcessOutcome> {
  const { candidate, owner_epoch: ownerEpoch, step } = input;
  const key = stepPart(candidate.id);
  const claim = input.resumeCapacity?.claim;
  const retrySuffix = claim ? '-capacity-retry' : '';
  let mergedAttempt: PublishAttempt | undefined;
  for (let probe = 0; probe <= PUBLICATION_WAIT_MS.length; probe += 1) {
    const suffix = retrySuffix + (probe ? `-poll-${probe}` : '');
    if (probe) await step.sleep(`await-checks-${key}${suffix}`, PUBLICATION_WAIT_MS[probe - 1]);
    const publication = await step.do(`publish-content-${key}${suffix}`, () => deps.publish(proposal, review, input.signal, input.catalog, claim));
    const attempt = publication.attempt;
    if (attempt.status === 'BRANCH_UNQUALIFIED') {
      return { status: 'held', reason: 'GitHub has no active rule requiring this pull request to be current with the base and pass its checks.' };
    }
    if (input.resumeCapacity && attempt.status === 'FAILED') {
      const stopped = await step.do(`persist-candidate-${key}-NEEDS_OWNER${suffix}`, () =>
        deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', { proposal, review, attempt: input.resumeCapacity?.attempt }, claim));
      if (!stopped) return { status: 'held', reason: 'Could not checkpoint the deferred publication hold.' };
      return { status: 'held', reason: 'The deferred publication requires fresh owner review.', continue_after_hold: true };
    }
    if (attempt.candidate_id !== candidate.id || attempt.owner_epoch !== ownerEpoch || !attempt.source_commit || !attempt.pull_request) {
      return { status: 'held', reason: 'Reviewed source publication requires reconciliation.' };
    }
    if (attempt.status === 'CAPACITY_HELD') {
      const retryAfter = await step.do(`next-publication-day-${key}`, () => new Date(nextChicagoBudgetDay(new Date())).toISOString());
      const recorded = await step.do(`persist-candidate-${key}-CAPACITY_HELD${suffix}`, () =>
        deps.persist(candidate.id, ownerEpoch, 'CAPACITY_HELD', { proposal, review, attempt, retry_after: retryAfter, signal: input.signal }, claim));
      if (!recorded) return { status: 'held', reason: 'Could not checkpoint the publication capacity hold.' };
      return { status: 'held', reason: 'The daily publication allowance would be exceeded.', continue_after_hold: true };
    }
    if (attempt.status === 'UNCERTAIN') continue;
    if (attempt.status !== 'SOURCE_PUBLISHED') {
      return { status: 'held', reason: 'Reviewed source publication requires reconciliation.' };
    }
    const publishedCheckpoint = { proposal, review, attempt };
    if (!input.resumeCapacity && !(await step.do(`persist-candidate-${key}-SOURCE_PUBLISHED${suffix}`, () =>
      deps.persist(candidate.id, ownerEpoch, 'SOURCE_PUBLISHED', publishedCheckpoint)))) {
      return { status: 'held', reason: 'Workflow authority changed before the publication effect could be checkpointed.' };
    }
    if (publication.merged) { mergedAttempt = attempt; break; }
  }
  if (!mergedAttempt) return { status: 'held', reason: 'Pull request checks or merge reconciliation did not complete within the publication wait.' };

  const attempt = mergedAttempt;
  for (let probe = 0; probe <= PUBLICATION_WAIT_MS.length; probe += 1) {
    const suffix = retrySuffix + (probe ? `-poll-${probe}` : '');
    if (probe) await step.sleep(`await-deployment-${key}${suffix}`, PUBLICATION_WAIT_MS[probe - 1]);
    const verification = await step.do(`verify-publication-${key}${suffix}`, () => deps.verify(attempt));
    const receipt = verification.receipt;
    const verifiedCheckpoint = { proposal, review, attempt, publication: receipt };
    if (receipt.outcome !== 'VERIFIED' || verification.failure) {
      if (!input.resumeCapacity && probe === PUBLICATION_WAIT_MS.length) await step.do(`persist-candidate-${key}-SOURCE_PUBLISHED-readback${retrySuffix}`, () =>
        deps.persist(candidate.id, ownerEpoch, 'SOURCE_PUBLISHED', verifiedCheckpoint));
      continue;
    }
    if (receipt.candidate_id !== candidate.id || receipt.owner_epoch !== ownerEpoch || receipt.source_commit !== attempt.source_commit ||
        !receipt.deployment_version || JSON.stringify(receipt.public_urls) !== JSON.stringify(attempt.public_urls)) {
      return { status: 'held', reason: 'Deployment readback did not bind to the exact reviewed publication.' };
    }
    if (!(await step.do(`persist-candidate-${key}-VERIFIED${retrySuffix}`, () => deps.persist(candidate.id, ownerEpoch, 'VERIFIED', verifiedCheckpoint, claim)))) {
      return { status: 'held', reason: 'Workflow authority changed before verified publication could be checkpointed.' };
    }
    return { status: 'verified', reason: 'Publication and exact readback are verified.' };
  }
  return { status: 'held', reason: 'Deployment readback did not verify the exact reviewed publication within the wait.' };
}
