import type { EditorialPolicy } from './policy.mjs';

export { MAX_MODEL_CALLS_PER_CANDIDATE, MAX_REVIEW_ROUNDS_PER_CANDIDATE, parseEditorialPolicy } from './policy.mjs';
export type { EditorialPolicy } from './policy.mjs';

export type SlotClaim = { id: string; local_date: string; slot: string; claimed_at: string };

function chicagoParts(now: Date): { date: string; slot: string; month: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${value.year}-${value.month}-${value.day}`, slot: `${value.hour}:${value.minute}`, month: `${value.year}-${value.month}` };
}

export function scheduleWorkflowId(claim: Pick<SlotClaim, 'local_date' | 'slot'>): string {
  return `slot-${claim.local_date}-${claim.slot.replace(':', '')}`;
}

export async function claimScheduleSlot(db: D1Database, now: Date, policy: EditorialPolicy, ownerEpoch: number): Promise<SlotClaim | null> {
  const local = chicagoParts(now);
  if (policy.timezone !== 'America/Chicago' || !policy.slots.includes(local.slot)) return null;
  const claim = { id: `${local.date}:${local.slot}`, local_date: local.date, slot: local.slot, claimed_at: now.toISOString() };
  const inserted = await db.prepare(`INSERT OR IGNORE INTO schedule_claims(id, local_date, slot, claimed_at, owner_epoch)
    SELECT ?, ?, ?, ?, owner_epoch FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?`)
    .bind(claim.id, claim.local_date, claim.slot, claim.claimed_at, ownerEpoch).run();
  return inserted.meta.changes === 1 ? claim : null;
}

export async function readScheduleClaim(db: D1Database, claimId: string, ownerEpoch: number): Promise<SlotClaim | null> {
  return db.prepare(`SELECT claim.id, claim.local_date, claim.slot, claim.claimed_at FROM schedule_claims AS claim
    JOIN editorial_control AS control ON control.singleton = 1 AND control.paused = 0 AND control.owner_epoch = claim.owner_epoch
    WHERE claim.id = ? AND claim.owner_epoch = ?`).bind(claimId, ownerEpoch).first<SlotClaim>();
}

export async function markScheduleDispatched(db: D1Database, claimId: string, workflowId: string, ownerEpoch: number, now: Date): Promise<void> {
  await db.prepare(`UPDATE schedule_claims SET dispatch_state = 'DISPATCHED', workflow_instance_id = ?, dispatched_at = ?
    WHERE id = ? AND dispatch_state = 'PENDING' AND owner_epoch = ?`).bind(workflowId, now.toISOString(), claimId, ownerEpoch).run();
}

export async function pendingScheduleClaims(db: D1Database, ownerEpoch: number, limit = 10): Promise<SlotClaim[]> {
  const result = await db.prepare(`SELECT claim.id, claim.local_date, claim.slot, claim.claimed_at FROM schedule_claims AS claim
    JOIN editorial_control AS control ON control.singleton = 1 AND control.paused = 0 AND control.owner_epoch = claim.owner_epoch
    WHERE claim.dispatch_state = 'PENDING' AND claim.owner_epoch = ? ORDER BY claim.claimed_at LIMIT ?`)
    .bind(ownerEpoch, Math.min(10, Math.max(1, limit))).all<SlotClaim>();
  return result.results ?? [];
}

export function localBudgetPeriod(now: Date): { local_date: string; local_month: string } {
  const { date, month } = chicagoParts(now);
  return { local_date: date, local_month: month };
}
