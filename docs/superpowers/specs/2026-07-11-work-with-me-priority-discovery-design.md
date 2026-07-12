# Work With Me Priority Discovery Design Spec

## Summary

Extend the existing `www.sulemanji.com/work-with-me` offer into a complete,
portfolio-native customer intake and paid discovery flow.

Visitors can submit one messy automation problem for normal review or place a
fixed deposit to begin a priority, agent-driven discovery in a dedicated Gmail
thread. The discovery asks one question at a time until the problem is
sufficiently understood, obtains the customer's explicit confirmation, and
delivers an action blueprint. The deposit is credited once toward a privately
quoted live session and also provides priority scheduling access.

The portfolio remains a static Jekyll site on GitHub Pages. A separate
Cloudflare backend provides intake processing, payment orchestration, durable
workflow state, Gmail integration, agent execution, human review controls, and
retention automation.

This is Phase 2 of the Work With Me surface. It supersedes the Phase 1
prohibitions against forms, pricing, Stripe, and backend services while
preserving the Phase 1 audience, positioning, and public safety boundaries.

## Approved Product Decisions

- Audience: individuals, founders, small business owners, and other people
  trying to automate messy personal or professional work.
- Entry point: the existing `/work-with-me` page, not a separate agency or
  product brand.
- Unpaid path: submission confirmation followed by normal manual review.
- Paid path: an optional fixed Priority Discovery Deposit.
- Founding price: `$295` for the first ten paid Priority Discovery cases that
  reach `discovery_active`; a case refunded before delivery starts does not
  consume a founding-cohort place.
- Standard price: `$395` after the founding cohort.
- Deposit treatment: non-refundable after discovery starts and credited in full
  once toward the recommended live session.
- Session prices: quoted privately after the blueprint, not published as a
  pricing ladder.
- Credit validity: 60 days after blueprint delivery.
- Discovery channel: a dedicated Gmail thread sent from
  `ssmanji89@gmail.com` for the initial release.
- Discovery depth: open-ended within one defined problem, with no arbitrary
  question count.
- Discovery method: one topic at a time, no material assumptions, explicit
  understanding checkpoint before blueprint generation.
- Paid deliverable: confirmed project vision and action blueprint containing a
  triage brief, proposed workflow, automation opportunities, risks, staged next
  steps, and recommended session scope.
- Scheduling: offered only after blueprint delivery; deposit customers receive
  access to a priority session window appropriate to the recommended scope.
- Session confirmation: the customer selects a priority slot from a private
  quote-and-book page; the slot is confirmed only after Stripe collects the
  remaining session balance.
- Automation: risk-based. Routine outputs can eventually send automatically;
  sensitive or uncertain outputs become Gmail drafts for Suleman's review.
- Founding cohort: all checkpoints and blueprints require Suleman's review,
  regardless of risk classification.
- Human-review commitment: within one business day.
- Initial-thread commitment: normally within minutes and no later than one hour
  after confirmed payment.
- Inactivity: remind and pause after 14 days without a customer response.
- Intake media: text and sanitized links only. No file attachments at launch.
- Working-data retention: 90 days after case closure.
- Gmail-thread retention: one year after case closure.

## Goals

- Replace the mailto-only first contact with an accessible native intake form.
- Let visitors submit without payment and enter a normal review queue.
- Let higher-intent visitors purchase a bounded, durable discovery service.
- Deliver immediate value before a live session through an agent-guided Gmail
  interview and a reusable action blueprint.
- Keep customer understanding and consent explicit at payment and discovery
  checkpoints.
- Preserve human oversight for sensitive, ambiguous, complex, or high-liability
  cases.
- Keep payment, Gmail, model, and customer data out of the static site.
- Make retries, duplicate events, and multi-day waits safe.
- Produce enough operational evidence to decide whether routine auto-send is
  acceptable after the first ten paid cases.

## Non-Goals

- Do not create a separate agency, clinic sub-brand, or SaaS product.
- Do not publish session or implementation pricing.
- Do not promise a specific session slot before discovery is complete.
- Do not provide production implementation as part of the deposit.
- Do not accept attachments, credentials, secrets, regulated records, or
  sensitive third-party information.
