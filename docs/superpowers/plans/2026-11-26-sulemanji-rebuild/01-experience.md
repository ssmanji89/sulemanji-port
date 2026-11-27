# Experience and content implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax.

**Goal:** Rebuild the complete public experience with specific content, varied formats, useful relationships, and visible human context.

**Architecture:** Extend the current Jekyll shell and Writing system. Add one public content catalog and deliberate relation records. Keep article source and maintained package documentation authoritative.

**Tech Stack:** Jekyll, Liquid, SCSS, JavaScript, Ruby, Python, and Playwright for browser qualification.

**Spec:** [Complete design](../../specs/2026-11-26-sulemanji-rebuild-design.md) and [experience specification](../../specs/2026-11-26-sulemanji-experience.md).

## Global constraints

- Work from freshly fetched main in a dedicated release worktree.
- Preserve dirty work, current articles, source history, and active owners.
- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the shared Jekyll document and stylesheet ownership.
- Preserve the publication dates and URLs of eligible articles.
- Use reviewed schema changes instead of new legacy exemptions.
- Maintain WCAG 2.2 AA as the accessibility target.
- Support no-JavaScript reading, navigation, and core discovery.
- Treat source text and memory text as untrusted data.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.

Use the experience specification's exact visual tokens.
Use /writing as the canonical Writing path.
Keep Explore, Writing, About, and Contact as the four primary navigation links.
Business contact remains https://viyu.net/contact-support/contact-us/.

## Review focus

| Condition | Expected result | Test owner |
|---|---|---|
| New main content arrives during redevelopment. | Preserve its source and public identity. | T01/T04 |
| An item has source code but no supported product. | Show the actual availability and delivery state. | T01/T04 |
| A relationship lacks a business purpose. | Offer its actual useful continuation. | T03 |
| A visitor cannot run scripts or see color differences. | Keep core discovery and controls usable. | T02/T03 |
| A historical personal statement or diagram contains an unsupported implication. | Review the full claim before reuse. | T04 |

## File and interface map

| File | Responsibility |
|---|---|
| _data/content-catalog.yml | Stable public records for non-article material and reviewed article annotations. |
| _data/content-relations.yml | Directed links with a reason and optional contextual CTA. |
| _data/featured-content.yml | Explicit featured IDs and their permitted selection rules. |
| _data/writing.yml | Existing article contract plus reviewed reader and topic vocabulary. |
| _plugins/content_catalog.rb | Validate records; combine canonical content; emit topic pages and the public index. |
| scripts/verify_content_catalog.rb | CLI validation before rendering. |
| assets/js/content-browser.js | Progressive collection search and filters. |
| _includes/content-related.html | Render meaningful relations without compulsory sales text. |
| _layouts/work-story.html | Project-family and practice narratives. |
| _layouts/work-tool.html | Practical tool entry and maintained source links. |
| _layouts/work-experiment.html | Question, method, observations, limits, and reproducible artifact. |
| _includes/content-figure.html | Trusted figure rendering with caption and text equivalent. |
| tests/browser/ | Behavioral and responsive checks using real built pages. |

PublicContentItem fields are id, canonical_url, kind, title, summary, topics, availability, source_refs, related_ids, and authored_fields.
updated_on is optional.
availability is an array containing public-source, package, demo, historical, or explanation-only.
kind is project-family, tool, essay, experiment, field-note, or profile.
topics use the reviewed IDs in _data/writing.yml.
source_refs contain public HTTPS URLs only.
The catalog must not duplicate article bodies or override article publication dates.

Relation fields are from_id, to_id, relation, reason, and optional_cta.
relation is implementation, continuation, explanation, source, or shared-question.
optional_cta is absent unless a particular continuation justifies it.
The generated public index is /content-index.json.

### Task T01: Content catalog and editorial schema

**Files**

