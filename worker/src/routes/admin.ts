import { Hono } from "hono";
import {
  listHeldReviewCases,
  listQuoteReadyCases,
  renderAdminReviewPage,
} from "../admin/page";
import { AgentDecision, type AgentInput } from "../agent/contracts";
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
  claimNextAgentJob?(): Promise<ClaimedAgentJob | null>;
  completeAgentJob?(
    jobId: string,
    decision: AgentDecision,
  ): Promise<CompletedAgentJob>;
}

export interface ClaimedAgentJob {
  id: string;
  caseId: string;
  workflowId: string;
  sourceMessageId: string;
  input: AgentInput;
  claimedAt: string;
}

export interface CompletedAgentJob {
  id: string;
  caseId: string;
  workflowId: string;
  sourceMessageId: string;
  decision: AgentDecision;
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

    const [heldReviews, quoteReadyCases] = await Promise.all([
      listHeldReviewCases(c.env.DB),
      listQuoteReadyCases(c.env.DB),
    ]);

    return c.html(renderAdminReviewPage({ heldReviews, quoteReadyCases }));
  });

  app.post("/admin/cases/:id/approve-draft", async (c) => {
    const authenticate =
      dependencies.authenticate ?? verifyCloudflareAccessAdmin;
    const actor = await authenticate(c.req.raw, c.env);
    if (actor !== c.env.ADMIN_EMAIL) {
      return c.json({ error: "forbidden" }, 403);
    }

    const body = await readAdminBody(c.req.raw);
    if (!body) {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (typeof body.draftId !== "string") {
      return c.json({ error: "invalid_request" }, 400);
    }

    const gmail = dependencies.gmail ?? createAdminGmail(c.env);
    const audit = dependencies.audit ?? new D1CaseRepository(c.env.DB);
    const caseId = c.req.param("id");
    const artifactVersion = optionalInteger(body.artifactVersion);

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

    const body = await readAdminBody(c.req.raw);
    if (!body) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const durationMinutes = requiredInteger(body.durationMinutes);
    const totalCents = requiredInteger(body.totalCents);
    if (
      durationMinutes === null ||
      totalCents === null ||
      durationMinutes < 15 ||
      totalCents < 0
    ) {
      return c.json({ error: "invalid_request" }, 400);
    }
    const quoteDurationMinutes = durationMinutes;
    const quoteTotalCents = totalCents;

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

  app.post("/admin/agent/jobs/next", async (c) => {
    const actor = await authenticateAgentRunner(c.req.raw, c.env, dependencies);
    if (!actor) {
      return c.json({ error: "forbidden" }, 403);
    }

    const repository = dependencies.audit ?? new D1CaseRepository(c.env.DB);
    const job = await repository.claimNextAgentJob?.();
    if (!job) {
      return c.json({ job: null }, 200);
    }

    return c.json({ job });
  });

  app.post("/admin/agent/jobs/:id/complete", async (c) => {
    const actor = await authenticateAgentRunner(c.req.raw, c.env, dependencies);
    if (!actor) {
      return c.json({ error: "forbidden" }, 403);
    }

    let body: { decision?: unknown };
    try {
      body = await c.req.json<{ decision?: unknown }>();
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }

    const parsedDecision = AgentDecision.safeParse(body.decision);
    if (!parsedDecision.success) {
      return c.json({ error: "invalid_agent_decision" }, 400);
    }

    const repository = dependencies.audit ?? new D1CaseRepository(c.env.DB);
    const completed = await repository.completeAgentJob?.(
      c.req.param("id"),
      parsedDecision.data,
    );
    if (!completed) {
      throw new Error("Agent job repository unavailable");
    }

    const workflow = await c.env.PRIORITY_DISCOVERY.get(completed.workflowId);
    await workflow.sendEvent({
      type: "agent-decision",
      payload: {
        caseId: completed.caseId,
        messageId: completed.sourceMessageId,
        jobId: completed.id,
        decision: completed.decision,
      },
    });

    await repository.recordAdminAction({
      actor,
      caseId: completed.caseId,
      action: "complete-agent-job",
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

const readAdminBody = async (
  request: Request,
): Promise<Record<string, unknown> | null> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json<Record<string, unknown>>();
      return body && typeof body === "object" && !Array.isArray(body)
        ? body
        : null;
    } catch {
      return null;
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }

  return null;
};

const optionalInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = requiredInteger(value);
  return parsed ?? undefined;
};

const requiredInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
};

const authenticateAgentRunner = async (
  request: Request,
  env: Env,
  dependencies: AdminRouteDependencies,
): Promise<string | null> => {
  if (await hasValidRunnerToken(request, env)) {
    return "agent:local-runner";
  }

  const authenticate = dependencies.authenticate ?? verifyCloudflareAccessAdmin;
  const actor = await authenticate(request, env);
  return actor === env.ADMIN_EMAIL ? actor : null;
};

const hasValidRunnerToken = async (
  request: Request,
  env: Env,
): Promise<boolean> => {
  if (!env.AGENT_RUNNER_TOKEN) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return false;

  return digestEqual(token, env.AGENT_RUNNER_TOKEN);
};

const digestEqual = async (left: string, right: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
};

const quoteUrl = (siteOrigin: string, token: string): string => {
  const url = new URL("/work-with-me/quote", siteOrigin);
  url.hash = token;
  return url.toString();
};
