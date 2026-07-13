import {
  WORKSHOP_CATEGORY_LABELS,
  normalizeWorkshopCategory,
  type WorkshopCategory,
} from "../domain/case";

export interface HeldReviewCase {
  caseId: string;
  draftId: string;
  reasons: string[];
  createdAt: string;
  artifactVersion: number | null;
}

export interface QuoteReadyCase {
  caseId: string;
  email: string;
  name: string;
  blueprintVersion: number;
  blueprintDeliveredAt: string;
  creditCents: number;
}

export interface IntakeQueueCase {
  caseId: string;
  email: string;
  name: string;
  path: "normal" | "priority";
  status: "normal_queue" | "checkout_pending";
  contextType: "personal" | "professional";
  workshopCategory: WorkshopCategory;
  problem: string;
  desiredOutcome: string;
  sanitizedLinkCount: number;
  createdAt: string;
}

export const listHeldReviewCases = async (
  db: D1Database,
): Promise<HeldReviewCase[]> => {
  const rows = await db
    .prepare(
      `SELECT risk_decisions.case_id, risk_decisions.draft_id,
        risk_decisions.reasons_json, risk_decisions.created_at,
        (
          SELECT MAX(version)
          FROM artifacts
          WHERE artifacts.case_id = risk_decisions.case_id
        ) AS artifact_version
      FROM risk_decisions
      WHERE risk_decisions.status = ?
      ORDER BY risk_decisions.created_at ASC
      LIMIT 50`,
    )
    .bind("held")
    .all<{
      case_id: string;
      draft_id: string;
      reasons_json: string;
      created_at: string;
      artifact_version: number | null;
    }>();

  return (rows.results ?? []).map((row) => ({
    caseId: row.case_id,
    draftId: row.draft_id,
    reasons: parseReasons(row.reasons_json),
    createdAt: row.created_at,
    artifactVersion: row.artifact_version,
  }));
};

export const listIntakeQueueCases = async (
  db: D1Database,
): Promise<IntakeQueueCase[]> => {
  const rows = await db
    .prepare(
      `SELECT cases.id AS case_id, cases.email, cases.name, cases.path,
        cases.status, cases.context_type, cases.created_at,
        intakes.problem, intakes.desired_outcome,
        intakes.sanitized_links_json, intakes.workshop_category
      FROM cases
      INNER JOIN intakes
        ON intakes.case_id = cases.id
      WHERE cases.status IN (?, ?)
      ORDER BY cases.created_at ASC
      LIMIT 50`,
    )
    .bind("normal_queue", "checkout_pending")
    .all<{
      case_id: string;
      email: string;
      name: string;
      path: "normal" | "priority";
      status: "normal_queue" | "checkout_pending";
      context_type: "personal" | "professional";
      created_at: string;
      workshop_category: string | null;
      problem: string;
      desired_outcome: string;
      sanitized_links_json: string;
    }>();

  return (rows.results ?? []).map((row) => ({
    caseId: row.case_id,
    email: row.email,
    name: row.name,
    path: row.path,
    status: row.status,
    contextType: row.context_type,
    workshopCategory: normalizeWorkshopCategory(row.workshop_category),
    problem: row.problem,
    desiredOutcome: row.desired_outcome,
    sanitizedLinkCount: parseStringArray(row.sanitized_links_json).length,
    createdAt: row.created_at,
  }));
};

export const listQuoteReadyCases = async (
  db: D1Database,
): Promise<QuoteReadyCase[]> => {
  const rows = await db
    .prepare(
      `SELECT cases.id AS case_id, cases.email, cases.name,
        artifacts.version AS blueprint_version,
        artifacts.created_at AS blueprint_delivered_at,
        credits.cents AS credit_cents
      FROM cases
      INNER JOIN artifacts
        ON artifacts.case_id = cases.id
       AND artifacts.artifact_type = ?
      INNER JOIN credits
        ON credits.case_id = cases.id
      INNER JOIN gmail_threads
        ON gmail_threads.case_id = cases.id
      WHERE cases.status = ?
        AND artifacts.version = (
          SELECT MAX(latest.version)
          FROM artifacts latest
          WHERE latest.case_id = cases.id
            AND latest.artifact_type = ?
        )
        AND NOT EXISTS (
          SELECT 1
          FROM session_quotes
          WHERE session_quotes.case_id = cases.id
        )
      ORDER BY artifacts.created_at ASC
      LIMIT 50`,
    )
    .bind("blueprint", "blueprint_delivered", "blueprint")
    .all<{
      case_id: string;
      email: string;
      name: string;
      blueprint_version: number;
      blueprint_delivered_at: string;
      credit_cents: number;
    }>();

  return (rows.results ?? []).map((row) => ({
    caseId: row.case_id,
    email: row.email,
    name: row.name,
    blueprintVersion: row.blueprint_version,
    blueprintDeliveredAt: row.blueprint_delivered_at,
    creditCents: row.credit_cents,
  }));
};

