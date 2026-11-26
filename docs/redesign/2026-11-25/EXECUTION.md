# Portfolio redesign execution checkpoint

Updated: 2026-11-25

## Source and ownership

- Repository: `ssmanji89/sulemanji-port`.
- Fresh `origin/main`: `5ab5122b61a16ed0bb72067b8a346c67f3091bfa`.
- Planning PR #96: open draft, head `fed5f8c7d82b1397f01805803742d788a1abff63`.
- Implementation branch: `codex/portfolio-redesign-2026-11-25`.
- Implementation ran in a dedicated worktree isolated from the authenticated source checkout.
- The branch started from fresh main. Only the 25 paths added by PR #96 were imported; no planning ancestry was merged.
- Original checkout remains on `hotfix/pages-calendar-quote-fixture`. Its pre-existing changes remain untouched: `.DS_Store`, `case-studies/agentic-msp-delivery.md`, `docs/PUBLIC-CLAIMS-POLICY.md`, and untracked `backlog.md`. The same checkout has active article worktrees; none was reused.
- Open PRs observed: #9, #61, #67, #71, #84, #85, #86, #90, and #96. No PR was merged, closed, or absorbed.
- Issue #21 remains open and owns daily Writing publication. LaunchAgent `com.sulemanji.public-writing.daily` is loaded and idle (`last exit code 0`); no publisher command was run.

## Article baseline

`ARTICLE-BASELINE.json` records the eligible catalog at the fresh-main revision and America/Chicago date 2026-11-25: 52 eligible articles and 1 legacy article. Each row includes the source path, original canonical URL, title, publication metadata, and source SHA-256. This is a source baseline, not a fixed future article-count target. The preview's 41-article snapshot was not used.

## Decisions and evidence boundaries

- Business inquiries route directly to Viyu Network Solutions: <https://viyu.net/contact-support/contact-us/>.
- Public workshop promotion, personal project intake, and paid-discovery admission are retired. The updated policy retains attribution, public-claims, employer-IP, and confidentiality controls.
- The private preview is a design and selected-copy reference only. Jekyll remains the production builder and source of Writing eligibility.
- Private customer records, payment/session identifiers, credentials, private employer architecture, and raw operational evidence stay outside this repository. No live obligation count is inferred from source configuration.
- Existing paid cases, open hosted checkout sessions, payment races, callbacks, refunds, and retention remain unresolved until authorized read-only evidence supports a disposition. Release owner: Suleman or designated release operator. Next action: reconcile paid cases, unpaid hosted sessions/payment links, pending callbacks, scheduled work, refunds/disputes, and retention through the authorized Stripe/Worker read-only surfaces; record only sanitized status and the private evidence reference. If access is unavailable, provide that same scoped report to the release owner. No live record or setting was changed.

## Baseline checks

Environment: Ruby 3.1.7, Node 22.22.2, Python 3.12. Use `TMPDIR=/private/tmp` for Ruby fixtures because macOS resolves `/var/folders` through `/private/var`; use the CI-provisioned DejaVu font files through `DEJAVU_FONT_DIR` for social-card tests. Both adjustments are environment-only and did not change repository source.

| Check | Baseline result |
|---|---|
| `bundle check` | Pass |
| `JEKYLL_ENV=production bundle exec jekyll clean && JEKYLL_ENV=production bundle exec jekyll build` | Pass |
| `bundle exec ruby scripts/verify_writing.rb --source-only` | Pass: 52 public, 0 draft, 1 legacy |
| `bundle exec ruby scripts/verify_writing.rb` | Pass: 52 public, 0 draft, 1 legacy |
| `python3.12 scripts/verify_discovery.py` | Pass: 53 public articles, 52 feed entries, 53 sitemap article URLs, 15 sitemap pages |
| `npm run check --prefix worker` | Pass: 16 test files, 126 tests |
| Ruby test suite | Pass: 48 tests, 232 assertions |
| Python test suite | Pass: 42 tests |
| Work With Me, Viyu positioning, public-safety, portfolio-review, and Priority Discovery verifiers | Pass |

The first Ruby/Python test attempts exposed local environment assumptions; the corrected runs above passed without source changes. `npm ci` installed the lockfile dependencies in the ignored worktree `worker/node_modules`; it did not change the lockfile.

