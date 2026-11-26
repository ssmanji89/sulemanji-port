# Adaptive maintenance implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax.

**Goal:** Maintain the complete site through useful signals, authorized knowledge, independent review, and bounded autonomous publication.

**Architecture:** A separate editorial Worker runs durable Workflows and keeps bounded state in D1. It receives sanitized knowledge, observes public sources, and proposes allowlisted content changes through the existing reviewed source process.

**Tech Stack:** TypeScript, Cloudflare Workers, Workflows, Cron Triggers, D1, Web Crypto, Vitest, and the current qualified model and GitHub adapters.

**Spec:** [Maintenance specification](../../specs/2026-11-26-sulemanji-maintenance.md) and [complete design](../../specs/2026-11-26-sulemanji-rebuild-design.md).

## Global constraints

- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the publication dates and URLs of eligible articles.
- Use reviewed schema changes instead of new legacy exemptions.
- Keep inference outside the visitor request path.
- Use one active production publisher.
- Treat source text and memory text as untrusted data.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.
- Keep the last verified public site available when background work fails.

Use the exact types and limits in the maintenance specification.
Use [Shared contracts](CONTRACTS.md) for supporting types and wire details.
Three review rounds is a lifetime candidate limit.
Routine qualified publication requires no new per-article owner confirmation.
Private declassification and authored-meaning changes retain their distinct authority requirements.

## Review focus

| Condition | Expected result | Test owner |
|---|---|---|
| A delayed upsert follows withdrawal. | Keep the higher withdrawal sequence. | T07 |
| Several sources repeat one underlying episode. | Preserve one evidence origin. | T08 |
| Concurrent calls or resume cross daily/monthly boundaries. | Preserve atomic budget and candidate identity. | T09 |
| Merge succeeds but the response is lost. | Reconcile before retrying any effect. | T10 |
| A learned correction is too broad for a later situation. | Retain scope and avoid an invented global rule. | T11 |

## File structure

Use focused modules under cloudflare/src/editorial/.
Keep public-host code under cloudflare/src/site/.
Shared public content types may live under cloudflare/src/contracts/.
Do not import a private producer's source or credentials into this repository.

| Module | Responsibility |
|---|---|
| contracts.ts | Signal, Candidate, review, knowledge, and publication schemas. |
| knowledge.ts | Signed derivative admission, sequencing, and withdrawal. |
| sources.ts | Bounded source retrieval and date preservation. |
| relevance.ts | Duplicate detection and useful action selection. |
| scheduler.ts | Local schedule-slot admission. |
| state.ts | D1 candidate state and conditional transitions. |
| budget.ts | Atomic cost reservation, settlement, and reconciliation. |
| workflow.ts | Durable orchestration with explicit effect steps. |
| models.ts | Configured author and independent reviewer calls. |
| review.ts | Receipt validation against exact dependencies. |
| publisher.ts | Allowlisted GitHub changes, head checks, and guarded merge. |
| verify.ts | Deployment and actual public-content readback. |
| maintenance.ts | Corrections, relations, protected-field enforcement, and scoped lessons. |
| operator.ts | Authenticated status, pause, resume, inspect, and reconciliation commands. |

Create cloudflare/migrations/0001_editorial.sql.
It owns source observations, knowledge revisions, candidates, attempts, review receipts, publication effects, schedule claims, usage reservations, and publisher ownership.
Use unique keys and conditional transitions for concurrent behavior.
Use bounded columns and retention rules from the specification.
Do not use KV as a lock or financial authority.

### Task T07: Authorized knowledge import

**Files**

- Create: cloudflare/src/editorial/contracts.ts, cloudflare/src/editorial/knowledge.ts.
- Create: cloudflare/src/editorial/index.ts, cloudflare/wrangler.editorial.jsonc, cloudflare/wrangler.editorial-staging.jsonc.
- Create: cloudflare/migrations/0001_editorial.sql, cloudflare/test/knowledge.test.ts.
- Private companion: retrieve the exact knowledge-supply handoff labeled sulemanji-rebuild-2026-11-26 from Viyu memory.

**Interfaces**

- Consumes: signed KnowledgeEnvelope bytes from the qualified private producer.
- Produces: ingestKnowledge(raw: Uint8Array, signature: string, keyId: string, env: EditorialEnv): Promise<ImportResult>.
- ImportResult is accepted, duplicate, withdrawn, or rejected with a reason code.
- Produces: POST /internal/knowledge on the separate editorial Worker.
- Produces: getPublicKnowledge(subjectId: string, db: D1Database, now: Date): Promise<PublicKnowledge | null>.

