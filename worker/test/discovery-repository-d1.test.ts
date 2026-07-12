/// <reference types="@cloudflare/vitest-pool-workers/types" />

import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migration0001 from "../migrations/0001_cases.sql?raw";
import migration0002 from "../migrations/0002_priority_discovery.sql?raw";
import { D1CaseRepository } from "../src/repositories/cases";

const db = (env as unknown as { DB: D1Database }).DB;

describe("D1CaseRepository priority discovery SQL contracts", () => {
  let repository: D1CaseRepository;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(db, await loadMigrations(), "test_d1_migrations");
    repository = new D1CaseRepository(db);
  });

  it("treats repeated identical deposit payments as idempotent", async () => {
    await seedCase("case_1");
    await repository.markDepositPaid("case_1", "cs_123", "pi_123", 29_500);

    await expect(
      repository.markDepositPaid("case_1", "cs_123", "pi_123", 29_500),
    ).resolves.toBeUndefined();

    const row = await db
      .prepare("SELECT COUNT(*) AS count FROM credits")
      .first<{ count: number }>();
    expect(row?.count).toBe(1);
  });

  it("rejects conflicting duplicate deposit identifiers", async () => {
    await seedCase("case_1");
    await seedCase("case_2");
    await repository.markDepositPaid("case_1", "cs_123", "pi_123", 29_500);

    await expect(
      repository.markDepositPaid("case_2", "cs_123", "pi_999", 29_500),
    ).rejects.toThrow("Conflicting deposit payment");
    await expect(
      repository.markDepositPaid("case_2", "cs_999", "pi_123", 29_500),
    ).rejects.toThrow("Conflicting deposit payment");
    await expect(
      repository.markDepositPaid("case_1", "cs_123", "pi_123", 1),
    ).rejects.toThrow("Conflicting deposit payment");
  });

  it("treats repeated identical delivery starts as idempotent", async () => {
    await seedCase("case_1");
    await repository.startDelivery("case_1", "thread_1", "workflow_1");

    await expect(
      repository.startDelivery("case_1", "thread_1", "workflow_1"),
    ).resolves.toBeUndefined();

    const threads = await db
      .prepare("SELECT COUNT(*) AS count FROM gmail_threads")
      .first<{ count: number }>();
    expect(threads?.count).toBe(1);
  });

  it("rejects conflicting delivery starts", async () => {
    await seedCase("case_1");
    await seedCase("case_2");
    await repository.startDelivery("case_1", "thread_1", "workflow_1");

    await expect(
      repository.startDelivery("case_1", "thread_2", "workflow_2"),
    ).rejects.toThrow("Conflicting delivery start");
    await expect(
      repository.startDelivery("case_2", "thread_2", "workflow_1"),
    ).rejects.toThrow("Conflicting delivery start");
    await expect(
      repository.startDelivery("case_2", "thread_1", "workflow_2"),
    ).rejects.toThrow("Conflicting delivery start");
  });

  it("treats repeated identical review holds as idempotent", async () => {
    await seedCase("case_1");
    await repository.startDelivery("case_1", "thread_1", "workflow_1");
    await repository.holdForReview("case_1", ["payment_mismatch"], "draft_1");

    await expect(
      repository.holdForReview("case_1", ["payment_mismatch"], "draft_1"),
    ).resolves.toBeUndefined();

    const row = await db
      .prepare("SELECT COUNT(*) AS count FROM risk_decisions")
      .first<{ count: number }>();
    expect(row?.count).toBe(1);
  });

  it("rejects consent updates and deletes at the migration layer", async () => {
    await seedCase("case_1");
    await db
      .prepare(
        `INSERT INTO consents (
          id, case_id, terms_version, accepted_at, evidence_json
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        "consent_1",
        "case_1",
        "2026-07-11",
        "2026-07-12T00:00:00.000Z",
        "{}",
      )
      .run();

    await expect(
      db
        .prepare("UPDATE consents SET evidence_json = ? WHERE id = ?")
        .bind("{\"changed\":true}", "consent_1")
        .run(),
    ).rejects.toThrow("consent evidence is immutable");

    await expect(
      db.prepare("DELETE FROM consents WHERE id = ?").bind("consent_1").run(),
    ).rejects.toThrow("consent evidence is immutable");
  });
});

const loadMigrations = async (): Promise<D1Migration[]> =>
  [
    migration("0001_cases.sql", migration0001),
    migration("0002_priority_discovery.sql", migration0002),
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

    if (/^CREATE\s+TRIGGER\b/i.test(trimmed)) {
      inTrigger = true;
    }

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
    await db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
};

const seedCase = async (id: string): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO cases (
        id, public_token_hash, email, name, context_type, path, status,
        created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      `hash_${id}`,
      `${id}@example.com`,
      `Case ${id}`,
      "professional",
      "priority",
      "checkout_pending",
      "2026-07-12T00:00:00.000Z",
      "2026-07-12T00:00:00.000Z",
      null,
    )
    .run();
};