- Do not access customer systems during discovery.
- Do not provide regulated legal, medical, financial, or compliance advice.
- Do not build a general-purpose CRM or full administration console.
- Do not migrate the portfolio itself away from Jekyll/GitHub Pages.
- Do not tie the public offer to one model vendor or automation technology.
- Do not automatically enable routine auto-send before the founding-cohort
  review gate passes.

## Customer Flow

1. A visitor opens `/work-with-me` and submits one defined messy problem.
2. The form validates required context, rejects attachments, shows prohibited
   data boundaries, and records the visitor's consent to the current terms and
   privacy notice.
3. The visitor chooses normal review or Priority Discovery.
4. Normal-review submissions receive confirmation and enter Suleman's manual
   review queue.
5. Priority Discovery creates a Stripe Checkout Session tied to the intake
   case. Checkout displays the amount, deliverable, credit policy,
   non-refundable trigger, AI disclosure, retention summary, and support
   contact.
6. A verified successful-payment webhook starts the paid discovery workflow.
7. The system sends the first Gmail message normally within minutes and no
   later than one hour after payment.
8. The agent asks one focused question at a time. It continues until every
   required understanding field is supported by customer statements and no
   material contradiction remains.
9. The agent sends an understanding checkpoint covering the problem, desired
   outcome, current process, constraints, stakeholders, and success criteria.
10. Customer corrections reopen discovery. Explicit confirmation closes
    discovery and allows blueprint generation.
11. The agent produces an action blueprint. During the founding cohort every
    checkpoint and blueprint is held for review. After the cohort, cases that
    satisfy the auto-send policy may send automatically.
12. The blueprint recommends a live-session scope and links to a private
    quote-and-book page. It does not expose a public price ladder.
13. The private page shows the approved session scope, quoted total, deposit
    credit, remaining balance, and matching priority windows without exposing
    unrelated calendar details.
14. The customer selects a slot, which is held temporarily while Stripe
    collects the remaining session balance.
15. A verified balance payment confirms the Google Calendar event. An expired,
    abandoned, or failed checkout releases the hold.
16. The deposit credit can be applied once to the recommended session for 60
    days after blueprint delivery.
17. A thread with no customer response for 14 days receives a reminder and is
    paused. A pre-blueprint discovery may resume without another deposit for 60
    days after the pause; after that it closes as customer-abandoned and its
    unused credit expires.

## Commercial Rules

### What the Deposit Buys

One Priority Discovery Deposit covers one defined messy problem and includes:

- the agent-driven Gmail discovery;
- an explicit, customer-confirmed project vision;
- an action blueprint;
- a recommended live-session scope;
- access to a priority scheduling window; and
- a one-time credit toward that session.

New or materially different problems require a separate intake. The agent must
identify topic expansion rather than silently absorbing it into the original
case.

### Refund and Credit Semantics

- Payment alone does not make the deposit non-refundable.
- The deposit becomes non-refundable when the first discovery email is
  successfully sent because delivery has begun.
- If Suleman declines the engagement or the system cannot start discovery, the
  payment is refunded automatically.
- The customer receives the confirmed vision and blueprint even if they do not
  schedule a session.
- The credit has no cash value, applies only once, and cannot be applied to both
  a session and a later implementation engagement.
- Refunds, disputes, or payment reversals freeze unused credit pending review.
- The 60-day credit window begins when the blueprint is delivered, not when the
  deposit is paid.
- A customer who abandons discovery before confirming an understanding may
  resume for 60 days after the inactivity pause. If that resumption window
  expires, the case closes without a blueprint and the deposit credit expires.
- The remaining live-session balance is due before a selected priority slot is
  confirmed.
- A booking hold has no monetary value and is released automatically after its
  15-minute checkout window expires.
- Final public terms, tax treatment, cancellation language, and receipt wording
  require Texas attorney/CPA review before live payment is enabled.

## Architecture

### Static Portfolio Frontend

The current Jekyll/GitHub Pages site remains the public frontend. It owns:

- offer positioning and explanatory content;
- the intake form and client-side usability behavior;
- consent and boundary presentation;
- normal-review and Priority Discovery choices; and
- success, failure, and resumption views.

