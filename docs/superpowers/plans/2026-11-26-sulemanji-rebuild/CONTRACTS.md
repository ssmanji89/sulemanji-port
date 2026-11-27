# Shared implementation contracts

Status: proposed interfaces for the implementation plans.
The [maintenance specification](../../specs/2026-11-26-sulemanji-maintenance.md) owns the core knowledge, signal, candidate, and receipt schemas.
This file defines the supporting types that cross module boundaries.
It does not claim that these interfaces already exist.

Use runtime schema validation for external input.
Use ISO 8601 UTC timestamps, lowercase SHA-256 hex digests, and integer sequence values.
Knowledge content revision is a nonempty opaque string of at most 256 characters.
Use canonical UTC timestamps with milliseconds and a trailing Z at the knowledge boundary.
Keep source URLs public HTTPS destinations.
Do not put private origins, authorization records, or operational receipts in the public content catalog.

## T07: Knowledge transport

The separate editorial Worker owns `POST /internal/knowledge`.
Its exact environment origin comes from the activation record; it is not the public visitor-serving binding.
Use `Content-Type: application/json`.
Send the key ID in `X-Knowledge-Key-Id`.
Send the base64 HMAC-SHA256 signature in `X-Knowledge-Signature`.
Sign the exact UTF-8 request body.
Compute `payload_sha256` from the RFC 8785 canonical JSON payload bytes.
The WITHDRAW payload is null, so its digest covers the four UTF-8 bytes `null`.

~~~typescript
type ImportResult =
  | {status: "accepted" | "duplicate" | "withdrawn";
     derivative_id: string; sequence: number}
  | {status: "rejected"; code: "AUTH" | "INVALID" | "STALE" |
     "CONFLICT" | "EXPIRED"; detail: string};

type EditorialEnv = {
  DB: D1Database;
  EDITORIAL_WORKFLOW: Workflow;
  DEPLOYMENT_ENV: "staging" | "production";
  KNOWLEDGE_KEYS_JSON: string;
  KNOWLEDGE_POLICY_REVISION: string;
};
~~~

`KNOWLEDGE_KEYS_JSON` is a secret mapping from registered key IDs to signing keys.
`KNOWLEDGE_POLICY_REVISION` is the trusted knowledge-supply policy revision accepted by the importer.
Keep it distinct from the editorial operating-policy revision unless an explicit validated mapping establishes equivalence.
Additional model and GitHub secret bindings belong to the authorized provider configuration in T10.
Never derive a key or a role from source text.

| HTTP status | Meaning |
|---|---|
| 200 | Durable accepted, duplicate, or withdrawn result with derivative ID and sequence. |
| 400 | Malformed schema, digest, target, policy, timestamp, or bounded-input failure. |
| 401 | Missing or invalid key or signature. |
| 409 | Stale sequence or conflicting content at the same sequence. |
| 422 | Expired authority envelope. |

HTTP 200 means the projection mutation and dependent eligibility invalidation are durable.
It does not mean that a public article changes.
The producer validates the structured receipt against the exact delivery before marking its effect complete.

Sequence ordering applies to each derivative across its revisions.
The same sequence, revision, action, payload digest, and policy revision is an idempotent replay.
A conflicting value at the same sequence is an error.
A renewal can keep its content revision, but it uses a higher sequence after a fresh authority check.
Retain the sequence high-water mark and withdrawal tombstone beyond draft retention.
Never accept a delayed event that would restore a withdrawn derivative.

Set envelope expiry at most 24 hours after issue.
Use an earlier expiry when source authority ends earlier.
The private producer renews active authorized derivatives before expiry through its existing scheduler ownership.
Expired and withdrawn material cannot enter retrieval, drafting, review, or publication.
Existing public content follows the separate correction or removal path.

## T08: Sources and relevance

~~~typescript
type SourceConfig = {
  id: string;
  url: string;
  format: "rss" | "atom" | "json" | "html";
  topic_ids: string[];
  allowed_hostnames: string[];
  min_interval_seconds: number;
  max_age_seconds: number;
  enabled: boolean;
};
type SourceFailure = {
  source_id: string;
  code: "NETWORK" | "LIMIT" | "INVALID" | "STALE" | "FORBIDDEN";
  detail: string;
};
type SignalBatch = {signals: Signal[]; failures: SourceFailure[]};
type RecentHistory = {
  source_revisions: string[];
  episode_ids: string[];
  candidates: Candidate[];
  recent_topic_ids: string[];
};
type ActionDecision =
  | {action: "NO_CHANGE"; reason: string; signal_ids: string[]}
  | {action: Candidate["action"]; candidate: Candidate};
~~~

A source failure affects that source and its dependent claims.
It does not imply permission to use an unapproved mirror.
Reject non-public destinations, unexpected redirect hosts, and private-network addresses.
Do not use a user-supplied URL as an unrestricted fetch destination.
`episode_ids` identify underlying evidence origins, including known repeated coverage.
The catalog supplies valid topics; the worker cannot invent a schema value.

## T09: Scheduling, budgets, and state

~~~typescript
type EditorialPolicy = {
  revision: string;
  timezone: "America/Chicago";
  slots: string[];
  max_new_articles_daily: number;
  max_refreshes_daily: number;
  max_candidates_per_scan: number;
  max_fetches_per_scan: number;
  max_model_calls_per_candidate: number;
  max_review_rounds_per_candidate: number;
  max_candidate_usd: number;
  max_daily_usd: number;
  max_monthly_usd: number;
  model_pricing_revision: string;
};
type SlotClaim = {id: string; local_date: string; slot: string; claimed_at: string};
type UsageReservation = {
  id: string;
  candidate_id: string;
  attempt_id: string;
  maximum_usd: number;
  pricing_revision: string;
  requested_at: string;
};
type ReservationResult =
  | {status: "reserved" | "existing"; reservation_id: string}
  | {status: "denied"; reason: string};
