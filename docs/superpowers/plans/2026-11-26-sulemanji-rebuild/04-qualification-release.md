# Qualification and release implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax.

**Goal:** Verify the complete visitor experience and release one operating site and publisher on Cloudflare.

**Architecture:** Qualify the actual built site, isolated background runtime, private knowledge boundary, and single-writer transition. Release exact verified revisions and observe their public and scheduled behavior.

**Tech Stack:** Existing site tests, Playwright, Cloudflare deployment tools, public HTTP verification, and the established private operator environment.

**Spec:** [Complete design](../../specs/2026-11-26-sulemanji-rebuild-design.md), [experience](../../specs/2026-11-26-sulemanji-experience.md), and [maintenance](../../specs/2026-11-26-sulemanji-maintenance.md).

## Global constraints

- Preserve dirty work, current articles, source history, and active owners.
- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the publication dates and URLs of eligible articles.
- Maintain WCAG 2.2 AA as the accessibility target.
- Support no-JavaScript reading, navigation, and core discovery.
- Keep inference outside the visitor request path.
- Use one active production publisher.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.
- Keep the last verified public site available when background work fails.

Complete means the redesigned site is live on the intended Cloudflare host and the bounded maintenance system operates with evidence.
An open PR, a clean build, or a deployed Worker alone is not completion.

## Review focus

| Condition | Expected result | Test owner |
|---|---|---|
| Technical tests pass while the copy still feels generic or sales-dominated. | Fail product acceptance and revise the actual pages. | T12 |
| A preview has no real long article or substantive project. | Require representative real material before review. | T12 |
| The old publisher has an in-flight article. | Preserve its identity, review history, and ownership before transfer. | T13 |
| Cloudflare deployment succeeds but the custom domain serves an old origin. | Report deployment incomplete until public readback matches. | T13 |
| A background process runs but publishes nothing useful. | Accept justified no-change; distinguish it from failure or unimplemented capability. | T13 |

### Task T12: Product and engineering qualification

**Files**

- Extend: tests/browser/journeys.spec.ts, accessibility.spec.ts, explore.spec.ts.
- Create: tests/browser/reading.spec.ts, tests/browser/release.spec.ts.
- Create: scripts/verify_redevelopment.py, scripts/tests/test_redevelopment_acceptance.py.
- Update: docs/redevelopment/2026-11-26/EXECUTION.md, CONTENT_DISPOSITIONS.md, DEPLOYMENT.md, OPERATIONS.md.
- Create: docs/redevelopment/2026-11-26/PRODUCT_REVIEW.md using sanitized observations.

**Interfaces**

- Consumes: exact current source, built artifact, acceptance matrix, runtime receipts, and content baseline.
- Produces: a release-candidate identity and acceptance record.
- Produces: scripts/verify_redevelopment.py --site _site --baseline BASELINE_PATH.
- Produces: a concrete owner review of the full running preview.

- [ ] **Step 1: Write remaining integrated failure cases.**

Add an article merged after the initial baseline.
Add nested article markup, a noncommercial relation, a historical project, and a missing optional demonstration.
Assert preserved article identity, useful source links, readable fallback, and no duplicate main landmark.
Add tests that reject public operational files and missing required acceptance evidence.
Pin any newly observed bug with a failing behavioral test.

- [ ] **Step 2: Run the new integrated checks.**

Run: python3 -m unittest scripts.tests.test_redevelopment_acceptance -v
Expected: FAIL for any absent integrated acceptance behavior.
Run: npm run test:browser
Expected: failures identify real remaining experience defects.

- [ ] **Step 3: Resolve product and engineering defects.**

Run all six journeys using current real content.
Inspect Home, Explore, Writing, a long article, a tool, a project family, an experiment, About/Career, and Contact.
Check 320px, 390px, 768px, and 1440px layouts, both themes, keyboard, no JavaScript, reduced motion, and 200% zoom.
Check titles, actual copy, evidence placement, whitespace, figure legibility, and contact relevance.
Compare the key experiences with the strongest existing GitHub or package destination.

Use measured asset and loading data to correct concrete performance problems.
Target no unnecessary global script, no request-time inference, and no large initial demo download.
Use lazy media with explicit dimensions and a useful static poster.
Record lab measurements as lab measurements.
Do not invent field Core Web Vitals.

Present the complete preview for owner product review.
Record whether the copy reflects the owner's actual work and interests.
If independent readers are available, record their observed understanding and confusion.
Do not call agent simulations user research.
Continue unaffected engineering while a product decision is pending.

- [ ] **Step 4: Verify the final release candidate.**

Run: bash scripts/check_site_release.sh
Expected: PASS.
Run: npm --prefix cloudflare run check
Expected: PASS.
Run: npm run test:browser
Expected: PASS.
Run: python3 scripts/verify_redevelopment.py --site _site --baseline BASELINE_PATH
Expected: PASS with the full current article set and required surfaces.

Use Superpowers requesting-code-review for a fresh whole-branch review.
Give the reviewer the spec, all plans, exact diff range, acceptance evidence, and ledger rulings.
Check neighboring code and actual user effects, not only changed lines.
Apply the Executing Plans severity and fix procedure.
Use verification-before-completion before claiming qualification.

