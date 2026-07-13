/// <reference types="@cloudflare/vitest-pool-workers/types" />

import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migration0001 from "../migrations/0001_cases.sql?raw";
import migration0002 from "../migrations/0002_priority_discovery.sql?raw";
import migration0003 from "../migrations/0003_payment_workflow_idempotency.sql?raw";
import migration0004 from "../migrations/0004_automation_state.sql?raw";
import migration0005 from "../migrations/0005_booking_retention.sql?raw";
import migration0006 from "../migrations/0006_launch_review_and_quotes.sql?raw";
import { runOperationalDigest } from "../src/scheduled/digest";
import { runRetention, type RetentionGmailClient } from "../src/scheduled/retention";
import type { Env } from "../src/env";

const testEnv = env as unknown as Env;

describe("retention", () => {
  let gmail: FakeRetentionGmail;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(testEnv.DB, await loadMigrations(), "test_d1_migrations");
    gmail = new FakeRetentionGmail();
  });

  it("redacts closed working data after 90 days without deleting Gmail early", async () => {
    await seedClosedCase("case_1", "2026-01-01T00:00:00.000Z");

    const result = await runRetention(testEnv, {
      now: new Date("2026-04-02T00:00:00.000Z"),
      gmailFactory: () => gmail,
    });

    expect(result).toEqual({ redactedCases: 1, deletedGmailThreads: 0 });
    expect(gmail.deletedThreadIds).toEqual([]);
    await expect(intakeText("case_1")).resolves.toEqual({
      problem: "[redacted]",
      desired_outcome: "[redacted]",
      prior_attempts: "[redacted]",
      sanitized_links_json: "[]",
      redacted_at: "2026-04-02T00:00:00.000Z",
    });
    await expect(artifactBody("case_1")).resolves.toBe("{\"redacted\":true}");
  });

  it("deletes Gmail after one year only after D1 redaction is confirmed", async () => {
    await seedClosedCase("case_1", "2025-01-01T00:00:00.000Z");

    await runRetention(testEnv, {
      now: new Date("2026-01-02T00:00:00.000Z"),
      gmailFactory: () => gmail,
    });
    const second = await runRetention(testEnv, {
      now: new Date("2026-01-02T00:00:00.000Z"),
      gmailFactory: () => gmail,
    });

    expect(gmail.deletedThreadIds).toEqual(["thread_case_1"]);
    expect(second).toEqual({ redactedCases: 0, deletedGmailThreads: 0 });
    await expect(gmailThreadCount()).resolves.toBe(0);
  });

  it("includes held slot and expiring credit counts in the operational digest", async () => {
    await seedClosedCase("case_1", "2026-01-01T00:00:00.000Z");
    await testEnv.DB.prepare(
      "UPDATE cases SET status = ?, closed_at = ? WHERE id = ?",
    )
      .bind("priority_scheduling", null, "case_1")
      .run();
    await seedBooking("case_1");

    await expect(runOperationalDigest(testEnv)).resolves.toMatchObject({
      activeSlotHolds: 1,
      expiringCredits: 1,
    });
  });
});

class FakeRetentionGmail implements RetentionGmailClient {
  readonly deletedThreadIds: string[] = [];

  async deleteThread(threadId: string): Promise<void> {
    this.deletedThreadIds.push(threadId);
  }
}

const loadMigrations = async (): Promise<D1Migration[]> =>
  [
    migration("0001_cases.sql", migration0001),
    migration("0002_priority_discovery.sql", migration0002),
    migration("0003_payment_workflow_idempotency.sql", migration0003),
    migration("0004_automation_state.sql", migration0004),
    migration("0005_booking_retention.sql", migration0005),
    migration("0006_launch_review_and_quotes.sql", migration0006),
  ];

const migration = (name: string, text: string): D1Migration => ({
  name,
  queries: splitSql(text),
});

const splitSql = (text: string): string[] => {
  const queries: string[] = [];
  let current = "";
  let inTrigger = false;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^CREATE\s+TRIGGER\b/i.test(trimmed)) inTrigger = true;
    current += `${line}\n`;
    if (inTrigger) {
      if (/^END;$/i.test(trimmed)) {
        queries.push(current.trim());
        current = "";
        inTrigger = false;
      }
      continue;
    }
    if (trimmed.endsWith(";")) {
      queries.push(current.trim().slice(0, -1).trim());
      current = "";
    }
  }
  if (current.trim()) queries.push(current.trim());
  return queries;
};

