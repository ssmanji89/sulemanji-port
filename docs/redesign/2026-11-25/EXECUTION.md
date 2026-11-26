# Portfolio redesign execution checkpoint

Updated: 2026-11-25

## Source and ownership

- Repository: `ssmanji89/sulemanji-port`.
- Fresh `origin/main`: `5ab5122b61a16ed0bb72067b8a346c67f3091bfa`.
- Planning PR #96: open draft, head `fed5f8c7d82b1397f01805803742d788a1abff63`.
- Implementation branch: `codex/portfolio-redesign-2026-11-25`.
- Isolated worktree: `/Users/sully/Documents/GitHub/sulemanji/.worktrees/portfolio-redesign-2026-11-25`.
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

## Task status

| Task | Status | Evidence |
|---|---|---|
| T01 — Source and decision reconciliation | In progress; pending post-policy safety check and commit | Fresh-main worktree and SHAs recorded; baseline manifest complete; policy decision applied |
| T02–T08 | Planned | See the imported task plans and acceptance matrix |

## Overall state

- Package published: PR #96 is open as a draft; it is not merged.
- Goal acknowledged: yes, this local implementation run is active.
- Source implemented: not yet.
- Tests passed: baseline only; implementation checks remain.
- Independent review: not yet.
- Implementation PR: not yet created.
- Merged: no.
- Production verified: no.