It does not contain secrets, OAuth tokens, agent prompts, authoritative prices,
payment state, or customer case state.

### Cloudflare Worker API

A Cloudflare Worker provides a narrow backend API for:

- intake validation and case creation;
- Stripe Checkout Session creation;
- signed Stripe webhook handling;
- Gmail synchronization and outbound actions;
- private quote, availability, and booking actions;
- Google Calendar free/busy lookup and event confirmation;
- workflow event delivery;
- authenticated administrative decisions; and
- status responses that reveal only customer-safe information.

Every mutating operation uses idempotency keys. Public endpoints are protected
with strict schemas, origin controls, rate limits, bot protection, request-size
limits, and server-side validation. No customer input is treated as trusted
instructions.

### Cloudflare Workflows

Each paid case has one durable Workflow instance. It coordinates:

- payment fulfillment;
- initial email delivery;
- waiting for customer messages;
- discovery turns;
- understanding confirmation;
- risk and output validation;
- human-review waits;
- blueprint delivery;
- private quote approval, slot hold, balance payment, and booking confirmation;
- inactivity reminders and pauses;
- credit expiration; and
- terminal closure.

Workflow steps must be retryable and idempotent. External effects such as
sending email, issuing a refund, or consuming a credit require a durable event
record before and after the call so retries cannot duplicate the effect.

### D1 System of Record

D1 stores structured state, not full mailbox copies. The logical records are:

- `cases`: identity, contact, context type, status, timestamps, and ownership;
- `intakes`: validated problem statement, sanitized links, and policy version;
- `consents`: exact terms/privacy version, acceptance timestamp, and evidence;
- `payments`: Stripe identifiers, amount, state, refund/dispute state, and
  idempotency data;
- `credits`: amount, activation, expiry, consumption, and associated session;
- `session_quotes`: private scope, duration, total, deposit credit, remaining
  balance, approval, expiry, and one-time public token;
- `slot_holds`: quote, start/end, hold expiry, payment state, and calendar event
  identifier;
- `gmail_threads`: case/thread mapping, labels, last processed message/history
  cursor, and retention deadline;
- `discovery_state`: required understanding fields, supporting message IDs,
  contradictions, unknowns, and current question topic;
- `artifacts`: versioned understanding checkpoints and action blueprints;
- `risk_decisions`: triggered categories, disposition, reviewer, and outcome;
- `workflow_events`: durable side-effect and state-transition ledger; and
- `audit_events`: security- and consent-relevant actions without secrets or raw
  model reasoning.

Full card data is never stored. Stripe remains authoritative for payments.

### Gmail Integration

The initial sender is `ssmanji89@gmail.com`. The implementation must isolate
clinic traffic with dedicated Gmail labels and deterministic case metadata in
message headers and subjects.

The Worker uses Gmail OAuth with the minimum practical scopes needed to read
the labeled thread, apply labels, create drafts, and send replies. OAuth refresh
credentials are encrypted secrets and never stored in D1 or the repository.

A scheduled Worker incrementally checks Gmail history and labeled clinic
threads, then sends new-message events to the corresponding Workflow. This
avoids adding Google Cloud Pub/Sub to the first release. The Gmail adapter must
be replaceable so a future move to a domain mailbox or push notifications does
not change case or workflow behavior.

Customer attachments are not downloaded or passed to a model. If a new message
contains an attachment, the case is held and the customer receives safe
handling instructions.

### Stripe Integration

Stripe-hosted Checkout collects payment. The backend creates one Checkout
Session per case and associates the case ID through Stripe metadata. The Worker
verifies webhook signatures and treats the verified payment event, not the
browser redirect, as fulfillment authority.

Checkout must present the full refund/credit policy or a sufficiently complete
summary with conspicuous links, require affirmative acceptance, and preserve
the accepted policy version as evidence.

Stripe also collects the remaining live-session balance. A separate Checkout
Session is created from the approved private quote and short-lived slot hold.
The verified balance-payment webhook, not the browser redirect, authorizes
calendar confirmation and consumes the deposit credit.

