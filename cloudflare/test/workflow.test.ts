import { describe, expect, it } from 'vitest';
import { runEditorialAdmission } from '../src/editorial/workflow-core.js';
import { OperationsD1 } from './operations.test-support.js';

class DurableStep {
  values = new Map<string, unknown>();
  async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    if (!this.values.has(name)) this.values.set(name, await callback());
    return this.values.get(name) as T;
  }
}

describe('resumable editorial workflow admission', () => {
  it('durably holds an active slot when the content execution pipeline is unconfigured', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const env = { DB: db as unknown as D1Database };
    const params = { slot_claim_id: '2026-11-26:08:00' };
    const step = new DurableStep();
    expect(await runEditorialAdmission(params, env as never, step)).toMatchObject({ status: 'held', slot_claim_id: params.slot_claim_id });
    expect(await runEditorialAdmission(params, env as never, step)).toMatchObject({ status: 'held', slot_claim_id: params.slot_claim_id });
    expect(db.receipts.size).toBe(1);
  });

  it('does not admit work while paused', async () => {
    const db = new OperationsD1();
    const result = await runEditorialAdmission({ slot_claim_id: 'paused-slot' }, { DB: db as unknown as D1Database } as never, new DurableStep());
    expect(result.status).toBe('held');
    expect(db.receipts.size).toBe(0);
  });
});
