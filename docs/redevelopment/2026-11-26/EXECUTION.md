# Sulemanji.com redevelopment execution checkpoint

Status: site redesign is live; maintenance infrastructure is deployed but publication remains paused.

## Verified starting state

- Release worktree starts from freshly fetched `main` at `634948ca25602ac6ad908126a58a252dec27b1ac`.
- Planning source is PR #101 head `31c37290ff2eac015062cba4714658d289810c52`; only its dated planning package is imported.
- The current Pages build and deploy succeeded for that main revision. Canonical Home, Writing, market work, robots, and sitemap returned HTTP 200.
- The existing publisher remains the sole active authority. Its unfinished article and open Writing pull requests remain under their existing owner; none were edited or closed.
- Cloudflare account inspection is unavailable because the connected Cloudflare app requires reauthentication. No Cloudflare resources or settings were changed.

## Current execution

- T01: implementation commit `a2c0a70` is present. Current focused catalog tests pass (7 / 10); the full Writing fixture suite still has 7 failures / 14 errors reproduced on a clean `origin/main` archive, traced to zero-byte fixture renders after three build-context attempts. The legacy gate remains open for evidence-driven diagnosis.
- The complete Writing test file has 7 failures / 14 errors, reproduced unchanged on a clean `origin/main` archive (48 tests). The new mathematics test itself passes. This baseline suite condition remains a release gate to repair during Writing qualification.
- Public-safe content dispositions now cover market history, named integrations, knowledge work, math, skywatching, professional practice, and ff-cli in proportion. No private source or raw memory entered public repository data.
- T02: implementation commit `95d8577` is in place. The owner reviewed the full local preview at `http://127.0.0.1:4173/` (Home, Explore, Writing, About/Career, Contact) and approved it as presented. The 19-case Home suite passed earlier; light/dark screenshots at 320, 390, 768, and 1440 pixels showed no horizontal overflow. This is product approval, not authorization for provider spend or production activation.
- T03: commit `7b2756a` completes Explore, related paths, topic pages, and Writing navigation. Catalog tests pass (7 / 10), Writing source verification passes (54 public / 0 draft / 1 legacy), build emits 16 non-empty topic pages, and Explore/Writing browser tests pass 6 / 6. Empty acquisitions topic is omitted; article context no longer adds a universal business CTA.
- T04: work formats, accessible figure descriptions, About, career, Resume, and Contact are implemented. Format tests pass (4 / 11); public-safety, portfolio-review (26 routes), Viyu-positioning, production build, and the complete 24-case browser suite pass. Market and integration fragment IDs remain available.
- T06 local qualification: resolved on clean `origin/main` commit `dcd0a39` by canonicalizing the temporary source path in `scripts/tests/test_writing.rb`. On macOS, `Dir.chdir` resolves `/var/folders/...` to `/private/var/folders/...`, but Jekyll kept the symlinked `site.source`; `LayoutReader` then supplied an absolute layout path that was joined beneath the symlinked source, producing an invalid path and an empty layout. The test-only fix aligns the fixture source with the canonical working directory. Red focused regression passed before the fix; afterward the focused cases passed (2 runs / 11 assertions), all Ruby fixtures passed (60 / 255), and clean-tree `bash scripts/check_site_release.sh` passed in full. No site runtime, articles, or production build behavior changed.

T05: Worker static hosting and release manifest pass local Wrangler 4.168.0 validation. Both staging and production configs pass schema dry-run. A clean-main article baseline contains 55 note URLs/dates; the current build matches all 55. Local Worker runtime readback passes canonical Writing, note and work routes, retired redirects/gone behavior, 404 and HEAD. The Cloudflare connector reports unauthorized reauthentication; no account readback or live deployment has occurred.

