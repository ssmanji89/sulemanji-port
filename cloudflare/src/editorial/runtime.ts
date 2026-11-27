import sourceRegistry from '../../config/public-sources.json' with { type: 'json' };
import type { EditorialEnv, Candidate } from './contracts.js';
import type { Signal, SourceConfig } from './contracts.js';
import { parseEditorialPolicy, type EditorialPolicy } from './scheduler.js';
import { BudgetedModelGateway, JsonSchemaGateway, type ModelConfig } from './models.js';
import { GitHubApiPublisher } from './github.js';
import { D1PublishEffectStore } from './effects.js';
import { fingerprintPublicKnowledge } from './knowledge.js';
import { publishContent, verifyPublicationDetailed } from './publisher.js';
import { readControl } from './state.js';
import { readKnowledge } from './workflow-core.js';
import { revalidateSignalSourceDigest } from './sources.js';
import type { SocialCardRenderer } from './social-card-format.js';
import { createEditorialCandidatePipeline, type CandidateCheckpoint } from './pipeline.js';
import { fixtureSiteFetcher } from './site-readback.js';
import { articleSourcePath } from './review.js';
import { parseEditorialRuntimeSettings } from './runtime-settings.mjs';

export type EditorialRuntimeEnv = EditorialEnv & {
  EDITORIAL_POLICY_JSON?: string;
  EDITORIAL_MODEL_CONFIG_JSON?: string;
  EDITORIAL_MODEL_API_KEY?: string;
  EDITORIAL_GITHUB_CONFIG_JSON?: string;
  EDITORIAL_GITHUB_TOKEN?: string;
};
type CandidateRow = { state: string; revision: string; payload_json: string; publication_retry_claim: string | null };

