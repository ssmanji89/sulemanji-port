import {
  AgentDecision,
  AgentInputSchema,
  type AgentInput,
} from "../agent/contracts";
import { IntakeInput, type CaseStatus } from "../domain/case";
import { holdExpiresAt, quoteExpiresAt, remainingBalance } from "../domain/booking";
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

export interface PriorityDiscoveryCaseRecord {
  caseId: string;
  email: string;
  name: string;
  status: CaseStatus;
}

export interface DiscoveryAgentContext {
  caseId: string;
  email: string;
  contextType: IntakeInput["contextType"];
  problem: string;
  desiredOutcome: string;
  priorAttempts: string;
  sanitizedLinks: string[];
  launchReviewRequired: boolean;
  state: DiscoveryState | null;
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
    options?: { launchReviewRequired?: boolean },
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
  createSessionQuote(input: CreateSessionQuoteInput): Promise<CreatedSessionQuote>;
  latestBlueprintForQuote(caseId: string): Promise<LatestBlueprintForQuote | null>;
  getSessionQuoteByPublicToken(
    token: string,
  ): Promise<PrivateSessionQuote | null>;
  createSlotHold(input: CreateSlotHoldInput): Promise<CreatedSlotHold>;
  getActiveSlotHoldForPayment(holdId: string): Promise<SlotHoldPayment | null>;
  confirmSlotHold(holdId: string, providerEventId: string): Promise<void>;
  releaseSlotHold(holdId: string): Promise<void>;
  enqueueAgentDecisionJob(
    input: EnqueueAgentDecisionJobInput,
  ): Promise<EnqueuedAgentJob>;
  claimNextAgentJob(): Promise<ClaimedAgentJob | null>;
  completeAgentJob(
    jobId: string,
    decision: AgentDecision,
  ): Promise<CompletedAgentJob>;
}

export interface CreateSessionQuoteInput {
  caseId: string;
  blueprintVersion: number;
  durationMinutes: number;
  totalCents: number;
  blueprintDeliveredAt: Date;
  now?: Date;
}

export interface CreatedSessionQuote {
  id: string;
  publicToken: string;
  creditCents: number;
  balanceCents: number;
  expiresAt: string;
}

export interface PrivateSessionQuote {
  id: string;
  caseId: string;
  email: string;
  durationMinutes: number;
  totalCents: number;
  creditCents: number;
  balanceCents: number;
  expiresAt: string;
  caseStatus: CaseStatus;
}

export interface LatestBlueprintForQuote {
  version: number;
  deliveredAt: string;
  email: string;
  gmailThreadId: string;
}

export interface CreateSlotHoldInput {
  quoteToken: string;
  calendarId: string;
  startsAt: string;
  endsAt: string;
  stripeCheckoutSessionId: string;
  now?: Date;
}

export interface CreatedSlotHold {
  id: string;
  quoteId: string;
  expiresAt: string;
}

export interface SlotHoldPayment {
  holdId: string;
  quoteId: string;
  caseId: string;
  calendarId: string;
  startsAt: string;
  endsAt: string;
  balanceCents: number;
}

export interface EnqueueAgentDecisionJobInput {
  caseId: string;
  workflowId: string;
  sourceMessageId: string;
  input: AgentInput;
}

