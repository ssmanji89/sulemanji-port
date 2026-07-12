import { beforeEach, describe, expect, it } from "vitest";
import { D1CaseRepository, type DiscoveryState } from "../src/repositories/cases";

describe("D1CaseRepository priority discovery persistence", () => {
  let db: DiscoveryFakeD1Database;
  let repository: D1CaseRepository;

  beforeEach(() => {
    db = new DiscoveryFakeD1Database();
    repository = new D1CaseRepository(db.asD1());
  });

  it("deduplicates Stripe events by event id", async () => {
    await expect(
      repository.recordStripeEvent("evt_123", "case_1", "checkout.session.completed"),
    ).resolves.toBe("new");

    await expect(
      repository.recordStripeEvent("evt_123", "case_1", "checkout.session.completed"),
    ).resolves.toBe("duplicate");

    expect(db.paymentEvents("evt_123")).toHaveLength(1);
  });

  it("records deposit credit idempotently for a repeated Stripe payment", async () => {
    await repository.markDepositPaid("case_1", "cs_123", "pi_123", 7_500);
    await repository.markDepositPaid("case_1", "cs_123", "pi_123", 7_500);

    await expect(
      repository.markDepositPaid("case_2", "cs_123", "pi_456", 7_500),
    ).rejects.toThrow("Conflicting deposit payment");
    await expect(
      repository.markDepositPaid("case_2", "cs_456", "pi_123", 7_500),
    ).rejects.toThrow("Conflicting deposit payment");

    expect(db.credits()).toEqual([
      expect.objectContaining({
        case_id: "case_1",
        stripe_checkout_session_id: "cs_123",
        stripe_payment_intent_id: "pi_123",
        cents: 7_500,
      }),
    ]);
  });

  it("starts delivery with exactly one Gmail thread per case", async () => {
    await repository.startDelivery("case_1", "thread_1", "workflow_1");

    await expect(
      repository.startDelivery("case_1", "thread_2", "workflow_2"),
    ).rejects.toThrow("Conflicting delivery start");

    expect(db.gmailThreads()).toEqual([
      expect.objectContaining({
        case_id: "case_1",
        gmail_thread_id: "thread_1",
      }),
    ]);
  });

  it("allows a Workflow id to be active for only one case", async () => {
    await repository.startDelivery("case_1", "thread_1", "workflow_1");

    await expect(
      repository.startDelivery("case_2", "thread_2", "workflow_1"),
    ).rejects.toThrow("Conflicting delivery start");

    expect(db.discoveryState("case_2")).toBeNull();
  });

  it("does not mutate consent evidence when discovery state changes", async () => {
    db.insertConsent({
      id: "consent_1",
      case_id: "case_1",
      terms_version: "2026-07-12",
      accepted_at: "2026-07-12T00:00:00.000Z",
      evidence_json: JSON.stringify({ ip: "127.0.0.1", ua: "test" }),
    });

    const state: DiscoveryState = {
      status: "collecting_context",
      workflowId: "workflow_1",
      gmailThreadId: "thread_1",
      mandatoryReview: { held: false, reasons: [] },
    };

    await repository.saveDiscoveryState("case_1", state);

    expect(db.consentEvidence("case_1")).toEqual({
      ip: "127.0.0.1",
      ua: "test",
    });
    expect(db.discoveryState("case_1")?.state_json).toBe(JSON.stringify(state));
  });

  it("stores artifacts with monotonic versions per case and type", async () => {
    await expect(
      repository.saveArtifact("case_1", "checkpoint", { summary: "first" }),
    ).resolves.toBe(1);
    await expect(
      repository.saveArtifact("case_1", "checkpoint", { summary: "second" }),
    ).resolves.toBe(2);
    await expect(
      repository.saveArtifact("case_1", "blueprint", { summary: "final" }),
    ).resolves.toBe(1);

    expect(db.artifacts("case_1", "checkpoint")).toEqual([
      expect.objectContaining({ version: 1, body_json: '{"summary":"first"}' }),
      expect.objectContaining({ version: 2, body_json: '{"summary":"second"}' }),
    ]);
  });

  it("tracks mandatory-review holds atomically", async () => {
    await repository.startDelivery("case_1", "thread_1", "workflow_1");
    const stateBeforeFailedHold = db.discoveryState("case_1");
    db.failNextRiskDecision();

    await expect(
      repository.holdForReview("case_1", ["payment_mismatch"], "draft_1"),
    ).rejects.toThrow("forced risk decision failure");

    expect(db.riskDecisions("case_1")).toHaveLength(0);
    expect(db.discoveryState("case_1")).toEqual(stateBeforeFailedHold);

    await repository.holdForReview("case_1", ["payment_mismatch"], "draft_1");

    expect(db.riskDecisions("case_1")).toEqual([
      expect.objectContaining({
        case_id: "case_1",
        reasons_json: '["payment_mismatch"]',
        draft_id: "draft_1",
        status: "held",
      }),
    ]);
    expect(db.discoveryState("case_1")).toEqual(
      expect.objectContaining({
        workflow_id: "workflow_1",
        gmail_thread_id: "thread_1",
        mandatory_review_held: 1,
        mandatory_review_reasons_json: '["payment_mismatch"]',
        mandatory_review_draft_id: "draft_1",
      }),
    );
  });
});

