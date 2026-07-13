# Workshop Intake Archetypes Design

**Date:** 2026-07-13
**Repo:** `ssmanji89/sulemanji-port`
**Branch:** `feature/workshop-intake-archetypes-spec`

## Summary

Extend the existing portfolio-native AI Workflow Services flow with a small set
of "starting point" categories on `/work-with-me`.

The goal is to make the offer feel broader than "Claude/Codex office hours"
while still staying precise: individuals, founders, and owner-operators can
bring a messy workflow, codebase, operations process, or personal automation
problem and get routed into a better discovery path.

This is not a new product line, separate landing page, public pricing ladder, or
expanded checkout launch. It is an intake and positioning improvement inside the
current `www.sulemanji.com` deliverable.

## Goals

- Help visitors recognize themselves in the offer faster.
- Capture a lightweight category signal at intake time.
- Use that category to tailor the agent-driven Gmail discovery thread.
- Surface the category in admin review so cases can be triaged quickly.
- Keep all copy non-promissory, privacy-aware, and aligned with the existing
  high-liability exclusions.
- Preserve the current normal queue, optional deposit, blueprint, private quote,
  and scheduling flow.

## Non-Goals

- Do not create separate public workshop pages.
- Do not publish session pricing.
- Do not enable live checkout if the config gate is still off.
- Do not accept attachments at launch.
- Do not ask users for credentials, private source code, customer data, or
  sensitive third-party records.
- Do not offer regulated advice, employment surveillance, high-impact decisions,
  credential handling, or sensitive-data processing workflows.
- Do not expose internal implementation details of Viyu, customer systems, or
  private tooling.

## Visitor Categories

The public page presents these as starting points, not rigid packages.

### GitHub / Codebase Review

For people with a repo, half-built tool, agent scaffold, broken automation, or
unclear engineering path. The page should frame this as help turning a codebase
or technical idea into a clearer map, risk list, and next build slice.

The intake must tell users to provide only sanitized links and high-level
context. Private repo access, credentials, logs with secrets, and proprietary
customer data are out of scope for launch intake.

### AI Business Operations

For founders, independent operators, and professionals trying to automate messy
recurring work across email, documents, spreadsheets, tickets, forms, CRM-like
tools, or other business systems.

The page should emphasize workflow mapping, human approval points, handoff
clarity, evidence capture, and first practical automation opportunities.

### Home + Personal Automation

For household, personal admin, life-operations, inbox/calendar, file
organization, or lightweight personal productivity automation. This category
should feel legitimate without implying risky automation of locks, security
systems, finance, medical, legal, or other sensitive domains.

The page should keep the language grounded: recurring personal work, not
surveillance or unsafe unattended control.

### Not Sure / Other

For visitors who know the work is messy but do not know how to classify it.
This keeps the form welcoming and prevents the category selector from becoming a
false gate.

The discovery flow can use the generic messy-work triage path for this category.

## Public Page Design

`/work-with-me` remains the single public entry point. Add a compact section
near the intake form that asks the visitor to choose the closest starting point.

Recommended copy pattern:

> Pick the closest starting point. It just helps me ask better first questions.

Each category should be one short card or radio option with:

- a plain-language label;
- one sentence describing the problem shape; and
- no tool/vendor promises.

The selector should default to `not_sure_other` only if the user does not choose
another option. It should not block submission unless the existing form pattern
already requires every radio group.

The form still offers the current normal review queue and priority discovery
deposit path. The category signal informs discovery; it does not change public
pricing, public guarantees, or checkout availability.

## Frontend Data Contract

Add one submitted field:

```json
{
  "workshopCategory": "github_codebase_review"
}
```

Allowed values:

- `github_codebase_review`
- `ai_business_operations`
- `home_personal_automation`
- `not_sure_other`

The JavaScript that submits `/work-with-me` must serialize this field along with
the existing intake payload. The confirmation page and priority deposit page do
not need category-specific copy for the first implementation slice.

## Backend Data Contract

The Worker intake schema accepts `workshopCategory` as an optional string enum.
If the field is missing, malformed, or blank, the backend normalizes it to
`not_sure_other` rather than rejecting otherwise valid legacy submissions.