- [ ] **Step 1: Write importer and sequencing tests.**

Create accepts_valid_target, rejects_bad_signature, rejects_expired_payload, rejects_digest_mismatch, rejects_oversize_body, duplicate_is_noop, and withdrawal_beats_delayed_upsert.
Assert a signed valid envelope creates one accepted record.
Assert wrong key, target, policy, timestamps, or payload cannot enter model context.
Assert withdrawal sequence 3 followed by upsert sequence 2 remains withdrawn.
Assert conflicting content at one sequence fails.
Assert valid renewal can retain its content revision with a higher sequence.
Assert canonical payload digests agree across the private producer and Worker.
Assert expiry and withdrawal immediately remove dependent generation eligibility.
Assert public projection omits derivative IDs and private authorization metadata.

- [ ] **Step 2: Run the tests before implementation.**

Run: npm --prefix cloudflare test -- knowledge.test.ts
Expected: FAIL for the missing importer behavior.

- [ ] **Step 3: Implement the importer and connect the real producer.**

Implement the exact types from the specification.
Verify the signature over raw bytes before parsing.
Use atomic revision checks and stable idempotency.
Apply current source authority in the private producer.
Execute the private companion in its actual source repository when an adapter is missing.
Keep that work and its private receipts outside this public repository.
Do not mint a broad memory credential or emulate a person identity.
Keep public-source work available during dependency qualification.

- [ ] **Step 4: Verify fixtures and actual integration separately.**

Run: npm --prefix cloudflare test -- knowledge.test.ts
Expected: PASS.
Run: npm --prefix cloudflare run check
Expected: PASS.
Send an authorized sanitized test derivative through the real private producer to isolated staging.
Observe its accepted revision, duplicate behavior, and withdrawal.
Label the fixture lane synthetic until this deployed path passes.

- [ ] **Step 5: Commit the site-side contract.**

Commit message: feat: import authorized knowledge with revision and withdrawal checks.
Record the private companion's code and deployment evidence in its private checkpoint.

### Task T08: Signals and action selection

**Files**

- Create: cloudflare/src/editorial/sources.ts, cloudflare/src/editorial/relevance.ts.
- Create: cloudflare/config/public-sources.json, cloudflare/config/editorial-policy.example.json.
- Create: cloudflare/test/sources.test.ts, cloudflare/test/relevance.test.ts.
- Create: cloudflare/test/fixtures/ with synthetic or licensed public-source examples only.

**Interfaces**

- Consumes: /content-index.json, PublicKnowledge, and a reviewed public source registry.
- Produces: collectSignals(registry: SourceConfig[], now: Date, fetcher: typeof fetch): Promise<SignalBatch>.
- SignalBatch contains signals and explicit source failures.
- Produces: chooseAction(signal: Signal, catalog: PublicContentItem[], context: PublicKnowledge[], history: RecentHistory): ActionDecision.
- ActionDecision is NO_CHANGE with reason or a Candidate proposal.

- [ ] **Step 1: Write temporal, relevance, and source tests.**

Create old_event_is_not_new, duplicate_feeds_share_episode, new_package_version_targets_existing_tool, unrelated_macro_event_is_no_change, and curiosity_can_qualify.
Assert publication, event, and retrieval dates remain distinct.
Assert an unchanged source makes no model request.
Assert repeated generated material does not corroborate itself.
Assert off-registry redirects, private URLs, oversized responses, and instructions embedded in source text are rejected as effects.

- [ ] **Step 2: Run the focused tests.**

Run: npm --prefix cloudflare test -- sources.test.ts relevance.test.ts
Expected: FAIL for the missing source and relevance contracts.

- [ ] **Step 3: Implement bounded discovery and action selection.**

Validate actual source formats and publication rights.
Seed public macro, product, industry, project, and package sources relevant to the catalog.
Do not connect personal financial accounts or purchase data feeds.
Use deterministic freshness, deduplication, and permission checks before model work.
Use explicit reader benefit and existing content when selecting an action.
Keep NO_CHANGE as a successful result.
Treat current interest and repetition as context, not forced topic quotas.

- [ ] **Step 4: Verify useful and intentionally rejected outcomes.**

Run: npm --prefix cloudflare test -- sources.test.ts relevance.test.ts
Expected: PASS.
Replay a package change, a vendor change, a macro event with no relevant content, and an independent-interest event.
Expected: explainable distinct decisions, including at least one valid NO_CHANGE.