interface PaymentRecord {
  id: string;
  stripe_event_id: string;
  case_id: string;
  type: string;
  processed_at: string;
}

interface CreditRecord {
  id: string;
  case_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string;
  cents: number;
  created_at: string;
}

interface GmailThreadRecord {
  case_id: string;
  gmail_thread_id: string;
  created_at: string;
}

interface DiscoveryStateRecord {
  case_id: string;
  workflow_id: string | null;
  gmail_thread_id: string | null;
  state_json: string;
  mandatory_review_held: number;
  mandatory_review_reasons_json: string | null;
  mandatory_review_draft_id: string | null;
  mandatory_review_held_at: string | null;
  updated_at: string;
}

interface ArtifactRecord {
  id: string;
  case_id: string;
  artifact_type: string;
  version: number;
  body_json: string;
  created_at: string;
}

interface RiskDecisionRecord {
  id: string;
  case_id: string;
  reasons_json: string;
  draft_id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface ConsentRecord {
  id: string;
  case_id: string;
  terms_version: string;
  accepted_at: string;
  evidence_json: string;
}

class DiscoveryFakeD1Database {
  private payments: PaymentRecord[] = [];
  private creditsById = new Map<string, CreditRecord>();
  private gmailThreadsByCase = new Map<string, GmailThreadRecord>();
  private discoveryStatesByCase = new Map<string, DiscoveryStateRecord>();
  private artifactRows: ArtifactRecord[] = [];
  private riskDecisionRows: RiskDecisionRecord[] = [];
  private consentsByCase = new Map<string, ConsentRecord>();
  private riskDecisionFailure = false;

  asD1(): D1Database {
    return this as unknown as D1Database;
  }

  prepare(sql: string): DiscoveryFakeD1Statement {
    return new DiscoveryFakeD1Statement(this, sql);
  }

  async batch(statements: DiscoveryFakeD1Statement[]): Promise<D1Result[]> {
    const snapshot = this.clone();
    const results: D1Result[] = [];

    try {
      for (const statement of statements) {
        results.push(await statement.runOn(snapshot));
      }
    } catch (error) {
      this.riskDecisionFailure = snapshot.riskDecisionFailure;
      throw error;
    }

    this.replaceWith(snapshot);
    return results;
  }

  paymentEvents(eventId: string): PaymentRecord[] {
    return this.payments.filter((payment) => payment.stripe_event_id === eventId);
  }

  credits(): CreditRecord[] {
    return [...this.creditsById.values()];
  }

