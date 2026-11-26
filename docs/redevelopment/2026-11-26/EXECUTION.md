# Sulemanji.com redevelopment execution checkpoint

Status: implementation in progress; production cutover has not started.

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
- T06 local qualification: the complete release script passes its Worker checks, source verification, social-card pixel check, one Jekyll build, and 55-article release manifest. Its `test_writing.rb` step still stops the sequence at the reproduced fixture problem: 60 runs / 180 assertions, 7 failures / 14 errors, with rendered fixture pages missing the single `<html>` root. The same 7 / 14 pattern was reproduced earlier on clean `origin/main`; three prior fixture/build-context attempts did not change the zero-byte output. Rendered production verification itself passes. The independent Python suite passes 66/66, and offer-retirement, Viyu-positioning, public-safety, 26-route portfolio-review, and Priority Discovery checks pass. Do not claim the full release gate passes.

T05: Worker static hosting and release manifest pass local Wrangler 4.168.0 validation. Both staging and production configs pass schema dry-run. A clean-main article baseline contains 55 note URLs/dates; the current build matches all 55. Local Worker runtime readback passes canonical Writing, note and work routes, retired redirects/gone behavior, 404 and HEAD. The Cloudflare connector reports unauthorized reauthentication; no account readback or live deployment has occurred.

T06: release workflow, one-build qualification script, artifact validation, route deployment, version receipt, and exact host checks are implemented. Production is configured as a Worker Route on `www.sulemanji.com/*`, preserving existing DNS and TLS configuration. Public DNS currently resolves through Cloudflare; the observed certificate is valid through 2027-02-06. Exact account, proxied record, zone, permissions, route IDs, and active deployment remain live-evidence gates. Release policy tests pass 12/12, Cloudflare checks pass 10/10, and both configs pass Wrangler dry-run. Social-card verification compares rendered pixels and no longer rewrites article assets during release qualification. A supplied-artifact integration check initially failed because its log directory was null; that path is fixed and the targeted built-site Worker suite now passes 10/10. The full release gate will be repeated after the follow-up commit.

Staging, production, merge, publisher cutover, and schedule activation: not started. Existing local publisher and article work remain untouched. The product preview decision is complete. Account access and the remaining activation decisions are separate release gates.

## Maintenance implementation continuation

- T07–T10 implementation files are present in the current working tree. `npm run check` in `cloudflare` passes TypeScript, 58 tests (4 skipped), the built-site integration (229 assets / 55 preserved articles), and both static Worker dry-runs. Separate editorial staging/production Worker configs also pass Wrangler dry-run with distinct D1 and Workflow bindings.
- T10 is partial: the guarded provider, exact review binding, deterministic GitHub publication adapter and public HTML/feed/sitemap readback are implemented, but the scheduled Workflow is not integrated from discovery through readback. It now durably records `HELD_PIPELINE_UNCONFIGURED`; no slot is reported as a successful run.
- T11 is partial: scoped correction, authored-field protections, original-date preservation checks, withdrawal dependency invalidation, and five focused tests are added. D1 correction storage and workflow/operator integration remain open.
- `bash scripts/check_site_release.sh` was attempted with a dirty tree and stopped at the manifest guard before release qualification. Rerun on a clean committed tree. The previously observed Writing fixture failures were reproduced on clean `origin/main`; they remain a release gate until the rerun establishes current evidence.
- Generated `test-results/` remains untracked and preserved. The local publisher, in-flight article, and existing publication worktree remain untouched.
- Live Cloudflare access still requires reauthentication; no live resource read, deployment, secret write, cutover, or schedule activation occurred. The owner preview review is complete; see T12 and `PRODUCT_REVIEW.md`.

## T12 local acceptance and activation record

- Browser configuration now uses the same local port (`4174`) for Playwright's web server and default base URL, with stale server reuse disabled. `npm run test:browser` passes 24/24.
- `python3 -m unittest scripts.tests.test_redevelopment_acceptance -v` passes 2/2. `python3 scripts/verify_redevelopment.py --site _site --baseline docs/redevelopment/2026-11-26/article-baseline.json` passes, confirming the built public surfaces, 55 article identities/dates, Writing/sitemap/feed discovery, main landmarks, and exclusion of named operational/private files.
- `docs/redevelopment/2026-11-26/PRODUCT_REVIEW.md` records the owner's preview decision and the reviewed journeys. Browser review covered Home desktop/mobile, Explore, Writing, an article, About/Career, and Contact; the automated suite covers the additional project and interest routes.
- `docs/redevelopment/2026-11-26/ACTIVATION-PROPOSAL.md` captures staging/production topology, provider and schedule assumptions, proposed cost ceilings, data handling, one-writer cutover, DNS preservation, and recovery. Its unresolved account/model/spend/schedule decisions remain proposals. No live Cloudflare mutation or provider credential was used.
- The connector currently returns `UNAUTHORIZED` requiring reauthentication, so account resource IDs, plan, routes, billing, secrets, deployment, and live verification remain unavailable. The editorial pipeline remains intentionally held at `HELD_PIPELINE_UNCONFIGURED`; no successful maintenance run is claimed.
- The generated `test-results/` directory remains untracked and preserved. Existing publisher, in-flight article, and publication worktree remain untouched.

## Release gate

Reconnect Cloudflare access for exact account/resource readback and staging. Keep the public DNS/certificate untouched unless account evidence identifies a requirement. Continue with T06–T13 preparation while the live read is unavailable; do not claim production qualification or schedule evidence without live receipts.
