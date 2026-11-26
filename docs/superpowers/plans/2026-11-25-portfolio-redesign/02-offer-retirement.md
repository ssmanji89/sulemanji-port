# Offer Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox tracking.

**Goal:** Retire public workshop admission and direct business inquiries to Viyu while preserving existing obligations.

**Architecture:** Replace public entry pages within the shared Jekyll shell. Add admission control only to the existing intake and deposit-checkout handlers.

**Tech Stack:** Jekyll, Liquid, JavaScript, Python, TypeScript, Hono, Cloudflare Worker, Vitest, disposable D1.

**Spec:** [Portfolio design](../../specs/2026-11-25-portfolio-redesign-design.md).

## Global Constraints

Apply every [program constraint](README.md#global-constraints).
Use `https://viyu.net/contact-support/contact-us/` for business contact.
Treat absent operational evidence as unknown obligations, never as zero obligations.
Keep customer details and operational evidence outside the public repository.
This plan authorizes no live mutation or production release.

## Review Focus

Removing links must also close direct new-admission requests after an authorized Worker release.
Retirement must preserve existing paid-case servicing, callbacks, refunds, administration, workflows, and retention.
Tasks T05 and T06 cover A27–A38 in [the acceptance matrix](ACCEPTANCE_MATRIX.md).

### Task T05: Public routes and existing obligations

**Files:**
- Modify: `work-with-me.md`, `work-with-me-personal.md`, `work-with-me-priority.md`.
- Modify: `work-with-me-quote.md`, `work-with-me-thanks.md`, `work-with-me-terms.md`, `privacy.md`, `affiliate-disclosure.md` where copy requires correction.
- Modify: `_data/discovery-pages.yml` and `_layouts/default.html` for retirement metadata and script loading.
- Reuse: T02's compatibility-redirect hook in `_includes/head-custom.html`.
- Remove: `assets/js/work-with-me.js` after confirming that no retained servicing route consumes it.
- Preserve: `assets/js/work-with-me-quote.js` and its conditional loading for existing quote servicing.
- Test: `scripts/tests/test_offer_retirement.py`; modify retirement assertions in `scripts/verify_work_with_me.py` and `scripts/verify_portfolio_review.py`.
- Create: `docs/redesign/2026-11-25/OFFER-RETIREMENT.md` as the sanitized obligation and release record.
- Update: `docs/redesign/2026-11-25/EXECUTION.md` with task evidence and gate replacements.

**Interfaces:**
- Consumes: T01 source baseline, T02 Contact page, current consent terms, and authorized read-only obligation evidence.
- Produces: retired public entry routes, preserved servicing routes, accurate disclosure, and an explicit release disposition.
- Redirect contract: `redirect_target: /contact/`, `noindex: true`, a shared-head meta refresh, and a visible ordinary Contact link.
- Servicing contract: preserve quote-token handling and existing success URLs without a public offer or discovery promotion.

The shared-shell owner integrates edits to shared templates and discovery data.
Do not concurrently modify those files with another task.
T02 owns the main navigation and Home. T05 verifies their offer removal and requests corrections through that owner.

- [ ] **Step 1: Record obligations and route disposition.**

1. Create the sanitized retirement record with status `unknown`, evidence date, release owner, and required next action.
2. Request or inspect only authorized read-only operational evidence.
3. Account for paid cases, in-flight deposit sessions, unfinished workflows, unused credit, quotes, holds, scheduled sessions, refunds, and disputes.
4. Include pending requests and required retention when determining the final service disposition.
5. Store private evidence in the approved private evidence store.
6. Record only sanitized status and evidence references in Git.

Missing access blocks a verified obligation disposition. It does not block source changes, local tests, or review.
Assign the missing-access gate to Suleman or his designated release operator.
State the exact report or access needed next. Do not query, change, or delete live records without the applicable authority.

Already-created unpaid Stripe Checkout sessions can remain payable after new checkout creation closes.
The release owner must choose whether to honor or expire those sessions under separate authority.
Record that disposition, the cutoff, late-payment handling, and payment races without publishing session identifiers.
Keep webhook handling intact throughout that transition.
Do not declare full purchase retirement until the open-session gate has verified evidence.

Use this route map in the retirement record:

| Route | Initial production-source treatment | Later removal gate |
|---|---|---|
| `/work-with-me` | Compatibility redirect to `/contact/` | None beyond normal release authority |
| `/work-with-me/personal` | Compatibility redirect to `/contact/` | None beyond normal release authority |
| `/work-with-me/priority` | Compatibility redirect to `/contact/` | None beyond normal release authority |
| `/work-with-me/quote` | Preserve private-token quote and balance servicing; remove promotion and discovery | Verified zero-obligation disposition and a separately authorized release |
| `/work-with-me/thanks` | Preserve existing payment return URL; remove new-intake and deposit instructions | Same disposition and release gate |
| `/work-with-me/terms` | Preserve applicable historical terms with a clear retirement notice | Same disposition and release gate |
| `/inventory`, `/ask`, `/grill-me` | No dedicated route exists in the inspected source; record Contact as the compatibility destination | Implement only if current-source reconciliation establishes an alias |

Do not remove operational asset-inventory articles.
Do not rewrite accepted historical terms to describe a new agreement.
Noindex and removal from navigation do not replace existing token checks or authentication.

- [ ] **Step 2: Add failing route and disclosure checks.**

Add `test_retired_entry_routes_lead_to_contact` for all three public entry routes.
Check the rendered destination and the ordinary link with JavaScript disabled.
Add `test_retired_entry_pages_have_no_admission_controls` for forms, prices, deposit actions, intake JavaScript, and Turnstile loading.
Add `test_existing_service_routes_remain_unlisted` for quote, thanks, and terms availability without navigation or sitemap promotion.
Add `test_privacy_preserves_existing_service_disclosures` for accurate retained processing and contact information.
Run the new tests against the current production build. Record the expected old-behavior failures.

- [ ] **Step 3: Implement public retirement and preserved servicing.**

1. Replace the three public entry pages with shared-shell compatibility pages.
2. Use T02's guarded `redirect_target` meta-refresh hook in the existing head include.
3. Limit targets to reviewed local paths and retain a visible Contact link.
4. Mark retired and unlisted servicing pages noindex and remove their discovery entries.
5. Verify that generated sitemap output follows those exclusions.
6. Remove intake script and Turnstile loading after removing their public page flags.
7. Retain quote JavaScript only for the quote page.
8. Change the thanks page to describe existing request or payment processing without claiming unverified payment success.
9. Add a retirement notice above preserved historical terms without changing agreed obligations.
10. Update Privacy and disclosure copy to match the resulting site and retained Worker services.

Keep `work_with_me_api_base` while the quote page requires it.
Keep necessary provider return URLs stable.
Do not remove a service page because the preview redirects it or because the public checkout flag is false.

- [ ] **Step 4: Replace superseded gates and verify the routes.**

Update `verify_work_with_me.py` to require the new route map, direct Viyu contact, and preserved servicing behavior.
Update only retirement-related assertions in `verify_portfolio_review.py`.
Keep landmark, metadata, canonical, local-link, and build-boundary assertions.
Map each removed offer assertion to its replacement in the execution checkpoint.

Run:

```bash
JEKYLL_ENV=production bundle exec jekyll build
python3 -m unittest discover -s scripts/tests -p 'test_offer_retirement.py' -v
python3 scripts/verify_work_with_me.py
python3 scripts/verify_portfolio_review.py
python3 scripts/verify_discovery.py
python3 scripts/verify_public_safety.py
```

Expect successful local checks and no retired-offer promotion in rendered output.
Record A27–A31 separately. Leave the operational release gate unresolved when its evidence remains unavailable.

- [ ] **Step 5: Commit the frontend retirement.**

Commit only the accepted retirement pages, shared integration, tests, and sanitized record.
Record the commit and remaining obligations in `EXECUTION.md`.
Do not merge or deploy this checkpoint.

### Task T06: Worker admission control

**Files:**
- Modify: `worker/src/env.ts`, `worker/src/routes/intakes.ts`, `worker/src/routes/payments.ts`, `worker/wrangler.jsonc`, `worker/README.md`.
- Create: `worker/src/domain/public-offer.ts`, `worker/test/public-offer.test.ts`, `worker/test/quotes.test.ts`.
- Modify: `worker/test/intakes.test.ts` and `worker/test/payments.test.ts` for explicit active-mode fixtures and retirement regressions.
- Test: `worker/test/booking.test.ts`, `worker/test/admin.test.ts`, `worker/test/priority-discovery.test.ts`, `worker/test/retention.test.ts`, `worker/test/readiness.test.ts`.
- Modify: `scripts/verify_priority_discovery_plan.py` only to reconcile the retirement contract with existing configuration checks.
- Update: `docs/redesign/2026-11-25/OFFER-RETIREMENT.md` and `docs/redesign/2026-11-25/EXECUTION.md`.
- Preserve: `worker/src/routes/quotes.ts`, Worker migrations, payment integrations, repository state rules, and scheduled-service ownership unless a demonstrated defect requires review.

**Interfaces:**
- Consumes: T05 obligation record, existing route factories, current D1 states, and existing Stripe and Calendar dependency factories.
- Produces: fail-closed public admission and verified continuation of eligible existing services.
- Environment: `PUBLIC_OFFER_MODE?: "active" | "retired" | string`.
- Helper: `publicOfferIsActive(env)` returns true only when `env.PUBLIC_OFFER_MODE === "active"`.
- Response: HTTP 410 JSON `{ "error": "offer_retired", "contactUrl": "https://viyu.net/contact-support/contact-us/" }`.
- Ordering: existing Origin check, then admission check, then the existing active handler.

The helper and response constant belong in `worker/src/domain/public-offer.ts`.
Do not infer admission from `SERVICE_MODE`, a website flag, request data, payment configuration, or provider readiness.

- [ ] **Step 1: Add failing admission tests with observable effects.**

Use Hono requests against `createIntakeRoutes()` and `createPaymentRoutes()` for isolated admission tests.
Use the existing `stripeFactory` dependency for payment spies.
Pass a throwing D1 stub so any database access fails the retired-path test.
Pass a Request whose body-read methods throw. Assert that those methods remain uncalled and its body remains unused.
Use zero-call spies for provider fetches, Stripe factories, workflow bindings, and other exposed effect seams.

Cover this matrix for both new-admission endpoints:

| Condition | Required result |
|---|---|
| Valid Origin; mode `retired` | Exact 410 JSON contract; no body or dependency use |
| Valid Origin; missing, empty, unknown, or differently cased mode | Same retired result |
| Valid Origin; malformed, oversized, or forged request body while retired | Same retired result before body parsing |
| Missing or foreign Origin, including retired mode | Existing 403 `forbidden_origin`; no side effects |
| Direct deposit URL with arbitrary or existing case token while retired | Same 410 without database reads or counter reservation |
| Request body, query, or header claims mode `active` | Server environment still controls admission |
| Explicit server mode `active` | Existing intake validation and deposit eligibility remain effective |

Run the new retirement tests before implementation. Record expected failures against the current unguarded handlers.

- [ ] **Step 2: Implement the narrow admission boundary.**

1. Add the optional environment field and the strict helper.
2. Add the retired response immediately after the existing Origin check in `POST /v1/intakes`.
3. Add the same response after the Origin check in `POST /v1/cases/:token/deposit-checkout`.
4. Keep body parsing, repository construction, counter reservation, and provider calls below those checks.
5. Set source configuration `PUBLIC_OFFER_MODE` to `retired` in `worker/wrangler.jsonc`.
6. Keep existing service mode, cron triggers, bindings, and lifecycle configuration unchanged.

Do not add a global `/v1/*` retirement guard.
Do not gate Stripe webhooks, quote reads, quote holds, balance checkout, case reads, administration, workflow execution, or retention.
Do not change schemas, run remote migrations, or invoke provider operations during implementation.

- [ ] **Step 3: Prove existing obligations remain serviceable.**

Set active-mode fixtures explicitly in existing tests that exercise new intake or deposit creation.
Restore environment overrides after each test to prevent order-dependent results.
Keep retired mode in existing-obligation fixtures.

Use disposable D1 with existing migrations for `worker/test/quotes.test.ts`.
Mount `createQuoteRoutes()` with the existing fake Calendar and Stripe factories.
Create a paid-case quote through the current repository lifecycle, including its valid credit and future expiry.
Verify that a valid `priority_scheduling` case can obtain a hold and balance checkout while retired.
Verify rejection for expired quotes, missing tokens, `checkout_pending`, and other ineligible states from the current state model.
Verify the quote route's existing Origin check and provider behavior on rejection.

Run Stripe webhook and refund tests in retired mode, including duplicate events and in-flight deposit completion.
Preserve existing idempotence and invalid-payment handling.
Run existing case-read, administration, workflow, booking, readiness, and retention regressions.
The offer mode must not stop scheduled service work or reopen an ineligible case.

- [ ] **Step 4: Record deployment order and rollback without executing them.**

Update the Worker README and sanitized retirement record with the exact candidate revision and configuration contract.
State that `SERVICE_MODE` governs scheduled service readiness and `PUBLIC_OFFER_MODE` governs only new admission.
Keep historical discovery specifications as history. Update the configuration gate instead of rewriting historical commercial promises.

Record this sequence for a separately authorized release owner:

1. Review outstanding obligations and already-created unpaid checkout sessions using authorized read-only evidence.
2. Confirm servicing, webhook, refund, and retention paths remain available.
3. Deploy the qualified Worker revision with `PUBLIC_OFFER_MODE=retired` under explicit release authority.
4. Verify the exact retirement responses and unchanged origin rejection without creating records or provider actions.
5. Release the qualified site with public entry redirects and preserved servicing routes.
6. Verify deployed revisions, main routes, Viyu contact, and existing-service availability.
7. Record obligation closure before proposing any later removal of servicing routes or infrastructure.

Apply the approved open-session disposition at the release owner's chosen transition point.
Recheck late payment events and session state after the transition.
Honor existing webhook and refund rules during payment races. Do not silently discard a valid payment callback.

Rollback must preserve closed admission.
Record a tested Worker candidate containing the retirement guard as the rollback target.
Do not restore an older unguarded Worker or set mode active as an automatic rollback.
A site rollback must keep public intake entry points retired or include the retirement patch.
Any reopening, deletion, refund action, external message, or live configuration change requires its separate authority.

- [ ] **Step 5: Verify and commit Worker retirement.**

Run:

```bash
npm run test --prefix worker -- test/public-offer.test.ts test/intakes.test.ts test/payments.test.ts test/quotes.test.ts
npm run check --prefix worker
python3 scripts/verify_priority_discovery_plan.py
python3 scripts/verify_work_with_me.py
```

Expect the retirement matrix and existing-service regressions to pass with no real provider calls.
Record A32–A38, the candidate SHA, command results, and remaining release gates.
Commit the Worker source, tests, configuration, and runbook after review.
Do not claim live retirement from local tests or source configuration alone.