  findCredit(
    stripeCheckoutSessionId: string,
    stripePaymentIntentId: string,
  ): CreditRecord | null {
    return (
      [...this.creditsById.values()].find(
        (credit) =>
          credit.stripe_checkout_session_id === stripeCheckoutSessionId ||
          credit.stripe_payment_intent_id === stripePaymentIntentId,
      ) ?? null
    );
  }

  gmailThreads(): GmailThreadRecord[] {
    return [...this.gmailThreadsByCase.values()];
  }

  discoveryState(caseId: string): DiscoveryStateRecord | null {
    return this.discoveryStatesByCase.get(caseId) ?? null;
  }

  findDeliveryByCase(caseId: string): {
    case_id: string;
    gmail_thread_id: string | null;
    workflow_id: string | null;
  } | null {
    const thread = this.gmailThreadsByCase.get(caseId);
    if (!thread) return null;
    return {
      case_id: caseId,
      gmail_thread_id: thread.gmail_thread_id,
      workflow_id: this.discoveryStatesByCase.get(caseId)?.workflow_id ?? null,
    };
  }

  findDeliveryByThread(gmailThreadId: string): {
    case_id: string;
    gmail_thread_id: string | null;
    workflow_id: string | null;
  } | null {
    const thread = [...this.gmailThreadsByCase.values()].find(
      (record) => record.gmail_thread_id === gmailThreadId,
    );
    return thread ? this.findDeliveryByCase(thread.case_id) : null;
  }

  findDeliveryByWorkflow(workflowId: string): {
    case_id: string;
    gmail_thread_id: string | null;
    workflow_id: string | null;
  } | null {
    const state = [...this.discoveryStatesByCase.values()].find(
      (record) => record.workflow_id === workflowId,
    );
    return state
      ? {
          case_id: state.case_id,
          gmail_thread_id: state.gmail_thread_id,
          workflow_id: state.workflow_id,
        }
      : null;
  }

  artifacts(caseId: string, artifactType: string): ArtifactRecord[] {
    return this.artifactRows.filter(
      (artifact) =>
        artifact.case_id === caseId && artifact.artifact_type === artifactType,
    );
  }

  riskDecisions(caseId: string): RiskDecisionRecord[] {
    return this.riskDecisionRows.filter((decision) => decision.case_id === caseId);
  }

  findRiskDecision(
    caseId: string,
    draftId: string,
  ): Pick<RiskDecisionRecord, "reasons_json" | "draft_id" | "status"> | null {
    const decision = this.riskDecisionRows.find(
      (record) => record.case_id === caseId && record.draft_id === draftId,
    );
    return decision
      ? {
          reasons_json: decision.reasons_json,
          draft_id: decision.draft_id,
          status: decision.status,
        }
      : null;
  }

  insertConsent(record: ConsentRecord): void {
    this.consentsByCase.set(record.case_id, record);
  }

  consentEvidence(caseId: string): Record<string, unknown> | null {
    const consent = this.consentsByCase.get(caseId);
    return consent ? JSON.parse(consent.evidence_json) : null;
  }

  failNextRiskDecision(): void {
    this.riskDecisionFailure = true;
  }

  insertStripeEvent(record: PaymentRecord): void {
    if (
      this.payments.some(
        (payment) => payment.stripe_event_id === record.stripe_event_id,
      )
    ) {
      throw new Error("UNIQUE constraint failed: payments.stripe_event_id");
    }

    this.payments.push(record);
  }

  insertCredit(record: CreditRecord): void {
    if (
      [...this.creditsById.values()].some(
        (credit) =>
          credit.stripe_checkout_session_id ===
          record.stripe_checkout_session_id,
      )
    ) {
      throw new Error("UNIQUE constraint failed: credits.stripe_checkout_session_id");
    }

    if (
      [...this.creditsById.values()].some(
        (credit) =>
          credit.stripe_payment_intent_id === record.stripe_payment_intent_id,
      )
    ) {
      throw new Error("UNIQUE constraint failed: credits.stripe_payment_intent_id");
    }

    this.creditsById.set(record.id, record);
  }

