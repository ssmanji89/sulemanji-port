# Portfolio Redesign Source Ledger

## Inspection baseline

| Source | Inspected revision or location | Meaning |
|---|---|---|
| Canonical repository | [`ssmanji89/sulemanji-port`](https://github.com/ssmanji89/sulemanji-port) | Public production source |
| Main | [`5ab5122b61a16ed0bb72067b8a346c67f3091bfa`](https://github.com/ssmanji89/sulemanji-port/commit/5ab5122b61a16ed0bb72067b8a346c67f3091bfa) | Planning inspection on 2026-11-25 |
| Main tree | `ce71acef1271fca6a687cc09c8bc3e59610b2ac2` | 423 entries; non-truncated response |
| Preview production snapshot | `e12229f07dfabb9287a944200955f451bc83fc9c` | Earlier article source; not an implementation base |
| Separate preview source | `159ce931d6aaa43b3fcd5dddcaad1c7fe6bb7eb3` | Completed design and curated-copy reference |
| Private preview | <https://sulemanji-redesign.sulemanji-llc.chatgpt.site/> | Access can require the owner's session |
| Repository reference | [Reference directory](../../reference/2026-11-25-portfolio-redesign/README.md) | Portable design and curated content for Codex |

Fresh main is 19 commits ahead of the preview's production snapshot.
The comparison adds 12 article files and their 12 social images.
The inspected tree has 53 `notes/*.md` files. Eligibility remains governed by the Writing contract.
Do not use either the preview count or this inspection count as a permanent acceptance target.

The planning workspace contains a selected source snapshot, not a complete canonical checkout.
Package checks do not establish a full Jekyll build, Worker test pass, or production verification.
Codex must fetch current source and establish a complete local baseline.

## Controlling contracts

| Path or source | Requirement |
|---|---|
| `AGENTS.md` | Shared Jekyll shell, presentation, navigation, metadata, output, and publishing ownership |
| `docs/PUBLIC-CLAIMS-POLICY.md` | Public evidence, employer disclosure, attribution, and claim boundaries |
| `docs/WRITING-CONTRACT.md` | Article schema, eligibility, metadata, source quality, legacy exceptions, and commercial links |
| [Issue #21](https://github.com/ssmanji89/sulemanji-port/issues/21) | Daily Writing coordination and active owner |
| [PR #22](https://github.com/ssmanji89/sulemanji-port/pull/22) | Article-publisher reconciliation; its publication authority is specific to that workflow |
| `.github/workflows/jekyll.yml` | Current validation and Pages deployment behavior |
| `_config.yml` | Build exclusions, production URL, and Jekyll configuration |

The inspected root contains `AGENTS.md` and no `LOOP.md`.
Read new instructions if they exist in the actual execution environment.
Owner decisions retire the public workshop and direct business contact to Viyu.
Update only the policy clauses those decisions supersede.

## Source ownership map

| Area | Owner paths |
|---|---|
| Document and main | `_layouts/default.html` |
| Shared navigation | `_includes/site-header.html`, `_includes/nav.html`, `_includes/site-footer.html`, `_data/navigation.yml` |
| Presentation | `assets/css/components/theme.css`, `assets/css/style.scss` |
| Navigation enhancement | `assets/js/portfolio-rewrite.js` |
| Metadata and identity | `_includes/head-custom.html`, `_includes/person-schema.html`, `_config.yml` |
| Main content | `index.html`, `about.md`, `story.md`, `beyond.md`, `experience.md`, `resume.md`, `projects.md` |
| Existing cases | `case-studies/*.md` |
| Writing presentation | `writing.md`, `_includes/writing-entry.html`, `_includes/writing-meta.html`, `_layouts/writing-article.html`, `_layouts/writing-legacy.html` |
| Writing eligibility | `_plugins/writing_discovery.rb`, `scripts/verify_writing.rb`, `_data/writing.yml` |
| Public discovery | `_data/discovery-pages.yml`, `feed.xml`, `sitemap.xml`, `robots.txt`, `_data/crawler-policy.json` |
| Offer routes | `work-with-me.md`, `work-with-me-personal.md`, `work-with-me-priority.md`, `work-with-me-quote.md`, `work-with-me-thanks.md`, `work-with-me-terms.md` |
| Offer scripts | `assets/js/work-with-me.js`, `assets/js/work-with-me-quote.js`, `_layouts/default.html` script loading |
| Disclosure | `privacy.md`, `affiliate-disclosure.md` |
| Existing media | `assets/ffcli/demo.mp4`, `assets/ffcli/warroom-*.png`, `images/sulemanji-profile.png`, `assets/sulemanji-profile.png` |
| Legacy résumé assets | `assets/SulemanManji_Resume.pdf`, `assets/resume/Suleman-Manji-Resume.pdf` |

The shared shell supports `page.body_class` and `page.wide_content`.
Use those contracts where useful. Do not add another production document or stylesheet system.

## Worker findings

| Source | Observed behavior | Required treatment |
|---|---|---|
| `worker/src/index.ts` | `SERVICE_MODE=setup` prevents scheduled work | Keep service mode separate from public admission |
| `worker/src/routes/intakes.ts` | `POST /v1/intakes` can create a new case after its request checks | Add explicit retired admission before body parsing or side effects |
| `worker/src/routes/payments.ts` | `POST /v1/cases/:token/deposit-checkout` can reserve a counter and create Stripe checkout | Apply the same explicit admission contract |
| `worker/src/routes/quotes.ts` | `POST /v1/quotes/:token/holds` can serve an eligible paid scheduling case and create balance checkout | Preserve eligible existing obligations |
| `worker/src/env.ts` | Existing environment contract has no public-offer retirement control | Add `PUBLIC_OFFER_MODE` and fail closed |
| Worker integrations and workflows | Webhook, refund, case, calendar, administration, and retention responsibilities remain | Preserve them until a concrete disposition exists |

Current intake and deposit routes do not check `serviceIsReady`.
Removing website forms does not close those direct routes.
Closing new session creation does not expire previously created hosted checkout sessions.
The release disposition must cover those sessions and payments that arrive after retirement starts.
The Worker README describes deployment. That is source evidence, not a fresh live-system observation.
Operational reconciliation must use authorized read-only access. Keep private records outside this public repository.

## Existing gate reconciliation

| Gate | Conflict or gap | Replacement requirement |
|---|---|---|
| `scripts/verify_work_with_me.py` | Requires old forms, intake scripts, pricing, navigation, and privacy copy | Assert approved retirement, Viyu contact, and preserved obligation paths |
| `scripts/verify_viyu_positioning.py` | Requires older phrases across public career and project pages | Assert the approved professional framing and disclosure boundaries |
| `scripts/verify_portfolio_review.py` | Requires the previous route and personal-intake arrangement | Assert the new navigation, route disposition, and safe public content |
| `scripts/verify_priority_discovery_plan.py` | Validates historical paid-discovery specs and Worker configuration | Preserve useful configuration constraints while adding retirement coverage |
| `scripts/verify_public_safety.py` | Source scan omits a future nested `work/` directory | Add nested Work and relevant generated-output coverage |

Document every removed assertion and its replacement.
Do not remove a failing gate merely to obtain a passing workflow.

## Open work at inspection

| PR | Scope |
|---|---|
| [#90](https://github.com/ssmanji89/sulemanji-port/pull/90) | Mobile-driver-license article |
| [#86](https://github.com/ssmanji89/sulemanji-port/pull/86) | Agent-evaluation article |
| [#85](https://github.com/ssmanji89/sulemanji-port/pull/85) | AI-wallet article |
| [#84](https://github.com/ssmanji89/sulemanji-port/pull/84) | Adversarial-AI-taxonomy article |
| [#71](https://github.com/ssmanji89/sulemanji-port/pull/71) | Draft MSP Field Notes implementation |
| [#67](https://github.com/ssmanji89/sulemanji-port/pull/67) | Draft MSP Field Notes design |
| [#61](https://github.com/ssmanji89/sulemanji-port/pull/61) | Recovery-test article |
| [#9](https://github.com/ssmanji89/sulemanji-port/pull/9) | Toast project update |

Refresh these states and inspect newer work before implementation.
Do not merge, close, or absorb another owner's work automatically.

## Requested method references

| Reference | Application in this package |
|---|---|
| [rpi-skills](https://github.com/alanw707/rpi-skills) | Research, decision reconciliation, and implementation planning; do not restore the retired visitor interrogation flow |
| Superpowers | Goal, design, bounded tasks, isolated execution, independent review, and verification |
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | Accessible diagrams explain methods, project families, and evidence boundaries |
| [archify](https://github.com/tt-a1i/archify) | Explicit source ownership and architecture decisions |
| [rea](https://github.com/morluto/rea) | Evidence-led research and synthesis |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Independent review and correction checks |
| [humanizer](https://github.com/blader/humanizer) | Concrete copy with clear attribution and no unsupported promotional claims |

These references supply method guidance. Their presence does not prove that a separate CLI runs or passes in the canonical repository.
Review third-party instructions before use. Preserve repository authority, current user decisions, and public-content boundaries.
Private business context informs selection. This package includes only curated public-safe outcomes from that work.

## Validation commands

The inspected workflow uses Ruby 3.1, Node 22, and Python 3.12.
Reconcile commands against the current workflow before running them.

```bash
bundle install
python3 -m pip install --requirement requirements-seo.txt
npm ci --prefix worker
npm run check --prefix worker
bundle exec ruby scripts/verify_writing.rb --source-only
python3 scripts/generate_article_images.py --write-missing
python3 scripts/generate_article_images.py --check
bundle exec jekyll clean
JEKYLL_ENV=production bundle exec jekyll build
bundle exec ruby scripts/verify_writing.rb
python3 scripts/verify_discovery.py
bundle exec ruby -I scripts/tests -e 'Dir["scripts/tests/test_*.rb"].sort.each { |path| require_relative path }'
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/verify_public_safety.py
python3 scripts/verify_portfolio_review.py
python3 scripts/verify_priority_discovery_plan.py
```

Do not enable drafts, unpublished pages, future content, or incremental production builds.
Review generated-image changes. Do not overwrite valid images merely to make a check pass.
Add the targeted tests from the task plans and browser evidence for the actual Jekyll implementation.

## Publication boundary

The Pages workflow deploys on push to main and manual dispatch on main.
Pull-request events validate without deployment.
Keep the planning PR and implementation PR unmerged until the relevant release authority acts.
The separate private preview does not prove canonical-source or public production completion.
