import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";
import { createReadinessRoutes } from "../src/routes/readiness";
import { scheduledTaskFor } from "../src/index";

describe("worker readiness", () => {
  it("reports setup mode and missing bindings without exposing values", async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.route("/v1", createReadinessRoutes());

    const response = await app.fetch(
      new Request("https://api.example/v1/readiness"),
      {
        SERVICE_MODE: "setup",
        SITE_ORIGIN: "https://www.sulemanji.com",
      } as Env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: "setup",
      ready: false,
      missing: expect.arrayContaining([
        "TURNSTILE_SECRET",
        "STRIPE_SECRET_KEY",
        "GMAIL_CLIENT_ID",
        "OPENAI_API_KEY",
        "ACCESS_AUD",
      ]),
    });
  });

  it("marks the service ready only in live mode with required bindings present", async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.route("/v1", createReadinessRoutes());

    const response = await app.fetch(
      new Request("https://api.example/v1/readiness"),
      completeEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: "live",
      ready: true,
      missing: [],
    });
  });

  it("does not run scheduled jobs until the service is live and configured", () => {
    const event = { cron: "*/2 * * * *" } as ScheduledController;
    const task = scheduledTaskFor(event, {
      SERVICE_MODE: "setup",
    } as Env);

    expect(task).toBeNull();
  });

  it("chooses scheduled work after live readiness passes", async () => {
    const task = scheduledTaskFor(
      { cron: "0 13 * * *" } as ScheduledController,
      completeEnv({
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn(async () => ({ count: 0 })),
            })),
          })),
        } as unknown as D1Database,
      }),
    );

    await expect(task).resolves.toMatchObject({
      heldReviews: 0,
      normalQueue: 0,
    });
  });
});

const completeEnv = (overrides: Partial<Env> = {}): Env =>
  ({
    SERVICE_MODE: "live",
    TURNSTILE_SECRET: "present",
    STRIPE_SECRET_KEY: "present",
    STRIPE_WEBHOOK_SECRET: "present",
    GMAIL_CLIENT_ID: "present",
    GMAIL_CLIENT_SECRET: "present",
    GMAIL_REFRESH_TOKEN: "present",
    GMAIL_SENDER: "present",
    GMAIL_CLINIC_LABEL: "present",
    GOOGLE_CALENDAR_CLIENT_ID: "present",
    GOOGLE_CALENDAR_CLIENT_SECRET: "present",
    GOOGLE_CALENDAR_REFRESH_TOKEN: "present",
    OPENAI_API_KEY: "present",
    ACCESS_TEAM_DOMAIN: "present",
    ACCESS_AUD: "present",
    ADMIN_EMAIL: "present",
    SITE_ORIGIN: "https://www.sulemanji.com",
    TERMS_VERSION: "2026-07-11",
    PRIORITY_DEPOSIT_CENTS: "29500",
    MANDATORY_REVIEW_CASE_LIMIT: "10",
    GOOGLE_CALENDAR_ID: "primary",
    AGENT_MODEL: "gpt-5.4-mini",
    ...overrides,
  }) as Env;