T06: release workflow, one-build qualification script, artifact validation, route deployment, version receipt, and exact host checks are implemented. Production is configured as a Worker Route on `www.sulemanji.com/*`, preserving existing DNS and TLS configuration. Public DNS currently resolves through Cloudflare; the observed certificate is valid through 2027-02-06. Exact account, proxied record, zone, permissions, route IDs, and active deployment remain live-evidence gates. Release policy tests pass 12/12, Cloudflare checks pass 10/10, and both configs pass Wrangler dry-run. Social-card verification compares rendered pixels and no longer rewrites article assets during release qualification. A supplied-artifact integration check initially failed because its log directory was null; that path is fixed and the targeted built-site Worker suite now passes 10/10. The full release gate will be repeated after the follow-up commit.

Staging, production, merge, publisher cutover, and schedule activation: not started. Existing local publisher and article work remain untouched. The product preview decision is complete. Account access and the remaining activation decisions are separate release gates.

## Maintenance implementation continuation

- T07–T10 implementation files are present in the current working tree. `npm run check` in `cloudflare` passes TypeScript, 58 tests (4 skipped), the built-site integration (229 assets / 55 preserved articles), and both static Worker dry-runs. Separate editorial staging/production Worker configs also pass Wrangler dry-run with distinct D1 and Workflow bindings.
- T10 is partial: the guarded provider, exact review binding, deterministic GitHub publication adapter and public HTML/feed/sitemap readback are implemented, but the scheduled Workflow is not integrated from discovery through readback. It now durably records `HELD_PIPELINE_UNCONFIGURED`; no slot is reported as a successful run.
- T11 is partial: scoped correction, authored-field protections, original-date preservation checks, withdrawal dependency invalidation, a forward D1 correction ledger, and signed operator persistence are in place. Workflow-driven claim repair and regression follow-up remain open.
- The prior dirty-tree release attempt stopped at the manifest guard. After the fixture test-helper fix was committed, a clean-tree `bash scripts/check_site_release.sh` passed, including the full Ruby and Python suites plus public safety and portfolio checks. The final post-ledger run on `3281a32` exited 0; exact suite totals are recorded in the Writing fixture recovery entry below.
- Generated `test-results/` remains untracked and preserved. The local publisher, in-flight article, and existing publication worktree remain untouched.
- Pre-deployment Cloudflare reads: the connected app required reauthentication, but local Wrangler OAuth could read the account. The configured `sulemanji-site` Worker was absent; Pages project listing returned no entries. D1 listing showed only the unrelated `sulemanji-work-with-me` database, which was not reused. The live homepage returned 200 through Cloudflare edge with GitHub origin headers. No resource, route, DNS, secret, or deployment had yet been changed.
- Existing publisher: `com.sulemanji.public-writing.daily` and `.scout` are loaded; its separate `writing/676b9558` worktree is clean and ahead of origin by one commit. Preserve it as the sole writer. No publication state was changed.
- The owner preview review is complete; see T12 and `PRODUCT_REVIEW.md`.

## Writing fixture recovery

- Test-only fix: `e89d773 test: canonicalize Writing fixture source path`. The fixture source is resolved with `File.realpath` before Jekyll configuration so macOS `/var` and `/private/var` path forms cannot be mixed.
- Verification: focused red case reproduced before the change; focused regression passed (2 runs / 11 assertions); complete Ruby fixture suite passed (60 runs / 255 assertions); clean-tree `bash scripts/check_site_release.sh` passed, including Python 72/72, public safety, 26-route portfolio review, and Priority Discovery verification.
- `npm ci` emitted its dependency audit advisory (13 vulnerabilities: 3 moderate, 10 high); no lockfiles were modified. This is a dependency advisory, not a failing release check.

## T12 local acceptance and activation record

