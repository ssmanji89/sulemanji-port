import sourceRegistry from '../../config/public-sources.json' with { type: 'json' };
import type { ActionDecision, Candidate, CatalogItem, EditorialEnv, PublicKnowledge, RecentHistory, Signal, SignalBatch, SourceConfig, SourceFailure } from './contracts.js';
import { collectSignals } from './sources.js';
import { chooseAction } from './relevance.js';
import { fingerprintPublicKnowledge, getPublicKnowledge } from './knowledge.js';
import { nextChicagoBudgetDay, parseEditorialPolicy, readScheduleClaim, scheduleWorkflowId, type EditorialPolicy } from './scheduler.js';
import { readControl } from './state.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';
import { fixtureSiteFetcher } from './site-readback.js';
import type { DeferredReview } from './pipeline.js';

export type DurableStep = {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
  sleep(name: string, milliseconds: number): Promise<void>;
};
export type CandidateProcessOutcome = { status: 'verified'; reason: string }
  | { status: 'held'; reason: string; continue_after_hold?: true };
export type EditorialCandidateProcessor = {
  reconcileMergeCapacity?(ownerEpoch: number): Promise<void>;
  processCandidate(input: {
    candidate: Candidate;
    signal: Signal;
    catalog: CatalogItem[];
    knowledge: PublicKnowledge[];
    policy: EditorialPolicy;
    owner_epoch: number;
    step: DurableStep;
    resumeCapacity?: DeferredReview;
  }): Promise<CandidateProcessOutcome>;
};
type EditorialWorkflowEnv = EditorialEnv & { EDITORIAL_POLICY_JSON?: string };
type ReceiptRow = { id: string; action: string; result_json: string; created_at: string };
type CandidateRow = { id: string; state: string; revision: string; payload_json: string };
type SourceStateRow = { source_id: string; fetched_at: string; signals_json: string };
type SourceAttemptRow = { source_id: string; last_attempt_at: string; retry_after: string | null; consecutive_failures: number; last_failure_code: string | null };
type SignalHistory = { id: string; source_revision: string; episode_id: string; topic_ids: string[] };
type GuardedFetcher = { fetcher: typeof fetch; isStale: () => boolean; isCurrent: () => Promise<boolean>; requestsUsed: () => number };

const CONTENT_INDEX_URL = 'https://www.sulemanji.com/content-index.json';
const MAX_INDEX_BYTES = 1_048_576;
const HISTORY_LIMIT = 1_000;

