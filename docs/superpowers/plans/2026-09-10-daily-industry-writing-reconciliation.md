# Read first: daily Writing plan and concurrent WR-P1 reconciliation

**Program:** portfolio #21. **Slice:** WRIT-PLAN-001. **State:** PROPOSED_FOR_REVIEW; no implementation, article or schedule activation.

This document is part of the docs-only daily Writing proposal. It takes precedence over conflicting WR-P1 file names, public article metadata, verifier instructions, publication authority, review binding, backlog ordering, scheduler resumption and production-verification language in `2026-09-10-daily-industry-writing.md`. Unaffected research, ranking, privacy and source-integrity requirements remain proposed as written.

## Owner runtime and publication corrections

The owner controls recorded as **WR-PUBLISH-001** and **WR-PUBLISH-002** in issue #21 supersede the broader plan's draft-only, owner-merge and Codex-implementation assumptions.

The active role model is:

- the scheduled Daily Public Writing session owns COORDINATOR, BUILDER/FIXER and guarded PUBLISHER phases;
- Codex is independent REVIEWER only;
- Codex may report findings but must not be asked to build, edit, fix, merge, deploy or implement this plan;
- the scheduled session never self-approves its own implementation;
- routine owner approval is not required after a current-head independent review is clean and all local/publication gates pass.

The successful business outcome is not a draft PR. It is a reviewed article merged to production `main` and verified at its canonical `https://www.sulemanji.com/notes/<slug>` route with the correct discoverable entry on `https://www.sulemanji.com/writing`.

### WR-PUB-01 — guarded automatic publication path

The future publisher is a separately bounded coordinator/publisher capability, not the drafting worker. It may merge only the one active Writing PR after all of these conditions are true:

1. the remote PR head SHA exactly matches the independently reviewed head;
2. the review receipt is current and contains no unresolved material findings;
3. the changed-file allowlist is limited to the accepted atomic slice;
4. required local source/public-safety/Writing/build checks passed on that head;
5. current `main` and the PR base were reconciled immediately before merge;
6. the merge uses an expected-head guard and the repository's normal merge mechanism;
7. no force push, direct unreviewed main push, stale review or GitHub Actions gate is used.

The publisher must prove the actual repository merge permission and the existing production deployment path before activation. A planning claim that a main push deploys is not activation evidence. The existing main-push deployment may run normally after the guarded merge; this program does not create or modify a GitHub Actions workflow.

If permission, deployment access or release behavior cannot be demonstrated, the state is `BLOCKED_IMPLEMENTATION_ACCESS` or `MERGED_NOT_LIVE_VERIFIED` as applicable, not `DRAFT_ONLY` and not `NO_PUBLISHABLE_ARTICLE`.

### WR-SCHED-01 and WR-QUEUE-01 — resume work across dates and drain backlog first

The local calendar date is a research cadence key, not the identity of unfinished work. Every invocation begins with a cross-date reconciliation of durable Writing state before opening a new daily run.

The dispatcher processes exactly one highest-priority atomic item per invocation in this order:

1. unsafe live correction;
2. `MERGED_NOT_LIVE_VERIFIED` publication reconciliation;
3. current-head review findings requiring a FIXER slice;
4. returned independent review requiring reconciliation;
5. missing foundation/publisher implementation blocker;
6. independently cleared publication-ready head;
7. oldest other unfinished article/program item;
8. only when all actionable backlog is drained, the current local day's research target.

For a prior `REVIEW_PENDING` item, the dispatcher resumes the original durable item/run key even after the date changes. It validates reviewer identity, reviewed head SHA and required hashes before moving to FIXER, READY_TO_MERGE or another review round. A newer local date never strands an older review.

Queue saturation never authorizes another private/public article draft. New research is blocked while older actionable Writing work exists. An item may leave the queue only through a terminal disposition or an explicit external blocker with enough durable state to resume later.

### WR-REVIEW-01 — exact-head review receipt

Independent clearance is a durable receipt bound to the exact remote artifact. At minimum it records:

- repository and PR number;
- remote head SHA;
- base branch and reconciled base SHA;
- article/plan artifact hash or hashes for reviewed scope;
- applicable public-claims policy hash;
- source/claim-ledger hash when an article is in scope;
- reviewer identity and review submission/thread references;
- review completion time;
- finding IDs and their resolved/unresolved state;
- review round number.

