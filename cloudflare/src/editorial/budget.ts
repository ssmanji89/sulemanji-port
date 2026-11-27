import { localBudgetPeriod } from './scheduler.js';

export type UsageReservation = { id: string; candidate_id: string; attempt_id: string; maximum_usd: number; pricing_revision: string; requested_at: string };
export type ReservationResult = { status: 'reserved' | 'existing'; reservation_id: string } | { status: 'denied'; reason: string };
export const proposedLimits = { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 } as const;
const micros = (usd: number): number => Math.ceil(usd * 1_000_000);

export async function reserveUsage(db: D1Database, request: UsageReservation, limits = proposedLimits): Promise<ReservationResult> {
  if (!Number.isFinite(request.maximum_usd) || request.maximum_usd < 0 || !request.id || !request.attempt_id || !request.candidate_id || !request.pricing_revision) {
    return { status: 'denied', reason: 'Reservation request is invalid.' };
  }
  const amount = micros(request.maximum_usd);
  const candidateLimit = micros(limits.candidate_usd);
  const dailyLimit = micros(limits.daily_usd);
  const monthlyLimit = micros(limits.monthly_usd);
  const timestamp = new Date(request.requested_at);
  if (!Number.isFinite(timestamp.getTime())) return { status: 'denied', reason: 'Reservation timestamp is invalid.' };
  const period = localBudgetPeriod(timestamp);
  const existing = await db.prepare('SELECT id, candidate_id, maximum_micros, pricing_revision FROM usage_reservations WHERE attempt_id = ?')
    .bind(request.attempt_id).first<{ id: string; candidate_id: string; maximum_micros: number; pricing_revision: string }>();
  if (existing) return existing.candidate_id === request.candidate_id && existing.maximum_micros === amount && existing.pricing_revision === request.pricing_revision
    ? { status: 'existing', reservation_id: existing.id }
    : { status: 'denied', reason: 'Attempt ID is already bound to a different reservation.' };

  const result = await db.prepare(`INSERT INTO usage_reservations
      (id, candidate_id, attempt_id, maximum_micros, actual_micros, local_date, local_month, pricing_revision, requested_at, settled_at)
    SELECT ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL
    WHERE ? <= ?
      AND COALESCE((SELECT SUM(COALESCE(actual_micros, maximum_micros)) FROM usage_reservations WHERE candidate_id = ?), 0) + ? <= ?
      AND COALESCE((SELECT SUM(COALESCE(actual_micros, maximum_micros)) FROM usage_reservations WHERE local_date = ?), 0) + ? <= ?
      AND COALESCE((SELECT SUM(COALESCE(actual_micros, maximum_micros)) FROM usage_reservations WHERE local_month = ?), 0) + ? <= ?`)
    .bind(request.id, request.candidate_id, request.attempt_id, amount, period.local_date, period.local_month, request.pricing_revision, timestamp.toISOString(),
      amount, candidateLimit, request.candidate_id, amount, candidateLimit, period.local_date, amount, dailyLimit, period.local_month, amount, monthlyLimit).run();
  if ((result.meta.changes ?? 0) !== 1) return { status: 'denied', reason: 'Candidate, daily, or monthly model budget limit reached.' };
  return { status: 'reserved', reservation_id: request.id };
}

export async function settleUsage(db: D1Database, reservationId: string, actualUsd: number | null, now = new Date()): Promise<void> {
  if (actualUsd === null) return;
  if (!Number.isFinite(actualUsd) || actualUsd < 0) throw new Error('Actual cost must be a nonnegative finite USD amount.');
  await db.prepare('UPDATE usage_reservations SET actual_micros = ?, settled_at = ? WHERE id = ? AND actual_micros IS NULL')
    .bind(micros(actualUsd), now.toISOString(), reservationId).run();
}