### Private Quote and Google Calendar Integration

After blueprint delivery, Suleman approves the recommended scope, duration,
private total, and a set of priority availability rules. The system creates an
opaque, single-case quote link that expires with the 60-day credit window.

The quote page shows only:

- recommended session scope and duration;
- private total price;
- deposit credit;
- remaining balance;
- applicable cancellation/rescheduling terms; and
- currently available priority windows matching that duration.

Google Calendar is the availability and event authority for the initial
release. The backend reads free/busy data without exposing event titles,
attendees, or descriptions. Selecting a window creates a 15-minute D1 hold,
then starts Stripe Checkout for the remaining balance. A verified payment
rechecks availability and creates the calendar event. If the slot was taken
despite the hold, the system offers equivalent priority windows or refunds the
balance; it does not silently book a different time.

Calendar credentials use least privilege and are isolated behind a calendar
adapter so the account or scheduling provider can change without altering the
quote, payment, or case model.

### Agent Runtime

The model provider is an internal, reversible dependency behind a narrow agent
adapter. Public messaging does not promise a specific model. The launch model
must be selected by evaluation against the approved discovery and blueprint
rubrics rather than by vendor branding.

The adapter accepts structured case state and returns schema-validated outputs:

- next discovery question;
- understanding-state update;
- sufficiency recommendation;
- customer-facing checkpoint;
- risk classification;
- action blueprint; or
- escalation reason.

The application, not the model, controls state transitions, payment actions,
email recipients, credit use, retention, and authorization.

## Case State Model

Allowed top-level states are:

1. `intake_received`
2. `normal_queue`
3. `checkout_pending`
4. `paid_pending_start`
5. `discovery_active`
6. `waiting_for_customer`
7. `understanding_review`
8. `waiting_for_suleman`
9. `blueprint_ready`
10. `blueprint_delivered`
11. `priority_scheduling`
12. `slot_held`
13. `balance_payment_pending`
14. `session_confirmed`
15. `paused_inactive`
16. `closed`
17. `declined_refund_pending`
18. `payment_disputed`
19. `failed_requires_attention`

Transitions are explicit and validated. A workflow cannot deliver a blueprint
without recorded customer confirmation, expose scheduling before blueprint
delivery, confirm a session before verified balance payment, consume credit
twice, or continue automated sending while a case is held for review.

## Discovery Contract

The discovery agent is a constrained interviewer, not an implementation agent.
It must:

- ask one question at a time;
- keep each turn focused on one topic;
- distinguish customer statements from inferences;
- avoid planning until understanding is confirmed;
- avoid requesting secrets, credentials, production access, attachments, or
  prohibited sensitive information;
- identify contradictions and ask the customer to resolve them;
- identify new topics as separate potential cases;
- explain costly or difficult-to-reverse decisions in plain language; and
- stop questioning only when the sufficiency criteria are met.

Required understanding fields are:

- concise problem statement;
- desired end state;
- current workflow and failure points;
- people and systems involved;
- constraints and dependencies;
- prior attempts and available evidence;
- privacy, authorization, and human-approval boundaries; and
- observable success criteria.

"Sufficiently understood" means every required field is supported by customer
statements, no unresolved contradiction could materially change the blueprint,
and the agent can summarize the case without inventing a fact. The customer,
not the agent, closes discovery by explicitly confirming the understanding
checkpoint.

## Action Blueprint Contract

The blueprint contains:

- confirmed project vision;
- triage summary;
- current-state workflow;
- proposed future-state workflow;
- ranked automation opportunities;
- work that should remain human;
- human approval and rollback points;
- assumptions, remaining unknowns, prerequisites, and risks;
- small, reviewable implementation stages;
- decisions that are expensive or difficult to reverse;
- recommended live-session scope; and
- clear immediate next actions.

It must distinguish confirmed facts, supported conclusions, and remaining
unknowns. It must not guarantee feasibility, savings, compliance, production
deployment, or a specific implementation price.

## Risk-Based Human Review

A message or artifact is held when it involves or plausibly involves:

