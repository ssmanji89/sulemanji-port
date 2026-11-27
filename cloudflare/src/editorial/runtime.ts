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
import { createEditorialCandidatePipeline, type CandidateCheckpoint } from './pipeline.js';
import { fixtureSiteFetcher } from './site-readback.js';

export type EditorialRuntimeEnv = EditorialEnv & {
  EDITORIAL_POLICY_JSON?: string;
  EDITORIAL_MODEL_CONFIG_JSON?: string;
  EDITORIAL_MODEL_API_KEY?: string;
  EDITORIAL_GITHUB_CONFIG_JSON?: string;
  EDITORIAL_GITHUB_TOKEN?: string;
};
type ModelSettings = Omit<ModelConfig, 'api_key'>;
type PublisherSettings = { repository: string; required_checks: string[]; default_branch: string };
type CandidateRow = { state: string; revision: string; payload_json: string };

function objectFromJson(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function parseModelSettings(raw: string | undefined): ModelSettings | null {
  const value = objectFromJson(raw);
  const keys = ['endpoint', 'model_id', 'pricing_revision', 'input_usd_per_million', 'output_usd_per_million', 'max_input_chars', 'max_output_tokens'];
  if (!value || !hasExactKeys(value, keys) || typeof value.endpoint !== 'string' || typeof value.model_id !== 'string' || !value.model_id.trim() ||
      typeof value.pricing_revision !== 'string' || !value.pricing_revision.trim() ||
      !Number.isFinite(value.input_usd_per_million) || Number(value.input_usd_per_million) < 0 ||
      !Number.isFinite(value.output_usd_per_million) || Number(value.output_usd_per_million) < 0 ||
      !Number.isSafeInteger(value.max_input_chars) || Number(value.max_input_chars) < 1 || Number(value.max_input_chars) > 100_000 ||
      !Number.isSafeInteger(value.max_output_tokens) || Number(value.max_output_tokens) < 1 || Number(value.max_output_tokens) > 4_000) return null;
  try {
    const url = new URL(value.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
  } catch { return null; }
  return value as unknown as ModelSettings;
}

const PUBLICATION_REPOSITORIES = {
  production: 'ssmanji89/sulemanji-port',
  staging: 'ssmanji89/sulemanji-editorial-fixture',
};

function parsePublisherSettings(raw: string | undefined, repository: string): PublisherSettings | null {
  const value = objectFromJson(raw);
  if (!value || !hasExactKeys(value, ['repository', 'required_checks', 'default_branch']) ||
      value.repository !== repository || value.default_branch !== 'main' ||
      !Array.isArray(value.required_checks) || value.required_checks.length < 1 || value.required_checks.length > 20 ||
      value.required_checks.some((check) => typeof check !== 'string' || !/^[A-Za-z0-9 _.-]{1,100}$/.test(check)) ||
      new Set(value.required_checks).size !== value.required_checks.length) return null;
  return value as unknown as PublisherSettings;
}

async function persistCandidateCheckpoint(db: D1Database, candidateId: string, ownerEpoch: number,
  state: 'DRAFTED' | 'REVIEWED' | 'NEEDS_OWNER' | 'SOURCE_PUBLISHED' | 'VERIFIED', checkpoint: CandidateCheckpoint): Promise<boolean> {
  const row = await db.prepare('SELECT state, revision, payload_json FROM editorial_candidates WHERE id = ?')
    .bind(candidateId).first<CandidateRow>();
  if (!row) return false;
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(row.payload_json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    payload = parsed as Record<string, unknown>;
  } catch { return false; }
  if (payload.owner_epoch !== ownerEpoch || ['DEPLOYED', 'VERIFIED'].includes(row.state)) return false;
  const next = JSON.stringify({ ...payload, pipeline: checkpoint });
  if (new TextEncoder().encode(next).byteLength > 400_000) return false;
  const result = await db.prepare(`UPDATE editorial_candidates SET state = ?, payload_json = ?, updated_at = ? WHERE id = ? AND revision = ?
    AND state NOT IN ('DEPLOYED', 'VERIFIED') AND EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(state, next, new Date().toISOString(), candidateId, row.revision, ownerEpoch).run();
  if ((result.meta.changes ?? 0) !== 1) return false;
  const readback = await db.prepare('SELECT state, revision, payload_json FROM editorial_candidates WHERE id = ?').bind(candidateId).first<CandidateRow>();
  return Boolean(readback && readback.state === state && readback.revision === row.revision && readback.payload_json === next);
}

function pathForRefresh(candidate: Candidate, catalog: Array<{ id: string; url: string }>): string | null {
  if (candidate.action !== 'REFRESH' || !candidate.target_id) return null;
  const item = catalog.find((entry) => entry.id === candidate.target_id);
  if (!item) throw new Error('REFRESH_TARGET_NOT_IN_CATALOG');
  const url = new URL(item.url);
  const path = `${url.pathname.replace(/^\//, '')}.md`;
  if (url.origin !== 'https://www.sulemanji.com' || !/^notes\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(path)) throw new Error('REFRESH_TARGET_PATH_REJECTED');
  return path;
}

export function createEditorialCandidateProcessor(env: EditorialRuntimeEnv, fetcher: typeof fetch = fetch) {
  const environment = env.DEPLOYMENT_ENV;
  if (environment !== 'production' && environment !== 'staging') return null;
  const staging = environment === 'staging';
  if (staging && !env.EDITORIAL_FIXTURE_SITE) return null;
  const policy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
  const modelSettings = parseModelSettings(env.EDITORIAL_MODEL_CONFIG_JSON);
  const publisherSettings = parsePublisherSettings(env.EDITORIAL_GITHUB_CONFIG_JSON, PUBLICATION_REPOSITORIES[environment]);
  const modelApiKey = env.EDITORIAL_MODEL_API_KEY;
  const githubToken = env.EDITORIAL_GITHUB_TOKEN;
  if (!policy || !modelSettings || !publisherSettings || !modelApiKey?.trim() || !githubToken?.trim() ||
      modelSettings.pricing_revision !== policy.model_pricing_revision) return null;

  const model: ModelConfig = { ...modelSettings, api_key: modelApiKey };
  const github = new GitHubApiPublisher({ ...publisherSettings, token: githubToken, require_private: staging }, fetcher);
  const provider = new JsonSchemaGateway(model, fetcher);
  return createEditorialCandidatePipeline({
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
    async publish(proposal, review, signal) {
      const store = new D1PublishEffectStore(env.DB, review.owner_epoch);
      const attempt = await publishContent(proposal, review, { store, github, async currentState() {
        const guardedSourceFetch: typeof fetch = async (input, init) => {
          const before = await readControl(env.DB);
          if (before.paused || before.owner_epoch !== review.owner_epoch) throw new Error('SOURCE_REVALIDATION_AUTHORITY_CHANGED');
          const response = await fetcher(input, init);
          const after = await readControl(env.DB);
          if (after.paused || after.owner_epoch !== review.owner_epoch) throw new Error('SOURCE_REVALIDATION_AUTHORITY_CHANGED');
          return response;
        };
        const [control, baseCommit, knowledge, sourceDigest] = await Promise.all([
          readControl(env.DB), github.readDefaultBranchHead(), readKnowledge(env.DB, new Date()),
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
    persist: (candidateId, ownerEpoch, state, checkpoint) => persistCandidateCheckpoint(env.DB, candidateId, ownerEpoch, state, checkpoint),
  });
}