A receipt is invalidated by any material change to the head, reviewed content, base, policy, source set or dependency that changes reviewed behavior. A prior-head review can never authorize a later-head merge. The guarded merge transition must fail closed when the stored reviewed head differs from the current remote head.

Acceptance coverage must include a negative case where head `A` is reviewed, head `B` changes reviewed scope, and the publisher refuses to merge `B` until a new independent review completes.

### WR-LIVE-01 — production article and `/writing` verification

Merge is an intermediate state. `PUBLISHED_VERIFIED` / `LIVE_VERIFIED` requires both production checks against the real public origin:

1. fetch the canonical `https://www.sulemanji.com/notes/<slug>` URL and verify the approved title/body identity plus expected canonical route/content fingerprint;
2. fetch `https://www.sulemanji.com/writing` and verify the correct article link and expected visible metadata entry.

HTTP 200 by itself, a generic site title, a GitHub source URL or a local Jekyll render is insufficient. If the merge is on `main` but either production check has not passed, preserve `MERGED_NOT_LIVE_VERIFIED` and make it the next invocation's publication priority. Never create or merge a duplicate article to repair propagation.

These corrections are requirements for implementation and acceptance tests in the broader WR-P2–P10 design. They do not claim that the publisher, scheduler, merge permission or public verification path is already implemented.

## Why this reconciliation exists

During the final issue read-back, another session's complete WR-P1 plan appeared in the same program:

