/// <reference types="@cloudflare/vitest-pool-workers/types" />

import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import migration0001 from "../migrations/0001_cases.sql?raw";
import migration0002 from "../migrations/0002_priority_discovery.sql?raw";
import migration0003 from "../migrations/0003_payment_workflow_idempotency.sql?raw";
import migration0004 from "../migrations/0004_automation_state.sql?raw";
import migration0005 from "../migrations/0005_booking_retention.sql?raw";
import migration0006 from "../migrations/0006_launch_review_and_quotes.sql?raw";
import {
  createGoogleCalendarAdapter,
  type CalendarAdapter,
} from "../src/integrations/calendar";
import { D1CaseRepository } from "../src/repositories/cases";
import {
  createQuoteRoutes,
  type BalanceCheckoutRequest,
  type QuoteStripeAdapter,
} from "../src/routes/quotes";
import type { Env } from "../src/env";

const testEnv = env as unknown as Env;
const SITE_ORIGIN = "https://www.sulemanji.com";
const API_ORIGIN = "https://api.example";

describe("Google Calendar adapter", () => {
  it("checks free/busy without exposing calendar event details", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch: typeof fetch = vi.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url) === "https://oauth2.googleapis.com/token") {
        return Response.json({ access_token: "access_token", expires_in: 3600 });
      }

      return Response.json({
        calendars: {
          primary: {
            busy: [
              {
                start: "2026-07-14T16:00:00.000Z",
                end: "2026-07-14T17:00:00.000Z",
                summary: "private event title that must not surface",
              },
            ],
          },
        },
      });
    }) as typeof fetch;

    const calendar = createGoogleCalendarAdapter(
      {
        clientId: "client",
        clientSecret: "secret",
        refreshToken: "refresh",
      },
      fakeFetch,
    );

    await expect(
      calendar.isFree({
        calendarId: "primary",
        startsAt: "2026-07-14T15:00:00.000Z",
        endsAt: "2026-07-14T16:00:00.000Z",
      }),
    ).resolves.toBe(true);
    await expect(
      calendar.isFree({
        calendarId: "primary",
        startsAt: "2026-07-14T16:30:00.000Z",
        endsAt: "2026-07-14T17:30:00.000Z",
      }),
    ).resolves.toBe(false);

    const freeBusyRequest = calls.find((call) =>
      call.url.endsWith("/freeBusy"),
    );
    expect(freeBusyRequest).toBeDefined();
    expect(freeBusyRequest?.init?.body).not.toContain("summary");
  });
});

describe("private quote routes", () => {
  let repository: D1CaseRepository;
  let calendar: FakeCalendarAdapter;
  let stripe: FakeQuoteStripeAdapter;
  let app: Hono<{ Bindings: Env }>;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(testEnv.DB, await loadMigrations(), "test_d1_migrations");
    Object.assign(testEnv, {
      SITE_ORIGIN,
      GOOGLE_CALENDAR_ID: "primary",
    });

    repository = new D1CaseRepository(testEnv.DB);
    calendar = new FakeCalendarAdapter();
    stripe = new FakeQuoteStripeAdapter();
    app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createQuoteRoutes({
        calendarFactory: () => calendar,
        stripeFactory: () => stripe,
      }),
    );
  });

  it("returns a private quote with sanitized availability windows", async () => {
    const { quote } = await createQuote();

    const response = await app.fetch(
      new Request(`${API_ORIGIN}/v1/quotes/${quote.publicToken}`, {
        headers: { origin: SITE_ORIGIN },
      }),
      testEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      quote: {
        durationMinutes: 90,
        totalCents: 125_000,
        creditCents: 29_500,
        balanceCents: 95_500,
        expiresAt: "2026-09-11T15:30:00.000Z",
        timeZone: "America/Chicago",
      },
      windows: [
        {
          startsAt: "2026-07-14T15:00:00.000Z",
          endsAt: "2026-07-14T16:30:00.000Z",
        },
      ],
    });
  });

  it("creates a hold and balance Checkout from the authoritative quote balance", async () => {
    const { caseId, quote } = await createQuote();

    const response = await app.fetch(
      new Request(`${API_ORIGIN}/v1/quotes/${quote.publicToken}/holds`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: SITE_ORIGIN },
        body: JSON.stringify({
          startsAt: "2026-07-14T15:00:00.000Z",
          endsAt: "2026-07-14T16:30:00.000Z",
        }),
      }),
      testEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      checkoutUrl: "https://checkout.example/balance",
      hold: { expiresAt: expect.any(String) },
    });
    expect(stripe.balanceRequests).toEqual([
      expect.objectContaining({
        caseId,
        balanceCents: 95_500,
        metadata: expect.objectContaining({
          checkout_kind: "session_balance",
          case_id: caseId,
        }),
      }),
    ]);
    await expect(caseStatus(caseId)).resolves.toBe("slot_held");
  });

  it("rejects holds for unavailable calendar windows before Stripe is called", async () => {
    const { quote } = await createQuote();
    calendar.free = false;

    const response = await app.fetch(
      new Request(`${API_ORIGIN}/v1/quotes/${quote.publicToken}/holds`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: SITE_ORIGIN },
        body: JSON.stringify({
          startsAt: "2026-07-14T15:00:00.000Z",
          endsAt: "2026-07-14T16:30:00.000Z",
        }),
      }),
      testEnv,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "slot_unavailable" });
    expect(stripe.balanceRequests).toHaveLength(0);
  });

  const createQuote = async (): Promise<{
    caseId: string;
    quote: { id: string; publicToken: string };
  }> => {
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
    return { caseId: "case_1", quote };
  };
});

class FakeCalendarAdapter implements CalendarAdapter {
  free = true;

  async listAvailability(): Promise<Array<{ startsAt: string; endsAt: string }>> {
    return [
      {
        startsAt: "2026-07-14T15:00:00.000Z",
        endsAt: "2026-07-14T16:30:00.000Z",
      },
    ];
  }

  async isFree(): Promise<boolean> {
    return this.free;
  }

  async createSessionEvent(): Promise<{ providerEventId: string }> {
    return { providerEventId: "event_1" };
  }
}

class FakeQuoteStripeAdapter implements QuoteStripeAdapter {
  readonly balanceRequests: BalanceCheckoutRequest[] = [];

  async createBalanceCheckout(
    request: BalanceCheckoutRequest,
  ): Promise<{ checkoutUrl: string }> {
    this.balanceRequests.push(request);
    return { checkoutUrl: "https://checkout.example/balance" };
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
    await testEnv.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
};

const seedCase = async (id: string): Promise<void> => {
  await testEnv.DB.prepare(
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

const seedCredit = async (caseId: string, cents: number): Promise<void> => {
  await testEnv.DB.prepare(
    `INSERT INTO credits (
      id, case_id, stripe_checkout_session_id, stripe_payment_intent_id,
      cents, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `credit_${caseId}`,
      caseId,
      `cs_deposit_${caseId}`,
      `pi_deposit_${caseId}`,
      cents,
      "2026-07-13T15:45:00.000Z",
    )
    .run();
};

const caseStatus = async (caseId: string): Promise<string | undefined> => {
  const row = await testEnv.DB.prepare("SELECT status FROM cases WHERE id = ?")
    .bind(caseId)
    .first<{ status: string }>();
  return row?.status;
};
