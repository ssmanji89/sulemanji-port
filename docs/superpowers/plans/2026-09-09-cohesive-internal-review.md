# Cohesive portfolio internal review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with separate spec/quality review. Checkboxes record completed work.

**Execution status:** All three implementation tasks and their independent spec/quality reviews are complete. Whole-implementation review passed; its small Projects metadata finding was corrected and rechecked. Manual browser appearance/interaction acceptance remains open, as recorded in docs/INTERNAL-REVIEW-2026-09-09.md.

**Goal:** Implement a cohesive, credible portfolio and scenario-based contact experience for internal review.
**Architecture:** Existing Jekyll site, one shared shell and metadata owner, editorial content components and unchanged service backend. Keep routes and public-claim boundaries while replacing the rejected presentation.
**Tech Stack:** Jekyll/Liquid, Markdown, SCSS/CSS, browser JavaScript, Python verification, existing Worker fixtures where relevant.
**Spec:** docs/superpowers/specs/2026-09-09-internal-review-design.md. Read this active spec; issue snapshots record research only.

## Global Constraints

- Implement on review/cohesive-portfolio only; no main push, merge, deployment, GitHub Actions change/run, live form submission or outreach.
- Read AGENTS.md and docs/PUBLIC-CLAIMS-POLICY.md. Apply the owner's newer scenario-based framing narrowly; preserve all other evidence/confidentiality rules.
- Actual identity: Suleman Manji, Sr. Services Engineer at Viyu Network Solutions. Professional opportunities for him are not limited to hobby work. Do not invent consultancy, capacity, compensation, partnership or customer results.
- Keep existing route URLs, Worker schemas/enums, form payload contracts, case-token handling, terms and disabled checkout flag. Contact form relocation is the explicit frontend contract change.
- No new frontend framework, runtime dependency, analytics or CRM. Preserve meaningful tests; replace obsolete copy assertions with behavior assertions, never simply remove protection.
- Site claims and plans in the public repo must be public-safe. Keep primary evidence private. Quantitative M365/RFMS completion claims remain omitted.
- Three implementation tasks run sequentially, each with a separate reviewer. Review-fix cap is three rounds before coordinator reslicing/fresh review per existing sullydox contract.

## Task 1: Shared editorial shell and homepage

**Files:** modify index.html, _layouts/default.html, _includes/nav.html, assets/css/style.scss, assets/css/components/theme.css, assets/js/portfolio-rewrite.js, assets/js/theme-toggle.js only as needed, AGENTS.md ownership notes. Create _includes/site-header.html, _includes/site-footer.html, assets/css/components/editorial.css if it isolates the new homepage/content components. Retire assets/css/portfolio-rewrite.css after consumer search. Existing class styling for all inner pages remains supported.

**Interfaces:** default layout gets page.body_class and page.wide_content optional flags. It owns the unique main id=main, skip link, header/footer. Preserve hero_title/hero_lede/hero_ctas interface, data-site-header, data-menu-button, data-mobile-nav. Navigation URLs do not change. Home uses layout:default; root title and canonical remain. No new contact or case route may be linked until Task 2 creates it.

- [x] Read active spec, current source and baseline gates. Record BASE before edits. Build runtime is prepared by coordinator; use the supplied Ruby PATH when available.
- [x] Implement the shared templates, using this contract (adapt current theme toggle markup, not its public identity):

```liquid
<a class="skip-link" href="#main">Skip to content</a>
{% include site-header.html %}
<main id="main" tabindex="-1" class="container{% if page.wide_content %} container-wide{% endif %}">
  {{ content }}
</main>
{% include site-footer.html %}
```

Preserve front-matter heroes inside main and avoid a second h1 from the content. Use a layout-contained section.page for existing page classes if needed. Content requiring a hero still receives it. Extract the real header/footer to the named includes; do not duplicate them on home.

- [x] Replace palette/type tokens with the exact active spec values. Bound containers instead of hiding overflow. Grid columns use minmax(0,1fr), children min-width:0; text wraps naturally. Shared body/prose and heading scale apply to all old page components, including code, tables, long links and contact fields. Keep styles scoped and understandable; no second independent stylesheet redefining body and header.

```css
.page { max-width: 68ch; }
.container-wide .page { max-width: none; }
.work-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:2rem; }
.work-grid > * { min-width:0; }
.work-grid h3 { font-size:clamp(1.375rem,2vw,1.75rem); line-height:1.2; }
@media(max-width:760px) { .work-grid { grid-template-columns:1fr; } }
```