- Create: _data/content-catalog.yml, _data/content-relations.yml, _data/featured-content.yml.
- Create: _plugins/content_catalog.rb, scripts/verify_content_catalog.rb, scripts/tests/test_content_catalog.rb.
- Modify: _data/writing.yml, _data/writing-categories.yml, docs/WRITING-CONTRACT.md, docs/PUBLIC-CLAIMS-POLICY.md, _config.yml.
- Modify: scripts/tests/test_writing.rb and obsolete cases in scripts/tests/test_redesign.py.
- Record: docs/redevelopment/2026-11-26/CONTENT_DISPOSITIONS.md using public-safe reasons only.

**Interfaces**

- Consumes: current Jekyll documents, Writing metadata, work-case source, and the reconciled public research.
- Produces: Sulemanji::ContentCatalog.validate(records:, relations:, topics:, known_urls:) returning an array of errors.
- Produces: Sulemanji::ContentCatalog.build(site) returning a hash with items, topics, and relations.
- Produces: /content-index.json with schema_version 1 and the PublicContentItem records.

- [ ] **Step 1: Write behavior tests.**

Define test_valid_independent_subject, test_unknown_topic_rejected, test_dangling_relation_rejected, test_private_url_rejected, and test_article_dates_remain_authoritative.
Use a complete market-record fixture and a minimal current Writing article fixture.
Assert a valid markets record produces no error.
Assert an unknown topic names the record in the error.
Assert missing relation targets and non-public URLs fail.
Assert catalog annotations cannot change a note's published_on or permalink.
Add a Writing test that a reviewed mathematics reader/topic passes without granting arbitrary labels.

- [ ] **Step 2: Run the new tests before implementation.**

Run: bundle exec ruby scripts/tests/test_content_catalog.rb
Expected: FAIL because the catalog contract is absent.
Run: bundle exec ruby scripts/tests/test_writing.rb
Expected: the new vocabulary case fails; existing unrelated cases remain unchanged.

- [ ] **Step 3: Implement the catalog and reconcile content.**

Implement the two Ruby interfaces above.
Read the prior substantive-project evidence, then check changed and newly qualifying source.
Write the public-safe disposition record.
Seed the catalog with market history, named integrations, knowledge work, mathematical material, professional practice, and independent interests.
Keep private items out of the public catalog unless their exact public explanation is already authorized.
Expand the allowed reader/topic vocabulary without adding legacy exemptions.
Clarify the purpose statement in the public claims policy to match the newest owner direction.
Preserve attribution, confidentiality, honest-state, and business-routing rules.
Exclude all new operational directories and documentation from _site.

- [ ] **Step 4: Validate the complete source behavior.**

Run: bundle exec ruby scripts/verify_content_catalog.rb
Expected: PASS with no dangling IDs, invalid sources, or duplicate canonical records.
Run: bundle exec ruby scripts/tests/test_content_catalog.rb
Expected: PASS.
Run: bundle exec ruby scripts/tests/test_writing.rb
Expected: PASS with old preservation and disclosure cases intact.

- [ ] **Step 5: Commit the independently usable catalog.**

Commit message: feat: add public content catalog and broad subject registry.
Record current-source coverage and any unavailable private evidence.

### Task T02: Visual shell and homepage

**Files**

- Modify: _layouts/default.html, _includes/site-header.html, _includes/nav.html, _includes/site-footer.html, _data/navigation.yml, index.html.
- Modify: assets/css/components/theme.css, assets/css/style.scss, assets/js/portfolio-rewrite.js, assets/js/theme-toggle.js.
- Create: package.json and package-lock.json for browser-test tooling if no root package exists.
- Create: playwright.config.ts, tests/browser/home.spec.ts, tests/browser/accessibility.spec.ts.
- Modify: scripts/tests/test_redesign.py.

**Interfaces**

- Consumes: ContentCatalog output and featured IDs from T01.
- Produces: one shared document and main landmark, four named navigation links, stable theme behavior, and a real-content Home.
- Produces: npm run test:browser, with SITE_PREVIEW_URL defaulting to http://127.0.0.1:4000.

