import { describe, expect, it, vi } from 'vitest';
import { dispatchDueSlot } from '../src/editorial/schedule-dispatch.js';
import { OperationsD1 } from './operations.test-support.js';

function dispatch(paused: number, policy: string | undefined): Promise<void> {
  const database = {
    prepare: () => ({ first: async () => ({ paused, owner_epoch: 1 }) }),
  } as unknown as D1Database;
  const env = {
    DB: database,
    EDITORIAL_WORKFLOW: {} as Workflow,
    EDITORIAL_POLICY_JSON: policy,
  };
  return dispatchDueSlot(new Date('2026-11-27T14:00:00.000Z'), env as never);
}

describe('editorial scheduled dispatch configuration', () => {
  it('fails visibly when an unpaused schedule has a missing policy', async () => {
    await expect(dispatch(0, undefined)).rejects.toThrow('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
  });

  it('fails visibly when an unpaused schedule has an invalid policy', async () => {
    await expect(dispatch(0, '{"status":"proposed"}')).rejects.toThrow('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
  });

  it('keeps a paused schedule idle without requiring an activation policy', async () => {
    await expect(dispatch(1, undefined)).resolves.toBeUndefined();
  });

  it('reconciles uncertain dispatch with the original claim and Workflow instance', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const workflow = {
      create: vi.fn().mockRejectedValue(new Error('Uncertain create response')),
      get: vi.fn().mockRejectedValueOnce(new Error('Readback unavailable')).mockResolvedValue({}),
    };
    const env = { DB: db, EDITORIAL_WORKFLOW: workflow, EDITORIAL_POLICY_JSON: JSON.stringify({
      revision: 'test', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1,
      max_refreshes_daily: 1, max_candidates_per_scan: 1, max_fetches_per_scan: 1, max_model_calls_per_candidate: 1,
      max_review_rounds_per_candidate: 1, max_candidate_usd: 0, max_daily_usd: 0, max_monthly_usd: 0, model_pricing_revision: 'test',
    }) };

    await dispatchDueSlot(new Date('2026-11-27T14:00:00.000Z'), env as never);
    expect(db.slots.get('2026-11-27:08:00')).toMatchObject({ dispatch_state: 'PENDING', owner_epoch: 1 });
    await dispatchDueSlot(new Date('2026-11-27T14:01:00.000Z'), env as never);
    expect(db.slots.size).toBe(1);
    expect(db.slots.get('2026-11-27:08:00')).toMatchObject({ dispatch_state: 'DISPATCHED', workflow_instance_id: 'slot-2026-11-27-0800' });
    expect(workflow.create.mock.calls).toEqual(Array.from({ length: 2 }, () => [{
      id: 'slot-2026-11-27-0800', params: { slot_claim_id: '2026-11-27:08:00' },
    }]));
  });
});
