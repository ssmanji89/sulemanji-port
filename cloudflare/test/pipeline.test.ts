import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createEditorialCandidatePipeline } from '../src/editorial/pipeline.js';
import type { Candidate, ContentProposal, PreparationContext, PublicationReceipt, PublishAttempt, Signal } from '../src/editorial/contracts.js';
import type { EditorialPolicy } from '../src/editorial/scheduler.js';
import type { ModelGateway, ModelRequest, ModelResult } from '../src/editorial/models.js';
import type { DurableStep } from '../src/editorial/workflow-core.js';

const article = {
  title: 'A careful release evidence update',
  description: 'A practical explanation of when a package update changes a real reader decision.',
  body: `A useful explanation of the release evidence begins with the exact source and the behavior it describes. Engineers should compare the documented change with their own environment before adjusting production. The source makes a narrow claim, so this article keeps its conclusion narrow too. It identifies what changed, explains who should care, and gives readers a concrete way to verify the change before they rely on it. A reader can compare the documented behavior with the package they run, check whether the affected setting is enabled, and record the result before changing a workflow. This avoids treating a release headline as proof that every deployment is affected. [Official release](https://vendor.example.test/releases/42).`,
  publication_family: 'technical-guide', commercial_intent: 'none', time_horizon: 'durable', topics: ['infrastructure'], reader: 'technical-practitioner',
};
const renderSocialCard = async () => new Uint8Array(await readFile(
  new URL('../../assets/images/articles/agent-safety-social.png', import.meta.url)));
const candidate: Candidate = { id: 'create:signal-1:workers', signal_ids: ['signal-1'], target_id: null, action: 'CREATE', reader: 'Technical practitioner',
  question: 'What changed?', benefit: 'Keeps a useful guide current.', source_digest: 'b'.repeat(64), policy_revision: 'policy-v1', knowledge_revision: 'knowledge-v1', state: 'DISCOVERED' };
const source = { url: 'https://vendor.example.test/releases/42', title: 'Release 42', retrieved_at: '2026-11-27T14:00:00.000Z', source_date: '2026-11-27T14:00:00.000Z', content_sha256: 'a'.repeat(64) };
const context: PreparationContext = { catalog: [{ id: 'workers', title: 'Workers', url: '/work/workers/', topics: ['infrastructure'] }], sources: [source], knowledge: [],
  policy_revision: 'policy-v1', knowledge_revision: 'knowledge-v1', base_commit: 'c'.repeat(40), owner_epoch: 1 };
const policy: EditorialPolicy = { revision: 'policy-v1', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1, max_refreshes_daily: 1,
  max_candidates_per_scan: 1, max_fetches_per_scan: 1, max_model_calls_per_candidate: 6, max_review_rounds_per_candidate: 3,
  max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'prices-v1' };

class Models implements ModelGateway {
  outputs: unknown[] = [article, { decision: 'CLEAR', findings: [] }];
  calls: ModelRequest[] = [];
  async generate(request: ModelRequest): Promise<ModelResult> {
    this.calls.push(request);
    return { run_id: request.run_id, output: this.outputs.shift(), actual_usd: 0.01, provider_request_id: `request-${this.calls.length}` };
  }
}

class Steps implements DurableStep {
  names: string[] = [];
  waits = new Map<string, number>();
  values = new Map<string, unknown>();
  async sleep(name: string, milliseconds: number) { this.waits.set(name, milliseconds); }
  async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    this.names.push(name);
    if (!this.values.has(name)) this.values.set(name, await callback());
    return this.values.get(name) as T;
  }
}

function attempt(proposal: ContentProposal): PublishAttempt {
  return { id: `publication:${proposal.candidate_id}`, candidate_id: proposal.candidate_id, owner_epoch: proposal.owner_epoch,
    branch: 'editorial/candidate-test', pull_request: 7, source_commit: 'd'.repeat(40), deployment_version: null,
    public_urls: proposal.public_urls, expected_content: proposal.expected_content, status: 'SOURCE_PUBLISHED' };
}

