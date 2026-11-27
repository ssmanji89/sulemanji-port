# Plan: docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

| Task | State | Evidence | Remaining |
|---|---|---|---|
| T07 | Implementation partial | Importer tests pass. Separate staging and production D1 databases and Workflows are deployed. Production Custom Domain and TLS are reachable; unsigned synthetic POST to `/internal/knowledge` returned HTTP 401 AUTH on 2026-11-27. | Authorized Viyu delivery, durable accepted/duplicate/withdrawal receipt, and renewal observation. HTTP 401 confirms endpoint reachability only. |
| T08 | Implementation partial | Public source parsers and deterministic relevance are present. The durable workflow persists successful per-source snapshots, respects each configured minimum interval, and holds when enabled-source coverage is incomplete. | Live source-read qualification, history-backed duplicate behavior, and complete provider-backed candidate runner. |
| T09 | Implementation partial | Atomic budget, Chicago slot, durable claims/outbox, operator controls tested. Separate staging and production D1/Workflow resources deployed; production hourly Cron is attached. Both D1 controls read back paused at owner epoch 1. Workflow policy admission, source snapshots, and candidate/receipt writes are bounded by current owner epoch. | Provider-backed resumed execution and one approved production cadence. Staging Cron remains disabled. Migration 0004 is source-only and has been applied to an isolated local database for validation; remote production/staging migrations were not changed. |
| T10 | Implementation partial | Provider schema, author/reviewer separation, bounded review, GitHub publisher, and deployment readback modules are present. The deterministic workflow discovers signals and persists `NO_CHANGE` only with complete enabled-source coverage; actionable candidates remain HELD. Full Cloudflare check: 64 passed / 4 skipped; 229 assets / 55 preserved articles; site and editorial Worker dry-runs pass. | Real configured model/reviewer/GitHub/readback adapters, full provider-backed Workflow, staging interruption/resume, hosted checks, and live verification. |
| T11 | Implementation partial | Scoped correction, dependency invalidation, protected-field checks, forward D1 correction ledger, and authenticated `record_correction` operator action. Tests cover deduplicated scope, idempotent persistence, conflicting-ID rejection, and durable receipts. | Workflow-driven claim repair and regression follow-up; wider independent-candidate cases. |

## Current rulings

- A durable slot receipt must not imply publication occurred. Deterministic source discovery can record `NO_CHANGE` only when all enabled sources are covered by successful due reads or valid in-interval snapshots. Actionable candidates remain `HELD_PROVIDER_UNCONFIGURED` until actual author, reviewer, GitHub publisher, deployment-reader, and readback adapters are configured. Source/catalog failure and incomplete coverage are typed holds.
- Keep staging and production maintenance bindings separate and paused. Wrangler OAuth can manage the account; the connected Cloudflare app remains unauthorized. Resource IDs stay out of public documentation and placeholders remain in checked-in config. Do not set model/publisher secrets yet.
- Preserve the production Cron slot. The first deploy hit the Free plan's five-trigger account limit; removing only the newly added staging Cron allowed production's hourly Cron to attach. No existing trigger was changed. Any plan upgrade is a separate cost decision.
- Article publication remains blocked if policy, knowledge, source, base revision, owner epoch, exact review receipt, or allowed paths do not match at effect time.

## Latest gate result

- `npm run check` in `cloudflare`: PASS, 64 passed / 4 skipped; 229 built assets; 55 preserved articles; both static Worker configs dry-run.
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

## Post-merge live readback (2026-11-27)

