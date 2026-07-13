/// <reference types="@cloudflare/vitest-pool-workers/types" />

import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { Hono } from "hono";
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import migration0001 from "../migrations/0001_cases.sql?raw";
import migration0002 from "../migrations/0002_priority_discovery.sql?raw";
import migration0003 from "../migrations/0003_payment_workflow_idempotency.sql?raw";
import type { IntakeInput } from "../src/domain/case";
import type { Env } from "../src/env";
import { createStripeAdapter } from "../src/integrations/stripe";
import { D1CaseRepository } from "../src/repositories/cases";
import {
  createPaymentRoutes,
  type CheckoutSessionRequest,
  type StripeAdapter,
} from "../src/routes/payments";

const SITE_ORIGIN = "https://www.sulemanji.com";
const API_ORIGIN = "https://api.example";
const testEnv = env as unknown as Env;

const validInput: IntakeInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  contextType: "professional",
  problem:
    "I need help prioritizing a complex operating model change across multiple teams.",
  desiredOutcome: "A clear blueprint for the next operating decision.",
  priorAttempts: "A spreadsheet checklist exists, but it has not resolved ownership.",
  sanitizedLinks: [],
  path: "priority",
  termsAccepted: true,
  turnstileToken: "test-pass",
  website: "",
};

const consentMeta = {
  termsVersion: "2026-07-11",
  acceptedAt: "2026-07-12T00:00:00.000Z",
  evidence: { ip: "127.0.0.1", origin: SITE_ORIGIN },
};

