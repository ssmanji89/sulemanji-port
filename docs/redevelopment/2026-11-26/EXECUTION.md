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
- T02: implementation commit `95d8577` is in place and awaits owner review of the working preview. The 19-case Home suite passed earlier; light/dark screenshots at 320, 390, 768, and 1440 pixels showed no horizontal overflow.
- T03: commit `7b2756a` completes Explore, related paths, topic pages, and Writing navigation. Catalog tests pass (7 / 10), Writing source verification passes (54 public / 0 draft / 1 legacy), build emits 16 non-empty topic pages, and Explore/Writing browser tests pass 6 / 6. Empty acquisitions topic is omitted; article context no longer adds a universal business CTA.
- T04: work formats, accessible figure descriptions, About, career, Resume, and Contact are implemented. Format tests pass (4 / 11); public-safety, portfolio-review (26 routes), Viyu-positioning, production build, and the complete 24-case browser suite pass. Market and integration fragment IDs remain available.
- T06 local qualification: the complete release script passes its Worker checks, source verification, social-card pixel check, one Jekyll build, and 55-article release manifest. Its `test_writing.rb` step still stops the sequence at the reproduced fixture problem: 60 runs / 180 assertions, 7 failures / 14 errors, with rendered fixture pages missing the single `<html>` root. The same 7 / 14 pattern was reproduced earlier on clean `origin/main`; three prior fixture/build-context attempts did not change the zero-byte output. Rendered production verification itself passes. The independent Python suite passes 66/66, and offer-retirement, Viyu-positioning, public-safety, 26-route portfolio-review, and Priority Discovery checks pass. Do not claim the full release gate passes.

T05: Worker static hosting and release manifest pass local Wrangler 4.168.0 validation. Both staging and production configs pass schema dry-run. A clean-main article baseline contains 55 note URLs/dates; the current build matches all 55. Local Worker runtime readback passes canonical Writing, note and work routes, retired redirects/gone behavior, 404 and HEAD. The Cloudflare connector reports unauthorized reauthentication; no account readback or live deployment has occurred.

T06: release workflow, one-build qualification script, artifact validation, route deployment, version receipt, and exact host checks are implemented. Production is configured as a Worker Route on `www.sulemanji.com/*`, preserving existing DNS and TLS configuration. Public DNS currently resolves through Cloudflare; the observed certificate is valid through 2027-02-06. Exact account, proxied record, zone, permissions, route IDs, and active deployment remain live-evidence gates. Release policy tests pass 12/12, Cloudflare checks pass 10/10, and both configs pass Wrangler dry-run. Social-card verification compares rendered pixels and no longer rewrites article assets during release qualification. A supplied-artifact integration check initially failed because its log directory was null; that path is fixed and the targeted built-site Worker suite now passes 10/10. The full release gate will be repeated after the follow-up commit.

Staging, production, merge, publisher cutover, and schedule activation: not started. Existing local publisher and article work remain untouched. Owner preview is the next product decision; after local gates and concrete Cloudflare configuration are prepared, request one material decision only if access or owner review remains necessary.

## Release gate

Reconnect Cloudflare access for exact account/resource readback and staging. Keep the public DNS/certificate untouched unless account evidence identifies a requirement. Continue with T06–T13 preparation while the live read is unavailable; do not claim production qualification or schedule evidence without live receipts.