- regulated legal, medical, financial, or compliance advice;
- employment surveillance or worker evaluation;
- high-impact decisions affecting access, eligibility, employment, housing,
  credit, insurance, education, or essential services;
- credentials, secrets, private third-party data, or regulated records;
- unclear authority to automate or access a system;
- destructive, irreversible, or security-sensitive actions;
- unusual liability or safety consequences;
- unresolved material ambiguity or contradiction;
- unsupported claims or invented facts;
- topic expansion beyond the paid problem; or
- low-confidence thread/case association.

Held customer messages state only that personal review is underway and that a
response is expected within one business day. They do not expose internal risk
labels or model reasoning.

For this commitment, one business day means by 5:00 p.m. America/Chicago on the
next weekday that is not a United States federal holiday.

During the founding cohort, all checkpoints and blueprints are held even when
no risk category triggers. After the cohort, only explicitly allowlisted output
types may auto-send.

## Suleman Operations

Gmail is the primary operating surface. Labels represent:

- normal queue;
- priority discovery active;
- waiting for customer;
- needs Suleman review;
- blueprint delivered;
- paused for inactivity; and
- closed.

Held responses appear as Gmail drafts that Suleman can inspect and edit. A
minimal Cloudflare Access-protected operations page provides unambiguous
approve/send, revise, reject/refund, approve-private-quote, pause, and resume
actions. Merely deleting a draft does not change case state.

A daily digest reports:

- new normal-review cases;
- paid discoveries and current stage;
- threads waiting on Suleman;
- approaching one-hour or one-business-day commitments;
- inactive cases and pending reminders;
- credits approaching expiration;
- pending quote approvals, held slots, and unconfirmed balance payments; and
- failures, disputes, or refunds requiring action.

## Privacy, Consent, and Retention

- Intake and Gmail copy state that AI participates in discovery and blueprint
  generation and that Suleman may review any thread.
- Customers must not submit secrets, credentials, attachments, regulated
  records, sensitive third-party data, or material they lack authority to
  share.
- Customer text is sent only to processors required for the service and is not
  used for unrelated model training by this application.
- Logs exclude raw email bodies, secrets, OAuth tokens, full prompts, and
  chain-of-thought.
- D1 stores structured summaries and message identifiers rather than complete
  mailbox copies where practical.
- Working intake content, discovery state, and generated working material are
  deleted or irreversibly redacted 90 days after case closure.
- The labeled Gmail thread is archived at closure and deleted one year later.
- Stripe remains authoritative for financial records. D1 retains only the
  identifiers, consent evidence, credit history, and transaction metadata
  required for operations, disputes, tax, and legal obligations.
- A customer may request earlier deletion subject to payment-dispute,
  fraud-prevention, tax, and legal recordkeeping requirements.
- Retention jobs produce auditable success/failure events and alert on missed
  deletion deadlines.

## Error Handling

- Duplicate intake: return the existing case when the idempotency key and
  normalized identity/problem match.
- Duplicate Stripe webhook: acknowledge the recorded event without repeating
  fulfillment.
- Browser success without verified webhook: show payment processing and do not
  start discovery yet.
- Payment succeeds but Gmail fails: retry automatically, alert before the
  one-hour deadline, and refund if delivery cannot begin.
- Gmail reply cannot be mapped confidently: hold for review and do not send an
  automated response.
- Agent output fails schema, policy, grounding, or contradiction checks:
  regenerate once with the validation errors, then hold for review.
- Customer sends an attachment or prohibited content: do not download or pass
  it to the model; hold and send safe handling instructions.
- Provider outage: resume from the last durable step without duplicate email,
  payment, refund, or credit effects.
- Calendar window becomes unavailable before payment confirmation: do not book
  an alternative silently; release the hold and offer equivalent windows or a
  balance refund.
- Slot checkout expires or payment fails: release the hold without consuming
  the deposit credit.
- Balance payment succeeds but event creation fails: retain the paid state,
  retry safely, alert immediately, and prevent the slot from being offered
  again.
- Refund, dispute, or reversal: freeze unused credit and alert Suleman.
- Human-review deadline approaches: include the case in immediate alerts and
  the daily digest.
- Retention job fails: retain safely, alert, and retry; never report deletion
  until every required store confirms it.

