import { describe, expect, it } from 'vitest';
import { BudgetedModelGateway, JsonSchemaGateway, estimateModelInputTokenUpperBound, reserveMaximumUsd, type ModelConfig, type ModelGateway, type ModelRequest, type ModelResult } from '../src/editorial/models.js';
import { OperationsD1 } from './operations.test-support.js';

const config: ModelConfig = {
  endpoint: 'https://api.example.test/v1/chat/completions', api_key: 'test-key', model_id: 'authorized-test-model', pricing_revision: 'prices-test-1',
  input_usd_per_million: 1, output_usd_per_million: 1, max_input_chars: 48_000, max_output_tokens: 4_000,
};
const request: ModelRequest = {
  run_id: 'author:candidate-a', purpose: 'author', input: 'x'.repeat(1_200), schema_id: 'article-v1', schema: {},
  max_output_tokens: 4_000, reservation_id: 'author:candidate-a',
};

class FakeModels implements ModelGateway {
  calls = 0;
  beforeCall?: () => void;
  result: ModelResult = { run_id: request.run_id, output: { ok: true }, actual_usd: 0.002, provider_request_id: 'request-a' };
  async generate(modelRequest: ModelRequest): Promise<ModelResult> {
    this.calls += 1; this.beforeCall?.(); return { ...this.result, run_id: modelRequest.run_id };
  }
}

describe('budgeted model gateway', () => {
  it('rejects a redirect from the configured provider', async () => {
    let requests = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      requests += 1;
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status: 307, headers: { location: 'https://example.test/' } });
    };
    await expect(new JsonSchemaGateway(config, fetcher).generate(request)).rejects.toThrow('MODEL_PROVIDER_HTTP_307');
    expect(requests).toBe(1);
  });

  it('rejects output limits that cannot be safely reserved', () => {
    expect(() => reserveMaximumUsd(config, 1_200, -1)).toThrow('MODEL_REQUEST_LIMIT');
  });

  it('uses the serialized provider request byte count as a conservative input-token upper bound', () => {
    const upperBound = estimateModelInputTokenUpperBound(config, request);
    expect(upperBound).toBeGreaterThan(new TextEncoder().encode(request.input).byteLength);
    expect(Number.isSafeInteger(upperBound)).toBe(true);
  });

  it('reserves the maximum before the provider call and settles known usage', async () => {
    const db = new OperationsD1();
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    provider.beforeCall = () => expect([...db.reservations.values()][0]?.maximum_micros)
      .toBe(estimateModelInputTokenUpperBound(config, request) + request.max_output_tokens);
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a',
      owner_epoch: 1, max_model_calls: 6, max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });
    db.control = { paused: 0, owner_epoch: 1 };

    await expect(gateway.generate(request)).resolves.toEqual(provider.result);
    expect(provider.calls).toBe(1);
    expect([...db.reservations.values()][0]).toMatchObject({
      maximum_micros: estimateModelInputTokenUpperBound(config, request) + request.max_output_tokens, actual_micros: 2_000,
    });
    expect(db.candidates.get('candidate-a')).toMatchObject({ model_calls: 1, review_rounds: 0 });
  });

  it('rejects a pricing revision that differs from the approved policy before reserving or calling', async () => {
    const db = new OperationsD1();
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a',
      owner_epoch: 1, max_model_calls: 6, max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-other',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    await expect(gateway.generate(request)).rejects.toThrow('MODEL_PRICING_REVISION_MISMATCH');
    expect(provider.calls).toBe(0);
    expect(db.reservations.size).toBe(0);
  });

  it('does not call the provider when the candidate budget cannot reserve the worst case', async () => {
    const db = new OperationsD1();
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a',
      owner_epoch: 1, max_model_calls: 6, max_review_rounds: 3,
      limits: { candidate_usd: 0.004, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    await expect(gateway.generate(request)).rejects.toThrow('MODEL_BUDGET_HOLD');
    expect(provider.calls).toBe(0);
    expect(db.reservations.size).toBe(0);
    expect(db.candidates.get('candidate-a')).toMatchObject({ model_calls: 0, review_rounds: 0 });
  });

  it('keeps an unknown provider cost fully reserved after a timeout', async () => {
    const db = new OperationsD1();
    db.control = { paused: 0, owner_epoch: 1 };
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    provider.generate = async () => { provider.calls += 1; throw new Error('provider timeout'); };
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a',
      owner_epoch: 1, max_model_calls: 6, max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    await expect(gateway.generate(request)).rejects.toThrow('provider timeout');
    expect([...db.reservations.values()][0]).toMatchObject({
      maximum_micros: estimateModelInputTokenUpperBound(config, request) + request.max_output_tokens, actual_micros: null,
    });
  });

  it('does not call the provider or charge the reservation when the durable model-call cap is exhausted', async () => {
    const db = new OperationsD1();
    db.control = { paused: 0, owner_epoch: 1 };
    db.candidates.set('candidate-a', { model_calls: 6, review_rounds: 0 });
    const provider = new FakeModels();
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a', owner_epoch: 1, max_model_calls: 6,
      max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    await expect(gateway.generate(request)).rejects.toThrow('MODEL_CALL_LIMIT_HOLD');
    expect(provider.calls).toBe(0);
    expect([...db.reservations.values()][0]).toMatchObject({ actual_micros: 0 });
  });

  it('does not call the provider when the owner epoch is stale or paused', async () => {
    const db = new OperationsD1();
    db.control = { paused: 0, owner_epoch: 2 };
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a', owner_epoch: 1, max_model_calls: 6,
      max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    await expect(gateway.generate(request)).rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    expect(provider.calls).toBe(0);
    expect([...db.reservations.values()][0]).toMatchObject({ actual_micros: 0 });
    expect(db.candidates.get('candidate-a')).toMatchObject({ model_calls: 0 });
  });

  it('counts independent reviewer rounds atomically against both lifetime caps', async () => {
    const db = new OperationsD1();
    db.control = { paused: 0, owner_epoch: 1 };
    db.candidates.set('candidate-a', { model_calls: 0, review_rounds: 0 });
    const provider = new FakeModels();
    const gateway = new BudgetedModelGateway(provider, config, {
      db: db as unknown as D1Database, candidate_id: 'candidate-a', owner_epoch: 1,
      max_model_calls: 6, max_review_rounds: 3,
      limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'prices-test-1',
      now: () => new Date('2026-11-27T14:00:00.000Z'),
    });

    for (let round = 1; round <= 3; round += 1) {
      await gateway.generate({ ...request, purpose: 'review', run_id: `review:${round}`, reservation_id: `review:${round}` });
    }
    await expect(gateway.generate({ ...request, purpose: 'review', run_id: 'review:4', reservation_id: 'review:4' }))
      .rejects.toThrow('MODEL_REVIEW_ROUND_LIMIT_HOLD');
    expect(provider.calls).toBe(3);
    expect(db.candidates.get('candidate-a')).toMatchObject({ model_calls: 3, review_rounds: 3 });
  });
});
