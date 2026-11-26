# Qualification and Release Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox tracking.

**Goal:** Qualify the integrated redesign and deliver a reviewed implementation PR with exact remaining release actions.

**Architecture:** Verify the canonical Jekyll output and existing Worker together. Preserve current publishing ownership and separate engineering completion from public release.

**Tech Stack:** Jekyll, Liquid, Ruby, Python, TypeScript, Vitest, browser inspection, GitHub.

**Spec:** [Portfolio design](../../specs/2026-11-25-portfolio-redesign-design.md).

## Global Constraints

Apply every [program constraint](README.md#global-constraints).
Use current article eligibility and current main, not the frozen preview's article count.
Keep private evidence outside this public repository.
Do not merge, push to main, deploy, change live configuration, send messages, or mutate live service data.

## Review Focus

Inspect later article merges, obsolete assertions, generated public files, browser failure modes, and mismatched review revisions.
Tasks T07 and T08 own A39–A48.
The private-preview receipts remain reference observations. They do not qualify the canonical implementation.

### Task T07: Integrated qualification

**Files:**
- Modify: `scripts/tests/test_redesign.py`, `scripts/tests/test_public_safety.py`, and affected existing discovery or Writing tests.
- Modify: `scripts/verify_portfolio_review.py`, `scripts/verify_discovery.py`, `scripts/verify_public_safety.py`, and the existing offer-related gates where their assertions require replacement.
- Modify: `.github/workflows/jekyll.yml` only when the reviewed gate transition requires a command change.
- Create: `docs/redesign/2026-11-25/QUALIFICATION.md` and a sanitized evidence manifest beside it.
- Read: T01 baseline, T03 disclosure review, T04 catalog tests, T05 obligation disposition, and T06 Worker receipts.

**Interfaces:**
- Consumes: the integrated implementation revision, `REDESIGN_BASELINE_SHA`, current eligible article manifest, route decisions, and Worker retirement contract.
- Produces: an exact-revision qualification report for A39–A43, a working implementation preview, and explicit unresolved release gates.
- Every receipt records its command or browser action, source SHA, environment, observed result, and evidence location.

- [ ] **Step 1: Pin the integrated candidate and add regression cases.**

Record the candidate SHA and refresh main without replacing another owner's work.
Compare eligible article URLs, dates, and source hashes with T01 and all later accepted article changes.
Add `test_integrated_catalog_preserves_later_article` and `test_production_discovery_excludes_retired_routes` in `scripts/tests/test_redesign.py`.
Add `test_public_output_excludes_reference_docs_and_resume_pdfs` for the explicit exclusions in the design.
The test must inspect `_site`, not only navigation links or source configuration.
Observe a meaningful failing case for any missing protection before correcting it.
Record A42 evidence when current eligible articles remain intact and discoverable.
Confirm no unexplained loss of other owners' work.

- [ ] **Step 2: Reconcile the existing gates without weakening their useful checks.**

Map each changed assertion to retained behavior or its explicit replacement.
Replace required workshop promotion, mandatory personal routing, and old fixed navigation assertions with the accepted redesign behavior.
Keep checks for content safety, stable identity, metadata, Writing visibility, service integrity, and output exclusions.
Do not delete a verifier, skip a suite, or add an unconditional success return to obtain a passing build.
If a gate is renamed, update its workflow reference and document the replacement coverage.
Check that pull requests validate and that only the existing authorized main workflow can publish.
Complete A40 with the gate-transition record and passing meaningful tests.

- [ ] **Step 3: Run the canonical integrated checks.**

Use current source and the commands recorded in [SOURCE_LEDGER.md](SOURCE_LEDGER.md#validation-commands).
The inspected workflow supplies this command sequence:

```bash
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
git diff --check
```

Use the reconciled replacement command where Step 2 intentionally renames a gate.
Use dependency versions and setup declared by current source. Record unavailable prerequisites instead of claiming a test passes.
Review generated image changes before committing them. Preserve existing article bytes and commercial-link attributes.
Do not run `worker` deployment, remote migration, payment setup, OAuth setup, or live job commands.
Complete A39 only when all checks pass at one implementation revision.
Include the clean production build and current Ruby, Python, and Worker checks.

- [ ] **Step 4: Inspect the generated production surface.**

Check Home, Work, all six cases, Writing, About, Contact, retained practice notes, career pages, and compatibility routes.
Check original eligible article URLs and preserved metadata against the current manifest.
Check feed, sitemap, canonical URLs, social images, robots behavior, and the single stable Person identity.
Ensure production discovery does not inherit the private preview's noindex or deny-all robots settings.
Keep retired promotion out of navigation and discovery while retaining obligation-dependent servicing routes.
Confirm both legacy résumé PDFs are absent from `_site` and have no public links.
Confirm documentation, reference HTML, task records, scripts, Worker source, dependencies, and private evidence are absent from output.
Extend the verifier when a newly introduced public path is outside its coverage.
Complete A41 with exact output paths and observed results.

- [ ] **Step 5: Verify the canonical browser experience.**

Use a local or authorized private implementation preview built from the candidate revision.
Check desktop, 320 CSS pixels, and 200% zoom.
Disable JavaScript and confirm navigation, all eligible articles, case content, and contact links remain available.
With JavaScript enabled, check keyboard operation, Escape, visible focus, filter combinations, reset, empty results, and URL-state restoration.
Check reduced motion, image alternatives, semantic headings, menu state, result announcements, and scrollable tables and diagrams.
Check the video controls and its text description.
Record any horizontal document overflow or unreachable control as a defect.
Check the exact Viyu destination without submitting a message.
Record the browser portion of A43 with observations and sanitized screenshots.

- [ ] **Step 6: Measure performance under consistent conditions.**

Measure the T01 baseline and candidate through the same browser, viewport, cache policy, and network profile.
Select representative changed routes by asset weight, catalog behavior, and media changes.
Record three consistent samples per selected route and revision. Retain individual measurements and medians.
Add measurements only to investigate an observed regression.
Record transferred bytes, request counts, largest-contentful-paint timing, layout shift, and failed resource requests when the browser exposes them.
Mark unavailable metrics as unavailable. Do not substitute a guessed score or preview measurement.
Inspect lazy loading, font behavior, unnecessary scripts, and video preload when the candidate regresses.
Resolve avoidable regressions caused by this change. Record remaining differences and their causes for review.
Do not claim field performance from a local measurement.
Complete A43 with passing browser checks, reproducible settings, and measured baseline-versus-candidate results.

- [ ] **Step 7: Commit the qualified integration.**

Commit corrected implementation and tests, then rerun affected checks on the resulting revision.
Run the relevant complete suites at this integration boundary.
Record A39–A43 in the checkpoint with evidence tied to the committed candidate.
Keep unavailable obligation or live-state evidence as a release gate, not a fabricated passing result.

### Task T08: Reviewed release handoff

**Files:**
- Create: `docs/redesign/2026-11-25/REVIEW.md` and `docs/redesign/2026-11-25/RELEASE.md`.
- Modify: `docs/redesign/2026-11-25/EXECUTION.md` and qualification receipts after relevant corrections.
- Modify: implementation files only for review findings or current-main integration.
- External artifact: one real implementation PR against `main`, with the exact tested head and remaining release actions.

**Interfaces:**
- Consumes: T07 candidate, evidence manifest, current ownership, obligation disposition, and release dependencies.
- Produces: independent review, corrected exact-head evidence, implementation PR, release and rollback runbook, and finite engineering status.
- Report states separately: package published, Goal acknowledged, source implemented, tests passed, review passed, PR open, merged, production verified.

- [ ] **Step 1: Obtain independent review of the candidate revision.**

Use Superpowers requesting-code-review with the exact diff, design, acceptance matrix, and qualification receipts.
The reviewer inspects the complete changed professional disclosure and public build boundary.
The reviewer also checks Writing continuity, offer retirement, existing paid-case servicing, browser behavior, and release sequencing.
Record reviewer identity or session, reviewed SHA, findings, severity, and disposition.
Do not treat the author's checklist or a prior preview review as independent review.
Record A44 review evidence for the actual candidate. Complete its finding resolution in Step 2.

- [ ] **Step 2: Resolve material findings and verify the new revision.**

Fix reproducible correctness, disclosure, accessibility, service-integrity, and release defects.
Add a targeted regression case where the defect can recur.
Run affected checks and obtain independent review of the corrected changes.
Invalidate any receipt whose source or scope no longer matches.
Keep non-blocking findings explicit with a disposition. Do not silently expand into unrelated cleanup.
Complete A44 when material findings receive fixes and independent targeted rechecks at the current candidate.

- [ ] **Step 3: Reconcile current main and publish the implementation PR.**

Fetch main again and inspect new articles, policy changes, shared files, and active PR ownership.
Integrate relevant upstream changes in the isolated release worktree without resetting another owner's work.
Repeat continuity, affected tests, and independent review when the integration changes the candidate.
Refresh A42 evidence after this final reconciliation.
Push the owned release branch and create or update the real implementation PR against main.
Read back the PR's base, head, changed paths, checks, and draft or review state.
Use a problem-first description with behavior changes, evidence, known limits, and release dependencies.
Do not merge or push to main. A main update can publish the site.
Complete A45 only when final verification applies to the actual implementation PR head.
Complete A46 when the real PR records required evidence and its working preview represents the same source.

- [ ] **Step 4: Prepare the release and rollback runbook.**

Name the release owner and separate Pages publication from Worker publication.
Record the candidate SHA, prior known release identifiers, configuration differences, route changes, and required evidence.
Use T05's obligation disposition to identify servicing paths that must remain available.
Include already-created hosted checkout sessions and the owner's honor-or-expire decision.
Preserve late-payment callbacks and specify how newly paid obligations receive service or an authorized refund decision.
Specify the later authorized Worker admission-control change and the later authorized site publication in their actual dependency order.
Keep missing or unknown `PUBLIC_OFFER_MODE` retired. Do not reopen intake as an incidental rollback effect.
Describe how the release owner restores the prior presentation or Worker artifact while preserving paid-case state and retirement intent.
Do not use database deletion, history rewriting, or customer-record reversal as rollback.
List post-release checks for deployed revisions, main routes, current Writing, Viyu contact, new-admission denial, and retained servicing.
State the exact condition that requires rollback or a release stop.
Complete A47 with reviewable commands and owner actions. Execute none of the live release steps in this handoff run.

- [ ] **Step 5: Finish the engineering handoff with truthful states.**

Return the actual implementation PR, branch, base and head SHAs, passing commands, browser evidence, and independent review status.
List each remaining release gate with its owner, missing evidence, and next action.
Report merge and production verification as pending unless directly observed under separate authority.
Do not infer local Goal acknowledgment from publication of the planning package.
Complete the engineering Goal when all authorized source, test, review, preview, and PR deliverables exist.
Use the host's native status action when available. Do not invent a command or claim an unobserved state change.
Use blocked only when an essential engineering dependency has no authorized path and no independent task can continue.
Leave a resumable checkpoint. Do not create repeated continuations while only external release decisions remain.
Complete A48 with the separate state report and finite completion or precise blocker.