type OperatorCommand =
  | {action: "status" | "pause" | "resume"}
  | {action: "inspect" | "retry" | "revoke"; candidate_id: string};
type OperatorResult = {
  action: OperatorCommand["action"];
  status: "complete" | "held" | "rejected";
  reason: string;
  candidate_id?: string;
  receipt_id: string;
};
~~~

Use integer microdollars internally; the public type uses USD for configuration clarity.
Reject negative, nonfinite, or missing limits.
An attempt ID has one reservation across retries.
The system reconciles an uncertain attempt before issuing another paid request.
Unknown cost keeps its maximum reservation until resolved.
Candidate, daily, and monthly limits apply together across concurrent requests and resumed workflows.
Use the current documented Workflows event and step types from the pinned Cloudflare runtime.

`transitionCandidate` compares the current state and revision before the write.
The `revision` argument is the expected candidate revision digest.
Stale writes return false and read back the current record.
The same D1 authority owns publisher epoch, paused state, and effect claims.

## T10: Content, review, publication, and readback

~~~typescript
type FileChange = {
  path: string;
  operation: "create" | "update";
  encoding: "utf-8" | "base64";
  content: string;
  content_sha256: string;
};
type ContentProposal = {
  candidate_id: string;
  author_run_id: string;
  content_digest: string;
  source_digest: string;
  policy_revision: string;
  knowledge_revision: string;
  base_commit: string;
  files: FileChange[];
  public_sources: PublicSource[];
  required_media_paths: string[];
  public_urls: string[];
  expected_content: {url: string; title: string; text_sha256: string}[];
};
type PreparationContext = {
  catalog: PublicContentItem[];
  sources: PublicSource[];
  knowledge: PublicKnowledge[];
  policy_revision: string;
  knowledge_revision: string;
  base_commit: string;
};
type ReviewContext = PreparationContext & {reviewer_run_id: string};
type ModelRequest = {
  run_id: string;
  purpose: "author" | "review" | "revise";
  input: string;
  schema_id: string;
  max_output_tokens: number;
  reservation_id: string;
};
type ModelResult = {
  run_id: string;
  output: unknown;
  actual_usd: number | null;
  provider_request_id: string | null;
};
interface ModelGateway {
  generate(request: ModelRequest): Promise<ModelResult>;
}
type PublicationState = {
  owner_epoch: number;
  paused: boolean;
  base_commit: string;
  policy_revision: string;
  knowledge_revision: string;
  source_digest: string;
  allowed_paths: string[];
  author_run_id: string;
};
type PublicationDecision =
  | {allowed: true}
  | {allowed: false; reasons: string[]};
type PublishAttempt = {
  id: string;
  candidate_id: string;
  owner_epoch: number;
  branch: string;
  pull_request: number | null;
  source_commit: string | null;
  deployment_version: string | null;
  public_urls: string[];
  expected_content: ContentProposal["expected_content"];
  status: "PENDING" | "SOURCE_PUBLISHED" | "DEPLOYED" | "UNCERTAIN" | "FAILED";
};
~~~

`PublishDependencies` contains the effect store, GitHub adapter, deployment reader, clock, and current publication state reader.
Their implementation uses the current provider SDK, but it must expose read-after-timeout reconciliation for each effect.
The effect store records intent before GitHub writes and stores the provider identifier afterward.
The GitHub adapter compares expected heads for writes and merge.
The deployment reader resolves the exact source commit to its deployed version.
The current state reader rechecks authority immediately before each external write.

Keep the independent reviewer identity server-assigned and separate from the author.
Reject model output that attempts to supply authority, state transitions, or review clearance.
`expected_content` uses normalized visible article text from an HTML parser.
Use the same normalization when preparing the expectation and reading the deployed page.
Check the actual page, canonical URL, Writing visibility, feed, sitemap, and deployment revision.
Do not hash arbitrary full HTML containing environment-specific values.

## T11: Maintenance and correction

~~~typescript
type MaintenanceEvent = {
  id: string;
  kind: "source-change" | "broken-link" | "correction" | "withdrawal";
  target_id: string;
  evidence: PublicSource[];
  occurred_at: string;
};
type MaintenanceDecision =
  | {action: "NO_CHANGE"; reason: string}
  | {action: "REPAIR" | "REFRESH" | "CONNECT"; target_id: string; reason: string}
  | {action: "NEEDS_OWNER"; target_id: string; reason: string; protected_fields: string[]};
type ProtectedFieldResult =
  | {allowed: true; proposal: ContentProposal}
  | {allowed: false; protected_fields: string[]};
type ScopedCorrection = {
  id: string;
  source_episode: string;
  original_instruction: string;
  scope: string[];
  affected_behavior: string;
  regression_reference: string;
  recorded_at: string;
};
type CorrectionReceipt = {id: string; revision: string; stored_at: string};
interface CorrectionStore {
  put(correction: ScopedCorrection): Promise<CorrectionReceipt>;
}
~~~

Corrections remain private when their content or lineage is private.
Only an authorized public derivative enters this site's knowledge boundary.
Do not broaden a correction's scope because a generated summary uses stronger wording.
Keep exact operator commands and authentication requirements in access-controlled operations records. Public documentation describes the behavior and safety boundary without internal identifiers, live status, or authentication details.

## Contract changes

The executor may make a bounded implementation ruling when a current provider requires a different wire detail.
Record the reason, changed interface, matching consumer update, and regression case.
Do not silently weaken authority, idempotency, confidentiality, or evidence checks.
Do not use interface detail to shrink the experience scope or production completion criteria.
