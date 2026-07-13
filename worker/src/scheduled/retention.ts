import type { Env } from "../env";
import { createGmailClient } from "../integrations/gmail";

export interface RetentionGmailClient {
  deleteThread(threadId: string): Promise<void>;
}

export interface RetentionOptions {
  now?: Date;
  gmailFactory?: (env: Env) => RetentionGmailClient;
}

export interface RetentionResult {
  redactedCases: number;
  deletedGmailThreads: number;
}

export const runRetention = async (
  env: Env,
  options: RetentionOptions = {},
): Promise<RetentionResult> => {
  const now = options.now ?? new Date();
  const gmailFactory =
    options.gmailFactory ??
    ((targetEnv: Env) =>
      createGmailClient({
        clientId: targetEnv.GMAIL_CLIENT_ID,
        clientSecret: targetEnv.GMAIL_CLIENT_SECRET,
        refreshToken: targetEnv.GMAIL_REFRESH_TOKEN,
        sender: targetEnv.GMAIL_SENDER,
        labelId: targetEnv.GMAIL_CLINIC_LABEL,
      }));

  const redactedCases = await redactEligibleCases(env.DB, now);
  const deletedGmailThreads = await deleteEligibleGmailThreads(
    env.DB,
    gmailFactory(env),
    now,
  );

  return { redactedCases, deletedGmailThreads };
};

const redactEligibleCases = async (
  db: D1Database,
  now: Date,
): Promise<number> => {
  const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const rows = await db
    .prepare(
      `SELECT cases.id
      FROM cases
      INNER JOIN intakes ON intakes.case_id = cases.id
      WHERE cases.status = ?
        AND cases.closed_at IS NOT NULL
        AND cases.closed_at <= ?
        AND intakes.redacted_at IS NULL`,
    )
    .bind("closed", cutoff)
    .all<{ id: string }>();

  const ids = rows.results.map((row) => row.id);
  for (const caseId of ids) {
    const redactedAt = now.toISOString();
    await db.batch([
      db
        .prepare(
          `UPDATE intakes
          SET problem = ?,
            desired_outcome = ?,
            prior_attempts = ?,
            sanitized_links_json = ?,
            redacted_at = ?
          WHERE case_id = ? AND redacted_at IS NULL`,
        )
        .bind("[redacted]", "[redacted]", "[redacted]", "[]", redactedAt, caseId),
      db
        .prepare(
          `UPDATE discovery_state
          SET state_json = ?, updated_at = ?
          WHERE case_id = ?`,
        )
        .bind("{}", redactedAt, caseId),
      db
        .prepare(
          `UPDATE artifacts
          SET body_json = ?
          WHERE case_id = ?`,
        )
        .bind(JSON.stringify({ redacted: true }), caseId),
      db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          caseId,
          "retention_redacted",
          JSON.stringify({ cutoff }),
          redactedAt,
        ),
    ]);
  }

  return ids.length;
};

const deleteEligibleGmailThreads = async (
  db: D1Database,
  gmail: RetentionGmailClient,
  now: Date,
): Promise<number> => {
  const cutoff = new Date(now.getTime() - 365 * 86_400_000).toISOString();
  const rows = await db
    .prepare(
      `SELECT gmail_threads.case_id, gmail_threads.gmail_thread_id
      FROM gmail_threads
      INNER JOIN cases ON cases.id = gmail_threads.case_id
      INNER JOIN intakes ON intakes.case_id = cases.id
      WHERE cases.status = ?
        AND cases.closed_at IS NOT NULL
        AND cases.closed_at <= ?
        AND intakes.redacted_at IS NOT NULL`,
    )
    .bind("closed", cutoff)
    .all<{ case_id: string; gmail_thread_id: string }>();

  let deleted = 0;
  for (const row of rows.results) {
    await gmail.deleteThread(row.gmail_thread_id);
    await db.batch([
      db
        .prepare("DELETE FROM gmail_threads WHERE case_id = ?")
        .bind(row.case_id),
      db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          row.case_id,
          "retention_gmail_deleted",
          JSON.stringify({ threadDeleted: true }),
          now.toISOString(),
        ),
    ]);
    deleted += 1;
  }

  return deleted;
};