function parseJson<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function readCatalog(fetcher: typeof fetch): Promise<CatalogItem[]> {
  const response = await fetcher(CONTENT_INDEX_URL, { redirect: 'manual', headers: { accept: 'application/json' } });
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

export async function readKnowledge(db: D1Database, now: Date): Promise<PublicKnowledge[]> {
  const rows = await db.prepare(`SELECT DISTINCT subject_id FROM public_knowledge
    WHERE action = 'UPSERT' AND expires_at > ? ORDER BY subject_id LIMIT 100`).bind(now.toISOString()).all<{ subject_id: string }>();
  const items: PublicKnowledge[] = [];
  for (const row of rows.results ?? []) {
    const knowledge = await getPublicKnowledge(row.subject_id, db, now);
    if (knowledge) items.push(knowledge);
  }
  return items;
}

type CandidatePayload = {
  candidate?: Candidate;
  signal?: SignalHistory;
  owner_epoch?: number;
  awaiting_processing?: true;
  processing_slot?: string;
};
type PendingCandidate = { row: CandidateRow; candidate: Candidate; signal: SignalHistory; slot?: string };

function pendingCandidates(receipts: ReceiptRow[], candidates: CandidateRow[], ownerEpoch: number,
  currentSlot: string): Map<string, PendingCandidate> {
  const legacyHolds = new Set<string>();
  const completedSlots = new Set(receipts.filter((row) => row.action !== 'HELD_CANDIDATE_RECONCILIATION').map((row) => row.id));
  for (const row of receipts) {
    if (row.action !== 'HELD_PROVIDER_UNCONFIGURED') continue;
    const result = parseJson<{ owner_epoch?: number; candidates?: string[] }>(row.result_json);
    if (result?.owner_epoch === ownerEpoch && Array.isArray(result.candidates)) {
      for (const id of result.candidates) legacyHolds.add(id);
    }
  }
  const pending = new Map<string, PendingCandidate>();
  for (const row of candidates) {
    const payload = parseJson<CandidatePayload>(row.payload_json);
    const { candidate, signal, processing_slot: slot } = payload ?? {};
    if (payload?.owner_epoch !== ownerEpoch || candidate?.id !== row.id ||
        !signal || signal.source_revision !== row.revision || !Array.isArray(candidate.signal_ids) ||
        !candidate.signal_ids.includes(signal.id)) continue;
    if (slot) {
      if (completedSlots.has(`slot-result:${slot}`) ||
          (slot !== currentSlot && !['HELD', 'DRAFTED', 'REVIEWED', 'SOURCE_PUBLISHED'].includes(row.state))) continue;
    } else if (row.state !== 'HELD' || (!payload.awaiting_processing && !legacyHolds.has(row.id))) continue;
    pending.set(row.id, { row, candidate, signal, slot });
  }
  return pending;
}

function historyFromRows(receipts: ReceiptRow[], candidates: CandidateRow[], pending: Map<string, PendingCandidate>): RecentHistory {
  const sourceRevisions = new Set<string>();
  const episodeIds = new Set<string>();
  const recentTopics = new Set<string>();
  const heldSignals = new Set([...pending.values()].map(({ signal }) => signal.id));
  const rememberSignal = (signal: SignalHistory, skipProviderHolds = false) => {
    if (skipProviderHolds && heldSignals.has(signal.id)) return;
    if (signal.source_revision) sourceRevisions.add(signal.source_revision);
    if (signal.episode_id) episodeIds.add(signal.episode_id);
    for (const topic of signal.topic_ids ?? []) recentTopics.add(topic);
  };
  for (const row of receipts) {
    const result = parseJson<{ signals?: SignalHistory[]; topic_ids?: string[] }>(row.result_json);
    for (const signal of result?.signals ?? []) rememberSignal(signal, true);
    for (const topic of result?.topic_ids ?? []) recentTopics.add(topic);
  }
  const priorCandidates: Candidate[] = [];
  for (const row of candidates) {
    if (pending.has(row.id)) continue;
    const payload = parseJson<CandidatePayload>(row.payload_json);
    if (payload?.candidate && typeof payload.candidate.id === 'string') priorCandidates.push(payload.candidate);
    if (payload?.signal) rememberSignal(payload.signal);
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

async function persistHeldCandidate(db: D1Database, candidate: Candidate, signal: Signal, policy: EditorialPolicy,
  ownerEpoch: number): Promise<boolean> {
  const payload = { candidate: { ...candidate, policy_revision: policy.revision }, signal: signalHistory(signal),
    owner_epoch: ownerEpoch, awaiting_processing: true };
  const payloadJson = JSON.stringify(payload);
  await db.prepare(`INSERT OR IGNORE INTO editorial_candidates(id, state, revision, payload_json, updated_at)
    SELECT ?, 'HELD', ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(candidate.id, candidate.source_digest, payloadJson, new Date().toISOString(), ownerEpoch).run();
  const saved = await db.prepare('SELECT id, state, revision, payload_json FROM editorial_candidates WHERE id = ?')
    .bind(candidate.id).first<CandidateRow>();
  const previous = saved && parseJson<CandidatePayload>(saved.payload_json);
  if (!saved || previous?.owner_epoch !== ownerEpoch) return false;
  if (saved.revision !== candidate.source_digest || previous.candidate?.id !== candidate.id ||
      previous.signal?.id !== signal.id) throw new Error('WORKFLOW_CANDIDATE_CONFLICT');
  return true;
}

async function claimCandidateForProcessing(db: D1Database, candidate: Candidate, signal: Signal, policy: EditorialPolicy,
  ownerEpoch: number, slotId: string, pending: PendingCandidate | undefined): Promise<boolean> {
  const saved = await db.prepare('SELECT id, state, revision, payload_json FROM editorial_candidates WHERE id = ?')
    .bind(candidate.id).first<CandidateRow>();
  const previous = saved && parseJson<CandidatePayload>(saved.payload_json);
  if (!saved || previous?.owner_epoch !== ownerEpoch || saved.state !== 'HELD' || saved.revision !== candidate.source_digest ||
      previous.signal?.id !== signal.id || (previous.processing_slot && previous.processing_slot !== slotId) ||
      (!previous.processing_slot && !previous.awaiting_processing && !pending)) return false;

  const payload = { candidate: { ...candidate, policy_revision: policy.revision }, signal: signalHistory(signal),
    owner_epoch: ownerEpoch, processing_slot: slotId };
  // Recheck the exact row and external intents even when a restarted Workflow already owns the claim.
  const updated = await db.prepare(`UPDATE editorial_candidates SET payload_json = ?, updated_at = ?
    WHERE id = ? AND state = 'HELD' AND revision = ? AND payload_json = ? AND model_calls = 0 AND review_rounds = 0
      AND NOT EXISTS (SELECT 1 FROM usage_reservations WHERE candidate_id = editorial_candidates.id)
      AND NOT EXISTS (SELECT 1 FROM publication_effects WHERE candidate_id = editorial_candidates.id)
      AND EXISTS (SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?)`)
    .bind(JSON.stringify(payload), new Date().toISOString(), candidate.id, candidate.source_digest, saved.payload_json, ownerEpoch).run();
  return (updated.meta.changes ?? 0) === 1;
}

type DeferredPublication = DeferredReview & { candidate: Candidate; signal: Signal };

export async function claimDeferredPublication(db: D1Database, slotId: string, now: Date, ownerEpoch: number): Promise<DeferredPublication | null> {
  // A failed Workflow leaves the candidate available for a later date. Replaying the same claim is idempotent.
  const retryAfter = new Date(Math.max(nextChicagoBudgetDay(now), now.getTime() + 3_600_000)).toISOString();
  const claimed = await db.prepare(`UPDATE editorial_candidates SET publication_retry_claim = ?, publication_retry_after = ?
    WHERE id = (
      SELECT id FROM editorial_candidates WHERE state = 'CAPACITY_HELD'
        AND json_extract(payload_json, '$.owner_epoch') = ?
        AND (publication_retry_claim = ? OR publication_retry_after <= ?)
      ORDER BY CASE WHEN publication_retry_claim = ? THEN 0 ELSE 1 END, publication_retry_after, id LIMIT 1
    ) AND EXISTS (SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?)
    RETURNING id, revision, payload_json`)
    .bind(slotId, retryAfter, ownerEpoch, slotId, now.toISOString(), slotId, ownerEpoch).first<CandidateRow>();
  if (!claimed) return null;
  const data = parseJson<{ candidate?: Candidate; pipeline?: Partial<DeferredPublication> }>(claimed.payload_json);
  const { candidate, pipeline } = data ?? {};
  const { proposal, review, attempt, signal } = pipeline ?? {};
  if (!candidate || candidate.id !== claimed.id || candidate.source_digest !== claimed.revision ||
      !proposal || proposal.candidate_id !== candidate.id || proposal.owner_epoch !== ownerEpoch ||
      !review || review.candidate_id !== candidate.id || review.owner_epoch !== ownerEpoch ||
      !attempt || attempt.candidate_id !== candidate.id || attempt.owner_epoch !== ownerEpoch || !attempt.pull_request ||
      attempt.status !== 'CAPACITY_HELD' || !signal || !Array.isArray(candidate.signal_ids) || !candidate.signal_ids.includes(signal.id)) throw new Error('DEFERRED_PUBLICATION_CHECKPOINT_INVALID');
  return { candidate, signal, proposal, review, attempt, claim: slotId };
}

function held(params: WorkflowParams, reason: string): WorkflowResult {
  return { status: 'held', reason, slot_claim_id: params.slot_claim_id };
}

function resultFromReceipt(params: WorkflowParams, receipt: ReceiptRow, ownerEpoch: number): WorkflowResult {
  const result = parseJson<{ reason?: string; owner_epoch?: number }>(receipt.result_json);
  if (result?.owner_epoch !== ownerEpoch) return held(params, 'The durable slot result belongs to an earlier owner epoch.');
  const status = receipt.action === 'NO_CHANGE' ? 'no_change' : receipt.action === 'VERIFIED' ? 'admitted' : 'held';
  return { status, reason: result?.reason ?? 'A durable result already exists for this slot.', slot_claim_id: params.slot_claim_id };
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

function createGuardedFetcher(db: D1Database, ownerEpoch: number, fetcher: typeof fetch, requestLimit?: number): GuardedFetcher {
  let stale = false;
  let requests = 0;
  const isCurrent = async (): Promise<boolean> => {
    if (stale) return false;
    const control = await readControl(db);
    if (control.paused || control.owner_epoch !== ownerEpoch) stale = true;
    return !stale;
  };
  return {
    isStale: () => stale,
    isCurrent,
    requestsUsed: () => requests,
    fetcher: async (input, init) => {
      if (!(await isCurrent())) throw new Error('OWNER_CHANGED');
      if (requestLimit !== undefined && requests >= requestLimit) throw new Error('LIMIT');
      requests += 1;
      return fetcher(input, init);
    },
  };
}

async function persistSourceAttempt(db: D1Database, attempt: SourceAttemptRow, ownerEpoch: number): Promise<boolean> {
  const saved = await db.prepare(`INSERT OR REPLACE INTO editorial_source_attempts(
      source_id, last_attempt_at, retry_after, consecutive_failures, last_failure_code
    ) SELECT ?, ?, ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(attempt.source_id, attempt.last_attempt_at, attempt.retry_after, attempt.consecutive_failures,
      attempt.last_failure_code, ownerEpoch).run();
  return (saved.meta?.changes ?? 0) > 0;
}

function failedAttempt(source: SourceConfig, prior: SourceAttemptRow | undefined, now: Date, code: SourceFailure['code']): SourceAttemptRow {
  const consecutiveFailures = (prior?.consecutive_failures ?? 0) + 1;
  const baseSeconds = Math.max(60, source.min_interval_seconds);
  const ceilingSeconds = Math.max(7 * 24 * 60 * 60, baseSeconds);
  const retrySeconds = Math.min(baseSeconds * (2 ** Math.min(consecutiveFailures - 1, 10)), ceilingSeconds);
  return {
    source_id: source.id,
    last_attempt_at: now.toISOString(),
    retry_after: new Date(now.getTime() + retrySeconds * 1000).toISOString(),
    consecutive_failures: consecutiveFailures,
    last_failure_code: code,
  };
}

function successfulAttempt(sourceId: string, now: Date): SourceAttemptRow {
  return { source_id: sourceId, last_attempt_at: now.toISOString(), retry_after: null, consecutive_failures: 0, last_failure_code: null };
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
  fetcher: GuardedFetcher): Promise<{ signals: Signal[]; failures: SignalBatch['failures']; uncovered: string[]; stale: boolean }> {
  const enabled = sources.filter((source) => source.enabled);
  const [stateResult, attemptResult] = await Promise.all([
    db.prepare('SELECT source_id, fetched_at, signals_json FROM editorial_source_state LIMIT 100').all<SourceStateRow>(),
    db.prepare('SELECT source_id, last_attempt_at, retry_after, consecutive_failures, last_failure_code FROM editorial_source_attempts LIMIT 100').all<SourceAttemptRow>(),
  ]);
  const stateRows = stateResult.results ?? [];
  const states = new Map(stateRows.map((row) => [row.source_id, row]));
  const attempts = new Map((attemptResult.results ?? []).map((row) => [row.source_id, row]));
  if (!(await fetcher.isCurrent())) return { signals: [], failures: [], uncovered: [], stale: true };
  const due = enabled.filter((source) => sourceDue(source, states.get(source.id), now));
  const retryBlocked = due.filter((source) => {
    const retryAfter = attempts.get(source.id)?.retry_after;
    return retryAfter !== null && retryAfter !== undefined && Number.isFinite(Date.parse(retryAfter)) && Date.parse(retryAfter) > now.getTime();
  });
  const retryBlockedIds = new Set(retryBlocked.map((source) => source.id));
  const ready = due.filter((source) => !retryBlockedIds.has(source.id));
  const originalOrder = new Map(enabled.map((source, index) => [source.id, index]));
  ready.sort((left, right) => {
    const leftLast = attempts.get(left.id)?.last_attempt_at ?? states.get(left.id)?.fetched_at;
    const rightLast = attempts.get(right.id)?.last_attempt_at ?? states.get(right.id)?.fetched_at;
    const leftTime = leftLast && Number.isFinite(Date.parse(leftLast)) ? Date.parse(leftLast) : Number.NEGATIVE_INFINITY;
    const rightTime = rightLast && Number.isFinite(Date.parse(rightLast)) ? Date.parse(rightLast) : Number.NEGATIVE_INFINITY;
    return leftTime - rightTime || (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
  });
  const signals: Signal[] = [];
  const failures: SignalBatch['failures'] = [];
  const uncovered = retryBlocked.map((source) => source.id);
  const attempted = new Set<string>();

  for (const source of enabled) {
    if (!due.some((item) => item.id === source.id)) {
      const cached = parseCachedSignals(source.id, states.get(source.id), now);
      if (cached === null) uncovered.push(source.id);
      else signals.push(...cached);
    }
  }

  for (const source of ready) {
    if (fetcher.requestsUsed() >= maxFetches) break;
    if (!(await fetcher.isCurrent())) return { signals: [], failures: [], uncovered: [], stale: true };
    attempted.add(source.id);
    const batch = await collectSignals([source], now, fetcher.fetcher);
    if (fetcher.isStale() || !(await fetcher.isCurrent())) return { signals: [], failures: [], uncovered: [], stale: true };
    if (batch.failures.length) {
      failures.push(...batch.failures);
      uncovered.push(source.id);
      const attemptedAt = now;
      const persistedAttempt = await persistSourceAttempt(db, failedAttempt(source, attempts.get(source.id), attemptedAt, batch.failures[0].code), ownerEpoch);
      if (!persistedAttempt) return { signals: [], failures: [], uncovered: [], stale: true };
      continue;
    }
    const fetchedAt = now;
    const persisted = await persistSourceState(db, source.id, fetchedAt.toISOString(), batch.signals, ownerEpoch);
    if (!persisted) return { signals: [], failures: [], uncovered: [], stale: true };
    const persistedAttempt = await persistSourceAttempt(db, successfulAttempt(source.id, fetchedAt), ownerEpoch);
    if (!persistedAttempt) return { signals: [], failures: [], uncovered: [], stale: true };
    signals.push(...batch.signals);
  }
  for (const source of ready) if (!attempted.has(source.id)) uncovered.push(source.id);

  const seen = new Set<string>();
  const uniqueSignals = signals.filter((signal) => {
    if (seen.has(signal.episode_id)) return false;
    seen.add(signal.episode_id);
    return true;
  });
  return { signals: uniqueSignals, failures, uncovered: [...new Set(uncovered)], stale: fetcher.isStale() };
}

export async function runEditorialAdmission(params: WorkflowParams, env: EditorialWorkflowEnv, step: DurableStep, workflowInstanceId: string,
  processor?: EditorialCandidateProcessor): Promise<WorkflowResult> {
  if (!params.slot_claim_id || params.slot_claim_id.length > 128 || !/^[a-zA-Z0-9:_-]+$/.test(params.slot_claim_id)) {
    return held(params, 'Schedule slot identity is invalid.');
  }
  const control = await step.do('read-editorial-control', () => readControl(env.DB));
  if (control.paused) return held(params, 'Editorial publishing is paused.');
  const claim = await step.do('read-editorial-slot-claim', () => readScheduleClaim(env.DB, params.slot_claim_id, control.owner_epoch));
  if (!claim || workflowInstanceId !== scheduleWorkflowId(claim)) {
    return held(params, 'No current schedule claim matches this Workflow instance.');
  }

  // A replay can carry a cached miss from before this slot wrote its final receipt.
  const existing = await env.DB.prepare(`SELECT id, action, result_json, created_at
    FROM editorial_receipts WHERE id = ?`).bind(`slot-result:${params.slot_claim_id}`).first<ReceiptRow>();
  if (existing) return resultFromReceipt(params, existing, control.owner_epoch);

  const policy = await step.do('read-approved-editorial-policy', () => parseEditorialPolicy(env.EDITORIAL_POLICY_JSON));
  if (!policy) {
    const reason = 'Editorial policy is not configured.';
    const saved = await step.do('record-policy-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_POLICY_UNCONFIGURED', { reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
    return held(params, reason);
  }

  let catalog: CatalogItem[];
  const catalogReader = env.DEPLOYMENT_ENV === 'staging' ? fixtureSiteFetcher(env.EDITORIAL_FIXTURE_SITE) : fetch;
  const catalogFetcher = createGuardedFetcher(env.DB, control.owner_epoch, catalogReader);
  try {
    catalog = await step.do('read-public-content-index', () => readCatalog(catalogFetcher.fetcher));
  } catch {
    if (catalogFetcher.isStale() || !(await catalogFetcher.isCurrent())) return held(params, 'Workflow authority changed during the content-index read.');
    const reason = 'The public content index is unavailable or invalid.';
    const saved = await step.do('record-content-index-hold', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'HELD_CONTENT_INDEX_UNAVAILABLE', { reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
    return held(params, reason);
  }
  if (catalogFetcher.isStale() || !(await catalogFetcher.isCurrent())) return held(params, 'Workflow authority changed during the content-index read.');

  const now = await step.do('capture-editorial-run-time', () => new Date().toISOString());
  const knowledge = await step.do('read-authorized-public-knowledge', () => readKnowledge(env.DB, new Date(now)));
  const knowledgeRevision = await step.do('fingerprint-authorized-public-knowledge', () => fingerprintPublicKnowledge(knowledge));
  if (processor?.reconcileMergeCapacity) await step.do('reconcile-publication-capacity', async () => {
    await processor.reconcileMergeCapacity?.(control.owner_epoch);
    return true;
  });
  const pending = processor ? await step.do('claim-deferred-publication', () =>
    claimDeferredPublication(env.DB, params.slot_claim_id, new Date(now), control.owner_epoch)) : null;
  const retry = pending && processor ? await processor.processCandidate({
    candidate: pending.candidate, signal: pending.signal, catalog, knowledge, policy,
    owner_epoch: control.owner_epoch, step, resumeCapacity: pending,
  }) : null;
  if (pending && retry && (retry.status === 'verified' || !retry.continue_after_hold)) {
    const action = retry.status === 'verified' ? 'VERIFIED' : 'HELD_PUBLICATION_PIPELINE';
    const saved = await step.do('record-deferred-publication-result', () => recordReceipt(env.DB,
      params.slot_claim_id, pending.candidate.id, action, { reason: retry.reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the deferred publication result could be recorded.');
    return retry.status === 'verified' ? { status: 'admitted', reason: retry.reason, slot_claim_id: params.slot_claim_id } : held(params, retry.reason);
  }
  const historyRows = await step.do('read-recent-editorial-history', async () => {
    const [receipts, candidates] = await Promise.all([
      env.DB.prepare('SELECT id, action, result_json, created_at FROM editorial_receipts ORDER BY created_at DESC LIMIT ?').bind(HISTORY_LIMIT).all<ReceiptRow>(),
      env.DB.prepare(`SELECT id, state, revision, payload_json FROM editorial_candidates
        ORDER BY CASE WHEN json_valid(payload_json) THEN COALESCE(json_extract(payload_json, '$.processing_slot') = ?, 0) ELSE 0 END DESC,
          updated_at DESC LIMIT ?`).bind(params.slot_claim_id, HISTORY_LIMIT).all<CandidateRow>(),
    ]);
    return { receipts: receipts.results ?? [], candidates: candidates.results ?? [] };
  });
  const pendingWork = pendingCandidates(historyRows.receipts, historyRows.candidates, control.owner_epoch, params.slot_claim_id);
  const history = historyFromRows(historyRows.receipts, historyRows.candidates, pendingWork);
  const reconciliationReason = 'The candidate is already being processed or has a prior attempt to reconcile.';
  const sources = sourceRegistry as SourceConfig[];
  const sourceFetcher = createGuardedFetcher(env.DB, control.owner_epoch, fetch, policy.max_fetches_per_scan);
  const batch = await step.do('collect-dated-public-signals-v3', () => collectCoveredSignals(sources, policy.max_fetches_per_scan, new Date(now), env.DB, control.owner_epoch, sourceFetcher));
  if (batch.stale || sourceFetcher.isStale() || !(await sourceFetcher.isCurrent())) return held(params, 'Workflow authority changed during public-source discovery.');
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
  const selectedIds = new Set(actionable.map(({ decision }) => decision.candidate.id));
  const unreconciled = [...pendingWork.values()].filter((work) => work.slot &&
    (work.slot !== params.slot_claim_id || work.row.state !== 'HELD' || !selectedIds.has(work.candidate.id) || !processor));
  const heldTargets = new Set(unreconciled.flatMap(({ candidate }) => candidate.target_id ? [candidate.target_id] : []));
  const needsReconciliation = new Map(unreconciled.map(({ candidate }) => [candidate.id,
    { candidate_id: candidate.id, status: 'held' as const, reason: reconciliationReason }]));
  const reconciliationHold = async () => {
    const outcomes = [...needsReconciliation.values()];
    if (!outcomes.length) throw new Error('WORKFLOW_RECONCILIATION_MISSING');
    const saved = await step.do('record-candidate-reconciliation-hold', () => recordReceipt(env.DB,
      params.slot_claim_id, outcomes[0].candidate_id, 'HELD_CANDIDATE_RECONCILIATION',
      { reason: reconciliationReason, owner_epoch: control.owner_epoch, outcomes }, control.owner_epoch));
    return held(params, saved ? reconciliationReason : 'Workflow authority changed before the reconciliation hold could be recorded.');
  };
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
    if (pending && retry) {
      const saved = await step.do('record-deferred-publication-hold', () => recordReceipt(env.DB,
        params.slot_claim_id, pending.candidate.id, 'HELD_PUBLICATION_PIPELINE',
        { reason: retry.reason, owner_epoch: control.owner_epoch }, control.owner_epoch));
      if (!saved) return held(params, 'Workflow authority changed before the deferred publication hold could be recorded.');
      return held(params, retry.reason);
    }
    if (needsReconciliation.size) return reconciliationHold();
    const reason = batch.signals.length ? 'No fresh public signal qualifies for a site change.' : 'No fresh public signals were found.';
    const saved = await step.do('record-no-change-result', () => recordReceipt(env.DB, params.slot_claim_id, params.slot_claim_id, 'NO_CHANGE', {
      reason, owner_epoch: control.owner_epoch, signals: batch.signals.map(signalHistory),
      no_change_reasons: noChangeSignals.map(({ signal, decision }) => ({ signal_id: signal.id, reason: decision.action === 'NO_CHANGE' ? decision.reason : '' })),
      source_failures: batch.failures.map(({ source_id, code }) => ({ source_id, code })),
    }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before NO_CHANGE could be recorded.');
    return { status: 'no_change', reason, slot_claim_id: params.slot_claim_id };
  }

  const ready: typeof actionable = [];
  for (const entry of actionable) {
    const { signal, decision } = entry;
    const candidate = { ...decision.candidate, knowledge_revision: knowledgeRevision };
    if (needsReconciliation.has(candidate.id)) continue;
    const saved = await step.do(`persist-held-candidate-${candidate.id.slice(0, 48)}`, () =>
      persistHeldCandidate(env.DB, candidate, signal, policy, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the candidate could be recorded.');
    ready.push(entry);
  }
  if (!ready.length) return reconciliationHold();
  if (processor) {
    const outcomes: Array<{ candidate_id: string; status: CandidateProcessOutcome['status']; reason: string }> = [...needsReconciliation.values()];
    if (pending?.candidate.target_id) heldTargets.add(pending.candidate.target_id);
    let stopReason: string | undefined;
    for (const { signal, decision } of ready) {
      if (!(await sourceFetcher.isCurrent())) return held(params, 'Workflow authority changed before the next candidate.');
      const candidate = { ...decision.candidate, knowledge_revision: knowledgeRevision };
      if (candidate.target_id && heldTargets.has(candidate.target_id)) {
        outcomes.push({ candidate_id: candidate.id, status: 'held', reason: 'Another candidate for this item requires review.' });
        continue;
      }
      const claimed = await step.do(`claim-candidate-${candidate.id.slice(0, 48)}`, () =>
        claimCandidateForProcessing(env.DB, candidate, signal, policy, control.owner_epoch, params.slot_claim_id, pendingWork.get(candidate.id)));
      if (!claimed) {
        if (!(await sourceFetcher.isCurrent())) return held(params, 'Workflow authority changed before the candidate could be claimed.');
        if (candidate.target_id) heldTargets.add(candidate.target_id);
        const outcome = { candidate_id: candidate.id, status: 'held' as const, reason: reconciliationReason };
        needsReconciliation.set(candidate.id, outcome);
        outcomes.push(outcome);
        continue;
      }
      const outcome = await processor.processCandidate({ candidate, signal, catalog, knowledge, policy,
        owner_epoch: control.owner_epoch, step });
      outcomes.push({ candidate_id: candidate.id, status: outcome.status, reason: outcome.reason });
      if (outcome.status === 'held') {
        if (!outcome.continue_after_hold) {
          stopReason = outcome.reason;
          break;
        }
        if (candidate.target_id) heldTargets.add(candidate.target_id);
      }
    }
    if (outcomes.length === needsReconciliation.size && needsReconciliation.size) return reconciliationHold();
    const verified = !retry && outcomes.length === actionable.length && outcomes.every((outcome) => outcome.status === 'verified');
    const reason = verified ? 'All admitted candidates passed publication and public readback.' :
      stopReason ?? retry?.reason ?? outcomes.find((outcome) => outcome.status === 'held')?.reason ?? 'Candidate processing did not complete.';
    const action = verified ? 'VERIFIED' : 'HELD_PUBLICATION_PIPELINE';
    const saved = await step.do('record-candidate-pipeline-result', () => recordReceipt(env.DB, params.slot_claim_id,
      ready[0].decision.candidate.id, action, { reason, owner_epoch: control.owner_epoch, outcomes, ...(pending && retry ?
        { deferred_candidate: { candidate_id: pending.candidate.id, status: retry.status, reason: retry.reason } } : {}) }, control.owner_epoch));
    if (!saved) return held(params, 'Workflow authority changed before the publication result could be recorded.');
    return verified ? { status: 'admitted', reason, slot_claim_id: params.slot_claim_id } : held(params, reason);
  }
  const reason = 'Candidate awaits configured author, reviewer, publisher, and readback adapters.';
  const first = ready[0];
  const saved = await step.do('record-provider-adapter-hold', () => recordReceipt(env.DB, params.slot_claim_id, first.decision.candidate.id, 'HELD_PROVIDER_UNCONFIGURED', {
    reason, owner_epoch: control.owner_epoch, candidates: ready.map(({ decision }) => decision.candidate.id),
    signals: ready.map(({ signal }) => signalHistory(signal)),
    held_candidates: ready.map(({ signal, decision }) => ({ candidate_id: decision.candidate.id, signal_id: signal.id, state: 'HELD' })),
  }, control.owner_epoch));
  if (!saved) return held(params, 'Workflow authority changed before the hold could be recorded.');
  return held(params, reason);
}
