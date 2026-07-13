import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import { createAdminRoutes } from "../src/routes/admin";

describe("admin review routes", () => {
  it("requires the configured Access identity before sending a draft", async () => {
    const gmail = { sendDraft: vi.fn(async () => undefined) };
    const audit = { recordAdminAction: vi.fn(async () => undefined) };
    const app = new Hono<{ Bindings: Env }>();
    app.route("/v1", createAdminRoutes({ gmail, audit }));

    const response = await app.fetch(
      new Request("https://api.example/v1/admin/cases/case_1/approve-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: "draft_1" }),
      }),
      { ADMIN_EMAIL: "ssmanji89@gmail.com" } as Env,
    );

    expect(response.status).toBe(403);
    expect(gmail.sendDraft).not.toHaveBeenCalled();
  });

  it("does not trust a spoofed Cloudflare Access email header without a verified JWT", async () => {
    const gmail = { sendDraft: vi.fn(async () => undefined) };
    const audit = { recordAdminAction: vi.fn(async () => undefined) };
    const app = new Hono<{ Bindings: Env }>();
    app.route("/v1", createAdminRoutes({ gmail, audit }));

    const response = await app.fetch(
      new Request("https://api.example/v1/admin/cases/case_1/approve-draft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "ssmanji89@gmail.com",
        },
        body: JSON.stringify({ draftId: "draft_1" }),
      }),
      {
        ADMIN_EMAIL: "ssmanji89@gmail.com",
        ACCESS_TEAM_DOMAIN: "sulemanji.cloudflareaccess.com",
        ACCESS_AUD: "aud_123",
      } as Env,
    );

    expect(response.status).toBe(403);
    expect(gmail.sendDraft).not.toHaveBeenCalled();
  });

  it("sends approved Gmail drafts and records the actor", async () => {
    const gmail = { sendDraft: vi.fn(async () => undefined) };
    const audit = {
      recordAdminAction: vi.fn(async () => undefined),
      assertHeldDraftForReview: vi.fn(async () => undefined),
      resolveReviewHold: vi.fn(async () => undefined),
      transition: vi.fn(async () => undefined),
    };
    const app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createAdminRoutes({
        gmail,
        audit,
        authenticate: async () => "ssmanji89@gmail.com",
      }),
    );

    const response = await app.fetch(
      new Request("https://api.example/v1/admin/cases/case_1/approve-draft", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-access-authenticated-user-email": "ssmanji89@gmail.com",
        },
        body: JSON.stringify({ draftId: "draft_1", artifactVersion: 2 }),
      }),
      { ADMIN_EMAIL: "ssmanji89@gmail.com" } as Env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(audit.assertHeldDraftForReview).toHaveBeenCalledWith(
      "case_1",
      "draft_1",
    );
    expect(audit.recordAdminAction).toHaveBeenNthCalledWith(1, {
      actor: "ssmanji89@gmail.com",
      caseId: "case_1",
      action: "approve-draft-intent",
      artifactVersion: 2,
    });
    expect(gmail.sendDraft).toHaveBeenCalledWith("draft_1");
    expect(audit.resolveReviewHold).toHaveBeenCalledWith(
      "case_1",
      "draft_1",
      "approved",
    );
    expect(audit.recordAdminAction).toHaveBeenNthCalledWith(2, {
      actor: "ssmanji89@gmail.com",
      caseId: "case_1",
      action: "approve-draft-sent",
      artifactVersion: 2,
    });
  });

  it("rejects draft approval when the draft is not held for the case", async () => {
    const gmail = { sendDraft: vi.fn(async () => undefined) };
    const audit = {
      recordAdminAction: vi.fn(async () => undefined),
      assertHeldDraftForReview: vi.fn(async () => {
        throw new Error("Draft is not held for this case");
      }),
    };
    const app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createAdminRoutes({
        gmail,
        audit,
        authenticate: async () => "ssmanji89@gmail.com",
      }),
    );

    const response = await app.fetch(
      new Request("https://api.example/v1/admin/cases/case_1/approve-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: "draft_other" }),
      }),
      { ADMIN_EMAIL: "ssmanji89@gmail.com" } as Env,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "draft_not_held_for_case",
    });
    expect(gmail.sendDraft).not.toHaveBeenCalled();
    expect(audit.recordAdminAction).not.toHaveBeenCalled();
  });

  it("returns invalid_request for malformed JSON", async () => {
    const gmail = { sendDraft: vi.fn(async () => undefined) };
    const audit = { recordAdminAction: vi.fn(async () => undefined) };
    const app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createAdminRoutes({
        gmail,
        audit,
        authenticate: async () => "ssmanji89@gmail.com",
      }),
    );

    const response = await app.fetch(
      new Request("https://api.example/v1/admin/cases/case_1/approve-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { ADMIN_EMAIL: "ssmanji89@gmail.com" } as Env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(gmail.sendDraft).not.toHaveBeenCalled();
  });

  it("creates a private quote from the latest blueprint after admin approval", async () => {
    const quote = {
      id: "quote_1",
      publicToken: "quote_token_123",
      creditCents: 29_500,
      balanceCents: 95_500,
      expiresAt: "2026-09-11T15:30:00.000Z",
    };
    const audit = {
      recordAdminAction: vi.fn(async () => undefined),
      latestBlueprintForQuote: vi.fn(async () => ({
        version: 2,
        deliveredAt: "2026-07-13T15:30:00.000Z",
      })),
      createSessionQuote: vi.fn(async () => quote),
    };
    const app = new Hono<{ Bindings: Env }>();
    app.route(
      "/v1",
      createAdminRoutes({
        audit,
        authenticate: async () => "ssmanji89@gmail.com",
      }),
    );

    const response = await app.fetch(
      new Request(
        "https://api.example/v1/admin/cases/case_1/approve-private-quote",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationMinutes: 90, totalCents: 125_000 }),
        },
      ),
      {
        ADMIN_EMAIL: "ssmanji89@gmail.com",
        SITE_ORIGIN: "https://www.sulemanji.com",
      } as Env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      quoteUrl: "https://www.sulemanji.com/work-with-me/quote#quote_token_123",
      creditCents: 29_500,
      balanceCents: 95_500,
      expiresAt: "2026-09-11T15:30:00.000Z",
    });
    expect(audit.latestBlueprintForQuote).toHaveBeenCalledWith("case_1");
    expect(audit.createSessionQuote).toHaveBeenCalledWith({
      caseId: "case_1",
      blueprintVersion: 2,
      durationMinutes: 90,
      totalCents: 125_000,
      blueprintDeliveredAt: new Date("2026-07-13T15:30:00.000Z"),
    });
    expect(audit.recordAdminAction).toHaveBeenCalledWith({
      actor: "ssmanji89@gmail.com",
      caseId: "case_1",
      action: "approve-private-quote",
      artifactVersion: 2,
    });
  });
});
