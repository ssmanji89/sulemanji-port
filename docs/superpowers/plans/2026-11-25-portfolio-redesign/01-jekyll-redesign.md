# Jekyll Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox tracking.

**Goal:** Deliver the shared design, main pages, selected cases, and current writing through the existing Jekyll site.

**Architecture:** Extend current presentation owners. Add case data and templates beneath the existing document layout. Consume the existing Writing catalog.

**Tech Stack:** Jekyll, Liquid, SCSS, JavaScript, Ruby, Python.

**Spec:** [Portfolio design](../../specs/2026-11-25-portfolio-redesign-design.md).

## Global Constraints

Apply every [program constraint](README.md#global-constraints).
Use one document shell, one main landmark, one stable Person identity, and the existing publishing contracts.

## Review Focus

Preserve later articles, no-JavaScript navigation, narrow layouts, public-source boundaries, and stale-asset exclusion.
Tasks T02–T04 pin those behaviors through A07–A26.

### Task T01: Source and decision reconciliation

**Files:**
- Read: `AGENTS.md`, `docs/PUBLIC-CLAIMS-POLICY.md`, `docs/WRITING-CONTRACT.md`, `.github/workflows/jekyll.yml`.
- Read: current issue #21 and relevant open PRs from the source ledger.
- Modify: `docs/PUBLIC-CLAIMS-POLICY.md` only where current owner decisions supersede workshop and personal-routing language.
- Create: `docs/redesign/2026-11-25/EXECUTION.md` and a sanitized baseline manifest beside it.

**Interfaces:**
- Consumes: fresh main SHA, current planning PR SHA, local ownership instructions, and eligible Writing source.
- Produces: `REDESIGN_BASELINE_SHA`, route and article baseline, decision reconciliation, dependency map, and task checkpoint.

- [ ] **Step 1: Reconcile the checkout and ownership.**

Fetch main and the planning ref. Use an isolated worktree from fresh main.
Record current branch ownership and uncommitted work before any write.
Read actual instructions. Do not invent an absent `LOOP.md` or copy unrelated coordination rules.

- [ ] **Step 2: Record the current source baseline.**

Set `REDESIGN_BASELINE_SHA` to the fetched main SHA.
Record each eligible article's source path, canonical URL, publication metadata, and source hash.
Record current navigation, discovery routes, PDF routes, offer handlers, and open work.
Do not fix the article count at either 41 or 53.

- [ ] **Step 3: Reconcile the policy decisions.**

Replace the old public workshop allowance with retirement.
Replace mandatory personal routing of organizational inquiries with the exact Viyu destination.
Keep disclosure, evidence, attribution, and employer-IP restrictions.
Record the preview's role and the unresolved production obligations.

- [ ] **Step 4: Run the existing baseline checks.**

Use the commands in [SOURCE_LEDGER.md](SOURCE_LEDGER.md#validation-commands).
Record observed results and pre-existing failures before changing gates.
If a dependency is unavailable, record it precisely and continue independent source work.

- [ ] **Step 5: Commit the reconciliation.**

Commit only the accepted policy update and sanitized checkpoint.
Complete A01–A06 before consuming the baseline in later tasks.

### Task T02: Shared shell and main pages

**Files:**
- Modify: `_layouts/default.html`, `_includes/site-header.html`, `_includes/nav.html`, `_includes/site-footer.html`.
- Modify: `_includes/head-custom.html` for the shared compatibility-redirect hook.
- Modify: `_data/navigation.yml`, `assets/css/components/theme.css`, `assets/css/style.scss`, `assets/js/portfolio-rewrite.js`.
- Modify: `index.html`, `about.md`; create `contact.md` with permalink `/contact/`.
- Test: `scripts/tests/test_redesign.py`; update relevant assertions in `scripts/verify_portfolio_review.py` and `scripts/verify_viyu_positioning.py`.

**Interfaces:**
- Consumes: current shared layout contracts, design tokens, curated About copy, and the T01 decision record.
- Produces: Home, About, Contact, responsive navigation, and the shared presentation used by Work and Writing.
- Navigation order: Work, Writing, About, Contact. The Viyu action remains an explicit business link.
- Redirect contract: reviewed local `redirect_target`, page-level noindex, shared-head meta refresh, and a visible ordinary destination link.

- [ ] **Step 1: Add failing behavioral assertions.**

Add `test_main_navigation_and_business_destination` for the exact route order and Viyu URL.
Add `test_shared_document_landmarks` for one main, one H1, a skip link, and one stable Person identity.
Add `test_no_javascript_navigation_remains_available` for source-visible navigation before disclosure enhancement.
Add `test_shared_redirect_fallback` for reviewed local targets and a usable destination link without JavaScript.
Run the targeted tests and record the expected failures against the old design.

- [ ] **Step 2: Implement the tokens and shared shell.**

Use the exact palette in the design.
Adapt the frozen Home reference into the existing shell and component styles.
Keep page-specific content outside the shared document.
Use existing hero and width contracts instead of another standalone HTML application.
Keep article H1 ownership in the existing article layouts. Do not add a second shared hero heading to those pages.
Add the guarded redirect hook to the current head include. Limit targets to reviewed local paths and escape attribute values.
T03 and T05 consume that hook. They must not create separate redirect implementations.

- [ ] **Step 3: Implement Home, About, and Contact.**

Use the selected work hierarchy, portrait, relevant personal topics, and direct contact paths.
Give About's background and interests sections stable `background` and `interests` IDs for compatibility links.
Do not add pricing, a workshop offer, a visitor form, or invented outcomes.
Keep disclosure text in the correct scope.

- [ ] **Step 4: Verify interaction and layout.**

Run the targeted tests, Jekyll build, and shared presentation gates.
Check keyboard navigation, Escape, visible focus, disabled JavaScript, 320 CSS pixels, and 200% zoom.
Attach menu handlers before enabling disclosure. Use reduced-motion preferences.
Record A07–A12 with screenshots or precise browser observations.

- [ ] **Step 5: Commit the shared presentation.**

Commit the shared files and main pages together after review.

### Task T03: Work cases and public content boundaries

**Files:**
- Create: `_data/work-cases.yml`, `_layouts/work-case.html`, `work.md`.
- Create: `work/service-operations.md`, `work/market-systems.md`, `work/integrations.md`, `work/knowledge-tools.md`, `work/ff-cli.md`, `work/mathematical-verification.md`.
- Create: `assets/diagrams/portfolio/` with the seven reference SVGs.
- Modify: `projects.md`, `story.md`, `beyond.md`, selected old case front matter, `experience.md`, `resume.md`, and `_config.yml` for stale PDF exclusions.
- Modify: `scripts/verify_public_safety.py`, `scripts/verify_portfolio_review.py`.
- Test: `scripts/tests/test_redesign.py`, `scripts/tests/test_public_safety.py`.

**Interfaces:**
- Consumes: T02 shell, `reference/content.json`, corrected career entries in `reference/retained.json`, and reference diagrams.
- Produces: six stable Work routes, source links, diagrams, demo, safe career surfaces, and public-safety coverage.
- Case data retains `slug`, `category`, `title`, `dek`, `status`, `intro`, `sections`, `projects`, `sources`, and `diagram`.
- Each case page supplies `case_slug`, `hero_title`, and `hero_lede`. The shared shell owns its H1.

- [ ] **Step 1: Add failure cases for the public output.**

Add `test_all_six_case_routes_exist` and `test_case_states_and_sources_remain_attached`.
Add `test_nested_work_content_is_scanned` using a forbidden-content fixture without publishing that fixture as a site page.
Add `test_stale_resume_assets_are_absent` for both legacy PDF paths.
Run the targeted checks before adding cases or exclusions.

- [ ] **Step 2: Implement case rendering and curated content.**

Use readable data and a thin case template beneath the shared layout.
Preserve project maturity and upstream attribution.
Use public links only. Do not copy private evidence into the case data.
Use pinned public source links for historical cases whose former routes redirect to the new Work pages.
Use T02's redirect contract for Projects, Story, Beyond, and the replaced ff-cli and service-delivery cases.
Preserve the destination paths and About section IDs from the design. Remove retired source routes from public discovery.
Keep the two existing professional practice notes accessible.

- [ ] **Step 3: Integrate diagrams and the demonstration.**

Preserve SVG titles, descriptions, IDs, and evidence captions.
Use existing `assets/ffcli/demo.mp4` and approved screenshots.
Keep the auction-demo description, synthetic participant framing, and snake-draft distinction.
Provide a text description of the silent video.

- [ ] **Step 4: Correct every public career surface.**

Apply the curated résumé and Experience copy.
Exclude `assets/SulemanManji_Resume.pdf` and `assets/resume/Suleman-Manji-Resume.pdf` from output and remove their links.
A later safe PDF replacement requires complete content review and explicit output checks.
Extend safety scanning to nested Work content and relevant generated text.

- [ ] **Step 5: Verify and commit the cases.**

Run public safety, targeted tests, and rendered route checks.
Obtain independent review of the complete professional disclosure.
Complete A13–A19, then commit the cases, assets, and career corrections.

### Task T04: Writing discovery and controls

**Files:**
- Modify: `writing.md`, `_includes/writing-entry.html`, `_includes/writing-meta.html`, `assets/css/style.scss`.
- Create: `_data/writing-categories.yml`, `assets/js/writing-browser.js`.
- Modify: shared script loading only for the Writing index.
- Test: `scripts/tests/test_writing.rb`, `scripts/tests/test_redesign.py`, and browser acceptance.
- Preserve: `_plugins/writing_discovery.rb`, article layouts, and article bytes unless a specific integration defect requires a reviewed change.

**Interfaces:**
- Consumes: `site.data.writing_discovery.articles`, `.legacy`, and canonical-URL category mapping.
- Produces: server-rendered eligible entries with `data-category` and normalized `data-search` values.
- Category mapping: Operations, Automation, Security, Research; unmapped eligible articles use Other.
- Browser state: `q` and `category` URL parameters. Search terms and category selection combine with AND.

- [ ] **Step 1: Add continuity and visibility tests.**

Add `test_current_articles_survive_redesign` against the pinned T01 baseline.
Add `test_new_unmapped_article_remains_discoverable` for All and Other.
Retain tests for future articles, noindex exclusions, undated legacy content, dates, images, feed, and sitemap.
Run the targeted tests and record the relevant expected failures.

- [ ] **Step 2: Render the current catalog.**

Use the existing discovery data rather than the preview's article JSON.
Build the category map without changing schema-v1 article files.
Keep full article content and sources. Preserve existing commercial-link attributes.
Render all eligible entries when JavaScript is unavailable.

- [ ] **Step 3: Implement the browser controls.**

Implement `readFilterState(searchParams)`, `matchesEntry(entry, state)`, and `renderFilterState(state)` inside the page script.
The state contains a string query and a valid display category.
Unknown URL categories fall back to All.
Use text normalization, not HTML insertion, for user-entered search text.
Keep counts, empty state, reset, and URL state synchronized.

- [ ] **Step 4: Verify meaningful discovery behavior.**

Check exact category totals against the current server-rendered catalog.
Check mixed-case multi-term queries, combined filters, zero results, reset, and query-state restoration.
Check a later article merge and the undated legacy article.
Run Writing source and rendered checks plus discovery tests.
Complete A20–A26.

- [ ] **Step 5: Commit the Writing integration.**

Commit the index, mapping, script, and tests without changing unrelated article bodies.