Persist the normalized value with the intake record. Existing D1 records should
remain valid through a migration that either allows nulls for historical data or
backfills to `not_sure_other`.

Recommended domain name:

```ts
type WorkshopCategory =
  | "github_codebase_review"
  | "ai_business_operations"
  | "home_personal_automation"
  | "not_sure_other";
```

## Admin Experience

The open intake queue and case detail/review views should show the selected
category near the problem summary.

This is a triage aid only. Admin approval, hold, send, revise, private quote,
pause, resume, and reject/refund controls continue to work exactly as they do
today.

## Agent Discovery Behavior

The agent input contract should include the normalized category. The discovery
prompt should use it to bias the first few questions while still asking one
topic at a time and continuing until the problem is sufficiently understood.

Category-specific discovery hints:

- GitHub / Codebase Review: goal of the repo, current blocker, expected users,
  current build/test/deploy state, docs/readme quality, known failure points,
  sanitized public links, and constraints around private code.
- AI Business Operations: recurring work to improve, systems involved at a high
  level, who touches each step, current handoffs, frequency/volume, business
  risk, approval needs, and data sensitivity boundaries.
- Home + Personal Automation: recurring personal workflow, devices or services
  involved at a high level, manual triggers, desired level of human approval,
  privacy boundaries, and anything that must never be automated.
- Not Sure / Other: generic messy-work triage covering desired outcome, current
  process, pain points, tools involved, volume/frequency, and risk boundaries.

The category must not override risk handling. Sensitive, ambiguous, unusually
complex, or high-liability cases are still held as Gmail drafts for human review
within the existing review policy.

## Data Flow

1. Visitor opens `/work-with-me`.
2. Visitor selects a starting point and submits the intake.
3. Static JavaScript posts the intake to `POST /v1/intakes`.
4. Worker validates, normalizes, and stores `workshopCategory`.
5. Public response remains the existing case token and next-step instruction.
6. Admin queue displays the category.
7. Paid discovery or later review passes the category into the agent context.
8. Gmail discovery questions adapt to the category while preserving risk gates.
9. Blueprint and private quote flow continue through the existing approval path.

## Error Handling

- Missing category: store `not_sure_other`.
- Unknown category: store `not_sure_other` and continue if all other intake
  fields are valid.
- Admin display for historical rows without a category: show "Not sure / Other".
- Agent execution for historical rows without a category: use the generic
  discovery path.
- Public validation errors for existing required fields stay unchanged.

## Privacy And Safety

The launch boundary remains text and sanitized links only. The public category
copy and discovery questions must repeat or reinforce:

- no credentials or secret material;
- no attachments at launch;
- no sensitive third-party data;
- no regulated advice;
- no employment surveillance;
- no high-impact decision automation;
- no unsafe personal automation; and
- no private/internal implementation disclosure.

The GitHub / Codebase category should be especially clear that a repository link
is optional and should be sanitized. Users can describe private code at a high
level without granting access.

## Testing And Verification

Implementation should add focused tests and verifiers:

- Worker intake tests for omitted, valid, and unknown `workshopCategory`.
- Repository or D1 tests proving the category is persisted and historical rows
  remain readable.
- Admin tests proving the open queue and case detail render a safe category
  label.
- Agent tests proving the category reaches the prompt/context and changes
  question hints without bypassing review gates.
- Static verifier updates proving `/work-with-me` includes the four public
  categories and no banned language.
- Jekyll build.
- Worker unit test suite.
- Live smoke can remain non-mutating unless explicitly approved for a real
  intake test.

## Acceptance Criteria

- `/work-with-me` presents the four starting points in the existing page flow.
- A submitted intake includes `workshopCategory`.
- The Worker accepts legacy submissions without the field.
- The selected category is persisted with the intake.
- Admin views expose the category as a label, not as a decision-maker.
- Agent discovery receives the category and uses it only to tailor questions.
- Existing normal queue, priority deposit, Gmail discovery, review, private
  quote, and scheduling behavior remain compatible.
- Checkout remains controlled by the existing readiness/config gate.
- No secrets, attachments, credentials, regulated-advice claims, or internal IP
  details are requested or exposed.