- [x] Compose home with visible name/role, modest existing portrait (width/height 200, descriptive alt), brief professional scope and Explore my work → /projects / Start a conversation → /work-with-me. Preserve required phrases Microsoft 365, migration work, service-delivery automation, agentic in natural text. Explain agent-assisted current practice separately from earlier experience. Use existing service-delivery case and ff-cli case as selected evidence; no metric billboard. Add one short actual decision example drawn from the existing case (verify state after action) and an authentic personal-intellectual passage pointing to Beyond Work/Writing. Use clear, specific copy; no phrases declaring how honest/robust/passionate the site is.
- [x] Remove marquee, duplicated full project index/career list and their unused filter behavior from the homepage. Preserve dedicated pages and existing personal depth.
- [x] Make mobile nav visible without JS, progressively enhanced only once handlers are installed. For enabled JS, opener reflects aria-expanded; Escape closes and restores focus, links close menu, wide resize clears overlay state. Ensure hidden nav does not retain focus, and body locking is removed on close. Theme continues across pages, handles inaccessible storage, and has a readable no-JS default. Remove reveal styles that can strand essential content invisible.
- [x] Run source safety/positioning gates; real Jekyll build if runtime ready. Do not change intake assertions just for this task. Self-review every touched route/class contract and commit only task files with a descriptive commit message.

**Acceptance:** one shell, consistent tokens, compact readable homepage, functioning progressive navigation and theme, no dead new links. Desktop/mobile visual review will occur on the integrated local build; report the absence of that evidence if not yet available.

## Task 2: Scenario conversations, coherent narratives and practice notes

**Files:** work-with-me.md; create work-with-me-personal.md; scripts/verify_work_with_me.py; docs/PUBLIC-CLAIMS-POLICY.md; create docs/superpowers/specs/2026-09-09-public-evidence-disposition.md; about.md; experience.md intro; projects.md; existing case-studies/agentic-msp-delivery.md and ff-cli-war-room.md opening/scan layer; create case-studies/microsoft-365-acquisition-integration.md and case-studies/rfms-operations.md. Read related intake subpages and adjust links if necessary, preserving their behavior. No Worker schema or endpoint change.

**Interfaces:** root /work-with-me has #business-engagements, #professional-conversations, #personal-projects and legacy #work-with-me-intake pointing to /work-with-me/personal#work-with-me-intake. Dedicated personal page enables work_with_me_form:true and keeps form ID and JSON field names. Practice notes use their planned routes but visibly identify their non-case-study nature.

- [x] Amend policy §1 only: owner 2026-09-09 directs scenario-appropriate opportunities for both Suleman and Viyu; professional opportunities/collaborations for Suleman are valid. Preserve actual role, employer delivery and every unrelated claim rule. Record qualitative accepted scope and omitted/unverified counts/customer claims in the new public-safe disposition. Do not include private names or source mappings.
- [x] Replace the contact page with issue #16's complete proposed copy from docs/superpowers/specs/2026-09-09-issue-16.md. Use the current published email with its static scenario subjects and selectable address fallback. Root loads no intake/Turnstile script. Style through shared classes; keep heading and scenarios concise.
- [x] Move the personal description/form into the dedicated page. Replace context radios with the exact field below and remove the ai_business_operations choice. All remaining fields, defaults, validation, security-related inputs and legacy backend enums remain.

```html
<input type="hidden" name="contextType" value="personal">
```

- [x] Update the verifier's form path and rendered personal path, preserving all existing field/terms/security checks at that new location. Replace root-specific obsolete copy assertions with parsed scenario-link/form-absence assertions. Prove the new routing check fails before the change and passes after. Add assertions that personal input has personal context and no professional/business option. Preserve forbidden-pattern scanning across both pages and remaining subpages. Assertions must parse the relevant form or HTML, not pass because strings occur in comments.
- [x] Check serialization with synthetic values without a network request: name/email/contextType/workshopCategory/problem/desiredOutcome/priorAttempts/sanitizedLinks/path/termsAccepted/website/turnstileToken must retain their meanings. Existing JS serialization can remain unchanged if the new markup satisfies it.
- [x] Correct About and Experience intro chronology: established migration/security/infrastructure practice preceded later agent assistance. Retain required current-role/acting-as wording and genuine personal story. Remove wording implying every year of work was delivered through agentic systems. State materially agent-assisted platform implementation honestly; fix existing hand-built wording where it contradicts this in the touched case.
- [x] Build two useful practice notes, not fictional customer stories. M365 note: acquisition/migration situation, identity/workload/device scope, dependency decisions, pilot/cutover/validation questions and business-conversation link. RFMS note: application/vendor vs infrastructure boundaries, access/dependency coordination, workflow validation questions and business-conversation link. Include explicit “Practice note” eyebrow and description; no delivery outcome/metric or named customer. Cite the already researched official Microsoft FastTrack migration guide and RFMS migration outline. Do not imply generic questions are a performed engagement. Link them from Projects alongside existing actual cases with distinguishable labels.
- [x] Recompose Projects into readable case/practice summaries, public tools and experiments; keep existing facts and maturity, no massive private-card wall. Preserve the current Toast foundation entry/PR #9 content. Add case opening summaries and section links; derive each from that existing case, never invent new evidence.
- [x] Run Jekyll plus all four existing verifiers; inspect source/rendered scenario paths and deprecated fragments. Self-review role/attribution and commit task files.