export interface EnqueuedAgentJob {
  id: string;
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

interface PriorityDiscoveryCaseRow {
  id: string;
  email: string;
  name: string;
  status: CaseStatus;
}

interface CreditRow {
  id?: string;
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

interface HeldReviewRow {
  draft_id: string;
  status: string;
  mandatory_review_draft_id: string | null;
  mandatory_review_held: number;
}

interface DiscoveryAgentContextRow {
  id: string;
  email: string;
  context_type: IntakeInput["contextType"];
  problem: string;
  desired_outcome: string;
  prior_attempts: string;
  sanitized_links_json: string;
  launch_review_required: number;
  state_json: string | null;
}

interface QuoteLookupRow {
  id: string;
  case_id: string;
  email: string;
  duration_minutes: number;
  total_cents: number;
  credit_cents: number;
  balance_cents: number;
  expires_at: string;
  case_status: CaseStatus;
}

interface HoldLookupRow {
  id: string;
  case_id: string;
  status: string;
}

interface SlotHoldPaymentRow {
  hold_id: string;
  quote_id: string;
  case_id: string;
  calendar_id: string;
  starts_at: string;
  ends_at: string;
  balance_cents: number;
}

interface AgentJobRow {
  id: string;
  case_id: string;
  workflow_id: string;
  source_message_id: string;
  input_json: string;
  result_json: string | null;
  claimed_at: string | null;
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
            case_id, workshop_category, problem, desired_outcome,
            prior_attempts, sanitized_links_json, redacted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          parsedInput.workshopCategory,
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
            case_id, workshop_category, problem, desired_outcome,
            prior_attempts, sanitized_links_json, redacted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          parsedInput.workshopCategory,
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

