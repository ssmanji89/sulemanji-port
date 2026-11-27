# Plan: docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

| Task | State | Evidence | Remaining |
|---|---|---|---|
| T07 | Implementation partial | Focused knowledge/import tests and D1 dry-run pass. | Actual authorized Viyu derivative, deployed endpoint, durable live receipt and renewal observation. |
| T08 | Implementation partial | 58 Cloudflare tests pass; public source parsers and deterministic relevance are present. | Live source-read qualification and complete end-to-end candidate runner. |
| T09 | Implementation partial | Atomic budget, Chicago slot, durable claims/outbox, operator controls tested. | Live D1/Workflow resources and resumed durable execution. |
| T10 | Implementation partial | Provider schema, author/reviewer separation, bounded review, GitHub publisher, deployment readback. Latest `npm run check`: 56 passed / 4 skipped; site build: 229 assets / 55 preserved articles; static site Worker dry-runs pass. | Full Workflow integration from discovery through public readback; configured authorized provider; hosted checks and live verification. |
| T11 | Implementation partial | Scoped correction, dependency invalidation, protected-field checks, forward D1 correction ledger, and authenticated `record_correction` operator action. Tests cover deduplicated scope, idempotent persistence, conflicting-ID rejection, and durable receipts. | Workflow-driven claim repair and regression follow-up; wider independent-candidate cases. |

## Current rulings

- A durable slot receipt must not imply the scheduled content pipeline ran. Until discovery, review, publication, and public readback are wired, an active slot is recorded as `HELD_PIPELINE_UNCONFIGURED`.
- Keep staging and production maintenance bindings separate and paused. Current Cloudflare connection is unauthorized, so do not replace placeholder resource IDs or set model/publisher secrets.
- Article publication remains blocked if policy, knowledge, source, base revision, owner epoch, exact review receipt, or allowed paths do not match at effect time.

## Latest gate result

- `npm run check` in `cloudflare`: PASS, 56 passed / 4 skipped; 229 built assets; 55 preserved articles; both static Worker configs dry-run.
- Editorial Worker configs: separate staging and production bindings dry-run.
- `bash scripts/check_site_release.sh`: stopped before release qualification because the working tree was dirty; rerun after commit. Earlier clean-main Writing fixture failures remain recorded in `EXECUTION.md` and must be retested.
- Generated `test-results/` remains untracked and intentionally preserved.

## T11 correction persistence follow-up

- Forward migration `0003_editorial_corrections.sql` adds a private D1 correction ledger with deterministic content revision, scope, source episode, regression reference, and stored timestamp.
- The signed operator endpoint accepts a bounded `record_correction` command, normalizes scope, persists it idempotently, rejects conflicting reuse of an ID, and writes an operator receipt.
- `npm --prefix cloudflare run check`: Vitest 56 passed / 4 skipped; built Worker integration 60/60; 229 assets and 55 preserved articles; static site Worker configs dry-run. This does not qualify a deployed Workflow or D1 migration.

## T12 acceptance and owner review

- Full local preview reviewed and approved by the owner: Home, Explore, Writing, About/Career, Contact.
- Browser suite: 24/24 pass after aligning Playwright's base URL and server port at 4174 and disabling reuse of stale servers.
- Acceptance verifier unit tests: 2/2 pass; built-site verifier passes against the 55-article baseline.
- Activation proposal is recorded in `ACTIVATION-PROPOSAL.md`. It does not grant spending, account access, provider configuration, schedule activation, or production cutover.
- Generated `test-results/` remains untracked and preserved.
