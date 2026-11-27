import { describe, expect, it } from 'vitest';
import { dispatchDueSlot } from '../src/editorial/schedule-dispatch.js';

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
});
