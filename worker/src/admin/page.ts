export interface HeldReviewCase {
  caseId: string;
  draftId: string;
  reasons: string[];
  createdAt: string;
  artifactVersion: number | null;
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

export const renderAdminReviewPage = (cases: HeldReviewCase[]): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Workflow Reviews</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #17202a; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #d8dee4; padding: 0.75rem; text-align: left; vertical-align: top; }
    th { font-size: 0.875rem; color: #52616f; }
    code { font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>AI Workflow Reviews</h1>
  <table>
    <thead>
      <tr>
        <th>Case</th>
        <th>Draft</th>
        <th>Reasons</th>
        <th>Held</th>
        <th>Artifact</th>
      </tr>
    </thead>
    <tbody>
      ${
        cases.length
          ? cases.map(renderRow).join("")
          : '<tr><td colspan="5">No held reviews.</td></tr>'
      }
    </tbody>
  </table>
</body>
</html>`;

const renderRow = (held: HeldReviewCase): string => `
  <tr>
    <td><code>${escapeHtml(held.caseId)}</code></td>
    <td><code>${escapeHtml(held.draftId)}</code></td>
    <td>${held.reasons.map(escapeHtml).join(", ")}</td>
    <td>${escapeHtml(held.createdAt)}</td>
    <td>${held.artifactVersion ?? ""}</td>
  </tr>`;

const parseReasons = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
