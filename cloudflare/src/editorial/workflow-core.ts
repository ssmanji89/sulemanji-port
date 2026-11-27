import sourceRegistry from '../../config/public-sources.json' with { type: 'json' };
import type { ActionDecision, Candidate, CatalogItem, EditorialEnv, PublicKnowledge, RecentHistory, Signal, SourceConfig } from './contracts.js';
import { collectSignals } from './sources.js';
import { chooseAction } from './relevance.js';
import { getPublicKnowledge } from './knowledge.js';
import { parseEditorialPolicy, type EditorialPolicy } from './scheduler.js';
import { readControl } from './state.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';

type DurableStep = { do<T>(name: string, callback: () => Promise<T> | T): Promise<T> };
type EditorialWorkflowEnv = EditorialEnv & { EDITORIAL_POLICY_JSON?: string };
type ReceiptRow = { id: string; action: string; result_json: string; created_at: string };
type CandidateRow = { id: string; state: string; revision: string; payload_json: string };
type SignalHistory = { id: string; source_revision: string; episode_id: string; topic_ids: string[] };

const CONTENT_INDEX_URL = 'https://www.sulemanji.com/content-index.json';
const MAX_INDEX_BYTES = 1_048_576;
const HISTORY_LIMIT = 1_000;

function parseJson<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function readCatalog(fetcher: typeof fetch): Promise<CatalogItem[]> {
  const response = await fetcher(CONTENT_INDEX_URL, { redirect: 'error', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('CONTENT_INDEX_UNAVAILABLE');
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_INDEX_BYTES) throw new Error('CONTENT_INDEX_TOO_LARGE');
  const parsed = parseJson<{ schema_version?: unknown; items?: unknown }>(text);
  if (parsed?.schema_version !== 1 || !Array.isArray(parsed.items)) throw new Error('CONTENT_INDEX_INVALID');
  const catalog: CatalogItem[] = [];
  for (const entry of parsed.items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' || !item.title ||
        typeof item.canonical_url !== 'string' || !item.canonical_url.startsWith('/') || item.canonical_url.startsWith('//') ||
        !Array.isArray(item.topics) || !item.topics.length || item.topics.some((topic) => typeof topic !== 'string')) continue;
    const url = new URL(item.canonical_url, 'https://www.sulemanji.com');
    if (url.origin !== 'https://www.sulemanji.com') continue;
    catalog.push({ id: item.id, title: item.title, url: url.toString(), topics: item.topics as string[], ...(typeof item.summary === 'string' ? { summary: item.summary } : {}) });
  }
  return catalog;
}

async function readKnowledge(db: D1Database, now: Date): Promise<PublicKnowledge[]> {
  const rows = await db.prepare(`SELECT DISTINCT subject_id FROM public_knowledge
    WHERE action = 'UPSERT' AND expires_at > ? ORDER BY subject_id LIMIT 100`).bind(now.toISOString()).all<{ subject_id: string }>();
  const items: PublicKnowledge[] = [];
  for (const row of rows.results ?? []) {
    const knowledge = await getPublicKnowledge(row.subject_id, db, now);
    if (knowledge) items.push(knowledge);
  }
  return items;
}

function historyFromRows(receipts: ReceiptRow[], candidates: CandidateRow[]): RecentHistory {
  const sourceRevisions = new Set<string>();
  const episodeIds = new Set<string>();
  const recentTopics = new Set<string>();
  for (const row of receipts) {
    const result = parseJson<{ signals?: SignalHistory[]; topic_ids?: string[] }>(row.result_json);
    for (const signal of result?.signals ?? []) {
      if (signal.source_revision) sourceRevisions.add(signal.source_revision);
      if (signal.episode_id) episodeIds.add(signal.episode_id);
      for (const topic of signal.topic_ids ?? []) recentTopics.add(topic);
    }
    for (const topic of result?.topic_ids ?? []) recentTopics.add(topic);
  }
  const priorCandidates: Candidate[] = [];
  for (const row of candidates) {
    const payload = parseJson<{ candidate?: Candidate }>(row.payload_json);
    if (payload?.candidate && typeof payload.candidate.id === 'string') priorCandidates.push(payload.candidate);
  }
  return { source_revisions: [...sourceRevisions], episode_ids: [...episodeIds], candidates: priorCandidates, recent_topic_ids: [...recentTopics] };
}