## Implementation qualification

- The current production Jekyll build passes. `bundle exec ruby scripts/verify_writing.rb` confirms 52 public articles, 0 drafts, and 1 legacy article. Discovery confirms 53 public article URLs, 52 feed entries, 53 article sitemap URLs, and 17 page sitemap URLs.
- Ruby tests pass: 48 tests, 230 assertions. Python tests pass: 55 tests. Worker TypeScript check and tests pass: 16 files, 131 tests. Article social-card check and all policy/portfolio verifiers pass.
- Browser preview at `http://127.0.0.1:4000/` confirms the homepage positioning, all six work-case routes, Viyu business destination, navigation disclosure, and Writing category + AND text filtering. The filter query/category restore after reload. Preview is local and does not prove production deployment.
- Browser review caught a crowded header at tablet width. The responsive header now moves navigation into a disclosure menu at 1280px; opening it exposes Work, Writing, About, and Contact. The disclosure has a visible focus target and all items remain accessible.
- `jekyll serve` is unavailable in the local Ruby install because `webrick` is missing. The production-built `_site` is being served locally with a path-aware Python preview server; no repository dependency was added.
- Remaining live release gate: Stripe and Cloudflare read-only connectors require reauthentication, so no live session, payment, callback, database, or Worker state was returned. Owner: Suleman or designated release operator. Exact next action: reauthenticate both connections for the intended Sulemanji account, then read and reconcile existing paid cases, unpaid hosted Checkout Sessions/Payment Links, pending callbacks, scheduled work, refunds/disputes, and retention. Record only sanitized disposition and a private evidence reference. Do not change records or settings in this step.
- Independent review of `0ab98ae..e3f5e68` found no Critical or Important issue. The reviewer’s privacy, source-config, legacy-CTA, and generated-output findings were fixed. The alleged missing quote servicing test was withdrawn after confirming `worker/test/calendar.test.ts` already proves a valid retired-mode case can complete a balance checkout; an expired-quote denial regression test was added.

The preview's 41-article snapshot was not used; the source baseline and current catalog drive Writing output.

## Task status

| Task | Status | Evidence |
|---|---|---|
| T01 — Source and decision reconciliation | Done | Fresh-main worktree and SHAs recorded; baseline manifest complete; policy decision applied and safety checks pass; checkpoint commit `0ab98ae` |
| T02 — Jekyll portfolio redesign | Implemented; reviewed | Shared shell, homepage, About, Contact, six work cases, seven accessible diagrams, retained profile pages and route aliases |
| T03 — Offer retirement | Implemented; live disposition gated | Admission endpoints return 410 before parsing/writes/provider calls unless explicitly active; paid-case servicing and callbacks remain; unit tests pass |
| T04 — Writing preservation and browsing | Implemented | Server-rendered eligible catalog preserved, article URLs unchanged, categories/search layered progressively; 48 Ruby tests and 55 Python tests pass |
| T05 — Qualification and release safety | Engineering checks pass; live evidence gated | Production build and verifiers pass; current Stripe/Cloudflare read-only access needs reauthentication |
| T06 — Automation and safety verification | Done | Discovery, public-safety, Viyu positioning, offer-retirement, portfolio, and Priority Discovery verifiers pass |
| T07 — Build and browser qualification | Done | Production build and local browser review pass; local preview retained on port 4000 |
| T08 — Independent review and implementation PR | Done | Independent review passes on the implementation; PR #97 is open against `main`; GitHub build passed at head `42caff1e`; deploy job skipped |

## Overall state

- Package published: PR #96 is open as a draft; it is not merged.
- Goal acknowledged: yes, this local implementation run is active.
- Source implemented: yes, in the isolated worktree and published on the implementation branch.
- Tests passed: yes; current local qualification is listed above and GitHub build passed at PR head `42caff1e`.
- Independent review: pass; the reviewer confirmed no Critical or Important issue on the implementation and rechecked the final source candidate.
- Implementation PR: open, [#97](https://github.com/ssmanji89/sulemanji-port/pull/97), base `main`, branch `codex/portfolio-redesign-2026-11-25`.
- Merged: no; merge is outside this authorization.
- Production verified: no.