## Security Requirements

- Store Stripe, Gmail OAuth, model, and administrative credentials only as
  encrypted Cloudflare secrets.
- Store Google Calendar OAuth credentials only as encrypted Cloudflare secrets.
- Verify Stripe webhook signatures against the raw request body.
- Use least-privilege Gmail OAuth scopes and a dedicated clinic label.
- Use least-privilege Google Calendar scopes and expose only computed
  availability to customers.
- Protect administrative routes with Cloudflare Access and server-side
  authorization.
- Apply CSRF protection to authenticated mutations and strict CORS to public
  API routes.
- Validate and normalize all URLs; allow only `http` and `https` sanitized
  links and never fetch them automatically during initial intake.
- Treat all customer and email content as untrusted prompt input.
- Prevent customer text from changing system policy, recipients, tools,
  payment state, or retention behavior.
- Use opaque public case tokens; never expose sequential database identifiers.
- Rate-limit intake, checkout creation, status lookup, and administrative
  authentication attempts.
- Maintain security-relevant audit events without logging secrets or sensitive
  message content.

## Phase 1 Verifier Migration

`scripts/verify_work_with_me.py` currently forbids Stripe, pricing, intake
forms, payment links, and custom backend language because those were explicit
Phase 1 non-goals. Phase 2 implementation must replace those stale prohibitions
with assertions for the approved Phase 2 behavior.

Vehicle-repair, invoice-review, Brakes & Bytes, and separate-agency-brand
prohibitions remain in force. The verifier must continue protecting the public
portfolio from those unrelated scopes.

## Testing Strategy

### Static Site

- Jekyll build and generated-page verification.
- Accessible labels, errors, focus order, and keyboard operation.
- Responsive form and policy presentation across mobile and desktop.
- Progressive failure behavior when JavaScript or the API is unavailable.
- No secret or authoritative backend configuration in generated assets.

### Worker and Data

- Schema and validation unit tests.
- State-transition and idempotency tests.
- D1 migration and retention tests.
- Authentication, authorization, CORS, CSRF, and rate-limit tests.
- Structured logging tests that reject sensitive fields.

### Stripe

- Test-mode success, cancellation, failure, duplicate webhook, delayed webhook,
  refund, dispute, and reversal scenarios.
- Signature verification and raw-body handling.
- Consent-version and case-ID association.
- Credit activation, expiration, single use, and freeze behavior.
- Remaining-balance Checkout, hold expiry, and credit consumption only after
  verified payment.

### Gmail

- OAuth refresh, label creation, thread mapping, incremental history polling,
  reply detection, draft creation, edited-draft approval, send, and retention.
- Duplicate polling and duplicate message event handling.
- Attachment and ambiguous-thread holds.
- Migration test proving the sender adapter can move to a domain mailbox.

### Scheduling

- Private quote authorization, expiry, and case isolation.
- Google Calendar free/busy calculation without event-detail disclosure.
- Duration-aware priority windows and timezone/DST handling.
- Concurrent slot selection, hold expiry, and availability recheck.
- Balance success, failure, abandonment, refund, and event-creation retry.
- No session confirmation before verified balance payment.

### Agent Evaluation

- One-question-at-a-time behavior.
- Required-field coverage and contradiction detection.
- No premature planning.
- Understanding checkpoints grounded in customer statements.
- Correct separation of facts, conclusions, and unknowns.
- Topic-expansion detection.
- Risk-category recall, including adversarial prompt injection.
- Blueprint completeness and actionable staging.
- No credential requests, regulated advice, or unsupported guarantees.

### End-to-End

Use synthetic, non-sensitive cases to verify:

- unpaid intake to normal queue;
- paid checkout to first Gmail message within the commitment;
- multi-turn discovery to corrected and confirmed understanding;
- routine and held blueprints;
- human edit/approval and rejection/refund;
- 14-day reminder/pause and later resume;
- private quote and priority scheduling handoff;
- short-lived slot hold, remaining-balance payment, and calendar confirmation;
- 60-day credit expiration; and
- 90-day/one-year retention actions in accelerated test time.

## Rollout

