import { beforeEach, describe, expect, it } from "vitest";
import type { IntakeInput } from "../../src/domain/case";
import { D1CaseRepository } from "../../src/repositories/cases";

const validInput: IntakeInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  contextType: "professional",
  problem:
    "I need help prioritizing a complex operating model change across multiple teams.",
  desiredOutcome: "A clear blueprint for the next operating decision.",
  priorAttempts: "",
  sanitizedLinks: ["https://example.com/context"],
  path: "normal",
  termsAccepted: true,
  turnstileToken: "token",
  website: "",
};

const consentMeta = {
  termsVersion: "2026-07-11",
  acceptedAt: "2026-07-12T00:00:00.000Z",
  evidence: { ip: "127.0.0.1" },
};

describe("D1CaseRepository", () => {
  let db: FakeD1Database;
  let repository: D1CaseRepository;

  beforeEach(async () => {
    db = new FakeD1Database();
    repository = new D1CaseRepository(db.asD1());
  });

  it("rejects invalid runtime intake input before persisting", async () => {
    const invalidInput = {
      ...validInput,
      name: "A",
    } as IntakeInput;

    await expect(
      repository.createIntake(invalidInput, consentMeta),
    ).rejects.toThrow();

    expect(db.tableCount("cases")).toBe(0);
    expect(db.tableCount("intakes")).toBe(0);
  });

  it("returns public case data for a valid public token", async () => {
    const { id, publicToken } = await repository.createIntake(
      validInput,
      consentMeta,
    );

    await expect(repository.getByPublicToken("wrong-token")).resolves.toBeNull();

    const publicCase = await repository.getByPublicToken(publicToken);
    expect(publicCase).toMatchObject({
      id,
      email: validInput.email,
      name: validInput.name,
      contextType: validInput.contextType,
      path: validInput.path,
      status: "intake_received",
      closedAt: null,
    });
    expect(publicCase?.createdAt).toEqual(expect.any(String));
    expect(publicCase?.updatedAt).toEqual(expect.any(String));
  });

  it("updates status and inserts an audit event for a valid transition", async () => {
    const { id } = await repository.createIntake(validInput, consentMeta);

    await repository.transition(
      id,
      "intake_received",
      "normal_queue",
      "case_queued",
    );

    expect(db.caseStatus(id)).toBe("normal_queue");
    expect(db.auditCount(id, "case_queued")).toBe(1);
    expect(db.auditData(id, "case_queued")).toEqual({
      from: "intake_received",
      to: "normal_queue",
    });
  });

  it("rejects invalid transitions without changing status or inserting audit", async () => {
    const { id } = await repository.createIntake(validInput, consentMeta);

    await expect(
      repository.transition(
        id,
        "intake_received",
        "session_confirmed",
        "invalid_transition",
      ),
    ).rejects.toThrow("Invalid case transition");

    expect(db.caseStatus(id)).toBe("intake_received");
    expect(db.auditCount(id, "invalid_transition")).toBe(0);
  });

  it("does not insert audit when compare-and-set transition fails", async () => {
    const { id } = await repository.createIntake(validInput, consentMeta);

    await expect(
      repository.transition(id, "normal_queue", "closed", "case_closed"),
    ).rejects.toThrow("Case transition failed");

    expect(db.caseStatus(id)).toBe("intake_received");
    expect(db.auditCount(id, "case_closed")).toBe(0);
  });

  it("rolls back the status update when audit insertion fails", async () => {
    const { id } = await repository.createIntake(validInput, consentMeta);

    await expect(
      repository.transition(
        id,
        "intake_received",
        "normal_queue",
        null as unknown as string,
      ),
    ).rejects.toThrow();

    expect(db.caseStatus(id)).toBe("intake_received");
    expect(db.tableCount("audit_events")).toBe(1);
  });
});

interface CaseRecord {
  id: string;
  public_token_hash: string;
  email: string;
  name: string;
  context_type: IntakeInput["contextType"];
  path: IntakeInput["path"];
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface IntakeRecord {
  case_id: string;
  problem: string;
  desired_outcome: string;
  prior_attempts: string;
  sanitized_links_json: string;
  redacted_at: string | null;
}

interface ConsentRecord {
  id: string;
  case_id: string;
  terms_version: string;
  accepted_at: string;
  evidence_json: string;
}

interface AuditRecord {
  id: string;
  case_id: string | null;
  event_type: string | null;
  data_json: string;
  created_at: string;
}

interface BatchContext {
  lastChanges: number;
}

class FakeD1Database {
  private cases = new Map<string, CaseRecord>();
  private intakes = new Map<string, IntakeRecord>();
  private consents = new Map<string, ConsentRecord>();
  private auditEvents: AuditRecord[] = [];

  asD1(): D1Database {
    return this as unknown as D1Database;
  }

  prepare(sql: string): FakeD1Statement {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]): Promise<D1Result[]> {
    const snapshot = this.clone();
    const context: BatchContext = { lastChanges: 0 };
    const results: D1Result[] = [];

    for (const statement of statements) {
      const result = await statement.runOn(snapshot, context);
      context.lastChanges = result.meta.changes ?? 0;
      results.push(result);
    }

    this.replaceWith(snapshot);
    return results;
  }