const resetMigrations = async (): Promise<void> => {
  for (const table of [
    "test_d1_migrations",
    "calendar_events",
    "slot_holds",
    "session_quotes",
    "automation_state",
    "offer_counters",
    "workflow_events",
    "risk_decisions",
    "artifacts",
    "discovery_state",
    "gmail_threads",
    "credits",
    "payments",
    "audit_events",
    "consents",
    "intakes",
    "cases",
  ]) {
    await testEnv.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
};

const seedClosedCase = async (id: string, closedAt: string): Promise<void> => {
  await testEnv.DB.batch([
    testEnv.DB.prepare(
      `INSERT INTO cases (
        id, public_token_hash, email, name, context_type, path, status,
        created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      `hash_${id}`,
      `${id}@example.com`,
      `Case ${id}`,
      "professional",
      "priority",
      "closed",
      "2025-01-01T00:00:00.000Z",
      closedAt,
      closedAt,
    ),
    testEnv.DB.prepare(
      `INSERT INTO intakes (
        case_id, problem, desired_outcome, prior_attempts,
        sanitized_links_json, redacted_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, "problem", "outcome", "attempts", "[\"https://example.com\"]", null),
    testEnv.DB.prepare(
      `INSERT INTO discovery_state (
        case_id, workflow_id, gmail_thread_id, state_json,
        mandatory_review_held, mandatory_review_reasons_json,
        mandatory_review_draft_id, mandatory_review_held_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, `workflow_${id}`, `thread_${id}`, "{\"working\":true}", 0, null, null, null, closedAt),
    testEnv.DB.prepare(
      `INSERT INTO artifacts (
        id, case_id, artifact_type, version, body_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(`artifact_${id}`, id, "blueprint", 1, "{\"body\":\"sensitive\"}", closedAt),
    testEnv.DB.prepare(
      `INSERT INTO gmail_threads (
        case_id, gmail_thread_id, created_at
      ) VALUES (?, ?, ?)`,
    ).bind(id, `thread_${id}`, closedAt),
  ]);
};

const seedBooking = async (caseId: string): Promise<void> => {
  await testEnv.DB.batch([
    testEnv.DB.prepare(
      `INSERT INTO credits (
        id, case_id, stripe_checkout_session_id, stripe_payment_intent_id,
        cents, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind("credit_1", caseId, "cs_deposit", "pi_deposit", 29_500, "2026-07-01T00:00:00.000Z"),
    testEnv.DB.prepare(
      `INSERT INTO session_quotes (
        id, case_id, blueprint_version, credit_id, public_token_hash,
        duration_minutes, total_cents, credit_cents, balance_cents,
        expires_at, created_at, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind("quote_1", caseId, 1, "credit_1", "quote_hash", 90, 125_000, 29_500, 95_500, "2026-07-20T00:00:00.000Z", "2026-07-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z"),
    testEnv.DB.prepare(
      `INSERT INTO slot_holds (
        id, quote_id, calendar_id, starts_at, ends_at, status,
        expires_at, stripe_checkout_session_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind("hold_1", "quote_1", "primary", "2026-07-14T15:00:00.000Z", "2026-07-14T16:30:00.000Z", "active", "2026-07-13T16:20:00.000Z", "cs_balance", "2026-07-13T16:05:00.000Z"),
  ]);
};

const intakeText = async (caseId: string) =>
  testEnv.DB.prepare(
    `SELECT problem, desired_outcome, prior_attempts, sanitized_links_json,
      redacted_at
    FROM intakes
    WHERE case_id = ?`,
  )
    .bind(caseId)
    .first();

const artifactBody = async (caseId: string): Promise<string | undefined> => {
  const row = await testEnv.DB.prepare(
    "SELECT body_json FROM artifacts WHERE case_id = ?",
  )
    .bind(caseId)
    .first<{ body_json: string }>();
  return row?.body_json;
};

const gmailThreadCount = async (): Promise<number> => {
  const row = await testEnv.DB.prepare(
    "SELECT COUNT(*) AS count FROM gmail_threads",
  ).first<{ count: number }>();
  return row?.count ?? 0;
};
