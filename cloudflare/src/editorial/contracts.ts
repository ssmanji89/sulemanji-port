export type PublicSource = {
  url: string;
  title: string;
  retrieved_at: string;
  source_date: string | null;
  content_sha256: string;
};

export type PublicKnowledge = {
  subject_id: string;
  summary: string;
  allowed_uses: Array<'context' | 'factual-update' | 'public-explanation'>;
  public_sources: PublicSource[];
  authored_fields: string[];
};

export type KnowledgeEnvelope = {
  schema_version: 1;
  derivative_id: string;
  revision: string;
  sequence: number;
  action: 'UPSERT' | 'WITHDRAW';
  target: 'sulemanji.com';
  issued_at: string;
  expires_at: string;
  policy_revision: string;
  payload_sha256: string;
  payload: PublicKnowledge | null;
};

export type ImportResult =
  | { status: 'accepted' | 'duplicate' | 'withdrawn'; derivative_id: string; sequence: number }
  | { status: 'rejected'; code: 'AUTH' | 'INVALID' | 'STALE' | 'CONFLICT' | 'EXPIRED'; detail: string };

export interface EditorialEnv {
  DB: D1Database;
  EDITORIAL_WORKFLOW: Workflow;
  DEPLOYMENT_ENV: 'staging' | 'production';
  EDITORIAL_FIXTURE_SITE?: import('./site-readback.js').EditorialFixtureSite;
  KNOWLEDGE_KEYS_JSON: string;
  KNOWLEDGE_POLICY_REVISION: string;
}

export type SourceConfig = {
  id: string;
  url: string;
  format: 'rss' | 'atom' | 'json' | 'html' | 'nasa-skywatching';
  topic_ids: string[];
  allowed_hostnames: string[];
  min_interval_seconds: number;
  max_age_seconds: number;
  enabled: boolean;
};

export type Signal = {
  id: string;
  episode_id: string;
  source_id: string;
  source_revision: string;
  observed_at: string;
  occurred_at: string | null;
  published_at: string | null;
  expires_at: string;
  topic_ids: string[];
  title: string;
  summary: string;
  evidence: PublicSource[];
};

export type SourceFailure = { source_id: string; code: 'NETWORK' | 'LIMIT' | 'INVALID' | 'STALE' | 'FORBIDDEN'; detail: string };
export type SignalBatch = { signals: Signal[]; failures: SourceFailure[] };
export type CatalogItem = { id: string; title: string; url: string; topics: string[]; summary?: string };
export type Candidate = {
  id: string; signal_ids: string[]; target_id: string | null; related_id?: string; action: 'REPAIR' | 'REFRESH' | 'CONNECT' | 'CREATE' | 'PROPOSE';
  reader: string; question: string; benefit: string; source_digest: string; policy_revision: string; knowledge_revision: string; state: 'DISCOVERED';
};
export type RecentHistory = { source_revisions: string[]; episode_ids: string[]; candidates: Candidate[]; recent_topic_ids: string[] };
export type ActionDecision = { action: 'NO_CHANGE'; reason: string; signal_ids: string[] } | { action: Candidate['action']; candidate: Candidate };

export type FileChange = { path: string; operation: 'create' | 'update'; encoding: 'utf-8' | 'base64'; content: string; content_sha256: string };
export type ExpectedContent = { url: string; title: string; text_sha256: string; required_link?: string; social_image?: { path: string; content_sha256: string } };
export type ContentProposal = {
  candidate_id: string; author_run_id: string; content_digest: string; source_digest: string; policy_revision: string; knowledge_revision: string;
  base_commit: string; owner_epoch: number; files: FileChange[]; public_sources: PublicSource[]; required_media_paths: string[]; public_urls: string[]; expected_content: ExpectedContent[];
};
export type PreparationContext = { catalog: CatalogItem[]; sources: PublicSource[]; source_excerpt?: string; knowledge: PublicKnowledge[]; policy_revision: string; knowledge_revision: string; base_commit: string; owner_epoch: number; existing_files?: Record<string, string>; existing_paths?: string[] };
export type ReviewContext = PreparationContext & { reviewer_run_id: string };
export type ReviewReceipt = { candidate_id: string; reviewer_run_id: string; author_run_id: string; content_digest: string; source_digest: string; policy_revision: string; knowledge_revision: string; base_commit: string; owner_epoch: number; decision: 'CLEAR' | 'FIX_REQUIRED' | 'HOLD'; findings: Array<{ code: string; detail: string }> };
export type PublicationState = { owner_epoch: number; paused: boolean; base_commit: string; policy_revision: string; knowledge_revision: string; source_digest: string; allowed_paths: string[]; author_run_id: string };
export type PublishAttempt = { id: string; candidate_id: string; owner_epoch: number; branch: string; pull_request: number | null; source_commit: string | null; deployment_version: string | null; public_urls: string[]; expected_content: ExpectedContent[]; status: 'PENDING' | 'SOURCE_PUBLISHED' | 'DEPLOYED' | 'UNCERTAIN' | 'FAILED' | 'CAPACITY_HELD' | 'BRANCH_UNQUALIFIED' };
export type PublicationReceipt = { candidate_id: string; owner_epoch: number; source_commit: string; deployment_version: string; public_urls: string[]; verified_at: string; outcome: 'VERIFIED' | 'UNCERTAIN' | 'FAILED' };
