import sourceRegistry from '../../config/public-sources.json' with { type: 'json' };
import type { ActionDecision, Candidate, CatalogItem, EditorialEnv, PublicKnowledge, RecentHistory, Signal, SignalBatch, SourceConfig } from './contracts.js';
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
type SourceStateRow = { source_id: string; fetched_at: string; signals_json: string };
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

async function recordReceipt(db: D1Database, slotId: string, candidateId: string, action: string, result: Record<string, unknown>, ownerEpoch: number): Promise<boolean> {
  const id = `slot-result:${slotId}`;
  const resultJson = JSON.stringify(result);
  await db.prepare(`INSERT OR IGNORE INTO editorial_receipts(id, candidate_id, action, result_json, created_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(id, candidateId, action, resultJson, new Date().toISOString(), ownerEpoch).run();
  const saved = await db.prepare('SELECT id, action, result_json, created_at FROM editorial_receipts WHERE id = ?').bind(id).first<ReceiptRow>();
  if (!saved) return false;
  if (saved.action !== action || saved.result_json !== resultJson) throw new Error('WORKFLOW_RECEIPT_CONFLICT');
  return parseJson<{ owner_epoch?: number }>(saved.result_json)?.owner_epoch === ownerEpoch;
}

async function persistHeldCandidate(db: D1Database, candidate: Candidate, signal: Signal, policy: EditorialPolicy, ownerEpoch: number): Promise<boolean> {
  const boundCandidate = { ...candidate, policy_revision: policy.revision };
  const payload = { candidate: boundCandidate, signal: signalHistory(signal), owner_epoch: ownerEpoch };
  const payloadJson = JSON.stringify(payload);
  await db.prepare(`INSERT OR IGNORE INTO editorial_candidates(id, state, revision, payload_json, updated_at)
    SELECT ?, 'HELD', ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(candidate.id, candidate.source_digest, payloadJson, new Date().toISOString(), ownerEpoch).run();
  const saved = await db.prepare('SELECT id, state, revision, payload_json FROM editorial_candidates WHERE id = ?').bind(candidate.id).first<CandidateRow>();
  if (!saved) return false;
  const savedPayload = parseJson<{ owner_epoch?: number }>(saved.payload_json);
  if (savedPayload?.owner_epoch !== ownerEpoch) return false;
  if (saved.payload_json !== payloadJson || saved.revision !== candidate.source_digest) throw new Error('WORKFLOW_CANDIDATE_CONFLICT');
  return true;
}

function held(params: WorkflowParams, reason: string): WorkflowResult {
  return { status: 'held', reason, slot_claim_id: params.slot_claim_id };
}

function resultFromReceipt(params: WorkflowParams, receipt: ReceiptRow, ownerEpoch: number): WorkflowResult {
  const result = parseJson<{ reason?: string; owner_epoch?: number }>(receipt.result_json);
  if (result?.owner_epoch !== ownerEpoch) return held(params, 'The durable slot result belongs to an earlier owner epoch.');
  return { status: receipt.action === 'NO_CHANGE' ? 'no_change' : 'held', reason: result?.reason ?? 'A durable result already exists for this slot.', slot_claim_id: params.slot_claim_id };
}

function parseCachedSignals(sourceId: string, row: SourceStateRow | undefined, now: Date): Signal[] | null {
  if (!row || !Number.isFinite(Date.parse(row.fetched_at))) return null;
  const signals = parseJson<Signal[]>(row.signals_json);
  if (!Array.isArray(signals) || signals.some((signal) => signal.source_id !== sourceId || !Number.isFinite(Date.parse(signal.expires_at)))) return null;
  return signals.filter((signal) => Date.parse(signal.expires_at) > now.getTime());
}

function sourceDue(source: SourceConfig, row: SourceStateRow | undefined, now: Date): boolean {
  if (!row || !Number.isFinite(Date.parse(row.fetched_at)) || !parseCachedSignals(source.id, row, now)) return true;
  return now.getTime() - Date.parse(row.fetched_at) >= source.min_interval_seconds * 1000;
}

async function persistSourceState(db: D1Database, sourceId: string, fetchedAt: string, signals: Signal[], ownerEpoch: number): Promise<boolean> {
  const signalsJson = JSON.stringify(signals);
  const written = await db.prepare(`INSERT OR REPLACE INTO editorial_source_state(source_id, fetched_at, signals_json)
    SELECT ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(sourceId, fetchedAt, signalsJson, ownerEpoch).run();
  return (written.meta?.changes ?? 0) > 0;
}

async function collectCoveredSignals(sources: SourceConfig[], maxFetches: number, now: Date, db: D1Database, ownerEpoch: number,
  fetcher: typeof fetch): Promise<{ signals: Signal[]; failures: SignalBatch['failures']; uncovered: string[] }> {
  const enabled = sources.filter((source) => source.enabled);
  const rows = await db.prepare('SELECT source_id, fetched_at, signals_json FROM editorial_source_state LIMIT 100').all<SourceStateRow>();
  const stateRows = rows.results ?? [];
  const states = new Map(stateRows.map((row) => [row.source_id, row]));
  const due = enabled.filter((source) => sourceDue(source, states.get(source.id), now));
  const toFetch = new Set(due.slice(0, maxFetches).map((source) => source.id));
  const unfetchedDue = due.slice(maxFetches).map((source) => source.id);
  const signals: Signal[] = [];
  const failures: SignalBatch['failures'] = [];
  const uncovered = [...unfetchedDue];

  for (const source of enabled) {
    if (!toFetch.has(source.id)) {
      if (unfetchedDue.includes(source.id)) continue;
      const cached = parseCachedSignals(source.id, states.get(source.id), now);
      if (cached === null) uncovered.push(source.id);
      else signals.push(...cached);
      continue;
    }
    const batch = await collectSignals([source], now, fetcher);
    if (batch.failures.length) {
      failures.push(...batch.failures);
      uncovered.push(source.id);
      continue;
    }
    const persisted = await persistSourceState(db, source.id, now.toISOString(), batch.signals, ownerEpoch);
    if (!persisted) {
      uncovered.push(source.id);
      continue;
    }
    signals.push(...batch.signals);
  }

  const seen = new Set<string>();
  const uniqueSignals = signals.filter((signal) => {
    if (seen.has(signal.episode_id)) return false;
    seen.add(signal.episode_id);
    return true;
  });
  return { signals: uniqueSignals, failures, uncovered: [...new Set(uncovered)] };
}

export async function runEditorialAdmission(params: WorkflowParams, env: EditorialWorkflowEnv, step: DurableStep): Promise<WorkflowResult> {
  if (!params.slot_claim_id || params.slot_claim_id.length > 128 || !/^[a-zA-Z0-9:_-]+$/.test(params.slot_claim_id)) {
    return held(params, 'Schedule slot identity is invalid.');
  }
  const control = await step.do('read-editorial-control', () => readControl(env.DB));
  if (control.paused) return held(params, 'Editorial publishing is paused.');

  const existing = await step.do('read-existing-slot-result', () => env.DB.prepare(`SELECT id, action, result_json, created_at
    FROM editorial_receipts WHERE id = ?`).bind(`slot-result:${params.slot_claim_id}`).first<ReceiptRow>());
  if (existing) return resultFromReceipt(params, existing, control.owner_epoch);

  const policy = await step.do('read-approved-editorial-policy', () => parseEditorialPolicy(env.EDITORIAL_POLICY_JSON));
  if (!policy) {
    const reason = 'Editorial policy is not configured.';
    const saved = await step.do('record-policy-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_POLICY_UNCONFIGURED', { reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
    return held(params, reason);
  }

  let catalog: CatalogItem[];
  try {
    catalog = await step.do('read-public-content-index', () => readCatalog(fetch));
  } catch {
    const reason = 'The public content index is unavailable or invalid.';
    const saved = await step.do('record-content-index-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_CONTENT_INDEX_UNAVAILABLE', { reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
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
  const sources = sourceRegistry as SourceConfig[];
  const batch = await step.do('collect-dated-public-signals-v2', () => collectCoveredSignals(sources, policy.max_fetches_per_scan, new Date(now), env.DB, control.owner_epoch, fetch));
  if (!batch.signals.length && batch.failures.length) {
    const reason = 'Public source reads failed; the run cannot conclude NO_CHANGE.';
    const saved = await step.do('record-source-read-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_SOURCE_UNAVAILABLE', {
      reason, owner_epoch: control.owner_epoch, source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })), signals: [],
    }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
    return held(params, reason);
  }

  const decisions = await step.do('select-actions-from-dated-signals', () => batch.signals.map((signal) => ({ signal, decision: chooseAction(signal, catalog, knowledge, history, new Date(now)) })));
  const actionable = decisions.filter((row): row is { signal: Signal; decision: Extract<ActionDecision, { candidate: Candidate }> } => 'candidate' in row.decision)
    .slice(0, policy.max_candidates_per_scan);
  const noChangeSignals = decisions.filter((row) => row.decision.action === 'NO_CHANGE');
  if (!actionable.length) {
    if (batch.failures.length) {
      const reason = 'Some public source reads failed; the run cannot certify NO_CHANGE.';
      const saved = await step.do('record-partial-source-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_SOURCE_PARTIAL_FAILURES', {
        reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory),
        source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })),
      }, control.owner_epoch));
      if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
      return held(params, reason);
    }
    if (batch.uncovered.length) {
      const reason = 'Enabled public sources remain uncovered by this scan.';
      const saved = await step.do('record-source-coverage-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_SOURCE_COVERAGE_INCOMPLETE', {
        reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory), uncovered_source_ids: batch.uncovered,
      }, control.owner_epoch));
      if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
      return held(params, reason);
    }
    const reason = batch.signals.length ? 'No fresh public signal qualifies for a site change.' : 'No fresh public signals were found.';
    const saved = await step.do('record-no-change-result', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'NO_CHANGE', {
      reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory),
      no_change_reasons: noChangeSignals.map(({ signal, decision }) => ({ signal_id: signal.id, reason: decision.action === 'NO_CHANGE' ? decision.reason : '' })),
      source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })),
    }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before NO_CHANGE could be recorded.');
    return { status: 'no_change', reason, slot_claim_id: params.slot_claim_id };
  }

  for (const { signal, decision } of actionable) {
    const candidate = decision.candidate;
    const saved = await step.do(`persist-held-candidate-${candidate.id.slice(0, 48)}`, () => persistHeldCandidate(env.DB, candidate, signal, policy, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the candidate could be recorded.');
  }
  const reason = 'Candidate awaits configured author, reviewer, publisher, and readback adapters.';
  const first = actionable[0];
  const saved = await step.do('record-provider-adapter-hold', () => recordReceipt(env.DB, params.slot_claim_id, first.decision.candidate.id, 'HELD_PROVIDER_UNCONFIGURED', {
    reason, owner_epoch: control.owner_epoch, candidates: actionable.map(({ decision }) => decision.candidate.id),
    signals: actionable.map(({ signal }) => signalHistory(signal)),
    held_candidates: actionable.map(({ signal, decision }) => ({ candidate_id: decision.candidate.id, signal_id: signal.id, state: 'HELD' })),
  }, control.owner_epoch));
  if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
  return held(params, reason);
}