  async getPriorityDiscoveryCase(
    caseId: string,
  ): Promise<PriorityDiscoveryCaseRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, email, name, status
        FROM cases
        WHERE id = ? AND status IN (?, ?)`,
      )
      .bind(caseId, "paid_pending_start", "discovery_active")
      .first<PriorityDiscoveryCaseRow>();

    if (!row) return null;
    return {
      caseId: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
    };
  }

  async getDiscoveryAgentContext(
    caseId: string,
  ): Promise<DiscoveryAgentContext | null> {
    const row = await this.db
      .prepare(
        `SELECT cases.id, cases.email, cases.context_type,
          cases.launch_review_required, intakes.problem,
          intakes.desired_outcome, intakes.prior_attempts,
          intakes.sanitized_links_json, discovery_state.state_json
        FROM cases
        INNER JOIN intakes ON intakes.case_id = cases.id
        LEFT JOIN discovery_state ON discovery_state.case_id = cases.id
        WHERE cases.id = ?
        LIMIT 1`,
      )
      .bind(caseId)
      .first<DiscoveryAgentContextRow>();

    if (!row) return null;
    return {
      caseId: row.id,
      email: row.email,
      contextType: row.context_type,
      problem: row.problem,
      desiredOutcome: row.desired_outcome,
      priorAttempts: row.prior_attempts,
      sanitizedLinks: parseStringArray(row.sanitized_links_json),
      launchReviewRequired: row.launch_review_required === 1,
      state: row.state_json ? (JSON.parse(row.state_json) as DiscoveryState) : null,
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
    options: { launchReviewRequired?: boolean } = {},
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

    const now = new Date().toISOString();
    const [creditResult, caseResult] = await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO credits (
            id, case_id, stripe_checkout_session_id, stripe_payment_intent_id,
            cents, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), caseId, sessionId, paymentIntentId, cents, now),
      this.db
        .prepare(
          `UPDATE cases
          SET launch_review_required = ?
          WHERE id = ?`,
        )
        .bind(options.launchReviewRequired === true ? 1 : 0, caseId),
    ]);

    if (creditResult?.meta.changes !== 1 || caseResult?.meta.changes !== 1) {
      throw new Error("Deposit payment persistence failed");
    }
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

  async assertHeldDraftForReview(
    caseId: string,
    draftId: string,
  ): Promise<void> {
    const row = await this.db
      .prepare(
        `SELECT risk_decisions.draft_id, risk_decisions.status,
          discovery_state.mandatory_review_draft_id,
          discovery_state.mandatory_review_held
        FROM risk_decisions
        LEFT JOIN discovery_state
          ON discovery_state.case_id = risk_decisions.case_id
        WHERE risk_decisions.case_id = ? AND risk_decisions.draft_id = ?
        LIMIT 1`,
      )
      .bind(caseId, draftId)
      .first<HeldReviewRow>();

    if (
      !row ||
      row.status !== "held" ||
      row.mandatory_review_held !== 1 ||
      row.mandatory_review_draft_id !== draftId
    ) {
      throw new Error("Draft is not held for this case");
    }
  }

  async resolveReviewHold(
    caseId: string,
    draftId: string,
    status: "approved" | "revised",
  ): Promise<void> {
    const now = new Date().toISOString();
    const [riskResult, stateResult] = await this.db.batch([
      this.db
        .prepare(
          `UPDATE risk_decisions
          SET status = ?, resolved_at = ?
          WHERE case_id = ? AND draft_id = ? AND status = ?`,
        )
        .bind(status, now, caseId, draftId, "held"),
      this.db
        .prepare(
          `UPDATE discovery_state
          SET mandatory_review_held = 0,
            mandatory_review_reasons_json = ?,
            mandatory_review_draft_id = ?,
            mandatory_review_held_at = ?,
            updated_at = ?
          WHERE case_id = ? AND mandatory_review_draft_id = ?`,
        )
        .bind(null, null, null, now, caseId, draftId),
    ]);

    if (riskResult?.meta.changes !== 1 || stateResult?.meta.changes !== 1) {
      throw new Error("Review hold resolution failed");
    }
  }

  async recordAdminAction(action: {
    actor: string;
    caseId: string;
    action: string;
    artifactVersion?: number;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_events (
          id, case_id, event_type, data_json, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        action.caseId,
        `admin_${action.action}`,
        JSON.stringify({
          actor: action.actor,
          artifactVersion: action.artifactVersion ?? null,
        }),
        new Date().toISOString(),
      )
      .run();
  }

  async createSessionQuote(
    input: CreateSessionQuoteInput,
  ): Promise<CreatedSessionQuote> {
    if (
      !Number.isInteger(input.blueprintVersion) ||
      input.blueprintVersion < 1 ||
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 15 ||
      !Number.isInteger(input.totalCents) ||
      input.totalCents < 0
    ) {
      throw new Error("Invalid session quote input");
    }

    const credit = await this.db
      .prepare(
        `SELECT id, case_id, stripe_checkout_session_id,
          stripe_payment_intent_id, cents
        FROM credits
        WHERE case_id = ?
        ORDER BY created_at ASC
        LIMIT 1`,
      )
      .bind(input.caseId)
      .first<CreditRow>();

    if (!credit?.id) {
      throw new Error("Deposit credit not found");
    }

    const id = crypto.randomUUID();
    const publicToken = randomToken();
    const publicTokenHash = await sha256(publicToken);
    const creditCents = Math.min(input.totalCents, credit.cents);
    const balanceCents = remainingBalance(input.totalCents, credit.cents);
    const expiresAt = quoteExpiresAt(input.blueprintDeliveredAt).toISOString();
    const now = (input.now ?? new Date()).toISOString();

    try {
      const [quoteResult, transitionResult, auditResult] = await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO session_quotes (
              id, case_id, blueprint_version, credit_id, public_token_hash,
              duration_minutes, total_cents, credit_cents, balance_cents,
              expires_at, created_at, approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            input.caseId,
            input.blueprintVersion,
            credit.id,
            publicTokenHash,
            input.durationMinutes,
            input.totalCents,
            creditCents,
            balanceCents,
            expiresAt,
            now,
            now,
          ),
        this.db
          .prepare(
            `UPDATE cases
            SET status = ?, updated_at = ?
            WHERE id = ? AND status = ?`,
          )
          .bind("priority_scheduling", now, input.caseId, "blueprint_delivered"),
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
            input.caseId,
            "session_quote_created",
            JSON.stringify({
              blueprintVersion: input.blueprintVersion,
              durationMinutes: input.durationMinutes,
              totalCents: input.totalCents,
              creditCents,
              balanceCents,
              expiresAt,
            }),
            now,
          ),
      ]);

      if (
        quoteResult?.meta.changes !== 1 ||
        transitionResult?.meta.changes !== 1 ||
        auditResult?.meta.changes !== 1
      ) {
        throw new Error("Session quote creation failed");
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("Session quote already exists or deposit credit consumed");
      }

      throw error;
    }

    return { id, publicToken, creditCents, balanceCents, expiresAt };
  }

  async latestBlueprintForQuote(
    caseId: string,
  ): Promise<LatestBlueprintForQuote | null> {
    const row = await this.db
      .prepare(
        `SELECT artifacts.version, artifacts.created_at, cases.email,
          gmail_threads.gmail_thread_id
        FROM artifacts
        INNER JOIN cases ON cases.id = artifacts.case_id
        INNER JOIN gmail_threads ON gmail_threads.case_id = cases.id
        WHERE artifacts.case_id = ?
          AND artifacts.artifact_type = ?
          AND cases.status = ?
        ORDER BY artifacts.version DESC
        LIMIT 1`,
      )
      .bind(caseId, "blueprint", "blueprint_delivered")
      .first<{
        version: number;
        created_at: string;
        email: string;
        gmail_thread_id: string;
      }>();

    if (!row) return null;
    return {
      version: row.version,
      deliveredAt: row.created_at,
      email: row.email,
      gmailThreadId: row.gmail_thread_id,
    };
  }

  async getSessionQuoteByPublicToken(
    token: string,
  ): Promise<PrivateSessionQuote | null> {
    const publicTokenHash = await sha256(token);
    const row = await this.db
      .prepare(
        `SELECT session_quotes.id, session_quotes.case_id, cases.email,
          session_quotes.duration_minutes, session_quotes.total_cents,
          session_quotes.credit_cents, session_quotes.balance_cents,
          session_quotes.expires_at, cases.status AS case_status
        FROM session_quotes
        INNER JOIN cases ON cases.id = session_quotes.case_id
        WHERE session_quotes.public_token_hash = ?
        LIMIT 1`,
      )
      .bind(publicTokenHash)
      .first<QuoteLookupRow>();

    if (!row) return null;
    return {
      id: row.id,
      caseId: row.case_id,
      email: row.email,
      durationMinutes: row.duration_minutes,
      totalCents: row.total_cents,
      creditCents: row.credit_cents,
      balanceCents: row.balance_cents,
      expiresAt: row.expires_at,
      caseStatus: row.case_status,
    };
  }

  async createSlotHold(input: CreateSlotHoldInput): Promise<CreatedSlotHold> {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const nowDate = input.now ?? new Date();

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      startsAt >= endsAt ||
      !input.calendarId ||
      !input.stripeCheckoutSessionId
    ) {
      throw new Error("Invalid slot hold input");
    }

    const publicTokenHash = await sha256(input.quoteToken);
    const quote = await this.db
      .prepare(
        `SELECT session_quotes.id, session_quotes.case_id, cases.email,
          session_quotes.duration_minutes, session_quotes.total_cents,
          session_quotes.credit_cents, session_quotes.balance_cents,
          session_quotes.expires_at, cases.status AS case_status
        FROM session_quotes
        INNER JOIN cases ON cases.id = session_quotes.case_id
        WHERE session_quotes.public_token_hash = ?
        LIMIT 1`,
      )
      .bind(publicTokenHash)
      .first<QuoteLookupRow>();

    if (
      !quote ||
      quote.case_status !== "priority_scheduling" ||
      new Date(quote.expires_at) <= nowDate
    ) {
      throw new Error("Private quote is expired or unavailable");
    }

    const expectedDurationMs = quote.duration_minutes * 60_000;
    if (endsAt.getTime() - startsAt.getTime() !== expectedDurationMs) {
      throw new Error("Slot duration does not match private quote");
    }

    const id = crypto.randomUUID();
    const expiresAt = holdExpiresAt(nowDate).toISOString();
    const now = nowDate.toISOString();

    try {
      const [holdResult, transitionResult, auditResult] = await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO slot_holds (
              id, quote_id, calendar_id, starts_at, ends_at, status,
              expires_at, stripe_checkout_session_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            quote.id,
            input.calendarId,
            startsAt.toISOString(),
            endsAt.toISOString(),
            "active",
            expiresAt,
            input.stripeCheckoutSessionId,
            now,
          ),
        this.db
          .prepare(
            `UPDATE cases
            SET status = ?, updated_at = ?
            WHERE id = ? AND status = ?`,
          )
          .bind("slot_held", now, quote.case_id, "priority_scheduling"),
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
            quote.case_id,
            "slot_hold_created",
            JSON.stringify({
              quoteId: quote.id,
              calendarId: input.calendarId,
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              expiresAt,
            }),
            now,
          ),
      ]);

      if (
        holdResult?.meta.changes !== 1 ||
        transitionResult?.meta.changes !== 1 ||
        auditResult?.meta.changes !== 1
      ) {
        throw new Error("Slot hold failed");
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("Slot is already held");
      }

      throw error;
    }

    return { id, quoteId: quote.id, expiresAt };
  }

  async getActiveSlotHoldForPayment(
    holdId: string,
  ): Promise<SlotHoldPayment | null> {
    const row = await this.db
      .prepare(
        `SELECT slot_holds.id AS hold_id, session_quotes.id AS quote_id,
          session_quotes.case_id, slot_holds.calendar_id, slot_holds.starts_at,
          slot_holds.ends_at, session_quotes.balance_cents
        FROM slot_holds
        INNER JOIN session_quotes ON session_quotes.id = slot_holds.quote_id
        INNER JOIN cases ON cases.id = session_quotes.case_id
        WHERE slot_holds.id = ?
          AND slot_holds.status = ?
          AND cases.status = ?
        LIMIT 1`,
      )
      .bind(holdId, "active", "slot_held")
      .first<SlotHoldPaymentRow>();

    if (!row) return null;
    return {
      holdId: row.hold_id,
      quoteId: row.quote_id,
      caseId: row.case_id,
      calendarId: row.calendar_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      balanceCents: row.balance_cents,
    };
  }

  async confirmSlotHold(
    holdId: string,
    providerEventId: string,
  ): Promise<void> {
    const hold = await this.getActiveSlotHoldForPayment(holdId);
    if (!hold) {
      throw new Error("Active slot hold not found");
    }

    const now = new Date().toISOString();
    const [eventResult, holdResult, pendingResult, pendingAudit, confirmedResult, confirmedAudit] =
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO calendar_events (
              id, hold_id, calendar_id, starts_at, ends_at, provider_event_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            holdId,
            hold.calendarId,
            hold.startsAt,
            hold.endsAt,
            providerEventId,
            now,
          ),
        this.db
          .prepare(
            `UPDATE slot_holds
            SET status = ?
            WHERE id = ? AND status = ?`,
          )
          .bind("confirmed", holdId, "active"),
        this.db
          .prepare(
            `UPDATE cases
            SET status = ?, updated_at = ?
            WHERE id = ? AND status = ?`,
          )
          .bind("balance_payment_pending", now, hold.caseId, "slot_held"),
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
            hold.caseId,
            "session_balance_paid",
            JSON.stringify({ holdId }),
            now,
          ),
        this.db
          .prepare(
            `UPDATE cases
            SET status = ?, updated_at = ?
            WHERE id = ? AND status = ?`,
          )
          .bind("session_confirmed", now, hold.caseId, "balance_payment_pending"),
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
            hold.caseId,
            "session_confirmed",
            JSON.stringify({ holdId, providerEventId }),
            now,
          ),
      ]);

    if (
      eventResult?.meta.changes !== 1 ||
      holdResult?.meta.changes !== 1 ||
      pendingResult?.meta.changes !== 1 ||
      pendingAudit?.meta.changes !== 1 ||
      confirmedResult?.meta.changes !== 1 ||
      confirmedAudit?.meta.changes !== 1
    ) {
      throw new Error("Slot hold confirmation failed");
    }
  }

  async releaseSlotHold(holdId: string): Promise<void> {
    const hold = await this.db
      .prepare(
        `SELECT slot_holds.id, session_quotes.case_id, slot_holds.status
        FROM slot_holds
        INNER JOIN session_quotes ON session_quotes.id = slot_holds.quote_id
        WHERE slot_holds.id = ?
        LIMIT 1`,
      )
      .bind(holdId)
      .first<HoldLookupRow>();

    if (!hold || hold.status !== "active") {
      throw new Error("Active slot hold not found");
    }

    const now = new Date().toISOString();
    const [holdResult, transitionResult, auditResult] = await this.db.batch([
      this.db
        .prepare(
          `UPDATE slot_holds
          SET status = ?
          WHERE id = ? AND status = ?`,
        )
        .bind("released", holdId, "active"),
      this.db
        .prepare(
          `UPDATE cases
          SET status = ?, updated_at = ?
          WHERE id = ? AND status = ?`,
        )
        .bind("priority_scheduling", now, hold.case_id, "slot_held"),
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
          hold.case_id,
          "slot_hold_released",
          JSON.stringify({ holdId }),
          now,
        ),
    ]);

    if (
      holdResult?.meta.changes !== 1 ||
      transitionResult?.meta.changes !== 1 ||
      auditResult?.meta.changes !== 1
    ) {
      throw new Error("Slot hold release failed");
    }
  }

  async enqueueAgentDecisionJob(
    input: EnqueueAgentDecisionJobInput,
  ): Promise<EnqueuedAgentJob> {
    AgentInputSchema.parse(input.input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await this.db
        .prepare(
          `INSERT INTO agent_jobs (
            id, case_id, workflow_id, source_message_id, job_type, status,
            input_json, result_json, error_text, created_at, claimed_at,
            completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.caseId,
          input.workflowId,
          input.sourceMessageId,
          "agent_decision",
          "pending",
          JSON.stringify(input.input),
          null,
          null,
          now,
          null,
          null,
        )
        .run();

