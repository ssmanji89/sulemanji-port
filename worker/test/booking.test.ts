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
import {
  holdExpiresAt,
  quoteExpiresAt,
  remainingBalance,
} from "../src/domain/booking";
import { D1CaseRepository } from "../src/repositories/cases";

const db = (env as unknown as { DB: D1Database }).DB;

describe("booking rules", () => {
  it("applies the discovery deposit exactly as a non-negative credit", () => {
    expect(remainingBalance(125_000, 29_500)).toBe(95_500);
    expect(remainingBalance(29_500, 29_500)).toBe(0);
    expect(remainingBalance(20_000, 29_500)).toBe(0);
  });

  it("expires private quotes 60 days after blueprint delivery", () => {
    const deliveredAt = new Date("2026-07-13T15:30:00.000Z");

    expect(quoteExpiresAt(deliveredAt).toISOString()).toBe(
      "2026-09-11T15:30:00.000Z",
    );
  });

  it("expires slot holds after 15 minutes", () => {
    const now = new Date("2026-07-13T15:30:00.000Z");

    expect(holdExpiresAt(now).toISOString()).toBe("2026-07-13T15:45:00.000Z");
  });
});

describe("booking persistence schema", () => {
  let repository: D1CaseRepository;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(db, await loadMigrations(), "test_d1_migrations");
    repository = new D1CaseRepository(db);
  });

  it("creates private quote, slot hold, and calendar event tables", async () => {
    await seedCase("case_1");
    await seedCredit("case_1", 29_500);

    await db
      .prepare(
        `INSERT INTO session_quotes (
          id, case_id, blueprint_version, credit_id, public_token_hash, duration_minutes,
          total_cents, credit_cents, balance_cents, expires_at, created_at,
          approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "quote_1",
        "case_1",
        1,
        "credit_case_1",
        "hash_quote",
        90,
        125_000,
        29_500,
        95_500,
        "2026-09-11T15:30:00.000Z",
        "2026-07-13T15:30:00.000Z",
        null,
      )
      .run();

    await db
      .prepare(
        `INSERT INTO slot_holds (
          id, quote_id, calendar_id, starts_at, ends_at, status,
          expires_at, stripe_checkout_session_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "hold_1",
        "quote_1",
        "primary",
        "2026-07-14T15:00:00.000Z",
        "2026-07-14T16:30:00.000Z",
        "active",
        "2026-07-13T15:45:00.000Z",
        "cs_hold_1",
        "2026-07-13T15:30:00.000Z",
      )
      .run();

    await db
      .prepare(
        `INSERT INTO calendar_events (
          id, hold_id, calendar_id, starts_at, ends_at, provider_event_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "event_1",
        "hold_1",
        "primary",
        "2026-07-14T15:00:00.000Z",
        "2026-07-14T16:30:00.000Z",
        "provider_1",
        "2026-07-13T15:31:00.000Z",
      )
      .run();

    const row = await db
      .prepare("SELECT balance_cents FROM session_quotes WHERE id = ?")
      .bind("quote_1")
      .first<{ balance_cents: number }>();
    expect(row?.balance_cents).toBe(95_500);
  });

  it("rejects two active holds for the same calendar window", async () => {
    await seedCase("case_1");
    await seedQuote("quote_1", "case_1");
    await seedQuote("quote_2", "case_1", 2);
    await seedHold("hold_1", "quote_1", "active");

    await expect(seedHold("hold_2", "quote_2", "active")).rejects.toThrow(
      /unique constraint|constraint failed/i,
    );
    await expect(seedHold("hold_2", "quote_2", "released")).resolves.toBeDefined();
  });

  it("creates a private quote with one-time deposit credit", async () => {
    await seedCase("case_1");
    await seedCredit("case_1", 29_500);

    const quote = await repository.createSessionQuote({
      caseId: "case_1",
      blueprintVersion: 1,
      durationMinutes: 90,
      totalCents: 125_000,
      blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
      now: new Date("2026-07-13T16:00:00.000Z"),
    });

    expect(quote.publicToken).toEqual(expect.any(String));
    expect(quote.creditCents).toBe(29_500);
    expect(quote.balanceCents).toBe(95_500);
    expect(quote.expiresAt).toBe("2026-09-11T15:30:00.000Z");
    await expect(caseStatus("case_1")).resolves.toBe("priority_scheduling");

    const row = await db
      .prepare(
        `SELECT public_token_hash, credit_id, credit_cents, balance_cents
        FROM session_quotes
        WHERE id = ?`,
      )
      .bind(quote.id)
      .first<{
        public_token_hash: string;
        credit_id: string;
        credit_cents: number;
        balance_cents: number;
      }>();

    expect(row?.public_token_hash).not.toBe(quote.publicToken);
    expect(row?.credit_id).toBe("credit_case_1");
    expect(row?.credit_cents).toBe(29_500);
    expect(row?.balance_cents).toBe(95_500);
  });

  it("rejects a second quote that would consume the same deposit credit", async () => {
    await seedCase("case_1");
    await seedCredit("case_1", 29_500);
    await repository.createSessionQuote({
      caseId: "case_1",
      blueprintVersion: 1,
      durationMinutes: 90,
      totalCents: 125_000,
      blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
      now: new Date("2026-07-13T16:00:00.000Z"),
    });

    await expect(
      repository.createSessionQuote({
        caseId: "case_1",
        blueprintVersion: 2,
        durationMinutes: 120,
        totalCents: 150_000,
        blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
        now: new Date("2026-07-13T16:05:00.000Z"),
      }),
    ).rejects.toThrow(/credit.*consumed|quote.*exists/i);
  });

  it("creates and releases a slot hold from a private quote token", async () => {
    await seedCase("case_1");
    await seedCredit("case_1", 29_500);
    const quote = await repository.createSessionQuote({
      caseId: "case_1",
      blueprintVersion: 1,
      durationMinutes: 90,
      totalCents: 125_000,
      blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
      now: new Date("2026-07-13T16:00:00.000Z"),
    });

    const hold = await repository.createSlotHold({
      quoteToken: quote.publicToken,
      calendarId: "primary",
      startsAt: "2026-07-14T15:00:00.000Z",
      endsAt: "2026-07-14T16:30:00.000Z",
      stripeCheckoutSessionId: "cs_balance_1",
      now: new Date("2026-07-13T16:05:00.000Z"),
    });

    expect(hold.quoteId).toBe(quote.id);
    expect(hold.expiresAt).toBe("2026-07-13T16:20:00.000Z");
    await expect(caseStatus("case_1")).resolves.toBe("slot_held");

    await repository.releaseSlotHold(hold.id);

    const row = await db
      .prepare("SELECT status FROM slot_holds WHERE id = ?")
      .bind(hold.id)
      .first<{ status: string }>();
    expect(row?.status).toBe("released");
    await expect(caseStatus("case_1")).resolves.toBe("priority_scheduling");
  });

  it("rejects holds after a private quote expires", async () => {
    await seedCase("case_1");
    await seedCredit("case_1", 29_500);
    const quote = await repository.createSessionQuote({
      caseId: "case_1",
      blueprintVersion: 1,
      durationMinutes: 90,
      totalCents: 125_000,
      blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
      now: new Date("2026-07-13T16:00:00.000Z"),
    });

    await expect(
      repository.createSlotHold({
        quoteToken: quote.publicToken,
        calendarId: "primary",
        startsAt: "2026-09-12T15:00:00.000Z",
        endsAt: "2026-09-12T16:30:00.000Z",
        stripeCheckoutSessionId: "cs_balance_expired",
        now: new Date("2026-09-12T00:00:00.000Z"),
      }),
    ).rejects.toThrow("Private quote is expired or unavailable");
  });
});

const loadMigrations = async (): Promise<D1Migration[]> =>
  [
    migration("0001_cases.sql", migration0001),
    migration("0002_priority_discovery.sql", migration0002),
    migration("0003_payment_workflow_idempotency.sql", migration0003),
    migration("0004_automation_state.sql", migration0004),
    migration("0005_booking_retention.sql", migration0005),
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
      "blueprint_delivered",
      "2026-07-13T15:30:00.000Z",
      "2026-07-13T15:30:00.000Z",
      null,
    )
    .run();
};

const seedCredit = async (
  caseId: string,
  cents: number,
  id = `credit_${caseId}`,
): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO credits (
        id, case_id, stripe_checkout_session_id, stripe_payment_intent_id,
        cents, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      caseId,
      `cs_deposit_${id}`,
      `pi_deposit_${id}`,
      cents,
      "2026-07-13T15:45:00.000Z",
    )
    .run();
};

const caseStatus = async (caseId: string): Promise<string | undefined> => {
  const row = await db
    .prepare("SELECT status FROM cases WHERE id = ?")
    .bind(caseId)
    .first<{ status: string }>();
  return row?.status;
};

const seedQuote = async (
  id: string,
  caseId: string,
  version = 1,
): Promise<void> => {
  const creditId = `credit_${caseId}_${version}`;
  await seedCredit(caseId, 29_500, creditId).catch(() => undefined);
  await db
    .prepare(
      `INSERT INTO session_quotes (
        id, case_id, blueprint_version, credit_id, public_token_hash, duration_minutes,
        total_cents, credit_cents, balance_cents, expires_at, created_at,
        approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      caseId,
      version,
      creditId,
      `hash_${id}`,
      90,
      125_000,
      29_500,
      95_500,
      "2026-09-11T15:30:00.000Z",
      "2026-07-13T15:30:00.000Z",
      null,
    )
    .run();
};

const seedHold = async (
  id: string,
  quoteId: string,
  status: string,
): Promise<D1Result> =>
  db
    .prepare(
      `INSERT INTO slot_holds (
        id, quote_id, calendar_id, starts_at, ends_at, status,
        expires_at, stripe_checkout_session_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      quoteId,
      "primary",
      "2026-07-14T15:00:00.000Z",
      "2026-07-14T16:30:00.000Z",
      status,
      "2026-07-13T15:45:00.000Z",
      `cs_${id}`,
      "2026-07-13T15:30:00.000Z",
    )
    .run();
