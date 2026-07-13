import { Hono } from "hono";
import type { Env } from "../env";
import {
  createGoogleCalendarAdapter,
  type CalendarAdapter,
} from "../integrations/calendar";
import {
  createStripeAdapter,
  type BalanceCheckoutSessionRequest,
} from "../integrations/stripe";
import { D1CaseRepository } from "../repositories/cases";

export type BalanceCheckoutRequest = BalanceCheckoutSessionRequest;
export type QuoteStripeAdapter = Pick<
  ReturnType<typeof createStripeAdapter>,
  "createBalanceCheckout"
>;

export interface QuoteRouteDependencies {
  calendarFactory?: (env: Env) => CalendarAdapter;
  stripeFactory?: (env: Env) => QuoteStripeAdapter;
}

interface HoldRequestBody {
  startsAt?: unknown;
  endsAt?: unknown;
}

const TIME_ZONE = "America/Chicago";

export const createQuoteRoutes = (
  dependencies: QuoteRouteDependencies = {},
) => {
  const app = new Hono<{ Bindings: Env }>();
  const calendarForEnv =
    dependencies.calendarFactory ??
    ((env: Env) =>
      createGoogleCalendarAdapter({
        clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
        clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
        refreshToken: env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      }));
  const stripeForEnv =
    dependencies.stripeFactory ?? ((env: Env) => createStripeAdapter(env));

  app.get("/quotes/:token", async (c) => {
    const repository = new D1CaseRepository(c.env.DB);
    const quote = await repository.getSessionQuoteByPublicToken(
      c.req.param("token"),
    );

    if (!quote || !quoteIsAvailable(quote.expiresAt, quote.caseStatus)) {
      return c.json({ error: "quote_unavailable" }, 404);
    }

    const now = new Date();
    const windows = await calendarForEnv(c.env).listAvailability({
      calendarId: c.env.GOOGLE_CALENDAR_ID,
      durationMinutes: quote.durationMinutes,
      from: now.toISOString(),
      to: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
    });

    return c.json({
      quote: publicQuote(quote),
      windows,
    });
  });

  app.post("/quotes/:token/holds", async (c) => {
    if (c.req.header("Origin") !== c.env.SITE_ORIGIN) {
      return c.json({ error: "forbidden_origin" }, 403);
    }

    const body = (await c.req.json().catch(() => ({}))) as HoldRequestBody;
    if (typeof body.startsAt !== "string" || typeof body.endsAt !== "string") {
      return c.json({ error: "invalid_hold" }, 400);
    }

    const repository = new D1CaseRepository(c.env.DB);
    const quote = await repository.getSessionQuoteByPublicToken(
      c.req.param("token"),
    );
    if (!quote || !quoteIsAvailable(quote.expiresAt, quote.caseStatus)) {
      return c.json({ error: "quote_unavailable" }, 404);
    }

    const calendar = calendarForEnv(c.env);
    const isFree = await calendar.isFree({
      calendarId: c.env.GOOGLE_CALENDAR_ID,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    if (!isFree) {
      return c.json({ error: "slot_unavailable" }, 409);
    }

    let hold;
    try {
      hold = await repository.createSlotHold({
        quoteToken: c.req.param("token"),
        calendarId: c.env.GOOGLE_CALENDAR_ID,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        stripeCheckoutSessionId: crypto.randomUUID(),
      });
    } catch (error) {
      if (error instanceof Error && /held|unavailable|expired/i.test(error.message)) {
        return c.json({ error: "slot_unavailable" }, 409);
      }
      throw error;
    }

    const metadata = {
      checkout_kind: "session_balance",
      case_id: quote.caseId,
      quote_id: quote.id,
      hold_id: hold.id,
      terms_version: c.env.TERMS_VERSION,
    };
    const checkout = await stripeForEnv(c.env).createBalanceCheckout({
      caseId: quote.caseId,
      customerEmail: quote.email,
      holdId: hold.id,
      balanceCents: quote.balanceCents,
      successUrl: new URL("/work-with-me/thanks", c.env.SITE_ORIGIN).toString(),
      cancelUrl: new URL("/work-with-me/quote", c.env.SITE_ORIGIN).toString(),
      metadata,
    });

    return c.json({
      checkoutUrl: checkout.checkoutUrl,
      hold: { id: hold.id, expiresAt: hold.expiresAt },
    });
  });

  return app;
};

const quoteIsAvailable = (expiresAt: string, status: string): boolean =>
  status === "priority_scheduling" && new Date(expiresAt) > new Date();

const publicQuote = (quote: {
  durationMinutes: number;
  totalCents: number;
  creditCents: number;
  balanceCents: number;
  expiresAt: string;
}) => ({
  durationMinutes: quote.durationMinutes,
  totalCents: quote.totalCents,
  creditCents: quote.creditCents,
  balanceCents: quote.balanceCents,
  expiresAt: quote.expiresAt,
  timeZone: TIME_ZONE,
});
