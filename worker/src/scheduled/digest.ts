import type { Env } from "../env";

export interface OperationalDigest {
  heldReviews: number;
  paidPendingStart: number;
  waitingForCustomer: number;
  normalQueue: number;
  priorityScheduling: number;
  activeSlotHolds: number;
  balancePaymentPending: number;
  expiringCredits: number;
  disputedOrRefundPending: number;
}

export const runOperationalDigest = async (env: Env): Promise<OperationalDigest> => {
  const [
    heldReviews,
    paidPendingStart,
    waitingForCustomer,
    normalQueue,
    priorityScheduling,
    activeSlotHolds,
    balancePaymentPending,
    expiringCredits,
    disputedOrRefundPending,
  ] = await Promise.all([
      countHeldReviews(env.DB),
      countCasesInStatus(env.DB, "paid_pending_start"),
      countCasesInStatus(env.DB, "waiting_for_customer"),
      countCasesInStatus(env.DB, "normal_queue"),
      countCasesInStatus(env.DB, "priority_scheduling"),
      countActiveSlotHolds(env.DB),
      countCasesInStatus(env.DB, "balance_payment_pending"),
      countExpiringCredits(env.DB),
      countPaymentAttention(env.DB),
    ]);

  return {
    heldReviews,
    paidPendingStart,
    waitingForCustomer,
    normalQueue,
    priorityScheduling,
    activeSlotHolds,
    balancePaymentPending,
    expiringCredits,
    disputedOrRefundPending,
  };
};

const countHeldReviews = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM risk_decisions
      WHERE status = ?`,
    )
    .bind("held")
    .first<{ count: number }>();
  return row?.count ?? 0;
};

const countCasesInStatus = async (
  db: D1Database,
  status: string,
): Promise<number> => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM cases
      WHERE status = ?`,
    )
    .bind(status)
    .first<{ count: number }>();
  return row?.count ?? 0;
};

const countActiveSlotHolds = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM slot_holds
      WHERE status = ?`,
    )
    .bind("active")
    .first<{ count: number }>();
  return row?.count ?? 0;
};

const countExpiringCredits = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM session_quotes
      INNER JOIN cases ON cases.id = session_quotes.case_id
      WHERE session_quotes.expires_at <= datetime('now', '+14 days')
        AND cases.status NOT IN (?, ?)`,
    )
    .bind("session_confirmed", "closed")
    .first<{ count: number }>();
  return row?.count ?? 0;
};

const countPaymentAttention = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
      FROM cases
      WHERE status IN (?, ?)`,
    )
    .bind("declined_refund_pending", "payment_disputed")
    .first<{ count: number }>();
  return row?.count ?? 0;
};
