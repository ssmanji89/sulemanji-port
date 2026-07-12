import { Hono } from "hono";
import type { Env } from "../env";
import {
  createStripeAdapter,
  type CheckoutSessionRequest,
  type StripeAdapter,
} from "../integrations/stripe";
import { D1CaseRepository, type PublicCase } from "../repositories/cases";

export type { CheckoutSessionRequest, StripeAdapter };

export interface PaymentRouteDependencies {
  stripeFactory?: (env: Env) => StripeAdapter;
}

interface ReviewGateReservation {
  position: number;
  status: "inside" | "outside";
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

interface CheckoutSessionCompleted {
  id: string;
  amount_total: number | null;
  metadata: Record<string, string> | null;
  payment_intent: string | { id?: string } | null;
  payment_status: string;
}

export const createPaymentRoutes = (
  dependencies: PaymentRouteDependencies = {},
) => {
  const app = new Hono<{ Bindings: Env }>();
  const stripeForEnv =
    dependencies.stripeFactory ?? ((env: Env) => createStripeAdapter(env));

  app.post("/cases/:token/deposit-checkout", async (c) => {
    if (c.req.header("Origin") !== c.env.SITE_ORIGIN) {
      return c.json({ error: "forbidden_origin" }, 403);
    }

    const repository = new D1CaseRepository(c.env.DB);
    const publicCase = await repository.getByPublicToken(c.req.param("token"));

    if (!publicCase || publicCase.status !== "checkout_pending") {
      return c.json({ error: "checkout_unavailable" }, 409);
    }

    const depositCents = parseConfiguredCents(c.env.PRIORITY_DEPOSIT_CENTS);
    const reservation = await reserveReviewGate(c.env);
    const metadata = checkoutMetadata(publicCase, reservation, c.env);
    const checkout = await stripeForEnv(c.env).createDepositCheckout({
      caseId: publicCase.id,
      customerEmail: publicCase.email,
      depositCents,
      successUrl: new URL("/work-with-me/thanks", c.env.SITE_ORIGIN).toString(),
      cancelUrl: priorityCancelUrl(c.env.SITE_ORIGIN, c.req.param("token")),
      metadata,
    });

    return c.json({ checkoutUrl: checkout.checkoutUrl });
  });

  app.post("/webhooks/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "invalid_signature" }, 400);
    }

    const raw = await c.req.raw.text();
    let event: unknown;
    try {
      event = await stripeForEnv(c.env).constructEvent(
        raw,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return c.json({ error: "invalid_signature" }, 400);
    }

    if (!isStripeWebhookEvent(event)) {
      return c.json({ error: "invalid_event" }, 400);
    }

    if (event.type !== "checkout.session.completed") {
      return c.json({ received: true });
    }

    const session = parseCheckoutCompleted(event.data.object);
    if (!session) {
      return c.json({ error: "invalid_event" }, 400);
    }

    const caseId = session.metadata?.case_id;
    const paymentIntentId = paymentIntentIdFrom(session.payment_intent);
    if (!caseId || !paymentIntentId) {
      return c.json({ error: "invalid_event" }, 400);
    }

    const repository = new D1CaseRepository(c.env.DB);
    const eventState = await repository.recordStripeEvent(
      event.id,
      caseId,
      event.type,
    );
    if (eventState === "duplicate") {
      return c.json({ received: true });
    }

    const depositCents = parseConfiguredCents(c.env.PRIORITY_DEPOSIT_CENTS);
    if (
      session.payment_status !== "paid" ||
      session.amount_total !== depositCents
    ) {
      return c.json({ error: "deposit_amount_mismatch" }, 422);
    }

    const current = await caseById(c.env.DB, caseId);
    if (!current || current.status !== "checkout_pending") {
      return c.json({ error: "checkout_unavailable" }, 409);
    }

    await repository.markDepositPaid(
      caseId,
      session.id,
      paymentIntentId,
      depositCents,
    );
    await repository.transition(
      caseId,
      "checkout_pending",
      "paid_pending_start",
      "priority_deposit_paid",
    );

    const workflowId = workflowIdFor(caseId);
    await c.env.PRIORITY_DISCOVERY.create({
      id: workflowId,
      params: { caseId },
    });

    return c.json({ received: true });
  });

  return app;
};

const parseConfiguredCents = (value: string): number => {
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error("Invalid PRIORITY_DEPOSIT_CENTS");
  }
  return cents;
};

const reserveReviewGate = async (env: Env): Promise<ReviewGateReservation> => {
  const limit = Number(env.MANDATORY_REVIEW_CASE_LIMIT);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("Invalid MANDATORY_REVIEW_CASE_LIMIT");
  }

  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `INSERT INTO offer_counters (counter_key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(counter_key) DO UPDATE SET
      value = value + 1,
      updated_at = excluded.updated_at
    RETURNING value`,
  )
    .bind("priority_launch_review_gate", 1, now)
    .first<{ value: number }>();

  if (!row) {
    throw new Error("Review gate reservation failed");
  }

  return {
    position: row.value,
    status: row.value <= limit ? "inside" : "outside",
  };
};

const checkoutMetadata = (
  publicCase: PublicCase,
  reservation: ReviewGateReservation,
  env: Env,
): Record<string, string> => ({
  case_id: publicCase.id,
  terms_version: env.TERMS_VERSION,
  launch_review_gate: reservation.status,
  launch_review_gate_position: String(reservation.position),
});

const priorityCancelUrl = (siteOrigin: string, token: string): string => {
  const url = new URL("/work-with-me/priority", siteOrigin);
  url.searchParams.set("case", token);
  return url.toString();
};

const isStripeWebhookEvent = (event: unknown): event is StripeWebhookEvent => {
  if (!event || typeof event !== "object") {
    return false;
  }
  const candidate = event as Partial<StripeWebhookEvent>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    !!candidate.data &&
    typeof candidate.data === "object" &&
    "object" in candidate.data
  );
};

const parseCheckoutCompleted = (
  value: unknown,
): CheckoutSessionCompleted | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<CheckoutSessionCompleted>;
  if (
    typeof session.id !== "string" ||
    typeof session.payment_status !== "string"
  ) {
    return null;
  }

  return {
    id: session.id,
    amount_total:
      typeof session.amount_total === "number" ? session.amount_total : null,
    metadata:
      session.metadata && typeof session.metadata === "object"
        ? session.metadata
        : null,
    payment_intent: session.payment_intent ?? null,
    payment_status: session.payment_status,
  };
};

const paymentIntentIdFrom = (
  paymentIntent: CheckoutSessionCompleted["payment_intent"],
): string | null => {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }
  if (paymentIntent && typeof paymentIntent.id === "string") {
    return paymentIntent.id;
  }
  return null;
};

const caseById = async (
  db: D1Database,
  caseId: string,
): Promise<{ id: string; status: string } | null> => {
  const row = await db
    .prepare("SELECT id, status FROM cases WHERE id = ?")
    .bind(caseId)
    .first<{ id: string; status: string }>();
  return row ?? null;
};

const workflowIdFor = (caseId: string): string => `priority-discovery-${caseId}`;
