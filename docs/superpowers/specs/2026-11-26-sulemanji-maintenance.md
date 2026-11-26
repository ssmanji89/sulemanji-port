# Adaptive site maintenance specification

Date: 2026-11-26, America/Chicago.
Status: proposed subsystem design for the complete site redevelopment.
Parent: [Redevelopment design](2026-11-26-sulemanji-rebuild-design.md).

## Purpose

Keep useful site material accurate, connected, and worth reading as the owner's work and the outside world change.
Reduce routine discovery, drafting, verification, publication, and repair work.
The system maintains the redesigned site described by the experience specification.
It does not turn the current site into a higher-volume news feed.

## Actions and boundaries

| Action | Trigger | Normal outcome |
|---|---|---|
| NO_CHANGE | No material reader benefit, insufficient evidence, duplicate event, or unchanged source. | Record a short reason and finish successfully. |
| REPAIR | A verified route, reference, artifact, or factual metadata defect. | Make the smallest correct change. |
| REFRESH | A relevant fact changes in an existing useful explanation. | Revise the affected claim and its sources. |
| CONNECT | Two items have a useful, evidenced relationship. | Add a specific contextual link. |
| CREATE | A distinct question warrants a new explanation, experiment, or useful tool account. | Prepare and independently review a new publication. |
| PROPOSE | A change would alter personal meaning, strategy, disclosure, or commitments. | Preserve a concise private proposal for the owner. |

A current event is not sufficient reason to publish.
The system records the reader, affected question, new information, and proposed benefit.
It prefers maintaining a useful existing item when a new article would repeat it.
It can publish independent interests without attaching an MSP lesson.
It does not infer the owner's beliefs from retrieved news.

## Input families

| Input family | Examples | Useful site effect |
|---|---|---|
| Macro markets and operating conditions | Public economic releases, policy changes, infrastructure costs, broad technology adoption. | Revisit a sourced explanation or identify a question worth investigating. |
| Micro markets and products | Issuer disclosures, product changes, release notes, package versions, project milestones. | Update a specific explanation, example, limitation, or artifact link. |
| Industry | Vendor deprecations, security advisories, standards, documented practitioner results. | Correct a guide or explain a relevant change. |
| Owner work | Public repository changes, packages, research artifacts, authorized knowledge derivatives. | Update a project history or connect related material. |
| Reader and owner feedback | A correction, a failed example, a confusing path, or an explicit interest decision. | Fix the affected material and preserve the lesson. |

These are input classes, not a requirement to cover every market.
The private source registry controls actual sources and polling.
Start with public primary feeds and the already reviewed project and package list.
Reconcile source URLs and their licenses before activation.
A financial input supports public research context; it does not connect to accounts or execute trades.

## Knowledge supply

Use Viyu memory to understand relevant context, interests, and relationships.
Keep raw personal and shared memory in its existing permission boundary.
The public serving Worker never receives a memory credential.
The editorial Worker receives only authorized, sanitized material for this site.

Source access does not establish permission to publish.
A caller-supplied role, approval boolean, source ID, or namespace cannot grant authority.
The private producer must enforce current identity, source entitlement, and disclosure rules before export.

Inspect the current private publication implementation and its deployed adapters at execution time.
Reuse a qualified existing export contract where available.
If an adapter is missing, implement that adapter in its actual owning private repository.
Do not invent an existing public-export endpoint.
Do not copy private code, names, endpoints, source records, or operational evidence into this public repository.

Public-source work and the frontend can proceed while that integration is unavailable.
The complete Goal still reports memory integration as incomplete until its real boundary is qualified.
A fixture or manual data file does not establish a working knowledge connection.

### Proposed site-side envelope

The following is a new adapter contract.
It does not claim to be an existing Viyu endpoint.

~~~typescript
type KnowledgeEnvelope = {
  schema_version: 1;
  derivative_id: string;
  revision: string;
  sequence: number;
  action: "UPSERT" | "WITHDRAW";
  target: "sulemanji.com";
  issued_at: string;
  expires_at: string;
  policy_revision: string;
  payload_sha256: string;
  payload: PublicKnowledge | null;
};

type PublicKnowledge = {
  subject_id: string;
  summary: string;
  allowed_uses: ("context" | "factual-update" | "public-explanation")[];
  public_sources: PublicSource[];
  authored_fields: string[];
};

type PublicSource = {
  url: string;
  title: string;
  retrieved_at: string;
  source_date: string | null;
  content_sha256: string;
};
~~~

