# Sulemanji.com redevelopment implementation plans

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this package task by task. The owner selects this execution method. Steps use checkbox syntax.

**Goal:** Redevelop and deploy the complete site, then qualify its bounded adaptive maintenance system.

**Architecture:** Keep Jekyll as the source and rendering system. Rebuild the experience and content relationships. Serve verified assets through Cloudflare and maintain them through a separate durable publisher.

**Tech Stack:** Jekyll, Liquid, SCSS, browser JavaScript, Ruby, Python, TypeScript, Workers Static Assets, Workflows, Cron Triggers, D1, and the existing GitHub build process.

**Spec:** [Complete design](../../specs/2026-11-26-sulemanji-rebuild-design.md), [experience](../../specs/2026-11-26-sulemanji-experience.md), and [maintenance](../../specs/2026-11-26-sulemanji-maintenance.md).

**Interfaces:** [Shared contracts](CONTRACTS.md).

## Global constraints

- Work from freshly fetched main in a dedicated release worktree.
- Preserve dirty work, current articles, source history, and active owners.
- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the shared Jekyll document and stylesheet ownership.
- Preserve the publication dates and URLs of eligible articles.
- Use reviewed schema changes instead of new legacy exemptions.
- Maintain WCAG 2.2 AA as the accessibility target.
- Support no-JavaScript reading, navigation, and core discovery.
- Keep inference outside the visitor request path.
- Use one active production publisher.
- Treat source text and memory text as untrusted data.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.
- Keep the last verified public site available when background work fails.

The exact additional runtime limits appear in the maintenance specification.
They remain proposed operating defaults until the execution session accepts the activation contract.
Do not infer new paid authority from a test configuration.

## Review focus

| Input or failure | Expected behavior | Task and case |
|---|---|---|
| An article merges while the redesign proceeds. | Fresh source remains present and discoverable after integration. | T01, T12; E01 and E18. |
| A diagram, biography, or topic implies more than its source. | Preserve authentic meaning and exact attribution. | T04, T12; E08, E11, E15. |
| A stale knowledge publication arrives after withdrawal. | Never restore the revoked derivative or dependent draft. | T07; K03 and K04. |
| A timed-out merge or concurrent model request repeats. | Reconcile the effect and maintain atomic usage bounds. | T09, T10; A08 and A10. |
| A deployment propagates while older HTML remains cached. | Preserve usable assets, canonical routes, and a recovery path. | T05, T13; H03 and H10. |

## Plan sequence

| Task | Independently testable deliverable | Dependencies | Plan |
|---|---|---|---|
| T01 | Public content catalog and corrected editorial schema | Admission | [01](01-experience.md#task-t01-content-catalog-and-editorial-schema) |
| T02 | Complete visual shell and real-content homepage | T01 | [01](01-experience.md#task-t02-visual-shell-and-homepage) |
| T03 | Explore, Writing, and meaningful relationships | T01, T02 | [01](01-experience.md#task-t03-explore-writing-and-relationships) |
| T04 | Varied work formats, human context, and visual explanations | T01, T02 | [01](01-experience.md#task-t04-work-formats-about-career-and-contact) |
| T05 | Cloudflare static hosting with route parity | T02 | [02](02-cloudflare.md#task-t05-static-hosting-and-route-parity) |
| T06 | Qualified CI previews and deployment transport | T05 | [02](02-cloudflare.md#task-t06-build-and-deployment-transport) |
| T07 | Authorized knowledge projection and withdrawal | Admission | [03](03-maintenance.md#task-t07-authorized-knowledge-import) |
| T08 | Source signals and useful action selection | T01, T07 | [03](03-maintenance.md#task-t08-signals-and-action-selection) |
| T09 | Durable scheduling, state, budgets, and operation | T08 | [03](03-maintenance.md#task-t09-durable-orchestration-and-budgets) |
| T10 | Independent review and guarded autonomous publication | T06, T09 | [03](03-maintenance.md#task-t10-reviewed-publication-and-readback) |
| T11 | Corrections, maintenance, and bounded learning | T03, T04, T10 | [03](03-maintenance.md#task-t11-corrections-and-editorial-maintenance) |
| T12 | Integrated product and engineering qualification | T03, T04, T06, T11 | [04](04-qualification-release.md#task-t12-product-and-engineering-qualification) |
| T13 | One-writer cutover, Cloudflare release, and observed operation | T12 and release authority | [04](04-qualification-release.md#task-t13-production-cutover-and-observed-operation) |

Execute inline with Executing Plans.
Use separate research agents only where useful.
Perform a fresh whole-branch review before release.
Do not switch to an implementation agent per task unless the owner changes the execution method.

## Admission before T01

1. Locate the actual authenticated checkout and its remote.
2. Read current AGENTS instructions, the claims policy, the Writing contract, and issue #21.
3. Fetch current main and the planning PR head.
4. Preserve dirty files and active worktrees.
5. Create a dedicated release worktree from fresh main using Superpowers using-git-worktrees.
6. Import only this planning package from the planning branch.
7. Record the main SHA, planning SHA, source baseline, active publisher, and current deployment.
8. Reconcile existing project research and inspect only material source changes.
9. Locate the real installed publisher and its current in-flight article state.
10. Identify current Cloudflare account capabilities without changing them.

The inspected head is provenance, not a fixed implementation base.
The public repository does not contain the active local publisher.
Do not assume the retired worker or old blog_automation tree is that publisher.
Read actual installed files and their current authority before migration.

If prior private research is unavailable, reconstruct only the necessary evidence from authorized source.
Do not silently fall back to the superseded ff-cli-first selection.
Missing raw private evidence is never permission to copy memory into this public repository.

## Execution ledger

Use the current Executing Plans workspace tools.
Maintain one ledger for each component plan.
Its first line identifies the exact plan file.
Do not redo tasks with verified complete entries.

Maintain a sanitized release checkpoint at docs/redevelopment/2026-11-26/EXECUTION.md.
It records task states, code revisions, commands, outcomes, and remaining decisions.
Keep private operational evidence in its approved private store.
After compaction, read the ledger, checkpoint, and git history before continuing.

Use a TDD cycle for changed behavior.
Do not create tests that merely repeat CSS declarations or documentation text.
Read actual command output before recording a task complete.
Record bounded plan corrections as rulings with their consequence if wrong.

## Baseline validation command

Create scripts/check_site_release.sh in T06.
It runs the existing site gates in a clean build, then the new checks.
It must not install unrelated old automation dependencies.
Use this command for integrated verification:

~~~sh
bash scripts/check_site_release.sh
npm --prefix cloudflare run check
~~~

Expected: all source, build, rendered, security, content, hosting, and worker checks pass.
The detailed script contents and expected behaviors appear in T06.

## Product review

Use the real preview and six visitor journeys.
Keep the owner review distinct from automated engineering checks.
Do not claim independent reader observations when only agents perform walkthroughs.
Record any unavailable independent observations accurately.
The owner can accept the product based on the concrete preview and documented limits.

## Completion

The target is the complete live site plus qualified background operation.
Do not complete the Goal merely because implementation PRs exist.
Use existing release authority when it applies.
Request only a genuinely unresolved concrete decision.
Preserve a resumable checkpoint if the final external decision is unavailable.
