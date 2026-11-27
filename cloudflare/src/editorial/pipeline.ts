import type { Candidate, CatalogItem, ContentProposal, PreparationContext, PublicationReceipt, PublicKnowledge, PublishAttempt, ReviewReceipt, Signal } from './contracts.js';
import type { ModelGateway } from './models.js';
import type { EditorialPolicy } from './scheduler.js';
import { prepareContent, reviewContent, reviseContent } from './review.js';

type DurableStep = { do<T>(name: string, callback: () => Promise<T> | T): Promise<T> };
type CandidatePipelineInput = {
  candidate: Candidate;
  signal: Signal;
  catalog: CatalogItem[];
  knowledge: PublicKnowledge[];
  policy: EditorialPolicy;
  owner_epoch: number;
  step: DurableStep;
};
type PublicationResult = { attempt: PublishAttempt; merged: boolean };
type PipelineOutcome = { status: 'verified' | 'held'; reason: string };
export type CandidateCheckpoint = { proposal?: ContentProposal; review?: ReviewReceipt; attempt?: PublishAttempt; publication?: PublicationReceipt };
export type CandidatePipelineDependencies = {
  modelsFor(candidate: Candidate, ownerEpoch: number, policy: EditorialPolicy): ModelGateway;
  preparationContext(input: CandidatePipelineInput): Promise<PreparationContext>;
  publish(proposal: ContentProposal, review: ReviewReceipt): Promise<PublicationResult>;
  verify(attempt: PublishAttempt): Promise<{ receipt: PublicationReceipt; failure?: string }>;
  persist(candidateId: string, ownerEpoch: number, state: 'DRAFTED' | 'REVIEWED' | 'NEEDS_OWNER' | 'SOURCE_PUBLISHED' | 'VERIFIED', checkpoint: CandidateCheckpoint): Promise<boolean>;
};

function stepPart(candidateId: string): string {
  return candidateId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
}

export function createEditorialCandidatePipeline(deps: CandidatePipelineDependencies) {
  return {
    async processCandidate(input: CandidatePipelineInput): Promise<PipelineOutcome> {
      const { candidate, policy, owner_epoch: ownerEpoch, step } = input;
      if (candidate.action === 'REPAIR' || candidate.action === 'PROPOSE') return { status: 'held', reason: 'This candidate action requires an owner decision.' };
      if (!Number.isSafeInteger(ownerEpoch) || ownerEpoch < 1 || !Number.isSafeInteger(policy.max_review_rounds_per_candidate) ||
          policy.max_review_rounds_per_candidate < 1 || policy.max_review_rounds_per_candidate > 3) {
        return { status: 'held', reason: 'Candidate publication context is not qualified.' };
      }
      const key = stepPart(candidate.id);
      const context = await step.do(`prepare-context-${key}`, () => deps.preparationContext(input));
      const models = deps.modelsFor(candidate, ownerEpoch, policy);
      let proposal = await step.do(`prepare-content-${key}`, () => prepareContent(candidate, context, models, `author:${candidate.id}`));
      let checkpoint: CandidateCheckpoint = { proposal };
      if (!(await step.do(`persist-candidate-${key}-DRAFTED`, () => deps.persist(candidate.id, ownerEpoch, 'DRAFTED', checkpoint)))) {
        return { status: 'held', reason: 'Workflow authority changed before the draft could be checkpointed.' };
      }

      let cleared: ReviewReceipt | null = null;
      const maximumRounds = Math.min(3, policy.max_review_rounds_per_candidate);
      for (let round = 1; round <= maximumRounds; round += 1) {
        const reviewerRunId = `review:${candidate.id}:round-${round}`;
        const reviewContext = { ...context, reviewer_run_id: reviewerRunId };
        const receipt = await step.do(`review-content-${key}-round-${round}`, () => reviewContent(proposal, reviewContext, models));
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
        if (receipt.decision === 'HOLD' || round === maximumRounds) {
          await step.do(`persist-candidate-${key}-NEEDS_OWNER-round-${round}`, () => deps.persist(candidate.id, ownerEpoch, 'NEEDS_OWNER', checkpoint));
          return { status: 'held', reason: receipt.decision === 'HOLD' ? 'Independent review requires an owner decision.' : 'Review rounds were exhausted before clearance.' };
        }
        proposal = await step.do(`revise-content-${key}-round-${round}`, () => reviseContent(proposal, candidate, context, receipt.findings,
          models, `author:${candidate.id}:revision-${round}`));
        checkpoint = { proposal, review: receipt };
        if (!(await step.do(`persist-candidate-${key}-DRAFTED-round-${round}`, () => deps.persist(candidate.id, ownerEpoch, 'DRAFTED', checkpoint)))) {
          return { status: 'held', reason: 'Workflow authority changed before the revision could be checkpointed.' };
        }
      }
      if (!cleared) return { status: 'held', reason: 'Independent review did not clear the candidate.' };

      const publication = await step.do(`publish-content-${key}`, () => deps.publish(proposal, cleared!));
      checkpoint = { proposal, review: cleared, attempt: publication.attempt };
      if (!(await step.do(`persist-candidate-${key}-SOURCE_PUBLISHED`, () => deps.persist(candidate.id, ownerEpoch, 'SOURCE_PUBLISHED', checkpoint)))) {
        return { status: 'held', reason: 'Workflow authority changed before the publication effect could be checkpointed.' };
      }
      if (!publication.merged || publication.attempt.candidate_id !== candidate.id || publication.attempt.owner_epoch !== ownerEpoch ||
          !publication.attempt.source_commit || publication.attempt.status === 'UNCERTAIN' || publication.attempt.status === 'FAILED') {
        return { status: 'held', reason: 'Reviewed source publication is pending or requires reconciliation.' };
      }

      const verification = await step.do(`verify-publication-${key}`, () => deps.verify(publication.attempt));
      checkpoint = { proposal, review: cleared, attempt: publication.attempt, publication: verification.receipt };
      const receipt = verification.receipt;
      if (receipt.outcome !== 'VERIFIED' || receipt.candidate_id !== candidate.id || receipt.owner_epoch !== ownerEpoch ||
          receipt.source_commit !== publication.attempt.source_commit || !receipt.deployment_version ||
          JSON.stringify(receipt.public_urls) !== JSON.stringify(publication.attempt.public_urls) || verification.failure) {
        await step.do(`persist-candidate-${key}-SOURCE_PUBLISHED-readback`, () => deps.persist(candidate.id, ownerEpoch, 'SOURCE_PUBLISHED', checkpoint));
        return { status: 'held', reason: 'Public deployment readback did not verify the exact reviewed publication.' };
      }
      if (!(await step.do(`persist-candidate-${key}-VERIFIED`, () => deps.persist(candidate.id, ownerEpoch, 'VERIFIED', checkpoint)))) {
        return { status: 'held', reason: 'Workflow authority changed before verified publication could be checkpointed.' };
      }
      return { status: 'verified', reason: 'Publication and exact public readback are verified.' };
    },
  };
}