- [ ] **Step 5: Commit the qualified candidate.**

Commit message: test: qualify complete site experience and adaptive operation.
Open or update the real implementation PRs.
Keep source, tests, review, staging, and production states separate.

### Task T13: Production cutover and observed operation

**Files**

- Create: scripts/verify_cloudflare_live.py, scripts/tests/test_cloudflare_live.py.
- Create: docs/redevelopment/2026-11-26/RELEASE.md.
- Update: DEPLOYMENT.md, OPERATIONS.md, and EXECUTION.md.
- Use private operational records for account, DNS, credentials, publisher leases, and memory integration.

**Interfaces**

- Consumes: accepted preview, qualified source, real account capabilities, current publishing authority, and the concrete activation record.
- Produces: verify_cloudflare_live.py --base-url URL --expected-commit SHA --manifest PATH.
- Produces: a release receipt covering source, deployed version, public behavior, one active writer, and two natural schedule runs.

- [ ] **Step 1: Write cutover and public readback cases.**

Create test_wrong_origin_fails, test_wrong_revision_fails, test_missing_writing_entry_fails, test_retired_admission_stays_closed, and test_two_writer_state_blocks_activation.
Test recovery where code rollback succeeds but content or D1 state still requires repair.
Assert the verification script cannot report success from a homepage 200 alone.

- [ ] **Step 2: Run the cutover checks before activation.**

Run: python3 -m unittest scripts.tests.test_cloudflare_live -v
Expected: new live-contract tests FAIL before the verifier is implemented.
Implement the verifier and rerun the same command.
Expected: PASS.

- [ ] **Step 3: Prepare the concrete activation record.**

Read current Cloudflare account, zone, resource capability, DNS records, and certificate state.
Confirm the current model provider, exact model IDs, prices, and secrets.
Confirm the proposed cadence and USD 30 model plus USD 10 incremental Cloudflare monthly envelopes.
Confirm current standing publication authority.
Locate the old scheduler, installed publisher, in-flight work, and locks.
Prepare exact pause, transfer, deploy, domain, verify, and rollback commands.
Keep the current Pages origin available until cutover succeeds.

Use authority already present in the execution session.
If a material new decision remains, present this record and ask once for that specific decision.
Do not ask again for routine article publication.
Do not make Stripe or the retired workshop's credentials prerequisites.

- [ ] **Step 4: Transfer ownership and deploy the qualified site.**

Pause the old scheduler.
Reconcile any in-flight article and preserve its state.
Merge the reviewed implementation PRs under the session's existing release authority.
Fetch the resulting main revision and preserve every intervening article.
Build and verify the exact resulting main artifact with the T06 gates.
Repeat affected product, browser, and independent review checks when integration changes the qualified content.
Bind the deployment receipt and live verifier to that final main SHA and artifact digest.
Hold deployment if a later main revision invalidates that identity.
Create the new publisher owner epoch.
Prove the old writer cannot act before enabling the new writer.
Deploy the exact qualified static artifact and editorial code to their intended resources.
Apply the accepted DNS and certificate transition.
Switch the explicit deployment target from Pages to Cloudflare.
Do not point two independent publishers at main.

- [ ] **Step 5: Verify actual public behavior and recovery.**

Run: python3 scripts/verify_cloudflare_live.py --base-url https://www.sulemanji.com --expected-commit RELEASE_SHA --manifest MANIFEST_PATH
Expected: PASS for the deployed revision and complete route/discovery matrix.
Run the six visitor journeys on the live host.
Verify apex and canonical redirects, /writing, work and article paths, feed, sitemap, robots, social imagery, and retired routes.
Exercise the qualified recovery procedure in staging.
Record distinct code/assets, source/content, and D1 recovery steps.
Do not perform a destructive production restore merely to prove a test.

Send an authorized sanitized derivative through the real private producer to the production editorial importer.
Verify its exact durable receipt and availability to the production maintenance workflow.
Record current authority expiry, the actual renewal owner, and a later authorized renewal receipt.
Keep these private receipts separate from public-source schedule outcomes and staging tests.
Production knowledge integration is incomplete until these observations exist.

- [ ] **Step 6: Observe natural background operation.**

Enable the qualified schedule under the new owner epoch.
Observe two natural eligible schedule runs.
Use durable checkpoints and the existing supervisor to resume observation without busy polling.
Each run must produce a real receipt and an explainable outcome.
NO_CHANGE is valid when nothing useful qualifies.
A staged update proves the update path; do not label it a production publication.
If a real qualified publication occurs, verify its exact public identity.
Do not generate filler to satisfy the observation requirement.

- [ ] **Step 7: Record the production result.**

Commit message: docs: record verified Cloudflare release and publisher ownership.
Keep private operational evidence outside public history.
Report design acceptance, implementation, tests, review, merge, deployment, public verification, and scheduled operation separately.
List rulings and deferred minor findings from Executing Plans.
Only complete the Goal when its production evidence exists.
If the sole remaining action needs external authority, checkpoint it with its owner and exact next action.