- [WR-P1 part 1: contract, renderers and execution](https://github.com/ssmanji89/sulemanji-port/issues/21#issuecomment-5627829276).
- [WR-P1 part 2: complete validator and tests](https://github.com/ssmanji89/sulemanji-port/issues/21#issuecomment-5627843642).

Part 1 records PLAN_READY / implementation NOT_STARTED, a consolidated document fingerprint, and a next-role handoff to BUILDER for WR-P1. It proposes a more specific Ruby/Jekyll-compatible foundation. These comments were absent from the initial issue read and present at the final read. No foundation implementation or independent review is inferred from them.

There must be one implementation of the Writing foundation. **WR-P1-A in the broader graph is an alias/dependency on that existing WR-P1, not an alternate builder assignment.** Do not create its originally proposed `note.html`, `writing-list.html`, `writing_catalog.rb`, `verify_writing.py` or Python Writing-index test suite. Do not require the other session to redo its work or wait for unrelated collector design approval. Reconcile its latest state before acting.

## Foundation contract to consume

The existing WR-P1 plan owns these future paths:

```text
writing.md
_data/writing.yml
_includes/writing-entry.html
_includes/writing-meta.html
_layouts/writing-article.html
scripts/verify_writing.rb
scripts/tests/test_writing.rb
docs/WRITING-CONTRACT.md
AGENTS.md (owning paragraph only at implementation time)
```

It preserves the legacy note file and `/notes/agent-safety` URL without inventing a publication date. The five existing verifiers remain unchanged. The new focused Ruby verifier supplies Writing/note coverage; **do not edit `verify_portfolio_review.py` merely because the broader proposal initially suggested expanding its route list**.

Public article metadata follows that foundation's closed schema. A synthetic valid example is:

```yaml
---
writing_schema: 1
layout: writing-article
title: "A specific supported article title"
description: "The operational decision this article helps the reader understand."
permalink: /notes/a-specific-supported-article-title
published: true
published_on: "2026-09-10"
article_type: analysis
time_horizon: timely
reader: it-leader
topics:
  - microsoft-365
---
```

The example is not a published article or observed release date. Optional `updated_on` is a quoted ISO calendar date; it cannot precede `published_on` or exceed the validation cutoff. Undated private drafts use `published: false` with null/absent publication dates. Intended-public pages cannot be future-dated. Updating an article does not move it to the top; order is publication day descending, then permalink ascending. Source and actual live-observation times remain separate facts.

The broad plan's proposed `date`, `last_modified_at`, `article_id`, `research_as_of` and `assistance` front-matter fields must **not** be emitted under this closed schema. Keep article IDs, exact research cutoffs, source hashes, assistance details, review evidence and live times in private typed records. Put truthful reader-facing research/drafting assistance and an as-of note in ordinary article prose when appropriate, not an unapproved metadata field. No `source_reviewed: true` badge. Public Markdown citations remain beside the claims they support.

`_data/writing.yml` owns accepted reader/type/topic keys. A business application owner can be the human target audience while the emitted reader key remains the appropriate registered value. Expanding the registry is reviewed work, not free-form model output.

## Downstream implementation changes

**WR-P5-A emitter:** produce exactly the foundation metadata above using safe serialization. Use `writing-article`, `published_on` and `updated_on`, one article H1 owned by the layout, and the implemented registry. Continue rejecting unknown keys, aliases, duplicate keys, unsafe paths, raw HTML and executable Liquid. Do not weaken either pipeline or foundation checks to reconcile a failed draft.

**Catalog integration:** the foundation proposes `WritingContract.catalog(source, as_of: Date)` returning `Catalog(active, drafts, legacy, registry)`, with `Article(path, data, legacy)`. The future WR-P5-A may add one isolated adapter, `blog_automation/industry_writing/catalog_bridge.rb`, which requires the existing Ruby verifier and exposes `--source PATH --as-of YYYY-MM-DD`. It serializes a version-1 JSON object with active/drafts/legacy arrays and registry. Each article record contains path, URL from `data['permalink']`, title, description, published_on, updated_on and legacy. It must call the foundation catalog rather than implement a competing YAML parser. The Python pipeline validates the adapter output and retains IDs/cutoffs in its private records. This adapter is not implemented by the planning PR.

**WR-P7-B corrections:** keep original `published_on`; use substantive `updated_on` and a visible correction explanation. Independent review remains bound to the exact current content/head under WR-REVIEW-01; routine owner approval is not a publication prerequisite under WR-PUBLISH-001/002. Actual live state is observed separately. Do not add legacy date-field aliases to make an old draft pass.

**WR-P8-A proof and WR-P8-B task:** invoke the actual implemented Ruby Writing gate. The proposed command is:

```bash
bundle exec ruby scripts/verify_writing.rb --source . --site _site --as-of YYYY-MM-DD
```

Here `YYYY-MM-DD` means the frozen run date supplied by the coordinator, not a literal argument in an executing command. The new focused gate runs alongside all five original Python verifiers and the production Jekyll build. No `python3 scripts/verify_writing.py` call is created. Source-only mode is not rendered-site proof.

**WR-P10-A optional feed:** consume `published_on` and `updated_on` from the same eligible catalog. Preserve original publication identity. Do not assume the existing post feed discovers ordinary notes or install a second feed dependency.

**Daily coordinator:** read this reconciliation, current owner-control comments and the accepted/implemented WR-P1 contract before choosing emitter fields, validation commands or publication transitions. Reconcile cross-date backlog before the current day's research. If the foundation evolves, stop incompatible emission and obtain a reviewed adapter update rather than introducing a second schema.

## Acceptance additions for downstream integration

Before positive article delivery, test that a generated intended-public fixture passes `WritingContract.catalog` and the real rendered Ruby gate; the broader proposal's retired metadata fails; both legacy and new routes are preserved; unpublished/future/unknown-field notes fail or remain excluded exactly as the foundation specifies; correction metadata does not reorder an article; and the bridge serializes the foundation catalog without duplicating parsing rules.

Also test the publication-control corrections above:

- a previous-head review cannot authorize merge of a changed head;
- returned `REVIEW_PENDING` work from a prior date is resumed before a new daily run;
- actionable backlog prevents another article draft/research selection;
- guarded merge refuses out-of-allowlist changes or a moved head;
- missing merge/deployment permission fails closed rather than claiming publication;
- an article route without the matching `/writing` entry remains `MERGED_NOT_LIVE_VERIFIED`;
- `/writing` containing a stale/wrong link does not satisfy production verification.

These are future integration tests, not passing evidence from this planning session.

## Roles and state

The concurrent WR-P1 handoff remains the foundation's next implementation dependency, subject to the latest owner/repository instructions and independent review. Under WR-PUBLISH-002, the scheduled session performs future BUILDER/FIXER work; Codex is independent REVIEWER only. The broader WR-P2–P10 architecture remains PROPOSED_FOR_REVIEW with the five P1 design findings addressed by this read-first reconciliation and awaiting fresh independent review of the new exact head.

This is a planning-contract reconciliation, not a new program or completion-state transition for implementation. EVID-001 remains separate. No source file, verifier, site route, dependency, schedule, privilege or public article was changed. DOX: no active repository ownership change; no AGENTS edit.