**Acceptance:** scenario choices retain Suleman as the point of contact, clarify Viyu delivery, and keep personal professional opportunities available. The personal workshop cannot invite organizational/professional submissions. Practices are useful but never misrepresented as completed cases. Outcome-case tasks remain evidence-gated.

## Task 3: Shared identity, integration verification and review handoff

**Files:** _includes/head-custom.html; create _includes/person-schema.html; _config.yml; about.md front matter; default layout/head consumers only as needed; create scripts/verify_portfolio_review.py, scripts/serve_portfolio_review.py and docs/INTERNAL-REVIEW-2026-09-09.md. Update AGENTS.md only for lasting shared metadata ownership. No runtime or workflow changes.

**Interfaces:** one Person @id=https://www.sulemanji.com/#person with actual jobTitle and worksFor Viyu. About is ProfilePage with mainEntity referencing that identity; other pages use appropriate SEO-generated WebPage/Article. Title/description/canonical are unique per rendered route. Use images/sulemanji-profile.png as existing truthful social-image fallback with real dimensions, not a fabricated banner.

- [x] Capture the current shared metadata shape. Replace blanket ProfilePage emission and conflicting title with the Person definition from issue #18 and a conditional About ProfilePage. Ensure includes escape dynamic JSON using jsonify and avoid duplicating contradictory identities with jekyll-seo-tag. Set About profile flag explicitly; default normal pages must not inherit it.
- [x] Use existing jekyll-seo-tag for page-specific title, description, canonical and Open Graph; configure identity/image defaults in one place. Preserve intake configuration. Keep homepage in the shared head and generate readable fallback previews from its real portrait.
- [x] Add a focused rendered-site verifier using Python stdlib HTMLParser/json: required root and new routes, exactly one main/h1/canonical per representative page, valid JSON-LD and role consistency, local href/fragment targets on changed routes, no old homepage style reference, contact root form/script absence, personal form presence. Exclude mailto/external URLs from local resolution and handle Jekyll extensionless routes as path.html or path/index.html. A named failure must exit nonzero.
- [ ] Manual browser acceptance remains pending; the automated portion is complete. Run the real Jekyll build and all content gates; report commands and results, including known environmental warnings. Coordinate with controller for browser captures at actual desktop/mobile or explicit capability limits. Verify menu, Escape/focus, theme, no-JS/reduced-motion and overflow behavior. Do not assert a viewport was tested if only CSS was inspected.
- [x] Provide a small stdlib-only localhost review server for the real `_site` directory. Resolve Jekyll extensionless routes as `.html` or directory `index.html`, retain static assets, bind 127.0.0.1 by default, and emit review-only `connect-src 'none'; form-action 'none'; frame-src 'none'` CSP headers to block submissions and external widgets during review. Do not alter production output or routing. Confirm required pages/assets return 200 and missing paths return 404 with local HTTP requests. Document how to build and run it.
- [x] Write review handoff: implemented scopes, screenshots location, verification results, remaining evidence gates and manual buyer comprehension checks, rollback unit and deliberate choices. Mark new M365/RFMS pages as practice notes in the handoff and leave case outcome issues open. Record no deploy/no outreach.
- [x] Commit task files; provide report to controller for whole-branch review. Do not push or open PR yourself.

**Acceptance:** representative metadata parses and agrees with visible identity, all links resolve, intended routes render through the same design, tests represent behavior, and the branch is ready for internal review with honest limits.

## Completion

Controller performs task-scoped spec/quality reviews, resolves findings, then broad final review; do not self-approve. Preserve a durable review record and propose the branch through a draft PR if authenticated Git push is available. If transport is unavailable, provide the committed local branch plus a patch and bundle without claiming remote publication. Never push main or trigger deployment. Reviewers can reject design decisions without needing to unwind backend changes.
