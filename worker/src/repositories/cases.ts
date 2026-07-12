import { IntakeInput, type CaseStatus } from "../domain/case";
import { canTransition } from "../domain/state-machine";

export interface ConsentMeta {
  termsVersion: string;
  acceptedAt: string;
  evidence: Record<string, unknown>;
}

export interface PublicCase {
  id: string;
  email: string;
  name: string;
  contextType: IntakeInput["contextType"];
  path: IntakeInput["path"];
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export type ArtifactType = "checkpoint" | "blueprint";

export interface DiscoveryState {
  status: string;
  workflowId?: string | null;
  gmailThreadId?: string | null;
  mandatoryReview?: {
    held: boolean;
    reasons: string[];
    draftId?: string | null;
    heldAt?: string | null;
  };
  [key: string]: unknown;
}

export interface CaseRepository {
  createIntake(
    input: IntakeInput,
    meta: ConsentMeta,
  ): Promise<{ id: string; publicToken: string }>;
  createIntakeInStatus(
    input: IntakeInput,
    meta: ConsentMeta,
    next: CaseStatus,
    event: string,
  ): Promise<{ id: string; publicToken: string }>;
  getByPublicToken(token: string): Promise<PublicCase | null>;
  transition(
    id: string,
    expected: CaseStatus,
    next: CaseStatus,
    event: string,
  ): Promise<void>;
  recordStripeEvent(
    eventId: string,
    caseId: string,
    type: string,
  ): Promise<"new" | "duplicate">;
  markDepositPaid(
    caseId: string,
    sessionId: string,
    paymentIntentId: string,
    cents: number,
  ): Promise<void>;
  startDelivery(
    caseId: string,
    gmailThreadId: string,
    workflowId: string,
  ): Promise<void>;
  saveDiscoveryState(caseId: string, state: DiscoveryState): Promise<void>;
  saveArtifact(caseId: string, type: ArtifactType, body: unknown): Promise<number>;
  holdForReview(
    caseId: string,
    reasons: string[],
    draftId: string,
  ): Promise<void>;
}

interface CaseRow {
  id: string;
  email: string;
  name: string;
  context_type: IntakeInput["contextType"];
  path: IntakeInput["path"];
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface CreditRow {
  case_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string;
  cents: number;
}

interface DeliveryRow {
  case_id: string;
  gmail_thread_id: string | null;
  workflow_id: string | null;
}

interface RiskDecisionRow {
  reasons_json: string;
  draft_id: string;
  status: string;
}

export class D1CaseRepository implements CaseRepository {
  constructor(private readonly db: D1Database) {}

  async createIntake(
    input: IntakeInput,
    meta: ConsentMeta,
  ): Promise<{ id: string; publicToken: string }> {
    const parsedInput = IntakeInput.parse(input);
    const id = crypto.randomUUID();
    const consentId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    const publicToken = randomToken();
    const publicTokenHash = await sha256(publicToken);
    const now = new Date().toISOString();
    const status: CaseStatus = "intake_received";

    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO cases (
            id, public_token_hash, email, name, context_type, path, status,
            created_at, updated_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          publicTokenHash,
          parsedInput.email,
          parsedInput.name,
          parsedInput.contextType,
          parsedInput.path,
          status,
          now,
          now,
          null,
        ),
      this.db
        .prepare(
          `INSERT INTO intakes (
            case_id, problem, desired_outcome, prior_attempts,
            sanitized_links_json, redacted_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          parsedInput.problem,
          parsedInput.desiredOutcome,
          parsedInput.priorAttempts,
          JSON.stringify(parsedInput.sanitizedLinks),
          null,
        ),
      this.db
        .prepare(
          `INSERT INTO consents (
            id, case_id, terms_version, accepted_at, evidence_json
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          consentId,
          id,
          meta.termsVersion,
          meta.acceptedAt,
          JSON.stringify(meta.evidence),
        ),
      this.db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          auditId,
          id,
          "intake_created",
          JSON.stringify({ path: parsedInput.path, status }),
          now,
        ),
    ]);

