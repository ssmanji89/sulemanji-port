# Sulemanji redesign — Codex CLI kickoff contract

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

## Read first

1. Read the associated planning PR at its current head or merged successor.
2. Read the repository `AGENTS.md` and applicable instructions in each changed directory.
3. Read [the Goal](../goals/2026-11-25-portfolio-redesign.md) and [the design](2026-11-25-portfolio-redesign-design.md).
4. Read [the plan index](../plans/2026-11-25-portfolio-redesign/README.md) and its linked acceptance matrix and source ledger.
5. Read `docs/PUBLIC-CLAIMS-POLICY.md`, `docs/WRITING-CONTRACT.md`, and the current article-publisher coordination in issue #21.

The inspected repository has no `LOOP.md`. Read one only if current source or the local execution environment actually provides it.

## Admission and reconciliation

Locate an authenticated local checkout. Do not assume the starting directory is the repository.
Inspect its remote, status, branches, worktrees, active tasks, and local handoff instructions.
Preserve unrelated changes and active owners. Do not reset a dirty checkout or reuse another task's branch.

Fetch `origin/main` and the current planning PR ref.
Create a dedicated release worktree from the freshly fetched main commit.
Import only this package's documents and reference assets from the planning PR.
Do not merge unrelated planning-branch ancestry into the release branch.
Record the exact main and planning commits in the execution checkpoint.

The source inspected for this package is `5ab5122b61a16ed0bb72067b8a346c67f3091bfa`.
Treat that value as provenance, not a permanent base or a reason to revert newer work.
The private preview uses an earlier production snapshot and a separate static builder.
Use it for design and selected copy. Keep the production Jekyll architecture.

Read the current states of PRs #9, #61, #67, #71, #84, #85, #86, and #90.
Reconcile newer PRs as needed. Do not automatically merge, close, or absorb another owner's work.
Issue #21 owns daily Writing publication. Preserve its active review and publication process.

## Execution method

Use `superpowers:using-git-worktrees` for isolation.
Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` for the listed tasks.
Use `superpowers:systematic-debugging` when a check fails unexpectedly.
Use `superpowers:requesting-code-review` and `superpowers:verification-before-completion` before the final handoff.

Use behavioral tests where a change can break publishing, retirement, access, article visibility, or navigation.
Do not add tests that only repeat CSS declarations or internal function bodies.
Use independent tasks concurrently only when they have separate write ownership.
Keep one owner for shared templates, navigation, and integration changes.

Each accepted task records its code revision, commands, results, review findings, and remaining dependencies.
Use `docs/redesign/2026-11-25/EXECUTION.md` as the repository checkpoint when local rules provide no existing owner.
Keep private operational evidence in the approved private evidence store. Publish only sanitized status and artifact references.
Never copy customer records or private memory into this public repository.

## Existing decisions

The owner delegates personal-topic selection and requests the broader project history.
Do not reopen the ff-cli-only selection or ask the owner to choose the same subjects again.
The owner retires the public workshop and paid-discovery offer.
Business inquiries lead directly to Viyu. This replaces the earlier mandatory personal routing.
The current public-disclosure, attribution, and evidence boundaries remain in force.

The assistant selects the paper-and-green visual direction for the private preview.
Treat its frozen reference as a concrete implementation direction, not a claim of final owner visual approval.
Make routine integration choices. Escalate only a material scope, disclosure, commercial, or production decision.

## Authority

Allowed: source changes, local or disposable tests, independent review, commits, branch publication, implementation PRs, and authorized read-only inspection.

Separate release authority controls merge, push to main, live Worker deployment, DNS, live configuration, data deletion, payments, and external messages.
The Pages workflow publishes on push to main. A merge can therefore publish the site.
Do not use the daily article publisher's authority to release the complete redesign.

Existing paid or scheduled obligations require a concrete disposition before removing their servicing paths.
Missing operational access does not prevent unrelated authorized engineering work.
It does prevent a claim that retirement or production qualification is complete.

## Finish and resume

Report these states separately: package published, Goal acknowledged, source implemented, tests passed, review passed, PR open, merged, and production verified.
Publishing this package does not start a local Codex session.

Complete when all authorized engineering deliverables exist and remaining external actions have exact owners and instructions.
Use blocked only when no authorized engineering path remains.
Preserve the checkpoint and return the next useful action. Do not wait indefinitely for an external gate.

After a later authorized public release, verify the deployed revision, the main routes, Writing discovery, contact routing, and retirement behavior.
Do not infer production success from a merge response or attempted deployment.