  insertGmailThread(record: GmailThreadRecord): void {
    if (this.gmailThreadsByCase.has(record.case_id)) {
      throw new Error("UNIQUE constraint failed: gmail_threads.case_id");
    }

    if (
      [...this.gmailThreadsByCase.values()].some(
        (thread) => thread.gmail_thread_id === record.gmail_thread_id,
      )
    ) {
      throw new Error("UNIQUE constraint failed: gmail_threads.gmail_thread_id");
    }

    this.gmailThreadsByCase.set(record.case_id, record);
  }

  upsertDiscoveryState(record: DiscoveryStateRecord): void {
    const existing = this.discoveryStatesByCase.get(record.case_id);
    const workflowId = record.workflow_id ?? existing?.workflow_id ?? null;
    const gmailThreadId =
      record.gmail_thread_id ?? existing?.gmail_thread_id ?? null;

    if (
      workflowId &&
      [...this.discoveryStatesByCase.values()].some(
        (state) =>
          state.case_id !== record.case_id &&
          state.workflow_id === workflowId,
      )
    ) {
      throw new Error("UNIQUE constraint failed: discovery_state.workflow_id");
    }

    this.discoveryStatesByCase.set(record.case_id, {
      ...record,
      workflow_id: workflowId,
      gmail_thread_id: gmailThreadId,
    });
  }

  nextArtifactVersion(caseId: string, artifactType: string): number {
    const versions = this.artifactRows
      .filter(
        (artifact) =>
          artifact.case_id === caseId && artifact.artifact_type === artifactType,
      )
      .map((artifact) => artifact.version);

    return Math.max(0, ...versions) + 1;
  }

  insertArtifact(record: ArtifactRecord): void {
    if (
      this.artifactRows.some(
        (artifact) =>
          artifact.case_id === record.case_id &&
          artifact.artifact_type === record.artifact_type &&
          artifact.version === record.version,
      )
    ) {
      throw new Error(
        "UNIQUE constraint failed: artifacts.case_id, artifacts.artifact_type, artifacts.version",
      );
    }

    this.artifactRows.push(record);
  }

  insertRiskDecision(record: RiskDecisionRecord): void {
    if (this.riskDecisionFailure) {
      this.riskDecisionFailure = false;
      throw new Error("forced risk decision failure");
    }

    if (
      this.riskDecisionRows.some(
        (decision) =>
          decision.case_id === record.case_id &&
          decision.draft_id === record.draft_id,
      )
    ) {
      throw new Error("UNIQUE constraint failed: risk_decisions.case_id, risk_decisions.draft_id");
    }

    this.riskDecisionRows.push(record);
  }

  private clone(): DiscoveryFakeD1Database {
    const copy = new DiscoveryFakeD1Database();
    copy.payments = this.payments.map((record) => ({ ...record }));
    copy.creditsById = new Map(
      [...this.creditsById.entries()].map(([key, value]) => [
        key,
        { ...value },
      ]),
    );
    copy.gmailThreadsByCase = new Map(
      [...this.gmailThreadsByCase.entries()].map(([key, value]) => [
        key,
        { ...value },
      ]),
    );
    copy.discoveryStatesByCase = new Map(
      [...this.discoveryStatesByCase.entries()].map(([key, value]) => [
        key,
        { ...value },
      ]),
    );
    copy.artifactRows = this.artifactRows.map((record) => ({ ...record }));
    copy.riskDecisionRows = this.riskDecisionRows.map((record) => ({
      ...record,
    }));
    copy.consentsByCase = new Map(
      [...this.consentsByCase.entries()].map(([key, value]) => [
        key,
        { ...value },
      ]),
    );
    copy.riskDecisionFailure = this.riskDecisionFailure;
    return copy;
  }

