# Portfolio Redesign Implementation Plans

## Owner correction — 2026-11-25

The owner confirms that this site no longer uses Stripe or Cloudflare.
The earlier provider reauthentication and operational-reconciliation requirements are withdrawn as release prerequisites.
Existing Worker and payment source does not establish current service use.

The owner explicitly authorizes merging PR #97 and publication through the existing GitHub Pages workflow.
PR #97 is merged at `4261833004eaedf93ec0c6f41b846a20fcc1485d`.
Do not request Stripe or Cloudflare reconnection for this release.
Verify the actual Pages deployment and public site through the existing publication workflow.

This decision supersedes conflicting release gates in the original Goal, kickoff contract, plans, acceptance matrix, and execution record.
Earlier provider-access failures remain historical observations.
They do not establish a current blocker or a verified live-provider state.
The original implementation evidence below remains a record of its earlier execution, including its pre-authorization merge status.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Execute tasks through their acceptance checks and independent review.

**Goal:** Integrate the complete redesign into the canonical Jekyll site and prepare safe retirement of new workshop admission.

**Architecture:** Extend the shared Jekyll shell, Writing catalog, and existing Worker. Keep current publishing and service-state ownership. Use the private preview as design input.

**Tech Stack:** Jekyll, Liquid, SCSS, browser JavaScript, Ruby, Python, TypeScript, Hono, Cloudflare Worker, Vitest.

**Spec:** [Design](../../specs/2026-11-25-portfolio-redesign-design.md).

## Global constraints

- Repository: `ssmanji89/sulemanji-port`; production branch: `main`.
- Start implementation from freshly fetched main. Preserve active owners and unrelated work.
- Preserve all eligible current articles. The frozen preview's 41 articles are not a production target.
- Use the current Jekyll document, metadata, navigation, and stylesheet owners.
- Business contact: `https://viyu.net/contact-support/contact-us/`.
- Public content follows `docs/PUBLIC-CLAIMS-POLICY.md` and the owner decisions in the design.
- Keep all private research and operational records outside the public repository.
- New `work/` content must enter public-safety coverage.
- Remove public access to stale résumé PDFs unless safe replacements pass review.
- Retired Worker admission returns HTTP 410 with `error: offer_retired` and the exact `contactUrl` above.
- Missing or unknown `PUBLIC_OFFER_MODE` values mean retired.
- Preserve existing paid-case servicing, webhook, refund, administration, and retention behavior until disposition.
- Do not merge, push to main, deploy production, change live settings, send messages, make payments, or delete live data.
- Preserve the daily article publisher's separate owner authority.

## Review focus

| Input or condition | Expected behavior | Owning task |
|---|---|---|
| A new article merges after the preview or implementation starts | It remains eligible and discoverable without copying stale article data | T04, T07 |
| JavaScript fails, the screen narrows, or the reader uses a keyboard | Navigation and content remain available with visible focus | T02, T04 |
| A caller uses an old intake or checkout URL directly | New admission closes before writes or external effects | T06 |
| An already-paid case receives a callback or needs servicing | Existing obligation handling remains available and idempotent | T05, T06 |
| A stale PDF, nested case, or excluded document survives the build | The output check detects the unintended public surface | T03, T07 |

## Task graph

| Task | Deliverable | Dependencies | Plan |
|---|---|---|---|
| T01 | Source and decision reconciliation | None | [01](01-jekyll-redesign.md#task-t01-source-and-decision-reconciliation) |
| T02 | Shared shell, Home, About, and Contact | T01 | [01](01-jekyll-redesign.md#task-t02-shared-shell-and-main-pages) |
| T03 | Six cases, diagrams, and safe career surfaces | T02 | [01](01-jekyll-redesign.md#task-t03-work-cases-and-public-content-boundaries) |
| T04 | Current Writing archive with search and categories | T01, T02 | [01](01-jekyll-redesign.md#task-t04-writing-discovery-and-controls) |
| T05 | Public route retirement and obligation disposition | T01, T02 | [02](02-offer-retirement.md#task-t05-public-routes-and-existing-obligations) |
| T06 | Explicit Worker admission retirement | T01, T05 | [02](02-offer-retirement.md#task-t06-worker-admission-control) |
| T07 | Integrated production-build qualification | T03, T04, T05, T06 | [03](03-qualification-release.md#task-t07-integrated-qualification) |
| T08 | Independent review and implementation PR handoff | T07 | [03](03-qualification-release.md#task-t08-reviewed-release-handoff) |

Use [TASKS.json](TASKS.json) for dependencies and [ACCEPTANCE_MATRIX.md](ACCEPTANCE_MATRIX.md) for the 48 behavioral cases.
Read [SOURCE_LEDGER.md](SOURCE_LEDGER.md) for inspected files, current deltas, and commands.
Read [the reference directory](../../reference/2026-11-25-portfolio-redesign/README.md) for exact curated content and diagrams.
Read [the independent package review](../../reviews/2026-11-25-portfolio-redesign-handoff-review.md) for resolved findings and validation limits.

T03 and T04 can proceed concurrently after T02 when their write ownership remains separate.
T06 can proceed separately from article work. Shared-template integration remains single-owner work.

## Evidence and completion

All implementation tasks start as planned. The prior preview receipts do not satisfy canonical-source acceptance cases.
Record code revisions, commands, outcomes, review findings, and release blockers in the execution checkpoint.
Do not copy another project's fixed continuation-turn limit into this assignment.

Engineering completion requires implemented source, meaningful verification, independent review, a working implementation preview, and a real implementation PR.
Missing live obligation evidence leaves the corresponding release gate unresolved. It does not require an empty continuation loop.
The release owner receives exact next actions and rollback instructions.