      return { id };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const existing = await this.db
        .prepare(
          `SELECT id
          FROM agent_jobs
          WHERE case_id = ? AND source_message_id = ? AND job_type = ?
          LIMIT 1`,
        )
        .bind(input.caseId, input.sourceMessageId, "agent_decision")
        .first<{ id: string }>();
      if (!existing) throw error;
      return { id: existing.id };
    }
  }

  async claimNextAgentJob(): Promise<ClaimedAgentJob | null> {
    const row = await this.db
      .prepare(
        `SELECT id, case_id, workflow_id, source_message_id, input_json,
          result_json, claimed_at
        FROM agent_jobs
        WHERE status = ?
        ORDER BY created_at ASC
        LIMIT 1`,
      )
      .bind("pending")
      .first<AgentJobRow>();
    if (!row) return null;

    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `UPDATE agent_jobs
        SET status = ?, claimed_at = ?
        WHERE id = ? AND status = ?`,
      )
      .bind("claimed", now, row.id, "pending")
      .run();
    if (result.meta.changes !== 1) {
      return this.claimNextAgentJob();
    }

    return {
      id: row.id,
      caseId: row.case_id,
      workflowId: row.workflow_id,
      sourceMessageId: row.source_message_id,
      input: AgentInputSchema.parse(JSON.parse(row.input_json)),
      claimedAt: now,
    };
  }

  async completeAgentJob(
    jobId: string,
    decision: AgentDecision,
  ): Promise<CompletedAgentJob> {
    const parsedDecision = AgentDecision.parse(decision);
    const row = await this.db
      .prepare(
        `SELECT id, case_id, workflow_id, source_message_id, input_json,
          result_json, claimed_at
        FROM agent_jobs
        WHERE id = ?
        LIMIT 1`,
      )
      .bind(jobId)
      .first<AgentJobRow>();
    if (!row) {
      throw new Error("Agent job not found");
    }

    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `UPDATE agent_jobs
        SET status = ?, result_json = ?, completed_at = ?
        WHERE id = ? AND status IN (?, ?)`,
      )
      .bind(
        "completed",
        JSON.stringify(parsedDecision),
        now,
        jobId,
        "pending",
        "claimed",
      )
      .run();
    if (result.meta.changes !== 1) {
      throw new Error("Agent job is not completable");
    }

    return {
      id: row.id,
      caseId: row.case_id,
      workflowId: row.workflow_id,
      sourceMessageId: row.source_message_id,
      decision: parsedDecision,
    };
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

const parseStringArray = (value: string): string[] => {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
};