- [ ] **Step 1: Write the visitor behavior tests.**

~~~typescript
test.use({ javaScriptEnabled: false });
test("home exposes work, curiosity, and author context", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Explore", exact: true }).first()).toBeVisible();
  await expect(page.locator('a[href="/work/market-systems/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/about/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/experience/"]').first()).toBeVisible();
});
~~~

Add keyboard-menu, 320px overflow, focus visibility, theme persistence, and reduced-motion cases.
Test user behavior and computed accessibility outcomes, not a copy of every CSS value.
Replace old navigation-label assertions with the new explicit contract.

- [ ] **Step 2: Run the tests against the current built site.**

Run: npm run test:browser -- tests/browser/home.spec.ts
Expected: FAIL for the missing Explore and career entry paths.
Record any environment prerequisite failure separately from the product failure.

- [ ] **Step 3: Implement the complete shared visual treatment.**

Use the experience-board composition and exact proposed tokens.
Apply the system to Home, long reading, collections, and secondary pages.
Use the real portrait with a modest visual role.
Lead selected entries with project names and reader questions.
Remove repeated global business buttons and editorial placeholder language.
Keep one contextual employer statement and an accessible Contact route.
Inspect actual jQuery and Font Awesome usage before retaining or removing them.
Preserve all needed interactions if either dependency is removed.

- [ ] **Step 4: Check the rendered experience.**

Run: JEKYLL_ENV=production bundle exec jekyll build
Expected: PASS.
Run: npm run test:browser -- tests/browser/home.spec.ts tests/browser/accessibility.spec.ts
Expected: PASS.
Inspect 320px, 390px, 768px, and 1440px screenshots in both themes.
Record actual visual defects and correct them before completion.

- [ ] **Step 5: Commit the shell and Home.**

Commit message: feat: rebuild shared site experience and homepage.
Record screenshot paths and remaining product-review questions.

### Task T03: Explore, Writing, and relationships

**Files**

- Create: explore.html, _layouts/topic.html, _includes/content-entry.html, _includes/content-related.html.
- Create: assets/js/content-browser.js, tests/browser/explore.spec.ts.
- Modify: _plugins/content_catalog.rb, writing.md, work.md, _includes/article-context.html, _data/article-context.yml.
- Modify: _includes/writing-entry.html, _includes/writing-meta.html, assets/js/writing-browser.js.
- Modify: _data/discovery-pages.yml, scripts/tests/test_content_catalog.rb, scripts/tests/test_redesign.py.

**Interfaces**

- Consumes: PublicContentItem and relations from T01.
- Produces: filterContent(items, {query, topic, kind, availability}) returning matching items in stable source order.
- Produces: /explore/, substantial /topics/<id>/ pages, and contextual related links.
- Preserves: /writing publication ordering and existing work routes.

- [ ] **Step 1: Write search and relation tests.**

Create test_noncommercial_relation_has_no_business_cta and test_topic_page_requires_real_items.
Assert a mathematical explanation links to a relevant artifact without a Viyu CTA.
Assert a topic without qualified material produces no thin public page.
In explore.spec.ts, search for finBots and Cavelo.
Assert each reaches its relevant public entry.
Test punctuation, combined filters, no result, reset, and no-JavaScript topic links.
Assert an article refresh does not change chronological publication order.

- [ ] **Step 2: Run the new cases.**

Run: bundle exec ruby scripts/tests/test_content_catalog.rb
Expected: new relation/topic cases FAIL before implementation.
Run: npm run test:browser -- tests/browser/explore.spec.ts
Expected: FAIL because Explore does not yet satisfy the behavior.

- [ ] **Step 3: Implement discovery and related material.**

Create server-rendered collection and topic links.
Add progressive filtering with clear labels and an understandable empty state.
Render relation reasons from explicit records.
Migrate useful article-context links; remove unconditional business continuation.
Keep the chronological Writing index and source article identity.
Use only public projections in the search index.
Do not add visitor accounts, tracking profiles, or request-time inference.