- Browser configuration now uses the same local port (`4174`) for Playwright's web server and default base URL, with stale server reuse disabled. `npm run test:browser` passes 24/24.
- `python3 -m unittest scripts.tests.test_redevelopment_acceptance -v` passes 2/2. `python3 scripts/verify_redevelopment.py --site _site --baseline docs/redevelopment/2026-11-26/article-baseline.json` passes, confirming the built public surfaces, 55 article identities/dates, Writing/sitemap/feed discovery, main landmarks, and exclusion of named operational/private files.
- `docs/redevelopment/2026-11-26/PRODUCT_REVIEW.md` records the owner's preview decision and the reviewed journeys. Browser review covered Home desktop/mobile, Explore, Writing, an article, About/Career, and Contact; the automated suite covers the additional project and interest routes.
- `docs/redevelopment/2026-11-26/ACTIVATION-PROPOSAL.md` captures staging/production topology, provider and schedule assumptions, proposed cost ceilings, data handling, one-writer cutover, DNS preservation, and recovery. Its unresolved account/model/spend/schedule decisions remain proposals. No live Cloudflare mutation or provider credential was used.
- Whole-branch review against `origin/main` found no standards violations or confirmed code smells. Spec review confirms T10 remains held before discovery and the real production knowledge receipt/renewal is unavailable. T11 now has a D1 correction ledger and authenticated operator action, but still lacks workflow-driven repair and regression follow-up. Review details are recorded in `BRANCH_REVIEW.md`.
- The app connector still returns `UNAUTHORIZED`; local Wrangler OAuth was used for the site deployment. `sulemanji-site` now serves the exact `8426c2b79dd3a08b39c22d6f579f89652ace9785` main artifact (asset digest `sha256:2adeeae2cf7204fe0f4d7cfe24ca00752ae384f3350de7fa7e620fbd38956fda`) at 100% on Worker version `a99c3f2c-7c45-41c4-95ac-bd1be3da0efa`. Cloudflare route inventory confirms `www.sulemanji.com/*` belongs to `sulemanji-site`. Public readback passes `/` 200, `/writing` 200, `/writing/` 301, selected work/article pages 200, retired `/workshop-intake/` 410, and missing article 404; `release.json` matches the deployed source and digest. The apex redirects to `https://www.sulemanji.com/`. The editorial pipeline remains intentionally held at `HELD_PIPELINE_UNCONFIGURED`; no successful maintenance run is claimed.
- The generated `test-results/` directory remains untracked and preserved. Existing publisher, in-flight article, and publication worktree remain untouched.

## Hosted branch and PR state

