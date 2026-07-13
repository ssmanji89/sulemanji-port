import type { Env } from "../env";

export interface OperationalDigest {
  heldReviews: number;
  paidPendingStart: number;
  waitingForCustomer: number;
}

export const runOperationalDigest = async (env: Env): Promise<OperationalDigest> => {
  const [heldReviews, paidPendingStart, waitingForCustomer] = await Promise.all([
    countHeldReviews(env.DB),
    countCasesInStatus(env.DB, "paid_pending_start"),
    countCasesInStatus(env.DB, "waiting_for_customer"),
  ]);

  return { heldReviews, paidPendingStart, waitingForCustomer };
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