1. Ship the native intake and normal-review queue without live payment.
2. Enable Stripe test mode and complete end-to-end synthetic journeys.
3. Enable Gmail discovery with mandatory human review for every outbound
   checkpoint and blueprint.
4. Complete a live internal pilot using non-sensitive test cases.
5. Enable the `$295` founding offer for the first ten paid cases that reach
   `discovery_active`.
6. Review all ten cases against the agent and risk rubrics.
7. Enable the `$395` standard offer.
8. Allow routine auto-send only if the founding review shows:
   - zero unsafe sends;
   - zero material invented facts in sent artifacts;
   - reliable case/thread association;
   - no duplicate customer communications or payment effects; and
   - acceptable blueprint quality under the approved rubric.
9. If any gate fails, keep mandatory review enabled and refine the system before
   reconsidering auto-send.

## Acceptance Criteria

- `/work-with-me` contains a native intake for one messy problem.
- Both normal review and Priority Discovery are available after intake.
- The first ten paid cases that reach `discovery_active` use `$295`; a case
  refunded before delivery starts does not consume a founding place. Subsequent
  cases use `$395` without a static-site deployment to change the authoritative
  price.
- Stripe Checkout is the only card-entry surface.
- A verified payment starts exactly one workflow and one Gmail thread.
- The first discovery message normally sends within minutes and is monitored
  against a one-hour maximum commitment.
- Discovery asks one topic at a time and cannot produce a blueprint before an
  explicit customer-confirmed understanding checkpoint.
- Every blueprint satisfies the approved artifact contract.
- All founding-cohort checkpoints and blueprints require human approval.
- Risk-triggered cases cannot auto-send.
- Held cases communicate a one-business-day personal-review expectation.
- No attachment is downloaded or passed to a model.
- Session pricing remains private.
- Deposit credit is single-use and expires 60 days after blueprint delivery.
- The private quote shows total, credit, and remaining balance; verified balance
  payment is required before Google Calendar confirmation.
- Customer inactivity triggers a reminder and pause after 14 days.
- A pre-blueprint case closes as customer-abandoned if it is not resumed within
  60 days after its inactivity pause.
- Working data and Gmail threads follow the approved 90-day/one-year retention
  policy.
- Duplicate events cannot duplicate charges, threads, replies, refunds, or
  credit consumption.
- Vehicle-repair, invoice-review, Brakes & Bytes, and separate agency branding
  remain absent from the public offer.
- Live payment remains disabled until the legal/tax language and the complete
  verification suite are approved.

## Research Basis

Pricing and service-shape references reviewed on July 11, 2026:

- Texas AI Lab: `$299` one-hour consultation and `$799` audit with written
  playbook: <https://texasailab.com/austin/>
- Rodney Warner, Houston: `$350` one-hour AI consultation with pre-call review:
  <https://rodneywarner.com/services/ai-implementation-consultant>
- Apex Performance Advisory, Houston: `$250/hour` process consulting:
  <https://www.apexperformanceadvisory.org/service-page/operations-process-improvement>
- AIssisted Consulting: `$225` non-refundable reservation deposit credited
  toward service: <https://aissistedconsulting.com/book/>
- Hello Peace: paid discovery from `$295` to `$395`, credited toward qualifying
  engagements: <https://www.hellopeace.me/pricing-process>
- DentriFlow: `$100` deposit toward a `$500` AI audit:
  <https://www.dentriflow.com/buy-now/p/ai-audit-deposit>
- Stripe Checkout and policy presentation:
  <https://docs.stripe.com/payments/checkout>
- Stripe metadata and webhook association:
  <https://docs.stripe.com/metadata>
- Stripe dispute-prevention guidance:
  <https://docs.stripe.com/disputes/prevention/best-practices>
- Cloudflare Workflows durable execution:
  <https://developers.cloudflare.com/workflows/>
- Gmail draft creation and sending:
  <https://developers.google.com/workspace/gmail/api/guides/drafts>
- Texas Comptroller treatment of standalone blueprinting and consulting versus
  taxable data processing:
  <https://comptroller.texas.gov/taxes/tax-policy-news/2024-april.php>