  private replaceWith(snapshot: DiscoveryFakeD1Database): void {
    this.payments = snapshot.payments;
    this.creditsById = snapshot.creditsById;
    this.gmailThreadsByCase = snapshot.gmailThreadsByCase;
    this.discoveryStatesByCase = snapshot.discoveryStatesByCase;
    this.artifactRows = snapshot.artifactRows;
    this.riskDecisionRows = snapshot.riskDecisionRows;
    this.consentsByCase = snapshot.consentsByCase;
    this.riskDecisionFailure = snapshot.riskDecisionFailure;
  }
}

class DiscoveryFakeD1Statement {
  constructor(
    private readonly db: DiscoveryFakeD1Database,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): DiscoveryFakeD1Statement {
    return new DiscoveryFakeD1Statement(this.db, this.sql, values);
  }

  async run(): Promise<D1Result> {
    return this.runOn(this.db);
  }

  async first<T>(): Promise<T | null> {
    if (this.sql.includes("INSERT INTO artifacts")) {
      const caseId = this.values[1] as string;
      const artifactType = this.values[2] as string;
      const version = this.db.nextArtifactVersion(caseId, artifactType);

      this.db.insertArtifact({
        id: this.values[0] as string,
        case_id: caseId,
        artifact_type: artifactType,
        version,
        body_json: this.values[5] as string,
        created_at: this.values[6] as string,
      });

      return { version } as T;
    }

    if (this.sql.includes("FROM credits")) {
      return this.db.findCredit(
        this.values[0] as string,
        this.values[1] as string,
      ) as T | null;
    }

    if (
      this.sql.includes("FROM gmail_threads") &&
      this.sql.includes("WHERE gmail_threads.case_id = ?")
    ) {
      return this.db.findDeliveryByCase(this.values[0] as string) as T | null;
    }

    if (
      this.sql.includes("FROM gmail_threads") &&
      this.sql.includes("WHERE gmail_threads.gmail_thread_id = ?")
    ) {
      return this.db.findDeliveryByThread(this.values[0] as string) as T | null;
    }

    if (this.sql.includes("FROM discovery_state")) {
      return this.db.findDeliveryByWorkflow(this.values[0] as string) as T | null;
    }

    if (this.sql.includes("FROM risk_decisions")) {
      return this.db.findRiskDecision(
        this.values[0] as string,
        this.values[1] as string,
      ) as T | null;
    }

    throw new Error(`Unsupported first SQL: ${this.sql}`);
  }

  async runOn(db: DiscoveryFakeD1Database): Promise<D1Result> {
    if (this.sql.includes("INSERT INTO payments")) {
      db.insertStripeEvent({
        id: this.values[0] as string,
        stripe_event_id: this.values[1] as string,
        case_id: this.values[2] as string,
        type: this.values[3] as string,
        processed_at: this.values[4] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO credits")) {
      db.insertCredit({
        id: this.values[0] as string,
        case_id: this.values[1] as string,
        stripe_checkout_session_id: this.values[2] as string,
        stripe_payment_intent_id: this.values[3] as string,
        cents: this.values[4] as number,
        created_at: this.values[5] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO gmail_threads")) {
      db.insertGmailThread({
        case_id: this.values[0] as string,
        gmail_thread_id: this.values[1] as string,
        created_at: this.values[2] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO discovery_state")) {
      db.upsertDiscoveryState({
        case_id: this.values[0] as string,
        workflow_id: this.values[1] as string | null,
        gmail_thread_id: this.values[2] as string | null,
        state_json: this.values[3] as string,
        mandatory_review_held: this.values[4] as number,
        mandatory_review_reasons_json: this.values[5] as string | null,
        mandatory_review_draft_id: this.values[6] as string | null,
        mandatory_review_held_at: this.values[7] as string | null,
        updated_at: this.values[8] as string,
      });
      return d1Result(1);
    }

    if (this.sql.includes("INSERT INTO risk_decisions")) {
      db.insertRiskDecision({
        id: this.values[0] as string,
        case_id: this.values[1] as string,
        reasons_json: this.values[2] as string,
        draft_id: this.values[3] as string,
        status: this.values[4] as string,
        created_at: this.values[5] as string,
        resolved_at: this.values[6] as string | null,
      });
      return d1Result(1);
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
