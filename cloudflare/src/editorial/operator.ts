import type { EditorialEnv } from './contracts.js';
import { readControl, setPaused } from './state.js';
import { D1CorrectionStore, recordCorrection, type ScopedCorrection } from './maintenance.js';

type OperatorCommand = { action: 'status' | 'pause' | 'resume' } | { action: 'inspect' | 'retry' | 'revoke'; candidate_id: string }
  | ({ action: 'record_correction' } & Omit<ScopedCorrection, 'scope'> & { scope: string[] });
type OperatorEnv = EditorialEnv & { EDITORIAL_OPERATOR_KEYS_JSON: string };

function decodeBase64(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); } catch { return null; }
}
function source(bytes: Uint8Array): ArrayBuffer { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; }

async function authorized(raw: Uint8Array, keyId: string, signature: string, env: OperatorEnv): Promise<boolean> {
  let keys: unknown;
  try { keys = JSON.parse(env.EDITORIAL_OPERATOR_KEYS_JSON); } catch { return false; }
  const encoded = keys && typeof keys === 'object' ? (keys as Record<string, unknown>)[keyId] : null;
  const keyBytes = typeof encoded === 'string' ? decodeBase64(encoded) : null;
  const signatureBytes = decodeBase64(signature);
  if (!keyBytes || keyBytes.length < 32 || !signatureBytes || signatureBytes.length !== 32) return false;
  try {
    const key = await crypto.subtle.importKey('raw', source(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, source(signatureBytes), source(raw));
  } catch { return false; }
}

function isCommand(value: unknown): value is OperatorCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (['status', 'pause', 'resume'].includes(String(row.action))) return Object.keys(row).length === 1;
  if (row.action === 'record_correction') return Object.keys(row).sort().join(',') === 'action,affected_behavior,id,original_instruction,recorded_at,regression_reference,scope,source_episode'
    && typeof row.id === 'string' && /^[a-zA-Z0-9._:-]{1,160}$/.test(row.id)
    && typeof row.source_episode === 'string' && row.source_episode.length > 0 && row.source_episode.length <= 256
    && typeof row.original_instruction === 'string' && row.original_instruction.trim().length > 0 && row.original_instruction.length <= 2000
    && Array.isArray(row.scope) && row.scope.length > 0 && row.scope.length <= 20 && row.scope.every((item) => typeof item === 'string' && /^[a-zA-Z0-9._:-]{1,160}$/.test(item))
    && typeof row.affected_behavior === 'string' && row.affected_behavior.trim().length > 0 && row.affected_behavior.length <= 1000
    && typeof row.regression_reference === 'string' && row.regression_reference.trim().length > 0 && row.regression_reference.length <= 512
    && typeof row.recorded_at === 'string' && Number.isFinite(Date.parse(row.recorded_at));
  return ['inspect', 'retry', 'revoke'].includes(String(row.action)) && Object.keys(row).length === 2 && typeof row.candidate_id === 'string' && /^[a-zA-Z0-9._:-]{1,160}$/.test(row.candidate_id);
}

export async function operatorRequest(raw: Uint8Array, keyId: string, signature: string, env: OperatorEnv, now = new Date()): Promise<Response> {
  if (raw.byteLength > 16_384) return Response.json({ error: 'Request is too large.' }, { status: 400 });
  if (!(await authorized(raw, keyId, signature, env))) return Response.json({ error: 'Operator authentication failed.' }, { status: 401 });
  let command: unknown;
  try { command = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!isCommand(command)) return Response.json({ error: 'Invalid operator command.' }, { status: 400 });

  let status: 'complete' | 'held' | 'rejected' = 'complete';
  let reason = 'Command completed.';
  let candidateId: string | undefined;
  let result: Record<string, unknown> = {};
  if (command.action === 'status') result = await readControl(env.DB);
  else if (command.action === 'pause' || command.action === 'resume') result = await setPaused(env.DB, command.action === 'pause', now);
  else if (command.action === 'record_correction') {
    try {
      result = await recordCorrection(command, new D1CorrectionStore(env.DB));
    } catch (error) {
      status = 'rejected';
      reason = error instanceof Error ? error.message : 'Correction could not be stored.';
    }
  }
  else if ('candidate_id' in command) {
    candidateId = command.candidate_id;
    if (command.action === 'inspect') {
      const row = await env.DB.prepare('SELECT id, state, revision, model_calls, review_rounds, updated_at FROM editorial_candidates WHERE id = ?')
        .bind(candidateId).first<Record<string, unknown>>();
      if (!row) { status = 'rejected'; reason = 'Candidate was not found.'; }
      else result = row;
    } else if (command.action === 'retry') {
      status = 'held'; reason = 'Retry requires effect reconciliation before any work is repeated.';
    } else {
      const changed = await env.DB.prepare(`UPDATE editorial_candidates SET state = 'HELD', revision = revision || ':revoked', updated_at = ? WHERE id = ? AND state NOT IN ('DEPLOYED', 'VERIFIED')`)
        .bind(now.toISOString(), candidateId).run();
      if ((changed.meta.changes ?? 0) !== 1) { status = 'rejected'; reason = 'Candidate is missing or already at a public terminal state.'; }
      else reason = 'Candidate was held by the operator.';
    }
  }
  const receiptId = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO editorial_receipts(id, candidate_id, action, result_json, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(receiptId, candidateId ?? '', command.action.toUpperCase(), JSON.stringify({ status, reason, ...result }), now.toISOString()).run();
  return Response.json({ action: command.action, status, reason, ...(candidateId ? { candidate_id: candidateId } : {}), receipt_id: receiptId, ...result }, { headers: { 'cache-control': 'no-store' } });
}
