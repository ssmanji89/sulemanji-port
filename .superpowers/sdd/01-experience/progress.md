# SDD ledger — plan: docs/superpowers/plans/2026-11-26-sulemanji-rebuild/01-experience.md

Plan baseline: `634948ca25602ac6ad908126a58a252dec27b1ac` (fresh `origin/main`).
Planning package source: `31c37290ff2eac015062cba4714658d289810c52` (PR #101 head).
Admission: current AGENTS, public claims policy, Writing contract, issue #21, all design docs, all four plans, contracts, acceptance matrix, source ledger, plan review, visual proposal, and private knowledge companion read.
Publisher: existing local daily/scout jobs remain enabled; latest runs blocked at Docker-based validation; one unfinished article and open Writing PRs must be preserved at cutover. No writer was paused or changed.
Deployment: latest main Pages build and deploy succeeded at source `634948c`; public Home, Writing, market page, robots, and sitemap returned HTTP 200.
Cloudflare: connector requires reauthentication; Wrangler CLI is unavailable. No account or resource mutation attempted.

Pre-flight: T01 produces validated `PublicContentItem`, relation, featured, and topic data consumed by T02–T04; the shared names and types agree with `CONTRACTS.md`. T05 consumes T02 shell/routes; T06 consumes T05 assets/config; T07 knowledge projection feeds T08/T10/T11; T12 consumes T03/T04/T06/T11; T13 consumes T12. No cross-task interface conflict found.

Task T01: in_progress (brief `.superpowers/sdd/01-experience/task-T01-brief.md`; base `634948ca25602ac6ad908126a58a252dec27b1ac`).

T01 evidence: test-first catalog suite passes (5 tests / 6 assertions); reviewed mathematics reader/topic case passes (1 / 2). `verify_content_catalog.rb` validates 15 public records and 12 directed relations. A Jekyll 3.9 build produced `/content-index.json` with 69 records and 16 topic pages. The build exposed and fixed unsupported `PageWithoutAFile#output_ext=` usage. `test_writing.rb` still reports 7 failures / 14 errors; an `origin/main` archive reproduces the same 7 / 14 baseline failures (48 baseline tests; new math test adds one passing test). Preserve this as a baseline gate finding and revisit when qualifying the Writing surface.

Content dispositions are recorded in `docs/redevelopment/2026-11-26/CONTENT_DISPOSITIONS.md`. Public descriptions include market project history, named integrations, knowledge work, mathematical verification, skywatching, and ff-cli in proportion. No private source or raw memory is cataloged.

Task T01 implementation checkpoint: commit `a2c0a70` (`feat: add public content catalog and broad subject registry`). Focused catalog tests pass (5 tests / 6 assertions), mathematics vocabulary regression passes (1 / 2), verifier accepts 16 records and 13 directed relations. T01 remains incomplete because the full Writing suite has the 7 failures / 14 errors reproduced on clean `origin/main`; the build fixture produced zero-byte HTML, and three evidence-recorded fixture/build-context attempts did not change it. Do not claim the legacy suite gate passes.

Task T03: complete. Explore, topic pages, relationships, and Writing cross-navigation are implemented. `bundle exec ruby scripts/tests/test_content_catalog.rb` passes (7 runs / 10 assertions); `bundle exec ruby scripts/verify_writing.rb --source-only` passes (54 public / 0 draft / 1 legacy); production Jekyll build passes and generates 16 non-empty topic pages, omitting the empty acquisitions topic. Explore and Writing browser suites pass 6/6, including JavaScript-disabled discovery, relationship reasons, mathematics, and no business CTA on independent-interest paths. Article context retains relevant proof links and removes the repeated business CTA. T02 remains pending owner review.

Task T04: complete. Work now uses story, tool, and experiment formats; all six published diagrams have required captions, short alt labels, and expandable text equivalents, validated at build time. Public historical project states and source attributions remain visible; original market and integration fragment IDs are restored. About links to Experience and Resume, Contact routes business delivery to Viyu and retains personal contact, and retired intake remains absent. `test_content_formats.rb` passes (4 tests / 11 assertions); production Jekyll build, public-safety, portfolio-review (26 routes), and Viyu-positioning gates pass. The complete browser suite passes 24/24 on a fresh isolated preview. T02 still awaits owner review.
