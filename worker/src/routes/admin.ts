import { Hono } from "hono";
import {
  listHeldReviewCases,
  renderAdminReviewPage,
} from "../admin/page";
import { verifyCloudflareAccessAdmin } from "../auth/access";
import type { Env } from "../env";
import { createGmailClient } from "../integrations/gmail";
import {
  D1CaseRepository,
  type CreatedSessionQuote,
  type LatestBlueprintForQuote,
} from "../repositories/cases";

export interface AdminGmail {
  sendDraft(draftId: string): Promise<void>;
}

export interface AdminAudit {
  recordAdminAction(action: {
    actor: string;
    caseId: string;
    action: string;
    artifactVersion?: number;
  }): Promise<void>;
  assertHeldDraftForReview?(caseId: string, draftId: string): Promise<void>;
  resolveReviewHold?(
    caseId: string,
    draftId: string,
    status: "approved" | "revised",
  ): Promise<void>;
  latestBlueprintForQuote?(caseId: string): Promise<LatestBlueprintForQuote | null>;
  createSessionQuote?(input: {
    caseId: string;
    blueprintVersion: number;
    durationMinutes: number;
    totalCents: number;
    blueprintDeliveredAt: Date;
  }): Promise<CreatedSessionQuote>;
  transition?(
    id: string,
    expected: "discovery_active",
    next: "waiting_for_customer",
    event: string,
  ): Promise<void>;
}

export interface AdminRouteDependencies {
  gmail?: AdminGmail;
  audit?: AdminAudit;
  authenticate?: (request: Request, env: Env) => Promise<string | null>;
}

export const createAdminRoutes = (dependencies: AdminRouteDependencies = {}) => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/admin", async (c) => {
    const authenticate =
      dependencies.authenticate ?? verifyCloudflareAccessAdmin;
    const actor = await authenticate(c.req.raw, c.env);
    if (actor !== c.env.ADMIN_EMAIL) {
      return c.text("Forbidden", 403);
    }

    return c.html(renderAdminReviewPage(await listHeldReviewCases(c.env.DB)));
  });

  app.post("/admin/cases/:id/approve-draft", async (c) => {
    const authenticate =
      dependencies.authenticate ?? verifyCloudflareAccessAdmin;
    const actor = await authenticate(c.req.raw, c.env);
    if (actor !== c.env.ADMIN_EMAIL) {
      return c.json({ error: "forbidden" }, 403);
    }

    let body: { draftId?: unknown; artifactVersion?: unknown };
    try {
      body = await c.req.json<{
        draftId?: unknown;
        artifactVersion?: unknown;
      }>();
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (typeof body.draftId !== "string") {
      return c.json({ error: "invalid_request" }, 400);
    }

    const gmail = dependencies.gmail ?? createAdminGmail(c.env);
    const audit = dependencies.audit ?? new D1CaseRepository(c.env.DB);
    const caseId = c.req.param("id");
    const artifactVersion =
      typeof body.artifactVersion === "number" ? body.artifactVersion : undefined;

    try {
      await audit.assertHeldDraftForReview?.(caseId, body.draftId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Draft is not held for this case"
      ) {
        return c.json({ error: "draft_not_held_for_case" }, 409);
      }
      throw error;
    }

    await audit.recordAdminAction({
      actor,
      caseId,
      action: "approve-draft-intent",
      artifactVersion,
    });
    await gmail.sendDraft(body.draftId);
    await audit.resolveReviewHold?.(caseId, body.draftId, "approved");
    try {
      await audit.transition?.(
        caseId,
        "discovery_active",
        "waiting_for_customer",
        "reviewed_discovery_draft_sent",
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("Case transition failed")
      ) {
        throw error;
      }
    }
    await audit.recordAdminAction({
      actor,
      caseId,
      action: "approve-draft-sent",
      artifactVersion,
    });

    return c.json({ ok: true });
  });

  app.post("/admin/cases/:id/approve-private-quote", async (c) => {
    const authenticate =
      dependencies.authenticate ?? verifyCloudflareAccessAdmin;
    const actor = await authenticate(c.req.raw, c.env);
    if (actor !== c.env.ADMIN_EMAIL) {
      return c.json({ error: "forbidden" }, 403);
    }

    let body: { durationMinutes?: unknown; totalCents?: unknown };
    try {
      body = await c.req.json<{
        durationMinutes?: unknown;
        totalCents?: unknown;
      }>();
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }
    const durationMinutes = body.durationMinutes;
    const totalCents = body.totalCents;
    if (
      !Number.isInteger(durationMinutes) ||
      !Number.isInteger(totalCents) ||
      (durationMinutes as number) < 15 ||
      (totalCents as number) < 0
    ) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const quoteDurationMinutes = durationMinutes as number;
    const quoteTotalCents = totalCents as number;

    const caseId = c.req.param("id");
    const repository = dependencies.audit ?? new D1CaseRepository(c.env.DB);
    const latestBlueprint = await repository.latestBlueprintForQuote?.(caseId);
    if (!latestBlueprint) {
      return c.json({ error: "blueprint_unavailable" }, 409);
    }

    const quote = await repository.createSessionQuote?.({
      caseId,
      blueprintVersion: latestBlueprint.version,
      durationMinutes: quoteDurationMinutes,
      totalCents: quoteTotalCents,
      blueprintDeliveredAt: new Date(latestBlueprint.deliveredAt),
    });
    if (!quote) {
      throw new Error("Session quote repository unavailable");
    }

    await repository.recordAdminAction({
      actor,
      caseId,
      action: "approve-private-quote",
      artifactVersion: latestBlueprint.version,
    });

    return c.json({
      quoteUrl: quoteUrl(c.env.SITE_ORIGIN, quote.publicToken),
      creditCents: quote.creditCents,
      balanceCents: quote.balanceCents,
      expiresAt: quote.expiresAt,
    });
  });

  return app;
};

const createAdminGmail = (env: Env): AdminGmail =>
  createGmailClient({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    sender: env.GMAIL_SENDER,
    labelId: env.GMAIL_CLINIC_LABEL,
  });

const quoteUrl = (siteOrigin: string, token: string): string => {
  const url = new URL("/work-with-me/quote", siteOrigin);
  url.hash = token;
  return url.toString();
};