- [ ] **Step 5: Commit discovery and selection.**

Commit message: feat: select useful site changes from dated public signals.

### Task T09: Durable orchestration and budgets

**Files**

- Create: cloudflare/src/editorial/scheduler.ts, state.ts, budget.ts, workflow.ts, operator.ts.
- Extend: cloudflare/migrations/0001_editorial.sql or add a forward migration if already applied.
- Create: cloudflare/test/scheduler.test.ts, budget.test.ts, workflow.test.ts.
- Modify: editorial Worker configurations and entrypoint.

**Interfaces**

- Produces: claimScheduleSlot(db: D1Database, now: Date, policy: EditorialPolicy): Promise<SlotClaim | null>.
- Produces: reserveUsage(db: D1Database, request: UsageReservation): Promise<ReservationResult>.
- Produces: settleUsage(db: D1Database, reservationId: string, actualUsd: number | null): Promise<void>.
- Produces: transitionCandidate(db: D1Database, id: string, from: CandidateState, to: CandidateState, revision: string): Promise<boolean>.
- Produces: EditorialWorkflow.run(event, step), using the current Workflows runtime contract.
- Produces: authenticated operator operations with stable structured results.

- [ ] **Step 1: Write concurrency and resume cases.**

Create slot_once_per_chicago_date, dst_slots_remain_unique, resume_keeps_candidate_id, budget_reservation_is_atomic, unknown_cost_remains_reserved, and pause_prevents_new_effects.
Run concurrent reservations whose sum exceeds USD 2 daily or USD 30 monthly.
Assert admitted spending never exceeds either limit.
Assert six model calls and three review rounds remain lifetime candidate limits after resume.
Assert a cross-midnight retry does not create another article or PR.

- [ ] **Step 2: Run the focused tests.**

Run: npm --prefix cloudflare test -- scheduler.test.ts budget.test.ts workflow.test.ts
Expected: FAIL for absent durable behavior.

- [ ] **Step 3: Implement the scheduler, state, and Workflows.**

Use hourly UTC Cron only to admit due Chicago slots.
Use D1 uniqueness for schedule claims.
Use tested atomic conditional database operations for usage reservation and settlement.
Do not use a process-local mutex or read-then-write balance check.
Keep workflow payloads small and store bounded state by candidate ID.
Record intent before external effects and reconcile ambiguous results.
Keep staging resources and credentials separate.
Implement private status, pause, resume, inspect, and retry-after-reconciliation commands.
Do not add a public dashboard or new messaging destination.

- [ ] **Step 4: Test the actual isolated runtime.**

Run: npm --prefix cloudflare test -- scheduler.test.ts budget.test.ts workflow.test.ts
Expected: PASS.
Run: npm --prefix cloudflare run check
Expected: PASS.
Exercise interruption and resume with isolated staging D1 and Workflows.
Expected: one candidate, one slot claim, bounded costs, and a durable final outcome.

- [ ] **Step 5: Commit durable operation.**

Commit message: feat: add bounded durable editorial orchestration.

### Task T10: Reviewed publication and readback

**Files**

- Create: cloudflare/src/editorial/models.ts, review.ts, publisher.ts, verify.ts.
- Create: cloudflare/test/review.test.ts, publisher.test.ts, live-verification.test.ts.
- Modify: workflow.ts, operator.ts, and reviewed runtime configuration.
- Reuse: current Writing and build contracts from T06 and issue #21.

**Interfaces**

- Produces: prepareContent(candidate: Candidate, context: PreparationContext, models: ModelGateway): Promise<ContentProposal>.
- Produces: reviewContent(proposal: ContentProposal, context: ReviewContext, models: ModelGateway): Promise<ReviewReceipt>.
- Produces: canPublish(proposal: ContentProposal, receipt: ReviewReceipt, state: PublicationState): PublicationDecision.
- Produces: publishContent(proposal: ContentProposal, receipt: ReviewReceipt, deps: PublishDependencies): Promise<PublishAttempt>.
- Produces: verifyPublication(attempt: PublishAttempt, fetcher: typeof fetch): Promise<PublicationReceipt>.
- ContentProposal includes candidate_id, content_digest, base_commit, changed files, public sources, and required media.

- [ ] **Step 1: Write independence and external-effect tests.**