function signalHistory(signal: Signal): SignalHistory {
  return { id: signal.id, source_revision: signal.source_revision, episode_id: signal.episode_id, topic_ids: signal.topic_ids };
}

async function recordReceipt(db: D1Database, slotId: string, candidateId: string, action: string, result: Record<string, unknown>): Promise<void> {
  const id = `slot-result:${slotId}`;
  const resultJson = JSON.stringify(result);
  await db.prepare(`INSERT OR IGNORE INTO editorial_receipts(id, candidate_id, action, result_json, created_at)
    VALUES (?, ?, ?, ?, ?)`).bind(id, candidateId, action, resultJson, new Date().toISOString()).run();
  const saved = await db.prepare('SELECT id, action, result_json, created_at FROM editorial_receipts WHERE id = ?').bind(id).first<ReceiptRow>();
  if (!saved || saved.action !== action || saved.result_json !== resultJson) throw new Error('WORKFLOW_RECEIPT_CONFLICT');
}

async function persistHeldCandidate(db: D1Database, candidate: Candidate, signal: Signal, policy: EditorialPolicy): Promise<void> {
  const boundCandidate = { ...candidate, policy_revision: policy.revision };
  const payload = { candidate: boundCandidate, signal: signalHistory(signal) };
  const payloadJson = JSON.stringify(payload);
  await db.prepare(`INSERT OR IGNORE INTO editorial_candidates(id, state, revision, payload_json, updated_at)
    VALUES (?, 'HELD', ?, ?, ?)`).bind(candidate.id, candidate.source_digest, payloadJson, new Date().toISOString()).run();
  const saved = await db.prepare('SELECT id, state, revision, payload_json FROM editorial_candidates WHERE id = ?').bind(candidate.id).first<CandidateRow>();
  if (!saved || saved.payload_json !== payloadJson || saved.revision !== candidate.source_digest) throw new Error('WORKFLOW_CANDIDATE_CONFLICT');
}

function held(params: WorkflowParams, reason: string): WorkflowResult {
  return { status: 'held', reason, slot_claim_id: params.slot_claim_id };
}

function resultFromReceipt(params: WorkflowParams, receipt: ReceiptRow): WorkflowResult {
  const result = parseJson<{ reason?: string }>(receipt.result_json);
  return { status: receipt.action === 'NO_CHANGE' ? 'no_change' : 'held', reason: result?.reason ?? 'A durable result already exists for this slot.', slot_claim_id: params.slot_claim_id };
}