    return { id, publicToken };
  }

  async createIntakeInStatus(
    input: IntakeInput,
    meta: ConsentMeta,
    next: CaseStatus,
    event: string,
  ): Promise<{ id: string; publicToken: string }> {
    if (!canTransition("intake_received", next)) {
      throw new Error(`Invalid case transition: intake_received to ${next}`);
    }

    const parsedInput = IntakeInput.parse(input);
    const id = crypto.randomUUID();
    const consentId = crypto.randomUUID();
    const intakeAuditId = crypto.randomUUID();
    const transitionAuditId = crypto.randomUUID();
    const publicToken = randomToken();
    const publicTokenHash = await sha256(publicToken);
    const now = new Date().toISOString();

    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO cases (
            id, public_token_hash, email, name, context_type, path, status,
            created_at, updated_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          publicTokenHash,
          parsedInput.email,
          parsedInput.name,
          parsedInput.contextType,
          parsedInput.path,
          next,
          now,
          now,
          null,
        ),
      this.db
        .prepare(
          `INSERT INTO intakes (
            case_id, problem, desired_outcome, prior_attempts,
            sanitized_links_json, redacted_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          parsedInput.problem,
          parsedInput.desiredOutcome,
          parsedInput.priorAttempts,
          JSON.stringify(parsedInput.sanitizedLinks),
          null,
        ),
      this.db
        .prepare(
          `INSERT INTO consents (
            id, case_id, terms_version, accepted_at, evidence_json
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          consentId,
          id,
          meta.termsVersion,
          meta.acceptedAt,
          JSON.stringify(meta.evidence),
        ),
      this.db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          intakeAuditId,
          id,
          "intake_created",
          JSON.stringify({ path: parsedInput.path, status: "intake_received" }),
          now,
        ),
      this.db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          transitionAuditId,
          id,
          event,
          JSON.stringify({ from: "intake_received", to: next }),
          now,
        ),
    ]);

    return { id, publicToken };
  }

  async getByPublicToken(token: string): Promise<PublicCase | null> {
    const publicTokenHash = await sha256(token);
    const row = await this.db
      .prepare(
        `SELECT id, email, name, context_type, path, status, created_at,
          updated_at, closed_at
        FROM cases
        WHERE public_token_hash = ?`,
      )
      .bind(publicTokenHash)
      .first<CaseRow>();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      contextType: row.context_type,
      path: row.path,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    };
  }

  async transition(
    id: string,
    expected: CaseStatus,
    next: CaseStatus,
    event: string,
  ): Promise<void> {
    if (!canTransition(expected, next)) {
      throw new Error(`Invalid case transition: ${expected} to ${next}`);
    }

    const now = new Date().toISOString();
    const [transitionResult, auditResult] = await this.db.batch([
      this.db
        .prepare(
          `UPDATE cases
          SET status = ?, updated_at = ?, closed_at = ?
          WHERE id = ? AND status = ?`,
        )
        .bind(next, now, next === "closed" ? now : null, id, expected),
      this.db
        .prepare(
          `INSERT INTO audit_events (
            id, case_id, event_type, data_json, created_at
          )
          SELECT ?, ?, ?, ?, ?
          WHERE changes() = 1`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          event,
          JSON.stringify({ from: expected, to: next }),
          now,
        ),
    ]);

    if (
      transitionResult?.meta.changes !== 1 ||
      auditResult?.meta.changes !== 1
    ) {
      throw new Error("Case transition failed");
    }
  }

  async recordStripeEvent(
    eventId: string,
    caseId: string,
    type: string,
  ): Promise<"new" | "duplicate"> {
    try {
      await this.db
        .prepare(
          `INSERT INTO payments (
            id, stripe_event_id, case_id, type, processed_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), eventId, caseId, type, new Date().toISOString())
        .run();

      return "new";
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return "duplicate";
      }

      throw error;
    }
  }

  async markDepositPaid(
    caseId: string,
    sessionId: string,
    paymentIntentId: string,
    cents: number,
  ): Promise<void> {
    const existing = await this.db
      .prepare(
        `SELECT case_id, stripe_checkout_session_id, stripe_payment_intent_id,
          cents
        FROM credits
        WHERE stripe_checkout_session_id = ? OR stripe_payment_intent_id = ?
        LIMIT 1`,
      )
      .bind(sessionId, paymentIntentId)
      .first<CreditRow>();

    if (existing) {
      if (
        existing.case_id === caseId &&
        existing.stripe_checkout_session_id === sessionId &&
        existing.stripe_payment_intent_id === paymentIntentId &&
        existing.cents === cents
      ) {
        return;
      }

      throw new Error("Conflicting deposit payment");
    }

    await this.db
      .prepare(
        `INSERT INTO credits (
          id, case_id, stripe_checkout_session_id, stripe_payment_intent_id,
          cents, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        caseId,
        sessionId,
        paymentIntentId,
        cents,
        new Date().toISOString(),
      )
      .run();
  }

  async startDelivery(
    caseId: string,
    gmailThreadId: string,
    workflowId: string,
  ): Promise<void> {
    await this.ensureDeliveryStartIsNewOrIdentical(
      caseId,
      gmailThreadId,
      workflowId,
    );

    const now = new Date().toISOString();
    const state: DiscoveryState = {
      status: "delivery_started",
      workflowId,
      gmailThreadId,
      mandatoryReview: { held: false, reasons: [] },
    };

    try {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO gmail_threads (
              case_id, gmail_thread_id, created_at
            ) VALUES (?, ?, ?)`,
          )
          .bind(caseId, gmailThreadId, now),
        this.discoveryStateStatement(caseId, state, now),
      ]);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        await this.ensureDeliveryStartIsNewOrIdentical(
          caseId,
          gmailThreadId,
          workflowId,
        );
        const existing = await this.deliveryByCase(caseId);
        if (
          existing?.gmail_thread_id === gmailThreadId &&
          existing.workflow_id === workflowId
        ) {
          return;
        }

        throw new Error("Conflicting delivery start");
      }

      throw error;
    }
  }

  async saveDiscoveryState(
    caseId: string,
    state: DiscoveryState,
  ): Promise<void> {
    await this.discoveryStateStatement(
      caseId,
      state,
      new Date().toISOString(),
    ).run();
  }

  async saveArtifact(
    caseId: string,
    type: ArtifactType,
    body: unknown,
  ): Promise<number> {
    const row = await this.db
      .prepare(
        `INSERT INTO artifacts (
          id, case_id, artifact_type, version, body_json, created_at
        )
        VALUES (
          ?,
          ?,
          ?,
          (
            SELECT COALESCE(MAX(version), 0) + 1
            FROM artifacts
            WHERE case_id = ? AND artifact_type = ?
          ),
          ?,
          ?
        )
        RETURNING version`,
      )
      .bind(
        crypto.randomUUID(),
        caseId,
        type,
        caseId,
        type,
        JSON.stringify(body),
        new Date().toISOString(),
      )
      .first<{ version: number }>();

    if (!row) {
      throw new Error("Artifact save failed");
    }

    return row.version;
  }

  async holdForReview(
    caseId: string,
    reasons: string[],
    draftId: string,
  ): Promise<void> {
    const existing = await this.db
      .prepare(
        `SELECT reasons_json, draft_id, status
        FROM risk_decisions
        WHERE case_id = ? AND draft_id = ?
        LIMIT 1`,
      )
      .bind(caseId, draftId)
      .first<RiskDecisionRow>();
    const reasonsJson = JSON.stringify(reasons);

    if (existing) {
      if (existing.reasons_json === reasonsJson && existing.status === "held") {
        return;
      }

      throw new Error("Conflicting review hold");
    }

    const now = new Date().toISOString();
    const state: DiscoveryState = {
      status: "mandatory_review",
      mandatoryReview: {
        held: true,
        reasons,
        draftId,
        heldAt: now,
      },
    };

    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO risk_decisions (
            id, case_id, reasons_json, draft_id, status, created_at, resolved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          caseId,
          reasonsJson,
          draftId,
          "held",
          now,
          null,
        ),
      this.discoveryStateStatement(caseId, state, now),
    ]);
  }

  private async ensureDeliveryStartIsNewOrIdentical(
    caseId: string,
    gmailThreadId: string,
    workflowId: string,
  ): Promise<void> {
    const byCase = await this.deliveryByCase(caseId);
    if (byCase) {
      if (
        byCase.gmail_thread_id === gmailThreadId &&
        byCase.workflow_id === workflowId
      ) {
        return;
      }

      throw new Error("Conflicting delivery start");
    }

    const byThread = await this.db
      .prepare(
        `SELECT gmail_threads.case_id, gmail_threads.gmail_thread_id,
          discovery_state.workflow_id
        FROM gmail_threads
        LEFT JOIN discovery_state
          ON discovery_state.case_id = gmail_threads.case_id
        WHERE gmail_threads.gmail_thread_id = ?
        LIMIT 1`,
      )
      .bind(gmailThreadId)
      .first<DeliveryRow>();
    if (byThread) {
      throw new Error("Conflicting delivery start");
    }

    const byWorkflow = await this.db
      .prepare(
        `SELECT case_id, gmail_thread_id, workflow_id
        FROM discovery_state
        WHERE workflow_id = ?
        LIMIT 1`,
      )
      .bind(workflowId)
      .first<DeliveryRow>();
    if (byWorkflow) {
      throw new Error("Conflicting delivery start");
    }
  }

  private async deliveryByCase(caseId: string): Promise<DeliveryRow | null> {
    return this.db
      .prepare(
        `SELECT gmail_threads.case_id, gmail_threads.gmail_thread_id,
          discovery_state.workflow_id
        FROM gmail_threads
        LEFT JOIN discovery_state
          ON discovery_state.case_id = gmail_threads.case_id
        WHERE gmail_threads.case_id = ?
        LIMIT 1`,
      )
      .bind(caseId)
      .first<DeliveryRow>();
  }

  private discoveryStateStatement(
    caseId: string,
    state: DiscoveryState,
    now: string,
  ): D1PreparedStatement {
    const review = state.mandatoryReview;

    return this.db
      .prepare(
        `INSERT INTO discovery_state (
          case_id, workflow_id, gmail_thread_id, state_json,
          mandatory_review_held, mandatory_review_reasons_json,
          mandatory_review_draft_id, mandatory_review_held_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_id) DO UPDATE SET
          workflow_id = COALESCE(excluded.workflow_id, discovery_state.workflow_id),
          gmail_thread_id = COALESCE(
            excluded.gmail_thread_id,
            discovery_state.gmail_thread_id
          ),
          state_json = excluded.state_json,
          mandatory_review_held = excluded.mandatory_review_held,
          mandatory_review_reasons_json = excluded.mandatory_review_reasons_json,
          mandatory_review_draft_id = excluded.mandatory_review_draft_id,
          mandatory_review_held_at = excluded.mandatory_review_held_at,
          updated_at = excluded.updated_at`,
      )
      .bind(
        caseId,
        state.workflowId ?? null,
        state.gmailThreadId ?? null,
        JSON.stringify(state),
        review?.held ? 1 : 0,
        review ? JSON.stringify(review.reasons) : null,
        review?.draftId ?? null,
        review?.heldAt ?? null,
        now,
      );
  }
}

const randomToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let value = "";
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

const bytesToHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes("UNIQUE constraint failed");