- PR [#102](https://github.com/ssmanji89/sulemanji-port/pull/102) merged to `main` as `96415a94db7979f7238fc0308b5c9210f53c3b0c`.
- Checkpoint PR [#103](https://github.com/ssmanji89/sulemanji-port/pull/103) merged to `main` as `8426c2b79dd3a08b39c22d6f579f89652ace9785`.
- A manual `workflow_dispatch` was rejected before job creation: staging and production referenced `runner.temp` in job-level `env`, where GitHub Actions does not expose that context. The invalid overrides are removed; `scripts/deploy_site.sh` falls back to `RUNNER_TEMP`. A validation-only dispatch option now defaults to no deployment; staging and production require explicit choices. Regression coverage passes 7/7. Dispatch validation on this branch after push.
- Validation dispatch `45915601004` and PR check `45915593101` passed the complete hosted release gates on `f900cd5`; both were build-only. The merge-triggered main run `45916020012` passed the full release gates and Pages deployment. Cloudflare jobs were skipped because `SITE_DEPLOY_TARGET` and Cloudflare CI credentials are not configured; the exact Pages artifact was verified against merged `main` and deployed manually with local Wrangler OAuth. Seven focused social-card tests and the pinned renderer check pass locally. The local full release script still hits 21 empty-HTML Writing fixture failures, while hosted Ubuntu passed the same gate.
- After PR #103 advanced main, run `45916945883` passed the full build and Pages deployment. The exact main artifact was verified and re-deployed; only `release.json` changed, and the active Worker now reads 100% on version `a99c3f2c-7c45-41c4-95ac-bd1be3da0efa` with the same asset digest. Editorial automation remains disabled.
- This deployment activates public static hosting only. No Cron, Workflows, D1, or editorial maintenance schedule was activated. Production knowledge delivery/renewal receipts and two natural eligible schedule runs remain release gates. The existing publisher is still the sole active writer and was not changed.

## Current live state (2026-11-27)

- Fresh deployment work began from `main` at `c14334b322b77bb877f54e52bf04205c4ac3838c` in a dedicated worktree. The planning package was read from the plan branch; no implementation files were imported from that branch.
- The static site remains live through `sulemanji-site` on `www.sulemanji.com/*`. Canonical-host, article, Writing, work, retired-route, and release-manifest reads passed after the main artifact deployment.
- `sulemanji-editorial` is deployed with its production D1, Workflow, hourly Cron, and `editorial.sulemanji.com` Custom Domain. `sulemanji-editorial-staging` has its own D1 and Workflow. Its Cron was disabled to stay within the Cloudflare Free-plan limit of five account triggers. No existing trigger was changed.
- Remote migrations 0001–0003 are applied in both editorial databases. Both control rows read back paused at owner epoch 1. The Worker code itself returns `HELD_PIPELINE_UNCONFIGURED` until the full discovery-to-public-readback workflow is connected.
- The initial Worker Route had no proxied DNS record. PR #106 changed the production hostname to a Custom Domain; deployment completed, public resolvers 1.1.1.1 and 8.8.8.8 return Cloudflare addresses, TLS verifies, and invalid HMAC is rejected with HTTP 401. The local system resolver failed to resolve the hostname during the same check; verify from the private producer before delivery. No API model secret, model spend, publisher cutover, or owner unpause was performed. The Viyu producer has not delivered a real authorized derivative, and no durable receipt or renewal has been observed.
- The connected Cloudflare app remains unauthorized; local Wrangler OAuth performed the deployment. Current Cloudflare docs show the Free account's five-Cron limit and a $5/month Paid starting plan. A plan upgrade was not made.
- Historical pre-fix run: a clean-tree `bash scripts/check_site_release.sh` stopped at the Writing suite (60 runs / 180 assertions, 7 failures, 14 errors) because fixture pages lacked the required single `<html>` root. The macOS path mismatch causing empty layouts was subsequently fixed by `e89d773`; the local Writing and full release gates now pass as recorded in “Writing fixture recovery” above. PR #105 hosted validation and the separate Cloudflare Worker checks remain earlier evidence.

## Release gate

The redesigned public site is live and owner-approved. The maintenance Worker resources and public endpoint now exist, but end-to-end maintenance activation is not qualified: the Viyu producer has not yet delivered real authorized knowledge, production delivery/renewal receipts are absent, the pipeline remains held, the current publisher has not been cut over, and two natural eligible schedule runs have not occurred. Keep the existing publisher and all publication state intact. Do not claim full-goal completion until those live receipts exist.


## Worker hostname correction (2026-11-27)

Ruling: configure `editorial.sulemanji.com` as a Cloudflare Custom Domain because this Worker is the origin and the Route had no proxied DNS record; this should let Cloudflare provision the hostname DNS and certificate. Cost if wrong: a conflicting hostname assignment could disrupt another service. Current DNS does not resolve and the custom hostname has no observed service, so the change has no existing endpoint traffic to displace. Deploy and verify DNS, certificate, and signed endpoint reachability before enabling knowledge delivery.


## Custom Domain live readback (2026-11-27)

PR #106 (`d79d8e9`) changed the production Worker from a Route to a Custom Domain and was merged after hosted build success. Wrangler deployed the 100% production version with the existing D1, Workflow, and hourly Cron. Public resolvers 1.1.1.1 and 8.8.8.8 return Cloudflare addresses. An HTTPS POST to `/internal/knowledge` with an invalid synthetic signature returned HTTP 401 with the expected `AUTH` rejection; TLS verification succeeded. The production control row still reads `paused=1, owner_epoch=1`. The local system resolver did not resolve the hostname during the same session, so actual producer-side reachability remains to be verified.