export const renderAdminReviewPage = (input: {
  intakeQueueCases: IntakeQueueCase[];
  heldReviews: HeldReviewCase[];
  quoteReadyCases: QuoteReadyCase[];
}): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Workflow Reviews</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #17202a; }
    section { margin-block: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #d8dee4; padding: 0.75rem; text-align: left; vertical-align: top; }
    th { font-size: 0.875rem; color: #52616f; }
    code { font-size: 0.875rem; }
    form { display: grid; gap: 0.5rem; max-width: 24rem; }
    input { font: inherit; padding: 0.45rem 0.55rem; }
    button { font: inherit; border: 1px solid #17202a; background: #17202a; color: white; padding: 0.5rem 0.7rem; cursor: pointer; }
    .inline-form { display: inline-grid; max-width: none; }
    .muted { color: #52616f; }
    .summary { max-width: 38rem; }
  </style>
</head>
<body>
  <h1>AI Workflow Reviews</h1>
  <section>
    <h2>Open intake queue</h2>
    <table>
      <thead>
        <tr>
          <th>Case</th>
          <th>Customer</th>
          <th>Path</th>
          <th>Submitted</th>
          <th>Problem</th>
          <th>Links</th>
        </tr>
      </thead>
      <tbody>
        ${
          input.intakeQueueCases.length
            ? input.intakeQueueCases.map(renderIntakeQueueRow).join("")
            : '<tr><td colspan="6">No open intake cases.</td></tr>'
        }
      </tbody>
    </table>
  </section>

  <section>
    <h2>Held Gmail drafts</h2>
  <table>
    <thead>
      <tr>
        <th>Case</th>
        <th>Draft</th>
        <th>Reasons</th>
        <th>Held</th>
        <th>Artifact</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${
        input.heldReviews.length
          ? input.heldReviews.map(renderHeldReviewRow).join("")
          : '<tr><td colspan="6">No held reviews.</td></tr>'
      }
    </tbody>
  </table>
  </section>

  <section>
    <h2>Blueprints ready for private quote</h2>
    <table>
      <thead>
        <tr>
          <th>Case</th>
          <th>Customer</th>
          <th>Blueprint</th>
          <th>Credit</th>
          <th>Quote</th>
        </tr>
      </thead>
      <tbody>
        ${
          input.quoteReadyCases.length
            ? input.quoteReadyCases.map(renderQuoteReadyRow).join("")
            : '<tr><td colspan="5">No blueprints waiting for a private quote.</td></tr>'
        }
      </tbody>
    </table>
  </section>
</body>
</html>`;

const renderIntakeQueueRow = (item: IntakeQueueCase): string => `
  <tr>
    <td><code>${escapeHtml(item.caseId)}</code></td>
    <td>${escapeHtml(item.name)}<br><span class="muted">${escapeHtml(item.email)}</span></td>
    <td>${escapeHtml(labelForPath(item.path))}<br><span class="muted">${escapeHtml(item.status)}</span><br><span class="muted">${escapeHtml(labelForWorkshopCategory(item.workshopCategory))}</span></td>
    <td>${escapeHtml(item.createdAt)}<br><span class="muted">${escapeHtml(item.contextType)}</span></td>
    <td class="summary">
      ${escapeHtml(truncate(item.problem, 220))}
      <br><span class="muted">${escapeHtml(truncate(item.desiredOutcome, 140))}</span>
    </td>
    <td>${item.sanitizedLinkCount}</td>
  </tr>`;

const renderHeldReviewRow = (held: HeldReviewCase): string => `
  <tr>
    <td><code>${escapeHtml(held.caseId)}</code></td>
    <td><code>${escapeHtml(held.draftId)}</code></td>
    <td>${held.reasons.map(escapeHtml).join(", ")}</td>
    <td>${escapeHtml(held.createdAt)}</td>
    <td>${held.artifactVersion ?? ""}</td>
    <td>
      <form class="inline-form" method="post" action="/v1/admin/cases/${encodeURIComponent(held.caseId)}/approve-draft">
        <input type="hidden" name="draftId" value="${escapeHtml(held.draftId)}">
        ${held.artifactVersion ? `<input type="hidden" name="artifactVersion" value="${held.artifactVersion}">` : ""}
        <button type="submit">Send approved draft</button>
      </form>
    </td>
  </tr>`;

const renderQuoteReadyRow = (item: QuoteReadyCase): string => `
  <tr>
    <td><code>${escapeHtml(item.caseId)}</code></td>
    <td>${escapeHtml(item.name)}<br><span class="muted">${escapeHtml(item.email)}</span></td>
    <td>v${item.blueprintVersion}<br><span class="muted">${escapeHtml(item.blueprintDeliveredAt)}</span></td>
    <td>${formatDollars(item.creditCents)}</td>
    <td>
      <form method="post" action="/v1/admin/cases/${encodeURIComponent(item.caseId)}/approve-private-quote">
        <label>Minutes <input name="durationMinutes" type="number" min="15" step="15" required></label>
        <label>Total cents <input name="totalCents" type="number" min="0" step="100" required></label>
        <button type="submit">Create private quote</button>
      </form>
    </td>
  </tr>`;

const parseReasons = (value: string): string[] => {
  return parseStringArray(value);
};

const parseStringArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const labelForPath = (path: IntakeQueueCase["path"]): string =>
  path === "priority" ? "Priority Discovery" : "Normal review";

const labelForWorkshopCategory = (category: WorkshopCategory): string =>
  WORKSHOP_CATEGORY_LABELS[category];

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatDollars = (cents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
