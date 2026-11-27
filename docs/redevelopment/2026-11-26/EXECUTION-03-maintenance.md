# Plan: docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

| Task | State | Evidence | Remaining |
|---|---|---|---|
| T07 | Implementation partial | Importer tests pass. Separate staging and production D1 databases and Workflows are deployed. | Actual authorized Viyu derivative, public DNS for the production endpoint, durable live receipt and renewal observation. |
| T08 | Implementation partial | 58 Cloudflare tests pass; public source parsers and deterministic relevance are present. | Live source-read qualification and complete end-to-end candidate runner. |
| T09 | Implementation partial | Atomic budget, Chicago slot, durable claims/outbox, operator controls tested. Separate staging and production D1/Workflow resources deployed; production hourly Cron is attached. Both D1 controls read back paused at owner epoch 1. | Resumed durable execution and one approved production cadence. Staging Cron is disabled because the account's Free plan limit is five triggers and all slots are occupied. |
| T10 | Implementation partial | Provider schema, author/reviewer separation, bounded review, GitHub publisher, deployment readback. `npm run check`: 56 passed / 4 skipped; site build: 229 assets / 55 preserved articles; editorial Worker dry-runs pass. Production Worker `sulemanji-editorial` is deployed with hourly Cron and production Workflow. Staging Worker has its own D1 and Workflow, no Cron. | Production hostname currently has no public DNS record; full Workflow integration from discovery through public readback; configured authorized provider; hosted checks and live verification. |
| T11 | Implementation partial | Scoped correction, dependency invalidation, protected-field checks, forward D1 correction ledger, and authenticated `record_correction` operator action. Tests cover deduplicated scope, idempotent persistence, conflicting-ID rejection, and durable receipts. | Workflow-driven claim repair and regression follow-up; wider independent-candidate cases. |

## Current rulings

- A durable slot receipt must not imply the scheduled content pipeline ran. Until discovery, review, publication, and public readback are wired, an active slot is recorded as `HELD_PIPELINE_UNCONFIGURED`.
- Keep staging and production maintenance bindings separate and paused. Wrangler OAuth can manage the account; the connected Cloudflare app remains unauthorized. Resource IDs stay out of public documentation and placeholders remain in checked-in config. Do not set model/publisher secrets yet.
- Preserve the production Cron slot. The first deploy hit the Free plan's five-trigger account limit; removing only the newly added staging Cron allowed production's hourly Cron to attach. No existing trigger was changed. Any plan upgrade is a separate cost decision.
- Article publication remains blocked if policy, knowledge, source, base revision, owner epoch, exact review receipt, or allowed paths do not match at effect time.

## Latest gate result

- `npm run check` in `cloudflare`: PASS, 56 passed / 4 skipped; 229 built assets; 55 preserved articles; both static Worker configs dry-run.
- Editorial Worker configs: both dry-run with separate bindings. Migrations 0001–0003 applied remotely in staging and production; `editorial_control` read back `paused=1, owner_epoch=1` on both databases. Workflow inventory confirms both resources. Production Cron attached; staging Cron disabled as recorded above.
- Public `https://editorial.sulemanji.com/` currently fails DNS resolution. The production Worker Route exists, but no DNS record was added; the Viyu producer cannot reach the endpoint over that hostname.
- `bash scripts/check_site_release.sh`: passed on clean `HEAD` `3281a32` after the ledger update. Exit status 0; the full release script completed, including 60 Writing tests / 255 assertions, 72 Python tests (`OK`), public-safety verification, the 26-route portfolio review, and Priority Discovery plan verification. `npm ci` reported 13 audit advisories (3 moderate, 10 high); no lockfiles changed.
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
