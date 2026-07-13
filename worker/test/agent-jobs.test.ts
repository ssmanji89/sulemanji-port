/// <reference types="@cloudflare/vitest-pool-workers/types" />

import {
  applyD1Migrations,
  env,
  type D1Migration,
} from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migration0001 from "../migrations/0001_cases.sql?raw";
import migration0002 from "../migrations/0002_priority_discovery.sql?raw";
import migration0007 from "../migrations/0007_agent_jobs.sql?raw";
import { D1CaseRepository } from "../src/repositories/cases";

const db = (env as unknown as { DB: D1Database }).DB;

describe("local agent job persistence", () => {
  let repository: D1CaseRepository;

  beforeEach(async () => {
    await resetMigrations();
    await applyD1Migrations(db, await loadMigrations(), "test_d1_migrations");
    repository = new D1CaseRepository(db);
    await seedCase("case_1");
  });

  it("enqueues and claims the oldest pending local agent decision job", async () => {
    await repository.enqueueAgentDecisionJob({
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      input: agentInput("case_1", "The request starts in a shared inbox."),
    });

    const claimed = await repository.claimNextAgentJob();

    expect(claimed).toMatchObject({
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      input: expect.objectContaining({
        caseId: "case_1",
        latestMessage: "The request starts in a shared inbox.",
      }),
    });
    expect(claimed?.id).toEqual(expect.any(String));
    expect(claimed?.claimedAt).toEqual(expect.any(String));
    await expect(repository.claimNextAgentJob()).resolves.toBeNull();
  });

  it("treats repeated enqueue for the same message as the same job", async () => {
    const first = await repository.enqueueAgentDecisionJob({
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      input: agentInput("case_1", "First customer reply."),
    });
    const second = await repository.enqueueAgentDecisionJob({
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      input: agentInput("case_1", "First customer reply."),
    });

    expect(second.id).toBe(first.id);

    const row = await db
      .prepare("SELECT COUNT(*) AS count FROM agent_jobs")
      .first<{ count: number }>();
    expect(row?.count).toBe(1);
  });

  it("completes a claimed job with a schema-valid agent decision", async () => {
    const job = await repository.enqueueAgentDecisionJob({
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      input: agentInput("case_1", "First customer reply."),
    });
    await repository.claimNextAgentJob();

    const completed = await repository.completeAgentJob(job.id, {
      kind: "question",
      topic: "handoff",
      message: "Who owns the first handoff after the shared inbox?",
    });

    expect(completed).toMatchObject({
      id: job.id,
      caseId: "case_1",
      workflowId: "workflow_1",
      sourceMessageId: "msg_1",
      decision: {
        kind: "question",
        topic: "handoff",
        message: "Who owns the first handoff after the shared inbox?",
      },
    });
  });
});

const agentInput = (caseId: string, latestMessage: string) => ({
  caseId,
  launchReviewRequired: true,
  intake: {
    contextType: "professional" as const,
    workshopCategory: "ai_business_operations" as const,
    problem: "I need help prioritizing a messy intake workflow across teams.",
    desiredOutcome: "A practical automation blueprint and session agenda.",
    priorAttempts: "",
    sanitizedLinks: [],
  },
  state: { knownFacts: [], openQuestions: [] },
  latestMessage,
});

const loadMigrations = async (): Promise<D1Migration[]> =>
  [
    migration("0001_cases.sql", migration0001),
    migration("0002_priority_discovery.sql", migration0002),
    migration("0007_agent_jobs.sql", migration0007),
  ];

const migration = (name: string, text: string): D1Migration => ({
  name,
  queries: splitSql(text),
});

const splitSql = (text: string): string[] => {
  const queries: string[] = [];
  let current = "";
  let inTrigger = false;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^CREATE\s+TRIGGER\b/i.test(trimmed)) {
      inTrigger = true;
    }

    current += `${line}\n`;

    if (inTrigger) {
      if (/^END;$/i.test(trimmed)) {
        queries.push(current.trim());
        current = "";
        inTrigger = false;
      }
      continue;
    }

    if (trimmed.endsWith(";")) {
      queries.push(current.trim().slice(0, -1).trim());
      current = "";
    }
  }

  if (current.trim()) queries.push(current.trim());
  return queries;
};

const resetMigrations = async (): Promise<void> => {
  for (const table of [
    "test_d1_migrations",
    "agent_jobs",
    "offer_counters",
    "workflow_events",
    "risk_decisions",
    "artifacts",
    "discovery_state",
    "gmail_threads",
    "credits",
    "payments",
    "audit_events",
    "consents",
    "intakes",
    "cases",
  ]) {
    await db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
};

const seedCase = async (id: string): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO cases (
        id, public_token_hash, email, name, context_type, path, status,
        created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      `hash_${id}`,
      `${id}@example.com`,
      `Case ${id}`,
      "professional",
      "priority",
      "discovery_active",
      "2026-07-12T00:00:00.000Z",
      "2026-07-12T00:00:00.000Z",
      null,
    )
    .run();
};