describe("payment routes", () => {
  let repository: D1CaseRepository;
  let stripe: FakeStripeAdapter;
  let workflowStarts: Array<{ id: string; params: { caseId: string } }>;
  let app: Hono<{ Bindings: Env }>;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(testEnv.DB, await loadMigrations(), "test_d1_migrations");

    repository = new D1CaseRepository(testEnv.DB);
    stripe = new FakeStripeAdapter();
    workflowStarts = [];
    Object.assign(testEnv, {
      SITE_ORIGIN,
      TERMS_VERSION: "2026-07-11",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
      PRIORITY_DEPOSIT_CENTS: "29500",
      MANDATORY_REVIEW_CASE_LIMIT: "10",
      PRIORITY_DISCOVERY: {
        create: vi.fn(
          async (options: { id: string; params: { caseId: string } }) => {
            workflowStarts.push(options);
            return { id: options.id };
          },
        ),
      },
    });

    app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createPaymentRoutes({ stripeFactory: () => stripe }),
    );
  });

  it("creates checkout from the authoritative fixed deposit and returns only the checkout URL", async () => {
    const created = await createCase("checkout_pending", {
      email: "priority@example.com",
    });

    const response = await checkout(created.publicToken, {
      maliciousBrowserPrice: 1,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.example/session",
    });
    expect(stripe.checkoutRequests).toEqual([
      expect.objectContaining({
        caseId: created.id,
        customerEmail: "priority@example.com",
        depositCents: 29_500,
        metadata: expect.objectContaining({
          case_id: created.id,
          launch_review_gate: "inside",
          launch_review_gate_position: "1",
        }),
      }),
    ]);
  });

  it("requires checkout_pending before creating a deposit Checkout Session", async () => {
    const created = await createCase("normal_queue", {
      path: "normal",
      email: "normal@example.com",
    });

    const response = await checkout(created.publicToken);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "checkout_unavailable",
    });
    expect(stripe.checkoutRequests).toHaveLength(0);
  });

  it("allocates launch review-gate metadata with an atomic counter", async () => {
    Object.assign(testEnv, { MANDATORY_REVIEW_CASE_LIMIT: "1" });
    const first = await createCase("checkout_pending", {
      email: "first@example.com",
    });
    const second = await createCase("checkout_pending", {
      email: "second@example.com",
    });

    const responses = await Promise.all([
      checkout(first.publicToken),
      checkout(second.publicToken),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 200,
    ]);
    expect(
      stripe.checkoutRequests
        .map((request) => request.metadata.launch_review_gate)
        .sort(),
    ).toEqual(["inside", "outside"]);
    expect(
      stripe.checkoutRequests
        .map((request) => request.metadata.launch_review_gate_position)
        .sort(),
    ).toEqual(["1", "2"]);
  });

  it("rejects webhook requests whose raw body fails Stripe signature verification", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_bad_sig",
      caseId: created.id,
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);

    const response = await webhook(raw, "invalid-signature");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_signature",
    });
    expect(stripe.constructEventCalls).toEqual([
      {
        raw,
        signature: "invalid-signature",
        webhookSecret: "whsec_test_123",
      },
    ]);
    await expect(tableCount("payments")).resolves.toBe(0);
    expect(workflowStarts).toHaveLength(0);
  });

  it("rejects deposit checkout from an arbitrary origin before Stripe is called", async () => {
    const created = await createCase("checkout_pending", {
      email: "priority@example.com",
    });

    const response = await app.fetch(
      new Request(`${API_ORIGIN}/v1/cases/${created.publicToken}/deposit-checkout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        body: "{}",
      }),
      testEnv,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden_origin" });
    expect(stripe.checkoutRequests).toHaveLength(0);
  });


  it("records duplicate webhook deliveries before effects and acknowledges without starting workflow twice", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_duplicate",
      caseId: created.id,
      sessionId: "cs_duplicate",
      paymentIntentId: "pi_duplicate",
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);

    const first = await webhook(raw, "valid-signature");
    const second = await webhook(raw, "valid-signature");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ received: true });
    await expect(second.json()).resolves.toEqual({ received: true });
    await expect(tableCount("payments")).resolves.toBe(1);
    await expect(tableCount("credits")).resolves.toBe(1);
    await expect(caseStatus(created.id)).resolves.toBe("paid_pending_start");
    expect(workflowStarts).toEqual([
      {
        id: `priority-discovery-${created.id}`,
        params: { caseId: created.id },
      },
    ]);
  });

  it("starts the Priority Discovery workflow exactly once after a verified successful checkout", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_paid",
      caseId: created.id,
      sessionId: "cs_paid",
      paymentIntentId: "pi_paid",
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);

    const response = await webhook(raw, "valid-signature");

    expect(response.status).toBe(200);
    await expect(tableCount("payments")).resolves.toBe(1);
    await expect(creditForCase(created.id)).resolves.toEqual({
      stripe_checkout_session_id: "cs_paid",
      stripe_payment_intent_id: "pi_paid",
      cents: 29_500,
    });
    expect(workflowStarts).toEqual([
      {
        id: `priority-discovery-${created.id}`,
        params: { caseId: created.id },
      },
    ]);
  });

  it("recovers workflow start on duplicate webhook retry after a transient failure", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_retry_workflow",
      caseId: created.id,
      sessionId: "cs_retry_workflow",
      paymentIntentId: "pi_retry_workflow",
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);
    let workflowAttempts = 0;
    testEnv.PRIORITY_DISCOVERY = {
      create: vi.fn(
        async (options: { id: string; params: { caseId: string } }) => {
          workflowAttempts += 1;
          if (workflowAttempts === 1) {
            throw new Error("workflow unavailable");
          }
          workflowStarts.push(options);
          return { id: options.id };
        },
      ),
    } as unknown as Env["PRIORITY_DISCOVERY"];

    const first = await webhook(raw, "valid-signature");
    const second = await webhook(raw, "valid-signature");

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    await expect(caseStatus(created.id)).resolves.toBe("paid_pending_start");
    await expect(tableCount("credits")).resolves.toBe(1);
    expect(workflowStarts).toEqual([
      {
        id: `priority-discovery-${created.id}`,
        params: { caseId: created.id },
      },
    ]);
  });

  it("automatically refunds paid events that cannot begin delivery before credit or workflow effects", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_amount_mismatch",
      caseId: created.id,
      amountTotal: 100,
      sessionId: "cs_amount_mismatch",
      paymentIntentId: "pi_amount_mismatch",
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);

    const response = await webhook(raw, "valid-signature");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(stripe.refundRequests).toEqual([
      {
        caseId: created.id,
        paymentIntentId: "pi_amount_mismatch",
        reason: "deposit_validation_failed",
      },
    ]);
    expect(workflowStarts).toHaveLength(0);
    await expect(tableCount("credits")).resolves.toBe(0);
    await expect(caseStatus(created.id)).resolves.toBe("declined_refund_pending");
  });

  it("retries validation and refund handling for duplicate bad paid events until refund state is reached", async () => {
    const created = await createCase("checkout_pending");
    const event = checkoutCompletedEvent({
      eventId: "evt_bad_retry",
      caseId: created.id,
      amountTotal: 100,
      sessionId: "cs_bad_retry",
      paymentIntentId: "pi_bad_retry",
    });
    const raw = JSON.stringify(event);
    stripe.events.set(raw, event);

    await webhook(raw, "valid-signature");
    await webhook(raw, "valid-signature");

    expect(stripe.refundRequests).toHaveLength(1);
    await expect(caseStatus(created.id)).resolves.toBe("declined_refund_pending");
  });

  const checkout = (token: string, body: unknown = {}): Promise<Response> =>
    Promise.resolve(
      app.fetch(
        new Request(`${API_ORIGIN}/v1/cases/${token}/deposit-checkout`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: SITE_ORIGIN,
          },
          body: JSON.stringify(body),
        }),
        testEnv,
      ),
    );

  const webhook = (raw: string, signature: string): Promise<Response> =>
    Promise.resolve(
      app.fetch(
        new Request(`${API_ORIGIN}/v1/webhooks/stripe`, {
          method: "POST",
          headers: { "stripe-signature": signature },
          body: raw,
        }),
        testEnv,
      ),
    );

  const createCase = async (
    status: "checkout_pending" | "normal_queue",
    overrides: Partial<IntakeInput> = {},
  ): Promise<{ id: string; publicToken: string }> => {
    const input = { ...validInput, ...overrides };
    return repository.createIntakeInStatus(
      input,
      consentMeta,
      status,
      status === "checkout_pending" ? "priority_checkout_pending" : "case_queued",
    );
  };
});

describe("Stripe adapter", () => {
  it("creates Checkout Sessions with metadata on both Session and PaymentIntent plus policy acceptance", async () => {
    const stripeClient = {
      checkout: {
        sessions: {
          create: vi.fn(async (_params: Record<string, unknown>) => ({
            id: "cs_123",
            url: "https://checkout.example/session",
          })),
        },
      },
      refunds: { create: vi.fn() },
      webhooks: { constructEventAsync: vi.fn() },
    };
    const adapter = createStripeAdapter(testEnv, stripeClient);

    await expect(
      adapter.createDepositCheckout({
        caseId: "case_123",
        customerEmail: "ada@example.com",
        depositCents: 29_500,
        successUrl: "https://www.sulemanji.com/work-with-me/thanks?case=case_123",
        cancelUrl: "https://www.sulemanji.com/work-with-me/priority?case=case_123",
        metadata: {
          case_id: "case_123",
          terms_version: "2026-07-11",
          launch_review_gate: "inside",
          launch_review_gate_position: "1",
        },
      }),
    ).resolves.toEqual({ checkoutUrl: "https://checkout.example/session" });

    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "ada@example.com",
        success_url:
          "https://www.sulemanji.com/work-with-me/thanks?case=case_123",
        cancel_url:
          "https://www.sulemanji.com/work-with-me/priority?case=case_123",
        consent_collection: { terms_of_service: "required" },
        metadata: {
          case_id: "case_123",
          terms_version: "2026-07-11",
          launch_review_gate: "inside",
          launch_review_gate_position: "1",
        },
        payment_intent_data: {
          metadata: {
            case_id: "case_123",
            terms_version: "2026-07-11",
            launch_review_gate: "inside",
            launch_review_gate_position: "1",
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: expect.objectContaining({
              currency: "usd",
              unit_amount: 29_500,
            }),
          },
        ],
      }),
    );
    const createdAtSeconds = Math.floor(Date.now() / 1000);
    const params = stripeClient.checkout.sessions.create.mock.calls[0]?.[0];
    expect(params).toBeDefined();
    const expiresAt = (params as unknown as { expires_at: number }).expires_at;
    expect(expiresAt).toBeGreaterThanOrEqual(createdAtSeconds + 29 * 60);
    expect(expiresAt).toBeLessThanOrEqual(createdAtSeconds + 31 * 60);
  });

  it("verifies webhook signatures against the exact raw payload", async () => {
    const adapter = createStripeAdapter(testEnv);
    const payload = JSON.stringify({
      id: "evt_real_signature",
      type: "checkout.session.completed",
      data: { object: { id: "cs_real_signature" } },
    });
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: "whsec_test_123",
    });

    await expect(
      adapter.constructEvent(payload, signature, "whsec_test_123"),
    ).resolves.toMatchObject({ id: "evt_real_signature" });
    await expect(
      adapter.constructEvent(`${payload}\n`, signature, "whsec_test_123"),
    ).rejects.toThrow();
  });
});

interface CheckoutCompletedEventOptions {
  eventId: string;
  caseId: string;
  sessionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
}

const checkoutCompletedEvent = ({
  eventId,
  caseId,
  sessionId = "cs_123",
  paymentIntentId = "pi_123",
  amountTotal = 29_500,
}: CheckoutCompletedEventOptions) => ({
  id: eventId,
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      amount_total: amountTotal,
      metadata: { case_id: caseId },
      payment_intent: paymentIntentId,
      payment_status: "paid",
    },
  },
});

class FakeStripeAdapter implements StripeAdapter {
  readonly checkoutRequests: CheckoutSessionRequest[] = [];
  readonly balanceCheckoutRequests: unknown[] = [];
  readonly constructEventCalls: Array<{
    raw: string;
    signature: string;
    webhookSecret: string;
  }> = [];
  readonly refundRequests: unknown[] = [];
  readonly events = new Map<string, unknown>();

  async createDepositCheckout(
    request: CheckoutSessionRequest,
  ): Promise<{ checkoutUrl: string }> {
    this.checkoutRequests.push(request);
    return { checkoutUrl: "https://checkout.example/session" };
  }

  async createBalanceCheckout(request: unknown): Promise<{ checkoutUrl: string }> {
    this.balanceCheckoutRequests.push(request);
    return { checkoutUrl: "https://checkout.example/balance" };
  }

  async constructEvent(
    raw: string,
    signature: string,
    webhookSecret: string,
  ): Promise<unknown> {
    this.constructEventCalls.push({ raw, signature, webhookSecret });
    if (signature !== "valid-signature") {
      throw new Error("Invalid signature");
    }

    const event = this.events.get(raw);
    if (!event) {
      throw new Error("Missing fake event");
    }

    return event;
  }

  async refundPaymentIntent(request: unknown): Promise<void> {
    this.refundRequests.push(request);
  }
}

const loadMigrations = async (): Promise<D1Migration[]> =>
  [
    migration("0001_cases.sql", migration0001),
    migration("0002_priority_discovery.sql", migration0002),
    migration("0003_payment_workflow_idempotency.sql", migration0003),
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
    await testEnv.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
};

const tableCount = async (
  table: "payments" | "credits",
): Promise<number> => {
  const result = await testEnv.DB.prepare(
    `SELECT COUNT(*) AS count FROM ${table}`,
  ).first<{ count: number }>();
  return result?.count ?? 0;
};

const caseStatus = async (caseId: string): Promise<string | null> => {
  const result = await testEnv.DB.prepare(
    "SELECT status FROM cases WHERE id = ?",
  )
    .bind(caseId)
    .first<{ status: string }>();
  return result?.status ?? null;
};

const creditForCase = async (
  caseId: string,
): Promise<{
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string;
  cents: number;
} | null> => {
  return testEnv.DB.prepare(
    `SELECT stripe_checkout_session_id, stripe_payment_intent_id, cents
    FROM credits
    WHERE case_id = ?`,
  )
    .bind(caseId)
    .first();
};
