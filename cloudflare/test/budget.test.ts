import { describe, expect, it } from 'vitest';
import { reserveUsage, settleUsage } from '../src/editorial/budget.js';
import { recordModelCall, recordReviewRound } from '../src/editorial/state.js';
import { OperationsD1 } from './operations.test-support.js';

const request = (i: number, candidate = `candidate-${i}`, amount = 0.75) => ({ id: `reservation-${i}`, attempt_id: `attempt-${i}`, candidate_id: candidate, maximum_usd: amount, pricing_revision: 'prices-2026-11-26', requested_at: '2026-11-26T14:00:00.000Z' });

describe('atomic bounded model reservations', () => {
  it('does not exceed the daily or candidate limit under concurrent reservations', async () => {
    const db = new OperationsD1();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => reserveUsage(db as unknown as D1Database, request(i))));
    expect(results.filter((result) => result.status === 'reserved')).toHaveLength(2);
    const spent = [...db.reservations.values()].reduce((sum, item) => sum + Number(item.maximum_micros), 0);
    expect(spent).toBeLessThanOrEqual(2_000_000);
  });

  it('keeps unknown cost reserved and settles known cost to actual usage', async () => {
    const db = new OperationsD1();
    expect(await reserveUsage(db as unknown as D1Database, request(1, 'a'))).toMatchObject({ status: 'reserved' });
    await settleUsage(db as unknown as D1Database, 'reservation-1', null);
    expect(await reserveUsage(db as unknown as D1Database, request(2, 'a', 0.5))).toMatchObject({ status: 'denied' });
    await settleUsage(db as unknown as D1Database, 'reservation-1', 0.2, new Date('2026-11-26T15:00:00.000Z'));
    expect(await reserveUsage(db as unknown as D1Database, request(2, 'a', 0.5))).toMatchObject({ status: 'reserved' });
  });

  it('reuses one attempt reservation on retry and rejects changed retry parameters', async () => {
    const db = new OperationsD1();
    const first = request(1);
    expect(await reserveUsage(db as unknown as D1Database, first)).toMatchObject({ status: 'reserved' });
    expect(await reserveUsage(db as unknown as D1Database, first)).toMatchObject({ status: 'existing' });
    expect(await reserveUsage(db as unknown as D1Database, { ...first, maximum_usd: 0.5 })).toMatchObject({ status: 'denied' });
  });

  it('keeps model-call and review-round caps across workflow resumes', async () => {
    const db = new OperationsD1();
    db.candidates.set('candidate', { model_calls: 0, review_rounds: 0 });
    for (let i = 0; i < 7; i += 1) await recordModelCall(db as unknown as D1Database, 'candidate');
    for (let i = 0; i < 4; i += 1) await recordReviewRound(db as unknown as D1Database, 'candidate');
    expect(db.candidates.get('candidate')).toMatchObject({ model_calls: 6, review_rounds: 3 });
  });
});
