# Portfolio internal review — 2026-09-09

The `review/cohesive-portfolio` branch implements the editorial portfolio and scenario-based contact design. It is ready for a human appearance and buyer-comprehension review; visual acceptance is outstanding. No merge, deployment, workflow run, live intake submission or outreach was performed.

## Review scope and deliberate choices

- One shared shell, warm paper/slate palette, serif headings, readable inner pages, compact homepage, real portrait, selected evidence and personal interests. The editorial direction follows the latest internal-review instruction; choosing a different direction means a reversible presentation revision.
- Organizational, professional and personal conversation routes. The published email remains the direct contact channel; business delivery is through Viyu Network Solutions. Personal intake moved to `/work-with-me/personal`, retaining payload fields, terms, CAPTCHA and backend contracts. Future routing choices remain open.
- About/Experience chronology distinguishes earlier engineering practice from later agent assistance. Projects and existing cases have concise opening summaries.
- Microsoft 365 acquisition integration and RFMS operations are **practice notes**, not completed customer case studies. They explain scope, dependencies and validation questions without unsupported outcomes. Evidence work in #12–14 remains open; no engagement count, new customer result or attribution is asserted.
- Shared metadata names Suleman Manji, Sr. Services Engineer at Viyu Network Solutions. Every reviewed route has its own title, description and canonical. One Person definition uses `https://www.sulemanji.com/#person`; only About adds ProfilePage referencing that Person. Jekyll SEO retains page metadata. Its author defaults stay unset because the installed version cannot reference this Person ID. The actual 201 × 200 portrait supplies social previews and the previously missing favicon; new artwork can follow a later choice.
- The local review helper serves the real build and disables network intake and framed widgets with review-only CSP. This supports manual review despite the cloud-browser access limit. Production form output and routing are unchanged. Worker source and dependencies are now explicitly excluded from Jekyll output: the previous broad exclusion failed to cover nested dependencies after installation.

## Build and open the review

From the repository root, use Ruby 3.3.6, which was validated in the temporary review environment. The repository workflow still uses Ruby 3.1 and was not changed. Although the lockfile records Bundler 1.17.2, this review build uses Bundler 2.5.22 explicitly without changing the lockfile or dependencies:

```sh
gem install bundler -v 2.5.22 --no-document
BUNDLE_VERSION=2.5.22 BUNDLE_FROZEN=true bundle _2.5.22_ install
BUNDLE_VERSION=2.5.22 BUNDLE_FROZEN=true JEKYLL_ENV=production bundle _2.5.22_ exec jekyll build
python3 scripts/verify_public_safety.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/verify_work_with_me.py
python3 scripts/verify_priority_discovery_plan.py
python3 scripts/verify_portfolio_review.py
python3 scripts/serve_portfolio_review.py --port 4000
```

Open `http://127.0.0.1:4000/` in a local browser. Stop the server with Ctrl-C. The helper requires Python 3.9+ and binds only to 127.0.0.1. It resolves extensionless routes to `.html` or directory `index.html`, serves static assets, and returns 404 for missing paths. Every response has `connect-src 'none'; form-action 'none'; frame-src 'none'`; intake requests and CAPTCHA frames will therefore be blocked during review. External references may be inspected. Do not make live submissions or send contact messages during acceptance; mailto links open a real mail application. External stylesheet/script assets already present in the site can still load; this is an intake-blocking review server, not an offline mirror.

The prepared session runtime used this prefix for the build command:

```sh
PATH=/workspace/scratch/c22d3c687600/ruby-runtime/bin:$PATH BUNDLE_VERSION=2.5.22 BUNDLE_FROZEN=true JEKYLL_ENV=production bundle _2.5.22_ exec jekyll build
```

## Verification evidence and limits

- Real production-mode Jekyll build: passed. Existing warnings concern future Ruby csv/bigdecimal packaging and optional Faraday retry middleware. No runtime dependency changes were made.
- All five Python gates above: passed. The new gate parses HTML and JSON-LD on 17 representative routes, checks unique landmarks and metadata, Person/ProfilePage identity, portrait metadata, local links/fragments/assets, form separation and absence of Worker output. Negative fixtures for a missing canonical, malformed JSON-LD, broken fragment and an injected root form each fail by name.
- Local HTTP using the actual review-server handler: 17 pages and six CSS/JS/image assets returned 200. Missing, Worker and parent-traversal paths returned 404. Every checked response carried the review CSP. The rebuilt site is 5.4 MB and contains no Worker directory.
- JSDOM with actual rendered homepage and production scripts: menu toggle, Escape/focus restoration, link close, wide-resize cleanup, theme persistence, blocked storage and no-JS markup passed. This is DOM/logic evidence, not browser layout, paint or assistive-technology evidence.
- Task 2's synthetic serializer checks covered all 12 payload fields across three categories and two paths, including validation and CAPTCHA callbacks, without requests. The coordinator's unchanged Worker check passed TypeScript and 126 tests in 16 files; existing Stripe sourcemap warnings remain.
- Screenshot location: **none**. Cloud browser policy blocks localhost and shared-file URLs. No bypass was attempted and no desktop/mobile viewport was visually inspected. Manual keyboard, reflow, theme, reduced-motion and no-JS acceptance remain outstanding.

## Human acceptance checklist

Review home, About, Experience, Projects, both existing cases, both practice notes, Beyond Work, Resume and contact subpages at 320, 390, 768, 1024 and 1440 px. Capture screenshots locally when reviewing; do not treat automated assertions as appearance approval.

- Can a first-time visitor identify Suleman, his actual role and an appropriate next action from the initial screen?
- Does the work read as experienced engineering judgment? Are earlier experience, current agent assistance, completed cases and practice notes distinguishable?
- Can an organizational buyer identify Suleman as the contact and Viyu as the delivery organization? Can a professional collaborator find the direct route without mistaking it for personal workshop intake?
- Is text readable in both themes with no page-level horizontal overflow? Check long links, code, tables, navigation and form fields. Check persisted and invalid stored theme values, plus denied storage.
- Using the keyboard, inspect skip-link visibility, focus order, focus styling, menu Escape return, link close and resize behavior. Ensure closed links cannot receive focus. With JavaScript disabled, confirm navigation and essential content remain available. With reduced motion enabled, confirm essential content remains visible.
- Inspect portrait/social-preview suitability and decide whether different artwork or contact routing would improve comprehension. No search, conversion or inquiry outcome has been measured.

## Review and rollback

All three task reviews passed both specification and quality checks. The whole-implementation review of `c9bcace..86a641d` found no critical or important issue. Its small Projects metadata selector mismatch was corrected in `5c4a2b6`; a scoped recheck confirmed the correction and found no new issue. The final CSS build and selector check covered all 26 project metadata labels. The review conclusion is **ready for internal review**; browser appearance and interaction acceptance remain outstanding.

The local implementation history is `de5fdd4` (shared design), `d1451ec` (content and contact routing), `7153b83` (metadata and review tooling), `86a641d` (portable setup instructions), and `5c4a2b6` (metadata typography). A remote review snapshot may consolidate these local commits; the publication must contain the same validated source tree.

Rollback is the entire review change set. If adopted through GitHub, revert the merged PR as one unit, including shared templates, styles, intake relocation, front matter, metadata and verifiers. Do not revert individual presentation commits in isolation from their content consumers. Worker code, schemas, checkout flag and production workflow were not changed. Keep the public-claims evidence boundary even if presentation is revised. No main push, merge or production publication is part of this handoff.