- PR #109 merged as `f37bb7c07ed8dcbbdde86f391d085ba36fe2443a` after the full hosted gate and independent review. PIPE-01 through PIPE-06 are fixed and locally reviewed. Main build passed; its production deploy step stopped before writing because `CLOUDFLARE_API_TOKEN` is unset in GitHub Actions.
- The successful main artifact was deployed manually with the existing Wrangler OAuth session. Static Worker `sulemanji-site` version `9baf081c-b60b-4044-a79a-e5dcc5ab6165` is 100% active; public `release.json` matches main `f37bb7c`, with 229 assets and the verified digest. Canonical Home, Writing, market project, preserved article, retired intake, and missing-article routes read back 200/301/410/404 as specified.
- Production editorial Worker version `c2c1c980-89ea-4f24-81e9-2f7eb9c2ca30` and staging version `2b067b44-99f4-4ec2-bccd-6cdf80edce89` are deployed with separate D1 and Workflow resources. Production has the hourly Cron; staging Cron remains disabled.
- Remote migrations 0004 and 0005 are applied to both editorial D1s; readback confirms migrations 0001–0005. Both control rows remain `paused=1, owner_epoch=1`; production candidates and receipts are zero. The editorial endpoint's unsigned synthetic POST remains a 401 AUTH reachability check only.
- Existing Writing LaunchAgent authority was left in place, with no new publisher enabled. Current status shows the daily job not running and last exit code 1. Its Nov 26 run blocked on Docker CLI timeout; later scout attempts blocked while Docker's `desktop` credential helper hung for the missing pinned Ruby image. Anonymous pull of the exact pinned image fixed the cache dependency; the read-only source gate now passes (55 public, 0 draft, 1 legacy), and the existing publication worktree remains clean. No article run was triggered.
- T09/T10 remain partial: CI still needs the scoped production token; the installed writer needs its next natural run reconciled; the signed sanitized Viyu producer/reader, approved strict policy, provider/model spend, real review/publisher/readback adapters, one-writer cutover, and two natural eligible schedule runs remain outstanding. No schedule run is counted from a manual probe.

## T07 importer contract alignment follow-up (2026-11-27)

- The private producer URL fix merged as `0ed4de6cfb7e5583b73c02edcbbc707c776f069c` after exact-head CI passed on PR #177 head `24a5df963bc4693e42eed942109e8eef8e2c66a6`.
- Site PR #110 head `f9c53d28b2d4855afeb4fc13282c90766e576d31` merged as `691608a89e307b69f6ece6cba6f4679728eb9992` after exact-head build passed. It requires exact top-level authored fields, unique fields, nonempty public sources, safe text, and rejects local/private/reserved source addresses. Local importer and release gates and independent review passed before merge.
- At the source-merge readback, the source corrections had not yet been deployed. The route was live (unsigned `POST /internal/knowledge` returned 401 AUTH), production and staging controls were paused at epoch 1, both Worker secret lists were empty, and each D1 had zero claims, candidates, receipts, public knowledge rows, and usage reservations.
- T07 remains partial. No signed authorized derivative, producer-side delivery, renewal, or withdrawal has been exercised. The GitHub `cloudflare-production` environment still lacks `CLOUDFLARE_API_TOKEN`; local Wrangler OAuth was not copied into CI.

## Activation blocker readback (2026-11-27)

- The site Worker and both editorial Workers exist and their latest deployed versions receive 100% traffic. The editorial Worker responds on the custom hostname; `GET` to unsupported paths returns 404, while an unsigned JSON `POST /internal/knowledge` returns 401 AUTH as designed.
- Current main source performs durable public-signal discovery and safely records NO_CHANGE or holds actionable candidates. It does not yet wire authoring, independent review, publication, or public readback adapters. No provider/publisher configuration or signed knowledge is present. D1 remains paused; no natural eligible run is claimed.
- The deployment token is an Actions deployment prerequisite, not a substitute for the missing editorial runtime configuration or activation evidence.

## Exact-main deployment readback (2026-11-27)

- Main `79b6bcc0077755c360f21f7e73c9b3f60a439092` passed hosted build and release gates in run `45942270781`; its production deployment job failed before writing because `CLOUDFLARE_API_TOKEN` was empty.
- The immutable artifact from that exact run verified successfully and was manually deployed with the existing local Wrangler OAuth session. Public `/release.json` now reports source `79b6bcc`, digest `sha256:2adeeae2cf7204fe0f4d7cfe24ca00752ae384f3350de7fa7e620fbd38956fda`, 229 assets, and 55 articles. Canonical route readback passed for Home, Writing and its slash redirect, the market project, a preserved article, retired intake (410), and an unknown article (404); the apex redirects to `www`.
- The importer fix is now deployed on both editorial Workers at 100%. Production retains its hourly Cron and staging remains manual. Both D1 controls remain paused at owner epoch 1, with zero schedule claims, candidates, receipts, public knowledge, and usage reservations; both Worker secret lists remain empty. Unsigned knowledge POSTs return 401 AUTH on both hosts.
- No signed producer delivery, authorized knowledge acceptance/renewal/withdrawal, model call, publication, or natural eligible schedule run is claimed. The production Actions token and editorial provider/publisher configuration remain separate unresolved requirements.
