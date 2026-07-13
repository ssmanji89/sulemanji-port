import { Hono } from "hono";
import type { Env } from "../env";
import {
  createGoogleCalendarAdapter,
  type CalendarAdapter,
} from "../integrations/calendar";
import {
  createStripeAdapter,
  type CheckoutSessionRequest,
  type StripeAdapter,
} from "../integrations/stripe";
import { D1CaseRepository, type PublicCase } from "../repositories/cases";

export type { CheckoutSessionRequest, StripeAdapter };

export interface PaymentRouteDependencies {
  stripeFactory?: (env: Env) => StripeAdapter;
  calendarFactory?: (env: Env) => CalendarAdapter;
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
  const calendarForEnv =
    dependencies.calendarFactory ??
    ((env: Env) =>
      createGoogleCalendarAdapter({
        clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
        clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
        refreshToken: env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      }));

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
    const stripe = stripeForEnv(c.env);
    let event: unknown;
    try {
      event = await stripe.constructEvent(
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
    if (session.metadata?.checkout_kind === "session_balance") {
      const status = await repository.recordStripeEvent(
        event.id,
        caseId,
        event.type,
      );
      if (status === "duplicate") {
        return c.json({ received: true });
      }

      await handleBalanceCheckout({
        repository,
        stripe,
        calendar: calendarForEnv(c.env),
        session,
        paymentIntentId,
      });
      return c.json({ received: true });
    }

    const stripeEventStatus = await repository.recordStripeEvent(
      event.id,
      caseId,
      event.type,
    );
    if (stripeEventStatus === "duplicate") {
      const current = await caseById(c.env.DB, caseId);
      if (current?.status === "paid_pending_start") {
        await ensurePriorityDiscoveryStarted(c.env, caseId);
      }
      return c.json({ received: true });
    }

    const depositCents = parseConfiguredCents(c.env.PRIORITY_DEPOSIT_CENTS);
    const current = await caseById(c.env.DB, caseId);
    if (!current) {
      return c.json({ error: "checkout_unavailable" }, 409);
    }

    if (
      session.payment_status !== "paid" ||
      session.amount_total !== depositCents
    ) {
      await refundInvalidDeposit(stripe, repository, current, paymentIntentId);
      return c.json({ received: true });
    }

    if (
      current.status !== "checkout_pending" &&
      current.status !== "paid_pending_start"
    ) {
      return c.json({ error: "checkout_unavailable" }, 409);
    }

    await repository.markDepositPaid(
      caseId,
      session.id,
      paymentIntentId,
      depositCents,
    );

    if (current.status === "checkout_pending") {
      await repository.transition(
        caseId,
        "checkout_pending",
        "paid_pending_start",
        "priority_deposit_paid",
      );
    }

    await ensurePriorityDiscoveryStarted(c.env, caseId);

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

const refundInvalidDeposit = async (
  stripe: StripeAdapter,
  repository: D1CaseRepository,
  current: { id: string; status: string },
  paymentIntentId: string,
): Promise<void> => {
  if (current.status === "declined_refund_pending") {
    return;
  }

  if (
    current.status !== "checkout_pending" &&
    current.status !== "paid_pending_start"
  ) {
    throw new Error("Invalid refund state");
  }

  if (current.status === "checkout_pending") {
    await repository.transition(
      current.id,
      "checkout_pending",
      "paid_pending_start",
      "priority_deposit_validation_failed",
    );
  }

  await stripe.refundPaymentIntent({
    caseId: current.id,
    paymentIntentId,
    reason: "deposit_validation_failed",
  });

  await repository.transition(
    current.id,
    "paid_pending_start",
    "declined_refund_pending",
    "priority_deposit_refund_pending",
  );
};

const handleBalanceCheckout = async (input: {
  repository: D1CaseRepository;
  stripe: StripeAdapter;
  calendar: CalendarAdapter;
  session: CheckoutSessionCompleted;
  paymentIntentId: string;
}): Promise<void> => {
  const holdId = input.session.metadata?.hold_id;
  if (!holdId) {
    throw new Error("Missing balance hold metadata");
  }

  const hold = await input.repository.getActiveSlotHoldForPayment(holdId);
  if (!hold) {
    throw new Error("Active slot hold not found");
  }

  if (
    input.session.payment_status !== "paid" ||
    input.session.amount_total !== hold.balanceCents
  ) {
    await input.stripe.refundPaymentIntent({
      caseId: hold.caseId,
      paymentIntentId: input.paymentIntentId,
      reason: "balance_validation_failed",
    });
    await input.repository.releaseSlotHold(hold.holdId);
    return;
  }

  const isFree = await input.calendar.isFree({
    calendarId: hold.calendarId,
    startsAt: hold.startsAt,
    endsAt: hold.endsAt,
  });
  if (!isFree) {
    await input.stripe.refundPaymentIntent({
      caseId: hold.caseId,
      paymentIntentId: input.paymentIntentId,
      reason: "slot_unavailable_after_payment",
    });
    await input.repository.releaseSlotHold(hold.holdId);
    return;
  }

  const event = await input.calendar.createSessionEvent({
    calendarId: hold.calendarId,
    startsAt: hold.startsAt,
    endsAt: hold.endsAt,
    summary: "Priority workflow session",
    description: `Case ${hold.caseId}`,
  });
  await input.repository.confirmSlotHold(hold.holdId, event.providerEventId);
};

const ensurePriorityDiscoveryStarted = async (
  env: Env,
  caseId: string,
): Promise<void> => {
  const workflowId = workflowIdFor(caseId);
  const alreadyStarted = await workflowStartRecorded(env.DB, caseId, workflowId);
  if (alreadyStarted) {
    return;
  }

  await env.PRIORITY_DISCOVERY.create({
    id: workflowId,
    params: { caseId },
  });
  await recordWorkflowStart(env.DB, caseId, workflowId);
};

const workflowStartRecorded = async (
  db: D1Database,
  caseId: string,
  workflowId: string,
): Promise<boolean> => {
  const row = await db
    .prepare(
      `SELECT 1
      FROM workflow_events
      WHERE case_id = ? AND workflow_id = ? AND event_type = ?
      LIMIT 1`,
    )
    .bind(caseId, workflowId, "priority_discovery_workflow_started")
    .first();

  return !!row;
};

const recordWorkflowStart = async (
  db: D1Database,
  caseId: string,
  workflowId: string,
): Promise<void> => {
  try {
    await db
      .prepare(
        `INSERT INTO workflow_events (
          id, case_id, workflow_id, event_type, data_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        caseId,
        workflowId,
        "priority_discovery_workflow_started",
        JSON.stringify({ source: "stripe_webhook" }),
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }
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

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Error &&
  /unique constraint|constraint failed/i.test(error.message);