async function persistCandidateCheckpoint(db: D1Database, candidateId: string, ownerEpoch: number,
  state: 'DRAFTED' | 'REVIEWED' | 'NEEDS_OWNER' | 'SOURCE_PUBLISHED' | 'CAPACITY_HELD' | 'VERIFIED',
  checkpoint: CandidateCheckpoint, claim?: string): Promise<boolean> {
  const row = await db.prepare('SELECT state, revision, payload_json, publication_retry_claim FROM editorial_candidates WHERE id = ?')
    .bind(candidateId).first<CandidateRow>();
  if (!row) return false;
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(row.payload_json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    payload = parsed as Record<string, unknown>;
  } catch { return false; }
  const current = payload.candidate as Candidate | undefined;
  if (payload.owner_epoch !== ownerEpoch || current?.source_digest !== row.revision ||
      row.publication_retry_claim !== (claim ?? null) || ['DEPLOYED', 'VERIFIED'].includes(row.state)) return false;
  const next = JSON.stringify({ ...payload, pipeline: checkpoint });
  if (new TextEncoder().encode(next).byteLength > 400_000) return false;
  if (state === 'CAPACITY_HELD' && (!checkpoint.retry_after || !checkpoint.signal)) return false;
  const result = await db.prepare(`UPDATE editorial_candidates SET state = ?, payload_json = ?, updated_at = ?,
    publication_retry_after = ?, publication_retry_claim = NULL
    WHERE id = ? AND revision = ? AND payload_json = ? AND state = ? AND publication_retry_claim IS ? AND EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(state, next, new Date().toISOString(), checkpoint.retry_after ?? null,
    candidateId, row.revision, row.payload_json, row.state, claim ?? null, ownerEpoch).run();
  if ((result.meta.changes ?? 0) !== 1) return false;
  const readback = await db.prepare('SELECT state, revision, payload_json, publication_retry_claim FROM editorial_candidates WHERE id = ?').bind(candidateId).first<CandidateRow>();
  return Boolean(readback && readback.state === state && readback.revision === row.revision && readback.payload_json === next);
}

function pathForRefresh(candidate: Candidate, catalog: Array<{ id: string; url: string }>): string | null {
  if (candidate.action !== 'REFRESH' || !candidate.target_id) return null;
  const item = catalog.find((entry) => entry.id === candidate.target_id);
  if (!item) throw new Error('REFRESH_TARGET_NOT_IN_CATALOG');
  const path = articleSourcePath(item.url);
  if (!path) throw new Error('REFRESH_TARGET_PATH_REJECTED');
  return path;
}

export function createEditorialCandidateProcessor(env: EditorialRuntimeEnv, renderSocialCard: SocialCardRenderer, fetcher: typeof fetch = fetch) {
  const environment = env.DEPLOYMENT_ENV;
  if (environment !== 'production' && environment !== 'staging') return null;
  const staging = environment === 'staging';
  if (staging && !env.EDITORIAL_FIXTURE_SITE) return null;
  const policy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
  if (!policy) return null;
  const settings = parseEditorialRuntimeSettings(env.EDITORIAL_MODEL_CONFIG_JSON, env.EDITORIAL_GITHUB_CONFIG_JSON,
    environment, policy.model_pricing_revision);
  const modelApiKey = env.EDITORIAL_MODEL_API_KEY;
  const githubToken = env.EDITORIAL_GITHUB_TOKEN;
  if (!settings || !modelApiKey?.trim() || !githubToken?.trim()) return null;

  const model: ModelConfig = { ...settings.model, api_key: modelApiKey };
  const github = new GitHubApiPublisher({ ...settings.publisher, token: githubToken, require_private: staging }, fetcher);
  const provider = new JsonSchemaGateway(model, fetcher);
  const limits = { new_articles: policy.max_new_articles_daily, refreshes: policy.max_refreshes_daily };
  const pipeline = createEditorialCandidatePipeline({
    renderSocialCard,
    modelsFor(candidate, ownerEpoch, activePolicy) {
      return new BudgetedModelGateway(provider, model, { db: env.DB, candidate_id: candidate.id, owner_epoch: ownerEpoch,
        max_model_calls: activePolicy.max_model_calls_per_candidate, max_review_rounds: activePolicy.max_review_rounds_per_candidate,
        limits: { candidate_usd: activePolicy.max_candidate_usd, daily_usd: activePolicy.max_daily_usd, monthly_usd: activePolicy.max_monthly_usd },
        expected_pricing_revision: activePolicy.model_pricing_revision });
    },
    async preparationContext(input) {
      const baseCommit = await github.readDefaultBranchHead();
      const path = pathForRefresh(input.candidate, input.catalog);
      const existingFiles: Record<string, string> = {};
      const existingPaths: string[] = [];
      if (path) {
        existingFiles[path] = await github.readTextFile(path, baseCommit);
        existingPaths.push(path);
      }
      return { catalog: input.catalog, sources: input.signal.evidence, knowledge: input.knowledge,
        policy_revision: input.policy.revision, knowledge_revision: input.candidate.knowledge_revision,
        base_commit: baseCommit, owner_epoch: input.owner_epoch, existing_files: existingFiles, existing_paths: existingPaths };
    },
    async publish(proposal, review, signal, claim) {
      const store = new D1PublishEffectStore(env.DB, review.owner_epoch, limits);
      const readAuthority = async () => {
        const row = await env.DB.prepare(`SELECT control.paused, control.owner_epoch FROM editorial_control AS control
          JOIN editorial_candidates AS candidate ON candidate.id = ? AND candidate.revision = ? AND candidate.publication_retry_claim IS ?
          WHERE control.singleton = 1`).bind(proposal.candidate_id, signal.source_revision, claim ?? null)
          .first<{ paused: number; owner_epoch: number }>();
        return row ? { paused: row.paused === 1, owner_epoch: row.owner_epoch } : { paused: true, owner_epoch: 0 };
      };
      const attempt = await publishContent(proposal, review, { store, github, readAuthority, async currentState() {
        const guardedSourceFetch: typeof fetch = async (input, init) => {
          const before = await readControl(env.DB);
          if (before.paused || before.owner_epoch !== review.owner_epoch) throw new Error('SOURCE_REVALIDATION_AUTHORITY_CHANGED');
          const response = await fetcher(input, init);
          const after = await readControl(env.DB);
          if (after.paused || after.owner_epoch !== review.owner_epoch) throw new Error('SOURCE_REVALIDATION_AUTHORITY_CHANGED');
          return response;
        };
        const [control, baseCommit, knowledge, sourceDigest] = await Promise.all([
          readAuthority(), github.readDefaultBranchHead(), readKnowledge(env.DB, new Date()),
          revalidateSignalSourceDigest(signal, sourceRegistry as SourceConfig[], new Date(), guardedSourceFetch),
        ]);
        const currentPolicy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
        return { owner_epoch: control.owner_epoch, paused: control.paused || !currentPolicy || currentPolicy.revision !== proposal.policy_revision,
          base_commit: baseCommit, policy_revision: currentPolicy?.revision ?? 'unqualified', knowledge_revision: await fingerprintPublicKnowledge(knowledge),
          source_digest: sourceDigest ?? '', allowed_paths: proposal.files.map((file) => file.path), author_run_id: proposal.author_run_id };
      } });
      const effect = await store.read(proposal.candidate_id);
      return { attempt, merged: Boolean(effect?.merge_commit) };
    },
    verify: (attempt) => verifyPublicationDetailed(attempt,
      staging ? fixtureSiteFetcher(env.EDITORIAL_FIXTURE_SITE) : fetcher, staging ? 'private-binding' : 'public'),
    persist: (candidateId, ownerEpoch, state, checkpoint, claim) => persistCandidateCheckpoint(env.DB, candidateId, ownerEpoch, state, checkpoint, claim),
  });
  return { ...pipeline, reconcileMergeCapacity: (ownerEpoch: number) =>
    new D1PublishEffectStore(env.DB, ownerEpoch, limits).reconcileMergeCapacity((branch) => github.findPullRequest(branch)) };
}