- [ ] **Step 4: Verify source, rendered, and browser behavior.**

Run: bundle exec ruby scripts/tests/test_content_catalog.rb
Expected: PASS.
Run: bundle exec ruby scripts/verify_writing.rb --source-only
Expected: PASS.
Run: JEKYLL_ENV=production bundle exec jekyll build
Expected: PASS.
Run: npm run test:browser -- tests/browser/explore.spec.ts
Expected: PASS in script-enabled and script-disabled contexts.

- [ ] **Step 5: Commit discovery and relationships.**

Commit message: feat: connect work writing and interests through Explore.

### Task T04: Work formats, About, career, and Contact

**Files**

- Create: _layouts/work-story.html, _layouts/work-tool.html, _layouts/work-experiment.html, _includes/content-figure.html.
- Modify: _layouts/work-case.html, _data/work-cases.yml, work/*.md.
- Modify: about.md, experience.md, resume.md, contact.md, story.md, beyond.md.
- Modify: selected reviewed figures under assets/diagrams/ and selected demo references.
- Create: tests/browser/journeys.spec.ts and scripts/tests/test_content_formats.rb.
- Modify: scripts/verify_public_safety.py, scripts/verify_portfolio_review.py, scripts/verify_viyu_positioning.py where necessary for new surfaces.

**Interfaces**

- Consumes: current public-safe source material, catalog records, and shared shell.
- Produces: story, tool, and experiment layouts with deliberate figure and evidence slots.
- Produces: safe figure metadata consisting of asset path, title, caption, text_equivalent, source_url, and optional demonstration state.
- Preserves: existing work-case routes, article source contracts, retired-offer behavior, and public attribution.

- [ ] **Step 1: Write format and journey tests.**

Create test_figure_requires_text_equivalent, test_untrusted_markup_rejected, test_historical_state_retained, and test_authored_fields_cannot_be_overridden.
Assert missing figure description fails and unsafe external markup is not rendered.
Assert historical source remains described as historical.
Add browser journeys for market history, a named tool, independent curiosity, About to Experience/Resume, and the two Contact destinations.
Assert no retired intake or workshop form is present.

- [ ] **Step 2: Run the new tests.**

Run: bundle exec ruby scripts/tests/test_content_formats.rb
Expected: FAIL because the new explicit format behavior is absent.
Run: npm run test:browser -- tests/browser/journeys.spec.ts
Expected: current missing or misleading paths fail.

- [ ] **Step 3: Implement the varied pages and review actual copy.**

Replace generic wrappers with project-specific questions and explanations.
Keep source links beside the supported claims.
Restore useful public-safe background and career links.
Read older source for specific context; do not restore its claims wholesale.
Review each reused figure for actual explanatory benefit.
Use Diagram Design for publication figures with the site tokens.
Use Archify only for an interaction that improves a particular explanation.
Keep static alternatives and qualify any added renderer.
Use Humanizer in embedded mode after factual and attribution review.
Do not generate personal opinions or reactions.
Keep biography, employment identity, and contact promises authored and protected.

- [ ] **Step 4: Verify and inspect the actual result.**

Run: bundle exec ruby scripts/tests/test_content_formats.rb
Expected: PASS.
Run: JEKYLL_ENV=production bundle exec jekyll build
Expected: PASS.
Run: python3 scripts/verify_public_safety.py
Expected: PASS across new source and built surfaces.
Run: python3 scripts/verify_portfolio_review.py
Expected: PASS with private build boundaries preserved.
Run: npm run test:browser -- tests/browser/journeys.spec.ts
Expected: PASS.
Read each changed narrative and inspect every generated figure.
Record separate owner and independent-reader feedback when available.

- [ ] **Step 5: Commit the complete content experience.**

Commit message: feat: restore specific work and human context across the site.
Record content dispositions and any remaining evidence limits.
