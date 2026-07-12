/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../src/env";

const SITE_ORIGIN = "https://www.sulemanji.com";
const testEnv = env as unknown as Env;

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  contextType: "professional",
  problem:
    "A recurring intake process is copied manually between email and a tracker.",
  desiredOutcome:
    "A reviewed workflow with explicit handoffs and approval boundaries.",
  priorAttempts: "A spreadsheet checklist.",
  sanitizedLinks: [],
  path: "normal",
  termsAccepted: true,
  turnstileToken: "test-pass",
  website: "",
};

describe("intake routes", () => {
  beforeEach(async () => {
    Object.assign(testEnv, {
      TURNSTILE_TEST_BYPASS: "test-pass",
    });
    await resetDatabase();
  });

  it("creates a normal intake and returns only the public case token and next step", async () => {
    const response = await postIntake(valid);

    expect(response.status).toBe(201);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      SITE_ORIGIN,
    );
    await expect(response.json()).resolves.toEqual({
      caseToken: expect.any(String),
      next: "normal_queue",
    });

    const caseRecord = await testEnv.DB.prepare(
      "SELECT status, path FROM cases WHERE email = ?",
    )
      .bind(valid.email)
      .first<{ status: string; path: string }>();
    expect(caseRecord).toEqual({ status: "normal_queue", path: "normal" });
  });

  it("rejects invalid intake input without persistence", async () => {
    const response = await postIntake({ ...valid, name: "A" });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "invalid_intake" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("silently accepts honeypot submissions without persistence", async () => {
    const response = await postIntake({
      ...valid,
      website: "https://spam.example",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    await expect(caseCount()).resolves.toBe(0);
  });

  it("rejects attachment-like links without persistence", async () => {
    const response = await postIntake({
      ...valid,
      sanitizedLinks: ["https://example.com/context.pdf"],
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "invalid_intake" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("rejects an unverified Turnstile token without persistence", async () => {
    const response = await postIntake({ ...valid, turnstileToken: "bad-token" });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "turnstile_failed",
    });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("does not echo arbitrary request origins in CORS responses", async () => {
    const response = await SELF.fetch("https://api.example/v1/intakes", {
      method: "OPTIONS",
      headers: {
        origin: "https://attacker.example",
        "access-control-request-method": "POST",
      },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      SITE_ORIGIN,
    );
  });

  it("rejects mutating requests from arbitrary origins without persistence", async () => {
    const response = await SELF.fetch("https://api.example/v1/intakes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(valid),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden_origin" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("rejects mutating requests without an origin header", async () => {
    const response = await SELF.fetch("https://api.example/v1/intakes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(valid),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden_origin" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("rejects oversized request bodies before persistence", async () => {
    const body = JSON.stringify({
      ...valid,
      problem: "x".repeat(20_000),
    });
    const response = await SELF.fetch("https://api.example/v1/intakes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: SITE_ORIGIN,
        "content-length": String(body.length),
      },
      body,
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "request_too_large" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("rejects oversized request bodies without relying on content length", async () => {
    const body = JSON.stringify({
      ...valid,
      problem: "x".repeat(20_000),
    });
    const response = await SELF.fetch("https://api.example/v1/intakes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: SITE_ORIGIN,
      },
      body,
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "request_too_large" });
    await expect(caseCount()).resolves.toBe(0);
  });

  it("returns only customer-safe state for a public case token", async () => {
    const created = await postIntake({ ...valid, path: "priority" });
    const { caseToken } = (await created.json()) as { caseToken: string };

    const response = await SELF.fetch(
      `https://api.example/v1/cases/${caseToken}`,
      { headers: { origin: SITE_ORIGIN } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      SITE_ORIGIN,
    );
    await expect(response.json()).resolves.toEqual({
      contextType: "professional",
      path: "priority",
      status: "checkout_pending",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      closedAt: null,
    });
  });
});

const postIntake = (body: unknown): Promise<Response> =>
  SELF.fetch("https://api.example/v1/intakes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: SITE_ORIGIN,
    },
    body: JSON.stringify(body),
  });

const caseCount = async (): Promise<number> => {
  const result = await testEnv.DB.prepare("SELECT COUNT(*) AS count FROM cases").first<{
    count: number;
  }>();
  return result?.count ?? 0;
};

const resetDatabase = async (): Promise<void> => {
  for (const statement of schemaStatements) {
    await testEnv.DB.prepare(statement).run();
  }
};

const schemaStatements = [
  "DROP TABLE IF EXISTS audit_events",
  "DROP TABLE IF EXISTS consents",
  "DROP TABLE IF EXISTS intakes",
  "DROP TABLE IF EXISTS cases",
  `CREATE TABLE cases (
      id TEXT PRIMARY KEY,
      public_token_hash TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      context_type TEXT NOT NULL,
      path TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT
    )`,
  `CREATE TABLE intakes (
      case_id TEXT PRIMARY KEY REFERENCES cases(id),
      problem TEXT NOT NULL,
      desired_outcome TEXT NOT NULL,
      prior_attempts TEXT NOT NULL,
      sanitized_links_json TEXT NOT NULL,
      redacted_at TEXT
    )`,
  `CREATE TABLE consents (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id),
      terms_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      evidence_json TEXT NOT NULL
    )`,
  `CREATE TABLE audit_events (
      id TEXT PRIMARY KEY,
      case_id TEXT,
      event_type TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  "CREATE INDEX cases_email_created_idx ON cases(email, created_at)",
  "CREATE INDEX cases_status_idx ON cases(status)",
];