  tableCount(table: "cases" | "intakes" | "consents" | "audit_events"): number {
    if (table === "cases") return this.cases.size;
    if (table === "intakes") return this.intakes.size;
    if (table === "consents") return this.consents.size;
    return this.auditEvents.length;
  }

  caseStatus(id: string): string | null {
    return this.cases.get(id)?.status ?? null;
  }

  auditCount(id: string, eventType: string): number {
    return this.auditEvents.filter(
      (event) => event.case_id === id && event.event_type === eventType,
    ).length;
  }

  auditData(id: string, eventType: string): Record<string, unknown> | null {
    const event = this.auditEvents.find(
      (entry) => entry.case_id === id && entry.event_type === eventType,
    );
    return event ? JSON.parse(event.data_json) : null;
  }

  insertCase(record: CaseRecord): void {
    this.cases.set(record.id, record);
  }

  insertIntake(record: IntakeRecord): void {
    if (record.prior_attempts === undefined) {
      throw new Error("NOT NULL constraint failed: intakes.prior_attempts");
    }
    this.intakes.set(record.case_id, record);
  }

  insertConsent(record: ConsentRecord): void {
    this.consents.set(record.id, record);
  }

  insertAudit(record: AuditRecord): void {
    if (record.event_type === null) {
      throw new Error("NOT NULL constraint failed: audit_events.event_type");
    }
    this.auditEvents.push(record);
  }

  updateCaseStatus(
    id: string,
    expected: string,
    next: string,
    updatedAt: string,
    closedAt: string | null,
  ): number {
    const record = this.cases.get(id);
    if (!record || record.status !== expected) {
      return 0;
    }

    record.status = next;
    record.updated_at = updatedAt;
    record.closed_at = closedAt;
    return 1;
  }

  findCaseByPublicTokenHash(publicTokenHash: string): CaseRecord | null {
    for (const record of this.cases.values()) {
      if (record.public_token_hash === publicTokenHash) {
        return record;
      }
    }

    return null;
  }

  private clone(): FakeD1Database {
    const copy = new FakeD1Database();
    copy.cases = new Map(
      [...this.cases.entries()].map(([key, value]) => [key, { ...value }]),
    );
    copy.intakes = new Map(
      [...this.intakes.entries()].map(([key, value]) => [key, { ...value }]),
    );
    copy.consents = new Map(
      [...this.consents.entries()].map(([key, value]) => [key, { ...value }]),
    );
    copy.auditEvents = this.auditEvents.map((value) => ({ ...value }));
    return copy;
  }

  private replaceWith(snapshot: FakeD1Database): void {
    this.cases = snapshot.cases;
    this.intakes = snapshot.intakes;
    this.consents = snapshot.consents;
    this.auditEvents = snapshot.auditEvents;
  }
}

class FakeD1Statement {
  constructor(
    private readonly db: FakeD1Database,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): FakeD1Statement {
    return new FakeD1Statement(this.db, this.sql, values);
  }

  async run(): Promise<D1Result> {
    return this.runOn(this.db, { lastChanges: 0 });
  }

  async first<T>(): Promise<T | null> {
    if (this.sql.includes("WHERE public_token_hash = ?")) {
      return this.db.findCaseByPublicTokenHash(this.values[0] as string) as T;
    }

    throw new Error(`Unsupported first SQL: ${this.sql}`);
  }

  async runOn(
    db: FakeD1Database,
    context: BatchContext,
  ): Promise<D1Result> {
    if (this.sql.includes("INSERT INTO cases")) {
      db.insertCase({
        id: this.values[0] as string,
        public_token_hash: this.values[1] as string,
        email: this.values[2] as string,
        name: this.values[3] as string,
        context_type: this.values[4] as IntakeInput["contextType"],
        path: this.values[5] as IntakeInput["path"],
        status: this.values[6] as string,
        created_at: this.values[7] as string,
        updated_at: this.values[8] as string,
        closed_at: this.values[9] as string | null,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO intakes")) {
      db.insertIntake({
        case_id: this.values[0] as string,
        problem: this.values[1] as string,
        desired_outcome: this.values[2] as string,
        prior_attempts: this.values[3] as string,
        sanitized_links_json: this.values[4] as string,
        redacted_at: this.values[5] as string | null,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO consents")) {
      db.insertConsent({
        id: this.values[0] as string,
        case_id: this.values[1] as string,
        terms_version: this.values[2] as string,
        accepted_at: this.values[3] as string,
        evidence_json: this.values[4] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO audit_events")) {
      if (this.sql.includes("WHERE changes() = 1") && context.lastChanges !== 1) {
        return d1Result(0);
      }

      db.insertAudit({
        id: this.values[0] as string,
        case_id: this.values[1] as string | null,
        event_type: this.values[2] as string,
        data_json: this.values[3] as string,
        created_at: this.values[4] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("UPDATE cases")) {
      const changes = db.updateCaseStatus(
        this.values[3] as string,
        this.values[4] as string,
        this.values[0] as string,
        this.values[1] as string,
        this.values[2] as string | null,
      );
      return d1Result(changes);
    }

    throw new Error(`Unsupported run SQL: ${this.sql}`);
  }
}

const d1Result = (changes: number): D1Result =>
  ({
    success: true,
    meta: { changes },
    results: [],
  }) as unknown as D1Result;
