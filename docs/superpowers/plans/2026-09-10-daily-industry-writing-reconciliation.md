# Read first: daily Writing plan and concurrent WR-P1 reconciliation

**Program:** portfolio #21. **Slice:** WRIT-PLAN-001. **State:** PROPOSED_FOR_REVIEW; no implementation, article or schedule activation.

This document is part of the docs-only daily Writing proposal. It takes precedence over conflicting WR-P1 file names, public article metadata and verifier instructions in `2026-09-10-daily-industry-writing.md`. Unaffected research, ranking, review, privacy, scheduling and authority requirements remain proposed as written.

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

**WR-P7-B corrections:** keep original `published_on`; use substantive `updated_on` and a visible correction explanation. Owner approvals still bind exact current content/head; actual live state is observed separately. Do not add legacy date-field aliases to make an old draft pass.

**WR-P8-A proof and WR-P8-B task:** invoke the actual implemented Ruby Writing gate. The proposed command is:

```bash
bundle exec ruby scripts/verify_writing.rb --source . --site _site --as-of YYYY-MM-DD
```

Here `YYYY-MM-DD` means the frozen run date supplied by the coordinator, not a literal argument in an executing command. The new focused gate runs alongside all five original Python verifiers and the production Jekyll build. No `python3 scripts/verify_writing.py` call is created. Source-only mode is not rendered-site proof.

**WR-P10-A optional feed:** consume `published_on` and `updated_on` from the same eligible catalog. Preserve original publication identity. Do not assume the existing post feed discovers ordinary notes or install a second feed dependency.

**Daily coordinator:** read this reconciliation and the accepted/implemented WR-P1 contract before choosing emitter fields or validation commands. Read current issue comments as well as the broader proposal. If the foundation evolves, stop incompatible emission and obtain a reviewed adapter update rather than introducing a second schema.

## Acceptance additions for downstream integration

Before positive article delivery, test that a generated intended-public fixture passes `WritingContract.catalog` and the real rendered Ruby gate; the broader proposal's retired metadata fails; both legacy and new routes are preserved; unpublished/future/unknown-field notes fail or remain excluded exactly as the foundation specifies; correction metadata does not reorder an article; and the bridge serializes the foundation catalog without duplicating parsing rules. These are future integration tests, not passing evidence from this planning session.

## Roles and state

The concurrent WR-P1 handoff remains the foundation's next-role authority, subject to its latest owner/repository instructions and independent review. The broader WR-P2–10 architecture remains PROPOSED_FOR_REVIEW. Its requested independent SPEC-REVIEWER examines popularity/evidence/voice and scheduling/public-write/failure boundaries, with this reconciliation included. No reviewer was launched here and no CLEAN is asserted.

This is a planning-contract reconciliation, not a new program or completion-state transition. EVID-001 remains separate. No source file, verifier, site route, dependency, schedule, privilege or public article was changed. DOX: no active contract or ownership change; no AGENTS edit.
