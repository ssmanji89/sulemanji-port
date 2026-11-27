# Plan: docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

| Task | State | Evidence | Remaining |
|---|---|---|---|
| T07 | Implementation partial | Importer tests pass. Separate staging and production D1 databases and Workflows are deployed. Production Custom Domain and TLS are reachable; unsigned synthetic POST to `/internal/knowledge` returned HTTP 401 AUTH on 2026-11-27. | Authorized Viyu delivery, durable accepted/duplicate/withdrawal receipt, and renewal observation. HTTP 401 confirms endpoint reachability only. |
| T08 | Implementation partial | Public source parsers and deterministic relevance are present. The durable workflow persists successful per-source snapshots, respects each configured minimum interval, and holds when enabled-source coverage is incomplete. | Live source-read qualification, history-backed duplicate behavior, and complete provider-backed candidate runner. |
| T09 | Implementation partial | Atomic budget, Chicago slot, durable claims/outbox, operator controls tested. Separate staging and production D1/Workflow resources deployed; production hourly Cron is attached. Both D1 controls read back paused at owner epoch 1. Workflow policy admission, source snapshots, and candidate/receipt writes are bounded by current owner epoch. | Provider-backed resumed execution and one approved production cadence. Staging Cron remains disabled. Migration 0004 is source-only and has been applied to an isolated local database for validation; remote production/staging migrations were not changed. |
| T10 | Implementation partial | Provider schema, author/reviewer separation, bounded review, GitHub publisher, and deployment readback modules are present. The deterministic workflow discovers signals and persists `NO_CHANGE` only with complete enabled-source coverage; actionable candidates remain HELD. Full Cloudflare check: 68 passed / 4 skipped; 229 assets / 55 preserved articles; site and editorial Worker dry-runs pass. | Real configured model/reviewer/GitHub/readback adapters, full provider-backed Workflow, staging interruption/resume, hosted checks, and live verification. |
| T11 | Implementation partial | Scoped correction, dependency invalidation, protected-field checks, forward D1 correction ledger, and authenticated `record_correction` operator action. Tests cover deduplicated scope, idempotent persistence, conflicting-ID rejection, and durable receipts. | Workflow-driven claim repair and regression follow-up; wider independent-candidate cases. |

## Current rulings

- A durable slot receipt must not imply publication occurred. Deterministic source discovery can record `NO_CHANGE` only when all enabled sources are covered by successful due reads or valid in-interval snapshots. Actionable candidates remain `HELD_PROVIDER_UNCONFIGURED` until actual author, reviewer, GitHub publisher, deployment-reader, and readback adapters are configured. Source/catalog failure and incomplete coverage are typed holds.
- Keep staging and production maintenance bindings separate and paused. Wrangler OAuth can manage the account; the connected Cloudflare app remains unauthorized. Resource IDs stay out of public documentation and placeholders remain in checked-in config. Do not set model/publisher secrets yet.
- Preserve the production Cron slot. The first deploy hit the Free plan's five-trigger account limit; removing only the newly added staging Cron allowed production's hourly Cron to attach. No existing trigger was changed. Any plan upgrade is a separate cost decision.
- Article publication remains blocked if policy, knowledge, source, base revision, owner epoch, exact review receipt, or allowed paths do not match at effect time.

## Latest gate result

- `npm run check` in `cloudflare`: PASS, 68 passed / 4 skipped; 229 built assets; 55 preserved articles; both static Worker configs dry-run.
- Editorial Worker production/staging configs both dry-run with separate bindings. Existing remote migrations 0001–0003 and paused owner-epoch-1 controls remain unchanged. Migration 0004 applied only to isolated local staging D1; local SQL probes verified active-epoch writes and rejection after pause/epoch change.
- Public `https://editorial.sulemanji.com/internal/knowledge` is reachable over Cloudflare TLS. An unsigned synthetic POST returned HTTP 401 AUTH on 2026-11-27; this does not prove Viyu producer-side DNS, authentication, or delivery.
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
