import { Hono } from "hono";
import {
  listHeldReviewCases,
  renderAdminReviewPage,
} from "../admin/page";
import { verifyCloudflareAccessAdmin } from "../auth/access";
import type { Env } from "../env";
import { createGmailClient } from "../integrations/gmail";
import { D1CaseRepository } from "../repositories/cases";

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