export async function runEditorialAdmission(params: WorkflowParams, env: EditorialWorkflowEnv, step: DurableStep): Promise<WorkflowResult> {
  if (!params.slot_claim_id || params.slot_claim_id.length > 128 || !/^[a-zA-Z0-9:_-]+$/.test(params.slot_claim_id)) {
    return held(params, 'Schedule slot identity is invalid.');
  }
  const control = await step.do('read-editorial-control', () => readControl(env.DB));
  if (control.paused) return held(params, 'Editorial publishing is paused.');

  const existing = await step.do('read-existing-slot-result', () => env.DB.prepare(`SELECT id, action, result_json, created_at
    FROM editorial_receipts WHERE id = ?`).bind(`slot-result:${params.slot_claim_id}`).first<ReceiptRow>());
  if (existing) return resultFromReceipt(params, existing);

  const policy = await step.do('read-approved-editorial-policy', () => parseEditorialPolicy(env.EDITORIAL_POLICY_JSON));
  if (!policy) {
    const reason = 'Editorial policy is not configured.';
    await step.do('record-policy-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_POLICY_UNCONFIGURED', { reason, owner_epoch: control.owner_epoch }));
    return held(params, reason);
  }

  let catalog: CatalogItem[];
  try {
    catalog = await step.do('read-public-content-index', () => readCatalog(fetch));
  } catch {
    const reason = 'The public content index is unavailable or invalid.';
    await step.do('record-content-index-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_CONTENT_INDEX_UNAVAILABLE', { reason, owner_epoch: control.owner_epoch }));
    return held(params, reason);
  }

  const now = await step.do('capture-editorial-run-time', () => new Date().toISOString());
  const knowledge = await step.do('read-authorized-public-knowledge', () => readKnowledge(env.DB, new Date(now)));
  const historyRows = await step.do('read-recent-editorial-history', async () => {
    const [receipts, candidates] = await Promise.all([
      env.DB.prepare('SELECT id, action, result_json, created_at FROM editorial_receipts ORDER BY created_at DESC LIMIT ?').bind(HISTORY_LIMIT).all<ReceiptRow>(),
      env.DB.prepare('SELECT id, state, revision, payload_json FROM editorial_candidates ORDER BY updated_at DESC LIMIT ?').bind(HISTORY_LIMIT).all<CandidateRow>(),
    ]);
    return { receipts: receipts.results ?? [], candidates: candidates.results ?? [] };
  });
  const history = historyFromRows(historyRows.receipts, historyRows.candidates);
  const sources = (sourceRegistry as SourceConfig[]).slice(0, policy.max_fetches_per_scan);
  const batch = await step.do('collect-dated-public-signals', () => collectSignals(sources, new Date(now), fetch));
  if (!batch.signals.length && batch.failures.length) {
    const reason = 'Public source reads failed; the run cannot conclude NO_CHANGE.';
    await step.do('record-source-read-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_SOURCE_UNAVAILABLE', {
      reason, owner_epoch: control.owner_epoch, source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })), signals: [],
    }));
    return held(params, reason);
  }

  const decisions = await step.do('select-actions-from-dated-signals', () => batch.signals.map((signal) => ({ signal, decision: chooseAction(signal, catalog, knowledge, history, new Date(now)) })));
  const actionable = decisions.filter((row): row is { signal: Signal; decision: Extract<ActionDecision, { candidate: Candidate }> } => 'candidate' in row.decision)
    .slice(0, policy.max_candidates_per_scan);
  const noChangeSignals = decisions.filter((row) => row.decision.action === 'NO_CHANGE');
  if (!actionable.length) {
    if (batch.failures.length) {
      const reason = 'Some public source reads failed; the run cannot certify NO_CHANGE.';
      await step.do('record-partial-source-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_SOURCE_PARTIAL_FAILURES', {
        reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory),
        source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })),
      }));
      return held(params, reason);
    }
    const reason = batch.signals.length ? 'No fresh public signal qualifies for a site change.' : 'No fresh public signals were found.';
    await step.do('record-no-change-result', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'NO_CHANGE', {
      reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory),
      no_change_reasons: noChangeSignals.map(({ signal, decision }) => ({ signal_id: signal.id, reason: decision.action === 'NO_CHANGE' ? decision.reason : '' })),
      source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })),
    }));
    return { status: 'no_change', reason, slot_claim_id: params.slot_claim_id };
  }

  for (const { signal, decision } of actionable) {
    const candidate = decision.candidate;
    await step.do(`persist-held-candidate-${candidate.id.slice(0, 48)}`, () => persistHeldCandidate(env.DB, candidate, signal, policy));
  }
  const reason = 'Candidate awaits configured author, reviewer, publisher, and readback adapters.';
  const first = actionable[0];
  await step.do('record-provider-adapter-hold', () => recordReceipt(env.DB, params.slot_claim_id, first.decision.candidate.id, 'HELD_PROVIDER_UNCONFIGURED', {
    reason, owner_epoch: control.owner_epoch, candidates: actionable.map(({ decision }) => decision.candidate.id),
    signals: actionable.map(({ signal }) => signalHistory(signal)),
    held_candidates: actionable.map(({ signal, decision }) => ({ candidate_id: decision.candidate.id, signal_id: signal.id, state: 'HELD' })),
  }));
  return held(params, reason);
}