Create rejects_self_clearance, invalidates_changed_content, invalidates_changed_source_or_policy, rejects_protected_paths, permits_required_article_media, and third_failed_round_holds.
Assert author and reviewer run identities differ.
Assert a changed base invalidates applicable review.
Simulate a successful merge followed by a lost response.
Assert the retry discovers the original merge and creates no duplicate.
Test nested article HTML, a 200 homepage with a missing article, and a wrong deployed revision.

- [ ] **Step 2: Run the focused tests.**

Run: npm --prefix cloudflare test -- review.test.ts publisher.test.ts live-verification.test.ts
Expected: FAIL for absent guarded behavior.

- [ ] **Step 3: Implement the model and publishing adapters.**

Select currently supported authorized model IDs and record their pricing and structured-output contract.
Keep author and reviewer contexts independent.
Use server-assigned run identities and receipts; reject model-supplied authority.
Validate public safety before any public Git write.
Allow only reviewed article, relation, catalog, and required media paths.
Reject workflow, script, policy, protected identity, and credential changes.
Bind clearance to exact content and relevant dependencies.
Use current expected-head merge semantics.
Read existing branch, PR, merge, and deployment state after ambiguous effects.
Parse real HTML for public verification.
Preserve routine automatic publication authority.

- [ ] **Step 4: Qualify the full path in staging.**

Run: npm --prefix cloudflare test -- review.test.ts publisher.test.ts live-verification.test.ts
Expected: PASS.
Run: bash scripts/check_site_release.sh
Expected: PASS.
Use a private test target or an explicitly authorized safe fixture destination.
Exercise author, independent review, required image, source checks, merge, deployment, and readback.
Exercise one rejected claim and one stale-clearance case.
Expected: one verified permitted effect and no rejected effect.

- [ ] **Step 5: Commit guarded autonomous publication.**

Commit message: feat: publish reviewed site content with durable live verification.

### Task T11: Corrections and editorial maintenance

**Files**

- Create: cloudflare/src/editorial/maintenance.ts, cloudflare/test/maintenance.test.ts.
- Modify: relevance.ts, workflow.ts, operator.ts.
- Modify: content-catalog and relation handling where maintenance requires explicit protected fields.
- Create: docs/redevelopment/2026-11-26/OPERATIONS.md.

**Interfaces**

- Produces: planMaintenance(event: MaintenanceEvent, item: PublicContentItem): MaintenanceDecision.
- Produces: applyProtectedFields(before: PublicContentItem, proposal: ContentProposal): ProtectedFieldResult.
- Produces: recordCorrection(correction: ScopedCorrection, store: CorrectionStore): Promise<CorrectionReceipt>.
- MaintenanceDecision is NO_CHANGE, a bounded allowed proposal, or NEEDS_OWNER with the exact protected change.
- ScopedCorrection retains source episode, scope, original instruction, affected behavior, and regression reference.

- [ ] **Step 1: Write correction and meaning-preservation tests.**

Create refresh_retains_original_publication_date, biography_change_needs_owner, withdrawal_invalidates_dependents, repeated_summary_is_one_source, and correction_scope_does_not_expand.
Assert a source refresh cannot invent firsthand experience.
Assert a market cue cannot change personal beliefs or employment identity.
Assert a real correction updates only affected claims and their dependencies.
Assert routine mechanical changes do not enter an owner approval queue.
Assert an unrelated useful candidate proceeds when another candidate is held.

- [ ] **Step 2: Run the focused tests.**

Run: npm --prefix cloudflare test -- maintenance.test.ts
Expected: FAIL before maintenance behavior exists.

- [ ] **Step 3: Implement maintenance and scoped learning.**

Maintain links, substantive updates, source revisions, related material, and factual corrections.
Keep explicit featured selection stable unless its accepted selection policy permits a change.
Preserve authored identity, commitments, and historical states.
Convert owner corrections into bounded rules and targeted regression cases.
Use the existing private memory write authority for those records.
Never publish raw feedback or private source lineage.
Add private operational summaries for changes, reasons, unresolved decisions, and actual usage.
Suppress routine success chatter.

- [ ] **Step 4: Verify the complete adaptive behavior.**

Run: npm --prefix cloudflare test -- maintenance.test.ts
Expected: PASS.
Run: npm --prefix cloudflare run check
Expected: PASS.
Replay a correction, a protected-meaning proposal, a knowledge withdrawal, an irrelevant signal, and a useful independent-interest update.
Expected: the declared distinct outcomes, preserved dates, and no disclosure or permission expansion.

- [ ] **Step 5: Commit ongoing maintenance.**

Commit message: feat: maintain useful content and preserve authored meaning.
Document actual operator commands and recovery cases.
