import { Hono } from "hono";
import { IntakeInput, type CaseStatus } from "../domain/case";
import type { Env } from "../env";
import { D1CaseRepository } from "../repositories/cases";
import { verifyTurnstile } from "../security/turnstile";

export const createIntakeRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.post("/intakes", async (c) => {
    if (c.req.header("Origin") !== c.env.SITE_ORIGIN) {
      return c.json({ error: "forbidden_origin" }, 403);
    }

    const body = await readBoundedJson(c.req.raw);
    if (body === "too_large") {
      return c.json({ error: "request_too_large" }, 413);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return c.json({ error: "invalid_intake" }, 422);
    }
    const rawInput = body as Record<string, unknown>;

    if (typeof rawInput.website === "string" && rawInput.website.length > 0) {
      return c.body(null, 204);
    }

    const parsed = IntakeInput.safeParse(rawInput);
    if (!parsed.success || hasUnsafeContent(parsed.data)) {
      return c.json({ error: "invalid_intake" }, 422);
    }

    const ip = c.req.header("CF-Connecting-IP");
    const turnstileOk = await verifyTurnstile(
      c.env,
      parsed.data.turnstileToken,
      ip,
    );
    if (!turnstileOk) {
      return c.json({ error: "turnstile_failed" }, 403);
    }

    const repository = new D1CaseRepository(c.env.DB);
    const next = nextStatusForPath(parsed.data.path);
    const created = await repository.createIntakeInStatus(
      parsed.data,
      {
        termsVersion: c.env.TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
        evidence: {
          ip: ip ?? null,
          origin: c.req.header("Origin") ?? null,
          userAgent: c.req.header("User-Agent") ?? null,
        },
      },
      next,
      parsed.data.path === "priority" ? "priority_checkout_pending" : "case_queued",
    );

    return c.json({ caseToken: created.publicToken, next }, 201);
  });

  app.get("/cases/:token", async (c) => {
    const repository = new D1CaseRepository(c.env.DB);
    const publicCase = await repository.getByPublicToken(c.req.param("token"));

    if (!publicCase) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json({
      contextType: publicCase.contextType,
      path: publicCase.path,
      status: publicCase.status,
      createdAt: publicCase.createdAt,
      updatedAt: publicCase.updatedAt,
      closedAt: publicCase.closedAt,
    });
  });

  return app;
};

const MAX_INTAKE_BODY_BYTES = 16_384;

const readBoundedJson = async (
  request: Request,
): Promise<unknown | "too_large" | null> => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_INTAKE_BODY_BYTES) {
    return "too_large";
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_INTAKE_BODY_BYTES) {
    return "too_large";
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const nextStatusForPath = (path: IntakeInput["path"]): CaseStatus =>
  path === "priority" ? "checkout_pending" : "normal_queue";

const hasUnsafeContent = (input: IntakeInput): boolean => {
  const linksAreUnsafe = input.sanitizedLinks.some((link) => {
    const url = new URL(link);
    return (
      !["http:", "https:"].includes(url.protocol) ||
      attachmentLikePath.test(url.pathname)
    );
  });

  if (linksAreUnsafe) {
    return true;
  }

  return [
    input.problem,
    input.desiredOutcome,
    input.priorAttempts,
    ...input.sanitizedLinks,
  ].some((value) => credentialLikeText.test(value));
};

const attachmentLikePath =
  /\.(?:7z|csv|doc|docx|gif|heic|jpe?g|mov|mp4|pdf|png|rar|rtf|txt|xls|xlsx|zip)$/i;

const credentialLikeText =
  /\b(?:api[_ -]?key|bearer\s+[a-z0-9._-]+|pass(?:word|wd)?|private[_ -]?key|secret|token)\b/i;
