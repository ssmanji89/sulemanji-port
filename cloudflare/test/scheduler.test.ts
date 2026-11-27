import { describe, expect, it } from 'vitest';
import { claimScheduleSlot, markScheduleDispatched, pendingScheduleClaims, type EditorialPolicy } from '../src/editorial/scheduler.js';
import { OperationsD1 } from './operations.test-support.js';

const policy: EditorialPolicy = { revision: 'proposal', timezone: 'America/Chicago', slots: ['08:00', '13:00', '19:00', '22:00'],
  max_new_articles_daily: 3, max_refreshes_daily: 6, max_candidates_per_scan: 3, max_fetches_per_scan: 40, max_model_calls_per_candidate: 6,
  max_review_rounds_per_candidate: 3, max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'pending' };

describe('Chicago editorial schedule claims', () => {
  it('does not claim a due slot when publisher authority is paused', async () => {
    const db = new OperationsD1();
    const now = new Date('2026-11-26T14:00:00.000Z');

    expect(await claimScheduleSlot(db as unknown as D1Database, now, policy, 1)).toBeNull();
    expect(db.slots.size).toBe(0);
  });

  it('claims a due slot once per local date and slot', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const now = new Date('2026-11-26T14:00:00.000Z');
    expect(await claimScheduleSlot(db as unknown as D1Database, now, policy, 1)).toMatchObject({ local_date: '2026-11-26', slot: '08:00' });
    expect(await claimScheduleSlot(db as unknown as D1Database, now, policy, 1)).toBeNull();
  });

  it('keeps slot identities unique across daylight-saving transitions', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const spring = await claimScheduleSlot(db as unknown as D1Database, new Date('2026-03-08T13:00:00.000Z'), policy, 1);
    const fall = await claimScheduleSlot(db as unknown as D1Database, new Date('2026-11-01T14:00:00.000Z'), policy, 1);
    expect(spring).toMatchObject({ local_date: '2026-03-08', slot: '08:00' });
    expect(fall).toMatchObject({ local_date: '2026-11-01', slot: '08:00' });
    expect(db.slots.size).toBe(2);
  });

  it('returns no claim outside an approved discovery slot', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    expect(await claimScheduleSlot(db as unknown as D1Database, new Date('2026-11-26T15:00:00.000Z'), policy, 1)).toBeNull();
  });

  it('leaves an uncertain dispatch pending for durable readback', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const now = new Date('2026-11-26T14:00:00.000Z');
    const slot = await claimScheduleSlot(db as unknown as D1Database, now, policy, 1);
    expect(await pendingScheduleClaims(db as unknown as D1Database, 1)).toHaveLength(1);
    await markScheduleDispatched(db as unknown as D1Database, slot!.id, 'slot-2026-11-26-0800', 1, now);
    expect(await pendingScheduleClaims(db as unknown as D1Database, 1)).toHaveLength(0);
  });

  it('keeps a previous owner’s pending slot in history without dispatching or reclaiming it', async () => {
    const db = new OperationsD1();
    db.control.paused = 0;
    const now = new Date('2026-11-26T14:00:00.000Z');
    await claimScheduleSlot(db as unknown as D1Database, now, policy, 1);
    db.control.owner_epoch = 2;

    expect(await pendingScheduleClaims(db as unknown as D1Database, 2)).toEqual([]);
    expect(await claimScheduleSlot(db as unknown as D1Database, now, policy, 2)).toBeNull();
    expect(await claimScheduleSlot(db as unknown as D1Database, new Date('2026-11-26T19:00:00.000Z'), policy, 1)).toBeNull();
    expect(db.slots.size).toBe(1);
  });
});