An authenticated private producer sends the exact UTF-8 envelope bytes.
Use an environment-specific HMAC-SHA256 signature over those bytes with a registered key ID.
Use the exact headers, payload canonicalization, responses, and renewal rules in [Shared contracts](../plans/2026-11-26-sulemanji-rebuild/CONTRACTS.md#t07-knowledge-transport).
Verify with Web Crypto before parsing or admitting the payload.
Key IDs identify server-controlled keys; source text cannot introduce a key.
If the existing qualified producer uses a stronger signed contract, adapt it without weakening its checks.
Record that interface ruling and test it.

Require a matching target, nonempty opaque revision of at most 256 characters, positive integer sequence, current policy, bounded payload, and valid timestamps.
The importer stores only the sanitized envelope and opaque lineage.
It strips authorization metadata from every public rendering projection.
Higher withdrawal sequence always wins over delayed earlier publication.
Identical sequence, revision, action, payload, and policy replay is a no-op.
Conflicting content at the same sequence is an error.
Retain the sequence high-water mark and withdrawal tombstone.
Renewed authority can retain the content revision but requires a higher sequence.
Set expiry at most 24 hours after issue, or earlier when source authority ends.
The private producer renews valid derivatives through its existing scheduler.
Expired and withdrawn material leaves active retrieval and generation immediately.
HTTP 200 confirms durable projection mutation and dependent eligibility invalidation.
It does not establish a public article change.

Withdrawal stops reuse and starts the appropriate correction or removal path.
It cannot erase previously published Git history or third-party copies.
Never promise that public disclosure can be fully recalled.
Do not rewrite repository history automatically.

## Authored meaning and ordinary publication

### Autonomous within the established standard

- Repair verified links and artifact references.
- Refresh source-backed technical facts and implementation states.
- Publish qualified articles under the current public-writing authority.
- Add useful connections among public material.
- Generate an explanatory figure with checked data and attribution.
- Record a justified no-change decision.

Routine independent review is automated.
Do not add per-article owner confirmation or a separate whitelist PR for every supported claim.

### Protected from automatic change

- Biography, personal stories, beliefs, motivations, and opinions.
- Employment identity and attribution.
- Availability, service promises, rates, endorsements, and commercial terms.
- New disclosure of private knowledge or employer intellectual property.
- Site purpose, global navigation, and the editorial operating contract.
- Publication authority, source grants, spending limits, and infrastructure permissions.

The system can propose a protected change with its reason and exact diff.
It cannot manufacture the approval or convert repeated suggestions into authority.
The owner can grant a bounded standing class; the system records its scope and revision.

## State and interfaces

Keep these names consistent across plans and code.
Runtime implementations live under cloudflare/src/.
Do not create parallel state authorities.
The [shared contracts](../plans/2026-11-26-sulemanji-rebuild/CONTRACTS.md) define supporting module interfaces.

~~~typescript
type Signal = {
  id: string;
  source_id: string;
  source_revision: string;
  observed_at: string;
  occurred_at: string | null;
  published_at: string | null;
  expires_at: string;
  topic_ids: string[];
  evidence: PublicSource[];
};

type Candidate = {
  id: string;
  signal_ids: string[];
  target_id: string | null;
  action: "REPAIR" | "REFRESH" | "CONNECT" | "CREATE" | "PROPOSE";
  reader: string;
  question: string;
  benefit: string;
  source_digest: string;
  policy_revision: string;
  knowledge_revision: string;
  state: CandidateState;
};

type CandidateState =
  | "DISCOVERED" | "ELIGIBLE" | "DRAFTED" | "REVIEWED"
  | "SOURCE_PUBLISHED" | "DEPLOYED" | "VERIFIED"
  | "NO_CHANGE" | "NEEDS_OWNER" | "HELD" | "FAILED";

type ReviewReceipt = {
  candidate_id: string;
  reviewer_run_id: string;
  author_run_id: string;
  content_digest: string;
  source_digest: string;
  policy_revision: string;
  knowledge_revision: string;
  base_commit: string;
  decision: "CLEAR" | "FIX_REQUIRED" | "HOLD";
  findings: {code: string; detail: string}[];
};

type PublicationReceipt = {
  candidate_id: string;
  owner_epoch: number;
  source_commit: string;
  deployment_version: string;
  public_urls: string[];
  verified_at: string;
  outcome: "VERIFIED" | "UNCERTAIN" | "FAILED";
};
~~~

Use separate source event time, publication time, retrieval time, and local publication date.
An old event retrieved today does not become current.
An article refresh retains its original published_on.
Set updated_on only when public meaning or useful content changes.

Candidate identity derives from stable source revision, action, target, and relevant policy version.
Do not create a new identity merely because a retry crosses midnight.
Preserve the article, branch, PR, review history, and unresolved effects when resuming.

## Durable workflow

~~~mermaid
stateDiagram-v2
    [*] --> Discover
    Discover --> NoChange: no useful change
    Discover --> Prepare: relevant evidence
    Prepare --> Review
    Review --> Prepare: bounded correction
    Review --> Hold: insufficient evidence
    Review --> Publish: current clearance
    Publish --> Verify
    Verify --> Complete: observed public state
    Verify --> Reconcile: uncertain outcome
    Reconcile --> Verify: effect located
    Reconcile --> Hold: unresolved
    NoChange --> [*]
    Hold --> [*]
    Complete --> [*]
~~~

The scheduler admits a durable workflow and returns.
Each step has a stable identity and an explicit retry policy.
Model calls, source writes, merges, and deployments record intent before the external effect.
An ambiguous timeout triggers readback before retry.
At-least-once execution must produce one accepted effect.

### Relevance assessment

Apply deterministic eligibility checks first.
Reject expired evidence, unsupported source types, duplicate episodes, disallowed disclosures, and unsupported metadata.
Then assess whether the source changes a reader's understanding or an existing item.

Use the broad content catalog and explicit interest decisions.
Do not rank by memory frequency alone.
A soft repetition penalty can reduce repeated subjects and title patterns.
Do not manufacture filler to meet a diversity quota.
Urgent factual correction takes precedence over presentation variety.

### Preparation and review

The author model receives bounded evidence and permitted context.
It returns structured content proposals.
It receives no repository, deployment, memory, or account write tools.
Source text is data, including text that imitates system messages.

A separate reviewer uses a fresh context.
It checks the actual factual claims, reader benefit, voice, attribution, privacy, relation relevance, and supported format.
It sees the exact candidate and source set.
A different model ID is optional; independent context and an independent receipt are required.

Recompute clearance after a material content, source, policy, knowledge, base, or dependency change.
Use at most three review rounds for a candidate.
After the limit, hold the candidate and continue unrelated useful work.
Do not reset the count by creating a new run.

### Publication

Before any public branch write, validate confidentiality, source authority, allowed paths, Markdown safety, media, and attribution.
A public draft branch is already a public disclosure.
Keep unreviewed private drafting outside GitHub.

The guarded writer permits intended article, catalog, relation, and public media paths only.
It rejects path traversal, protected files, unexpected deletes, policy changes, and workflow modifications.
Social images and necessary figure files belong in the explicit allowlist.
Do not repeat the old failure where a valid article cannot include its required image.

Create or update the deterministic content branch and PR.
Run the real source and production-build checks.
Bind the independent receipt to the final content and relevant base.
Merge using current expected-head semantics and existing authority.
Reconcile a lost response before any retry.

Verify the canonical article or affected page, Writing visibility, related links, feed and sitemap eligibility, and deployed revision.
Use an HTML parser for nested article extraction.
Do not treat a successful merge, HTTP 200 on the homepage, or an API success response as complete publication.

## Proposed initial limits

These are planner defaults for review, not measured capacity or a claim of approved spending.

| Setting | Initial value | Purpose |
|---|---:|---|
| Timer | Hourly UTC Cron | Cheap admission and missed-slot detection. |
| Discovery slots | 08:00, 13:00, 19:00, 22:00 America/Chicago | Preserve familiar timing while evaluating actual changes. |
| New articles | At most 3 per Chicago day | Upper bound; zero is valid. |
| Existing-content refreshes | At most 6 per Chicago day | Bounded routine upkeep. |
| Candidates per scan | At most 3 | Prevent an unbounded research queue. |
| Source fetches per scan | At most 40 | Bound network work. |
| Response body | At most 1 MiB | Stop unbounded retrieval. |
| Persisted source excerpt | At most 20,000 characters | Keep state bounded and relevant. |
| Candidate payload | At most 256 KiB | Bound storage and review input. |
| Model input | At most 48,000 characters | Bound context before sending. |
| Model output | At most 4,000 tokens per call | Bound generation. |
| Model calls | At most 6 per candidate | Include author, fixes, and independent review. |
| Review rounds | At most 3, across resumes | Avoid endless correction loops. |
| Model reservation | At most USD 0.75 per candidate | Admit against worst-case configured prices. |
| Model daily limit | USD 2 | Include retries and review. |
| Model monthly limit | USD 30 | Calendar month in America/Chicago. |
| Incremental Cloudflare envelope | USD 10 per month | Confirm actual subscription and product estimates before activation. |
| Candidate retention | 30 days after terminal state | Remove unnecessary draft material. |
| Sanitized operational receipts | 90 days | Support diagnosis and recovery. |

Maintain one unique schedule claim per local date and slot.
Compute local time using America/Chicago, including daylight-saving transitions.
A repeated timer invocation cannot admit the same slot twice.
Resume missed work only within its evidence validity.
Do not publish yesterday's stale opportunity as today's event.

Usage reservation and settlement are atomic.
Concurrent calls must not exceed either daily or monthly model limits.
Reserve each attempt before the request.
Record unknown provider cost conservatively until reconciled.
Do not describe this ledger as a hard cap on every possible Cloudflare charge.

Cloudflare account spending limits may affect unrelated Workers and exclude other services.
Do not change those limits automatically.
Use application admission, scoped tokens, resource limits, and monitored product usage.
Do not purchase new data subscriptions without the applicable authority.
ChatGPT subscription access does not establish API billing or capacity.

## Models, providers, and secrets

The executor selects currently supported model IDs from the owner's authorized provider configuration.
Record the selected IDs, pricing revision, structured-output method, timeouts, and token limits.
Do not hard-code an invented model name or infer provider authority from an unrelated project.
Use a small provider adapter with deterministic fixtures for tests.

Use environment secrets for API and repository credentials.
The public serving Worker has none of these credentials.
The editorial environment has no raw memory credential.
The publishing adapter cannot modify account resources.
The staging environment uses separate D1, workflows, signing keys, and a non-production repository target.

## Operation and learning

Provide authenticated status and command interfaces through the existing operator tools.
A custom admin application is not required for the first release.
Commands cover status, pause, resume, inspect, retry after reconciliation, and revoke a candidate.
Do not make the owner inspect routine success messages.

The status view shows what changed, why it changed, what remains uncertain, current spend, and the next action when attention is required.
Use existing notification authority and channels.
Do not create new outbound messaging behavior merely because a transport is available.

Every owner correction retains its original context, timestamp, scope, and affected rule or test.
A correction can produce a narrowly applicable rule, a search for similar defects, and a regression case.
Do not turn a one-off correction into an unbounded global policy.
Do not train the system by treating its own generated copy as new independent evidence.

Protect editorial diversity through the content model and review.
Do not optimize click count, publication count, or business conversion as a substitute for reader usefulness.
The first operational report distinguishes actual observations from expected benefits.

## Failure behavior

| Condition | Required result |
|---|---|
| Memory supply unavailable | Keep the public site available; continue only eligible public-source work; report integration degradation. |
| Source stale or conflicting | Hold affected claims; preserve source dates and uncertainty. |
| Budget unavailable or exhausted | Admit no new paid calls; preserve resumable state. |
| Model output malformed | Reject the proposal; do not interpret it as code or authority. |
| Review stale | Re-review the affected revision. |
| Merge or deploy result unknown | Read back the existing effect before retry. |
| Public verification fails | Stop that candidate, preserve the last good release, and apply the qualified recovery procedure. |
| Knowledge withdrawal arrives | Prevent reuse; invalidate dependent drafts; prepare the required correction or removal. |
| Old writer still active | Do not activate the new production writer. |
| Background process unavailable | Serve the last verified static build. |

## Qualification

Use the acceptance matrix for specific cases.
Test automatic no-change, ordinary update, withheld publication, correction, source revision, withdrawal, duplicate delivery, concurrent spending, stale review, ambiguous merge, and failed deployment.
Run full content and host checks on the exact candidate.
Use separate staging resources for workflow behavior; a visual branch preview is insufficient.

Production operation requires two natural eligible schedule runs with current owner identity and actual receipts.
A real authorized derivative must also reach the production importer through the private producer.
Verify its durable receipt, production workflow availability, authority expiry, and a subsequent authorized renewal.
Record the actual renewal owner and distinguish this evidence from staging fixtures.
A justified no-change outcome is valid.
A staged publication exercise proves the update path, but it is not a live publication receipt.
The final report keeps those evidence states separate.
