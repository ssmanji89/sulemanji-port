export type EditorialPolicy = {
  revision: string;
  timezone: 'America/Chicago';
  slots: string[];
  max_new_articles_daily: number;
  max_refreshes_daily: number;
  max_candidates_per_scan: number;
  max_fetches_per_scan: number;
  max_model_calls_per_candidate: number;
  max_review_rounds_per_candidate: number;
  max_candidate_usd: number;
  max_daily_usd: number;
  max_monthly_usd: number;
  model_pricing_revision: string;
};
export type SlotClaim = { id: string; local_date: string; slot: string; claimed_at: string };

function chicagoParts(now: Date): { date: string; slot: string; month: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${value.year}-${value.month}-${value.day}`, slot: `${value.hour}:${value.minute}`, month: `${value.year}-${value.month}` };
}

export async function claimScheduleSlot(db: D1Database, now: Date, policy: EditorialPolicy): Promise<SlotClaim | null> {
  const local = chicagoParts(now);
  if (policy.timezone !== 'America/Chicago' || !policy.slots.includes(local.slot)) return null;
  const id = `${local.date}:${local.slot}`;
  const inserted = await db.prepare('INSERT OR IGNORE INTO schedule_claims(id, local_date, slot, claimed_at) VALUES (?, ?, ?, ?)')
    .bind(id, local.date, local.slot, now.toISOString()).run();
  if ((inserted.meta.changes ?? 0) !== 1) return null;
  const claim = await db.prepare(`SELECT id, local_date, slot, claimed_at FROM schedule_claims
    WHERE id = ? AND dispatch_state = 'PENDING'`).bind(id).first<SlotClaim>();
  return claim ?? null;
}

export async function markScheduleDispatched(db: D1Database, claimId: string, workflowId: string, now = new Date()): Promise<void> {
  await db.prepare(`UPDATE schedule_claims SET dispatch_state = 'DISPATCHED', workflow_instance_id = ?, dispatched_at = ?
    WHERE id = ? AND dispatch_state = 'PENDING'`).bind(workflowId, now.toISOString(), claimId).run();
}

export async function pendingScheduleClaims(db: D1Database, limit = 10): Promise<SlotClaim[]> {
  const result = await db.prepare(`SELECT id, local_date, slot, claimed_at FROM schedule_claims
    WHERE dispatch_state = 'PENDING' ORDER BY claimed_at LIMIT ?`).bind(Math.min(10, Math.max(1, limit))).all<SlotClaim>();
  return result.results ?? [];
}

export function localBudgetPeriod(now: Date): { local_date: string; local_month: string } {
  const { date, month } = chicagoParts(now);
  return { local_date: date, local_month: month };
}
