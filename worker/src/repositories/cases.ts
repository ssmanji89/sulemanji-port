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