describe('durable candidate publication pipeline', () => {
  it('uses durable waits for pending checks and deployment without repeating authoring on replay', async () => {
    const models = new Models();
    const step = new Steps();
    let publishes = 0;
    let reads = 0;
    const pipeline = createEditorialCandidatePipeline({
      modelsFor: () => models, renderSocialCard, preparationContext: async () => context, persist: async () => true,
      publish: async (proposal) => ({ attempt: attempt(proposal), merged: ++publishes === 2 }),
      verify: async (value) => {
        const ready = ++reads === 2;
        return { receipt: { candidate_id: value.candidate_id, owner_epoch: value.owner_epoch,
          source_commit: value.source_commit!, deployment_version: ready ? 'e'.repeat(64) : '',
          public_urls: value.public_urls, verified_at: new Date().toISOString(), outcome: ready ? 'VERIFIED' : 'UNCERTAIN' } };
      },
    });
    const input = { candidate, signal: { id: 'signal-1', source_id: 'vendor', evidence: [source] } as Signal,
      catalog: context.catalog, knowledge: [], policy, owner_epoch: 1, step };
    expect((await pipeline.processCandidate(input)).status).toBe('verified');
    expect((await pipeline.processCandidate(input)).status).toBe('verified');
    expect(publishes).toBe(2);
    expect(reads).toBe(2);
    expect(step.waits.size).toBe(2);
    expect(models.calls.map((call) => call.purpose)).toEqual(['author', 'review']);
  });

  it('publishes only after independent clearance and admits only exact verified readback', async () => {
    const models = new Models();
    const published: ContentProposal[] = [];
    const checkpoints: string[] = [];
    const verified: PublicationReceipt[] = [];
    const pipeline = createEditorialCandidatePipeline({
      modelsFor: () => models,
      renderSocialCard,
      preparationContext: async () => context,
      publish: async (proposal, review) => {
        expect(review.content_digest).toBe(proposal.content_digest);
        published.push(proposal);
        return { attempt: attempt(proposal), merged: true };
      },
      verify: async (value) => {
        const receipt: PublicationReceipt = { candidate_id: value.candidate_id, owner_epoch: value.owner_epoch, source_commit: value.source_commit!,
          deployment_version: 'e'.repeat(64), public_urls: value.public_urls, verified_at: '2026-11-27T14:01:00.000Z', outcome: 'VERIFIED' };
        verified.push(receipt);
        return { receipt };
      },
      persist: async (_id, _epoch, state) => { checkpoints.push(state); return true; },
    });
    const step = new Steps();
    const signal = { id: 'signal-1', source_id: 'vendor', evidence: [source] } as Signal;

    const result = await pipeline.processCandidate({ candidate, signal, catalog: context.catalog, knowledge: [], policy, owner_epoch: 1, step });

    expect(result).toMatchObject({ status: 'verified' });
    expect(models.calls.map((call) => call.purpose)).toEqual(['author', 'review']);
    expect(published).toHaveLength(1);
    const card = published[0].files.find((file) => file.encoding === 'base64');
    expect(card?.path).toBe('assets/images/articles/a-careful-release-evidence-update-social.png');
    expect(published[0].required_media_paths).toEqual([card?.path]);
    expect(published[0].files[0].content).toContain(`/${card?.path}`);
    expect(models.calls[1].input).toContain(card!.content_sha256);
    expect(models.calls[1].input).not.toContain(card!.content);
    expect(verified[0]).toMatchObject({ outcome: 'VERIFIED', candidate_id: candidate.id, owner_epoch: 1 });
    expect(checkpoints).toEqual(['DRAFTED', 'REVIEWED', 'SOURCE_PUBLISHED', 'VERIFIED']);
    expect(step.names).toEqual([
      'prepare-context-create-signal-1-workers',
      'prepare-content-create-signal-1-workers',
      'attach-social-card-create-signal-1-workers',
      'persist-candidate-create-signal-1-workers-DRAFTED',
      'review-content-create-signal-1-workers-round-1',
      'persist-candidate-create-signal-1-workers-REVIEWED',
      'publish-content-create-signal-1-workers',
      'persist-candidate-create-signal-1-workers-SOURCE_PUBLISHED',
      'verify-publication-create-signal-1-workers',
      'persist-candidate-create-signal-1-workers-VERIFIED',
    ]);
  });

  it('records a hold for an invalid card before review and does not rerender on replay', async () => {
    const models = new Models();
    const checkpoints: string[] = [];
    let renders = 0;
    const pipeline = createEditorialCandidatePipeline({
      modelsFor: () => models, preparationContext: async () => context,
      renderSocialCard: async () => { renders += 1; return Uint8Array.of(0); },
      persist: async (_id, _epoch, state) => { checkpoints.push(state); return true; },
      publish: async () => { throw new Error('unexpected publication'); },
      verify: async () => { throw new Error('unexpected verification'); },
    });
    const input = { candidate, signal: { id: 'signal-1', source_id: 'vendor', evidence: [source] } as Signal,
      catalog: context.catalog, knowledge: [], policy, owner_epoch: 1, step: new Steps() };
    expect(await pipeline.processCandidate(input)).toMatchObject({ status: 'held' });
    expect(await pipeline.processCandidate(input)).toMatchObject({ status: 'held' });
    expect(models.calls.map((call) => call.purpose)).toEqual(['author']);
    expect(checkpoints).toEqual(['NEEDS_OWNER']);
    expect(renders).toBe(1);
  });

  it('never calls the publisher or readback after an independent reviewer hold', async () => {
    const models = new Models();
    models.outputs[1] = { decision: 'HOLD', findings: [{ code: 'CLAIM', detail: 'Evidence does not support this.' }] };
    let publishCalls = 0;
    let verifyCalls = 0;
    const pipeline = createEditorialCandidatePipeline({ modelsFor: () => models, renderSocialCard, preparationContext: async () => context,
      publish: async (proposal) => { publishCalls += 1; return { attempt: attempt(proposal), merged: true }; },
      verify: async (value) => { verifyCalls += 1; return { receipt: { candidate_id: value.candidate_id, owner_epoch: value.owner_epoch,
        source_commit: value.source_commit ?? '', deployment_version: '', public_urls: value.public_urls, verified_at: new Date().toISOString(), outcome: 'UNCERTAIN' } }; },
      persist: async () => true,
    });
    const result = await pipeline.processCandidate({ candidate, signal: { id: 'signal-1', source_id: 'vendor', evidence: [source] } as Signal,
      catalog: context.catalog, knowledge: [], policy, owner_epoch: 1, step: new Steps() });

    expect(result).toMatchObject({ status: 'held' });
    expect(models.calls.map((call) => call.purpose)).toEqual(['author', 'review']);
    expect(publishCalls).toBe(0);
    expect(verifyCalls).toBe(0);
  });

  it('uses separate bounded review and revision steps and stops after the third failed review', async () => {
    const models = new Models();
    models.outputs = [
      article,
      { decision: 'FIX_REQUIRED', findings: [{ code: 'EVIDENCE', detail: 'Clarify the evidence.' }] }, article,
      { decision: 'FIX_REQUIRED', findings: [{ code: 'EVIDENCE', detail: 'Narrow the conclusion.' }] }, article,
      { decision: 'FIX_REQUIRED', findings: [{ code: 'EVIDENCE', detail: 'The claim remains unsupported.' }] },
    ];
    let publishCalls = 0;
    const checkpoints: string[] = [];
    const cardDigests: string[] = [];
    let renders = 0;
    const pipeline = createEditorialCandidatePipeline({ modelsFor: () => models, preparationContext: async () => context,
      renderSocialCard: () => { renders += 1; return renderSocialCard(); },
      publish: async (proposal) => { publishCalls += 1; return { attempt: attempt(proposal), merged: true }; },
      verify: async (value) => ({ receipt: { candidate_id: value.candidate_id, owner_epoch: value.owner_epoch,
        source_commit: value.source_commit ?? '', deployment_version: 'e'.repeat(64), public_urls: value.public_urls,
        verified_at: new Date().toISOString(), outcome: 'VERIFIED' } }),
      persist: async (_id, _epoch, state, checkpoint) => {
        checkpoints.push(state);
        cardDigests.push(checkpoint.proposal!.expected_content[0].social_image!.content_sha256);
        return true;
      },
    });

    const result = await pipeline.processCandidate({ candidate, signal: { id: 'signal-1', source_id: 'vendor', evidence: [source] } as Signal,
      catalog: context.catalog, knowledge: [], policy, owner_epoch: 1, step: new Steps() });

    expect(result).toMatchObject({ status: 'held', reason: 'Review rounds were exhausted before clearance.' });
    expect(models.calls.map((call) => call.purpose)).toEqual(['author', 'review', 'revise', 'review', 'revise', 'review']);
    expect(models.calls.filter((call) => call.purpose === 'review').map((call) => call.run_id)).toEqual([
      `review:${candidate.id}:round-1`, `review:${candidate.id}:round-2`, `review:${candidate.id}:round-3`,
    ]);
    expect(publishCalls).toBe(0);
    expect(checkpoints.at(-1)).toBe('NEEDS_OWNER');
    expect(renders).toBe(1);
    expect(new Set(cardDigests).size).toBe(1);
  });
});
