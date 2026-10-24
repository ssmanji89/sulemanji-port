# Publications Revenue Discovery System

Date: 2026-10-24
Status: Proposed for owner approval
Owner: Suleman Manji

## Intent

Professional Writing should give Suleman something worth reading and give public readers something worth using. Each Publication starts with a real question, verified evidence, and a useful point of view. Commercial analysis follows the editorial decision. It never manufactures the reason to publish.

The system uses current scheduled research, viyu-memory, public sources, and ad hoc prompts to find subjects. It then evaluates two independent commercial paths:

1. Near-term income through affiliate, referral, sponsorship, or paid-recommendation opportunities.
2. Durable MRR or ARR through subscriptions, tools, datasets, services, and productized workflows.

The system may execute reversible zero-cost work automatically. Spending, binding agreements, new financial commitments, and irreversible launches require explicit approval.

## Goals

- Keep one Professional Writing surface at `/writing`.
- Publish evidence-backed work across Suleman's professional judgment and genuine interests.
- Make every Publication useful without requiring a commercial link.
- Evaluate near-term income and recurring-revenue potential independently.
- Use Superpowers brainstorming, writing-plans, and executing-plans for qualified opportunities.
- Preserve exact-head review, privacy checks, build validation, guarded merge, and live verification.
- Measure actual outcomes without promising revenue, rankings, or conversions.

## Non-goals

- Do not turn the site into an undifferentiated affiliate catalog.
- Do not insert a product because an affiliate account exists.
- Do not let revenue quotas override source quality or reader value.
- Do not expose private research, customer evidence, wedding finances, or opportunity ledgers.
- Do not infer personal product use, professional adoption, or measured results.
- Do not create paid campaigns, subscriptions, purchases, contracts, or financial commitments without approval.
- Do not block a strong Publication because it has no commercial path.

## Existing system constraints

The current publisher already provides several controls that remain unchanged:

- One active article PR at a time.
- Three verified publications per America/Chicago local day.
- A private article and source ledger outside public Git history.
- Independent privacy and exact-head editorial review.
- Nine release checks bound to the exact head.
- Expected-head merge protection.
- Verification of both the canonical article and its `/writing` entry.
- Durable recovery through one runner lock and one private ledger.

The current Writing contract limits articles to technology decisions inside operating businesses. This design expands that editorial boundary while retaining the existing safety and publication controls.

## Approaches considered

### Selected: dual-track analysis for every qualified Publication

The system decides editorial value first. It then scores near-term and recurring-revenue paths separately. One article can yield either path, both paths, or neither path.

This approach matches the owner's requirement to pursue wedding-timeline income and durable MRR or ARR together. It also prevents a low affiliate score from hiding a strong recurring-revenue idea.

### Rejected: fixed daily allocation

The publisher could reserve article slots for affiliate and recurring topics. This makes output predictable but creates pressure to publish weak commercial matches.

### Rejected: weekly commercial incubator

The publisher could review articles for revenue only after the editorial week ends. This protects editorial separation but delays validation and near-term income.

## Editorial model

### Publication sources

The discovery pool includes:

- Daily Work and Discovery research.
- Finance, market, and business reading where public discussion is appropriate.
- Professional service engineering, Microsoft, infrastructure, AI, security, and software work.
- Developer tools, self-hosting, local AI, small hardware, privacy, digital ownership, and interoperability.
- Science, astronomy, mathematics, history, archaeology, home automation, gardening, biology, and other defensible interests.
- Ad hoc owner requests for something useful to read.

Private financial records and confidential work records can guide topic selection. They cannot become public evidence.

### Editorial admission gate

A topic enters the publication queue only when all conditions pass:

1. A named reader has a concrete question.
2. The thesis adds interpretation, a decision framework, or a useful test.
3. The factual core has current authoritative support.
4. The article remains useful without a commercial link.
5. The topic is materially distinct from published and queued work.
6. The privacy and employer-IP boundaries permit publication.

Failure at this gate produces a private disposition. It does not create filler.

### Publication families

The public schema should support these families under one Writing identity:

- `professional-analysis`: operational, architectural, service, and business judgment.
- `technical-guide`: a practical method or implementation guide.
- `research-note`: a current development with a defensible interpretation.
- `product-category-guide`: a category decision framework, not a single-product pitch.
- `field-note`: a bounded lesson with honest evidence limits.
- `experiment`: a public hypothesis, test method, and later result.

The existing article types can migrate into this vocabulary without changing existing routes.

## Dual-track commercial analysis

Commercial analysis starts after editorial admission. It stays in a private opportunity ledger.

### Track A: near-term income

Score each dimension from 0 to 5. Higher benefit scores mean stronger evidence. Higher risk scores mean more risk.

- Reader purchase intent.
- Natural product or service fit.
- Evidence quality and comparison depth.
- Available program and account readiness.
- Expected commission value relative to reader trust.
- Disclosure and claims risk, recorded as a risk score.
- Freshness and price-volatility risk, recorded as a risk score.

The system records the score, evidence, falsifier, and next checkpoint. It does not adjust the threshold after seeing a preferred result.

Eligible zero-cost actions include:

- Researching affiliate and referral programs.
- Comparing program terms without accepting new binding terms.
- Confirming existing account identifiers and approved link formats.
- Drafting category guides and contextual links.
- Preparing an application packet for owner approval when terms require acceptance.
- Adding compliant links for already-approved programs.
- Creating zero-cost attribution parameters and click receipts.

### Track B: recurring revenue

Score each dimension from 0 to 5. Higher benefit scores mean stronger evidence. Higher risk scores mean more risk.

- Repeated reader problem.
- Evidence of willingness to pay.
- Frequency and durability of the need.
- Fit with Suleman's knowledge, assets, and distribution.
- Time to a useful zero-cost validation.
- Delivery and support burden, recorded as a risk score.
- Defensibility and differentiation.
- Conflict, confidentiality, and employer-IP risk, recorded as a risk score.

Eligible opportunity shapes include subscriptions, paid research, datasets, small tools, templates, advisory products, productized workflows, and recurring services. The system must reconcile existing Stripe products, payment links, and product-control work before creating duplicates.

### Scoring decision rule

Each benefit and risk dimension has equal weight within its group. The ledger stores raw component scores, not only an aggregate.

- The benefit score is the arithmetic mean of the benefit dimensions.
- The risk ceiling is the highest risk-dimension score.
- Missing current evidence produces `RESEARCH_REQUIRED`. The system cannot replace missing evidence with a neutral score.
- A track qualifies when its benefit score is at least 3.0 and every risk score is at most 3.
- A track becomes `NO_COMMERCIAL_FIT` when completed research leaves its benefit score below 3.0 or an unmitigable risk score at 4 or 5.
- A risk score of 3 requires a named mitigation and a validation check before launch.
- A mitigable risk score of 4 or 5 produces `DESIGN_REQUIRED`. The design must reduce and reverify the score at 3 or below before execution.

The system fixes these rules before candidate research. A later threshold change requires a versioned policy change and cannot retroactively make a failed candidate pass.

Evidence is complete only when every dimension has a current source, an observed sample or explicit `not-applicable` reason, a time window, and a falsifier. Current means inside the source's natural change window. Program terms, prices, availability, and account status require same-run verification. Stable domain evidence can use an older source when the record explains why it remains valid.

A `not-applicable` dimension is excluded from the benefit mean and risk ceiling. The record must name the opportunity shape and explain why the dimension cannot affect that shape. All benefit dimensions that define demand, fit, and delivery remain required. A reviewer must reject `not-applicable` when it only removes an unfavorable score.

Scores 1, 2, and 4 represent documented positions between the anchors below. A scorer cannot use a midpoint only because evidence is missing.

| Dimension | 0 anchor | 3 anchor | 5 anchor |
| --- | --- | --- | --- |
| Purchase intent | No buying task or evidence against one. | Current direct evidence of a buying decision. | Repeated observed purchases or high-intent actions in the named audience. |
| Natural fit | The offer is unrelated to the thesis. | The offer helps complete the article's named task. | The offer is necessary to complete the task and the article compares credible alternatives. |
| Evidence and comparison | No reliable product evidence. | Current primary evidence covers the decisive criteria. | Primary evidence plus repeatable testing or independent corroboration covers all decisive criteria. |
| Program readiness | No available compliant program. | A suitable program exists and zero-cost setup remains. | An approved account and verified link format are ready. |
| Commission relative to trust | Confirmed return is negligible or the placement harms trust. | Confirmed terms justify a contextual placement without changing the thesis. | Confirmed terms provide material return while the same recommendation remains best without commission. |
| Disclosure and claims risk | No commercial claim beyond verified facts. | Known claims need explicit wording or review. | The required claim or disclosure is prohibited, misleading, or cannot be supported. |
| Freshness and price risk | The useful claim is stable and avoids volatile values. | Same-run verification can control the changing value. | The claim cannot remain accurate through publication or measurement. |
| Repeated reader problem | No repeated problem. | Current evidence shows the problem recurs for the named reader. | Repeated observed requests or behavior show persistent demand. |
| Willingness to pay | Evidence rejects payment. | Comparable paid behavior or a direct price test supports payment. | Verified purchases, preorders, or renewals support payment. |
| Need durability | The need is one-time or ending. | The need recurs for at least six months. | The need is continuous or contractually recurring. |
| Knowledge, asset, and distribution fit | No credible delivery path. | Existing knowledge and one reachable audience support delivery. | Existing assets, expertise, and repeat distribution support delivery. |
| Time to zero-cost validation | Validation needs spending or more than 90 days. | A useful free test can finish within 14 days. | A useful free test can finish within 48 hours. |
| Defensibility | A commodity copy has no differentiation. | A specific workflow, dataset, or expertise creates useful differentiation. | Compounding proprietary evidence or integration creates durable differentiation. |
| Delivery and support burden | Existing automation handles delivery with negligible support. | A documented manual process can support the first cohort. | Delivery requires unavailable capacity or creates an unsafe obligation. |
| Conflict, confidentiality, and IP risk | No identified conflict or private dependency. | A documented boundary and review can control the risk. | The offer requires restricted information, conflicting duties, or unlicensed IP. |

### Commercial dispositions

Each track uses explicit states:

- `NO_COMMERCIAL_FIT`
- `RESEARCH_REQUIRED`
- `ZERO_COST_VALIDATION`
- `DESIGN_REQUIRED`
- `PLAN_READY`
- `EXECUTING_ZERO_COST`
- `OWNER_APPROVAL_REQUIRED`
- `LAUNCHED`
- `MEASURING`
- `VALIDATED`
- `RETIRED`

An article publication state and an opportunity state remain separate. Commercial failure does not invalidate editorial value.

Each editorially admitted article creates exactly two private opportunity-evaluation records: one `near-term` record and one `recurring` record. A record remains useful when its result is `NO_COMMERCIAL_FIT`, because it prevents repeated scoring without new evidence. The system does not create a combined `both` record.

The initial state follows this rule:

- Missing current evidence: `RESEARCH_REQUIRED`.
- Complete evidence with a benefit score below 3.0 or an unmitigable risk score above 3: `NO_COMMERCIAL_FIT`.
- A qualifying test that uses an existing approved program, offer, route, and measurement path: `ZERO_COST_VALIDATION`.
- A qualifying test that requires a new offer, user workflow, data collection path, recurring delivery obligation, public price, or operating capability: `DESIGN_REQUIRED`.

A new external program that requires accepted terms cannot start in `ZERO_COST_VALIDATION`. Research can finish at zero cost, but acceptance moves the record to `OWNER_APPROVAL_REQUIRED`.

Allowed transitions are:

1. `RESEARCH_REQUIRED` moves to `NO_COMMERCIAL_FIT`, `ZERO_COST_VALIDATION`, or `DESIGN_REQUIRED` after scoring completes.
2. `ZERO_COST_VALIDATION` moves to `EXECUTING_ZERO_COST`, then `MEASURING`, then `VALIDATED` or `RETIRED`.
3. `DESIGN_REQUIRED` moves through the Superpowers design gate to `PLAN_READY`.
4. `PLAN_READY` moves to `EXECUTING_ZERO_COST` when every planned action is reversible and free. Otherwise, it moves to `OWNER_APPROVAL_REQUIRED`.
5. `OWNER_APPROVAL_REQUIRED` moves to `LAUNCHED` only after explicit approval and the approved action. `LAUNCHED` moves to `MEASURING`, then `VALIDATED` or `RETIRED`.

`RESEARCH_REQUIRED` can also move directly to `OWNER_APPROVAL_REQUIRED` when the track qualifies and accepting new external terms is the only remaining blocker. The approval request must include the terms version, obligations, cancellation path, and zero-cost confirmation.

New evidence can move `MEASURING` back to `RESEARCH_REQUIRED` or `DESIGN_REQUIRED`. A retired record can reopen only with a new evidence receipt and a new policy-version evaluation.

Lifecycle exceptions use these rules:

- Denied approval moves to `RETIRED`, unless the owner requests a revised design. A requested revision moves to `DESIGN_REQUIRED`.
- Expired approval remains `OWNER_APPROVAL_REQUIRED` and requires a new approval receipt. The system cannot reuse the expired receipt.
- Failed execution moves to `RESEARCH_REQUIRED` for an evidence failure, `DESIGN_REQUIRED` for an implementation failure, or `RETIRED` when the test falsifies the opportunity.
- `NO_COMMERCIAL_FIT` can reopen only when a new evidence receipt or policy version identifies the changed input. It reopens as `RESEARCH_REQUIRED`.
- No failure path can move directly to `VALIDATED`.

## Superpowers opportunity workflow

Qualified opportunities follow this sequence:

1. **Brainstorming:** Define the reader problem, value, alternatives, commercial model, and failure conditions.
2. **Design approval:** Use the owner's standing zero-cost authority for reversible experiments within this design. Request explicit approval when work changes contracts, public pricing, core governance, or external commitments.
3. **Writing-plans:** Produce an implementation plan with bounded tasks, evidence, and stop conditions.
4. **Executing-plans:** Run only authorized steps. Preserve atomic receipts and validation evidence.
5. **Measurement:** Record observed clicks, applications, sales, recurring revenue, refunds, support cost, and time cost where available.

The system must stop at `OWNER_APPROVAL_REQUIRED` before spending money, accepting new binding terms, creating a financial commitment, or making an irreversible launch.

## Public publication schema

The site should retain flat `notes/<slug>.md` routes and the current shared layout. Extend the Writing schema rather than create a second content surface.

Add these controlled fields to the next schema version:

- `publication_family`: one value from the approved family list.
- `commercial_intent`: `none`, `affiliate`, `referral`, `sponsorship`, `paid-recommendation`, `own-product`, or `mixed`.
- `disclosure_required`: boolean.

Do not store private account data, opportunity scores, expected revenue, or program terms in public front matter.

Add a durable `/affiliate-disclosure` page. Every affiliate or referral article must also place a clear disclosure before the first commercial link. The body disclosure cannot be replaced by a footer-only statement.

For Amazon, preserve the approved Associate identifier in the link. Place the exact statement “As an Amazon Associate I earn from qualifying purchases.” on the disclosure page and before the first Amazon link. This wording was verified against the Amazon Associates Operating Agreement and Amazon disclosure guidance on 2026-10-24. Do not cloak Amazon links, state durable prices, or imply that Amazon, the manufacturer, or the seller endorses the article.

Other commercial relationships use these minimum visible disclosures before the first promotion:

- Affiliate or referral: “This article contains affiliate or referral links. I may earn a commission if you buy or sign up through them.”
- Sponsorship: name the sponsor and state the material payment or support that funded the article.
- Paid recommendation: name the payer and state that the payer paid for the recommendation.
- Own product: state that Suleman created and sells the product or service.

The site validator identifies commercial links from a versioned registry of host, path, and query-parameter patterns. The public registry contains detection rules and disclosure requirements, but no private account data. The private runner separately verifies the expected account identifier against its approved-program record. A declared sponsorship or paid recommendation requires disclosure even when no commercial link exists.

Existing articles remain valid without a bulk rewrite. The renderer applies `professional-analysis`, `none`, and `false` as compatibility defaults only to unchanged legacy articles. Any new or edited article must set all three fields explicitly. A legacy or edited article that matches a commercial-link rule cannot use the compatibility defaults and fails validation until its commercial fields and disclosure are explicit.

The validation matrix is:

| `commercial_intent` | `disclosure_required` | Required evidence |
| --- | --- | --- |
| `none` | `false` | No detected commercial link and no declared material relationship. |
| `affiliate` or `referral` | `true` | At least one matching link and the applicable visible disclosure. |
| `sponsorship` | `true` | A named sponsor disclosure. A link is optional. |
| `paid-recommendation` | `true` | A named payer disclosure. A link is optional. |
| `own-product` | `true` | A visible ownership disclosure and a matching owned-offer link or call to action. |
| `mixed` | `true` | At least two detected or declared intent types and every applicable disclosure. |

Any detected commercial link with `none`, any required disclosure set to `false`, an unknown program pattern, or an account-identifier mismatch fails validation. Extra disclosure is allowed, but it cannot hide an incorrect intent value.

Schema output remains article-first:

- Use `BlogPosting` or `Article` for normal publications.
- Use `Review` only when the article performs a real, disclosed review and the structured data matches visible content.
- Use `Product` only for an owned product page or a page that actually satisfies the product schema contract.
- Never emit ratings, prices, availability, or hands-on claims without current visible evidence.

## Scheduled and ad hoc operation

The existing daily publisher remains the sole publication owner. It gains two input modes:

1. Scheduled discovery consumes current research receipts and relevant viyu-memory context.
2. Ad hoc discovery handles requests such as “give me something worth reading.”

Both modes use the same candidate queue, fingerprints, review gates, and daily capacity. An ad hoc request cannot create a competing publisher or bypass an unfinished article.

The Daily Work and Discovery Brief remains a source of candidate evidence. It does not become the publisher and does not expose private work or personal details.

## Private data model

Keep two related private records:

### Publication record

- Stable article ID and fingerprint.
- Reader, question, thesis, and purpose.
- Source and claim ledger.
- Privacy and employer-IP review.
- Branch, PR, head, review, merge, and live-verification receipts.
- Links to zero or more opportunity records.

### Opportunity record

- Stable opportunity ID and source article ID.
- Track: near-term or recurring.
- Score components, evidence, sample, time window, and falsifier.
- Program or product category.
- Current state and authorized next action.
- Cost ceiling, defaulting to zero.
- External-account, contract, and approval requirements.
- Outcome receipts and measured revenue fields.

Private records may reference public URLs. Public pages never link to private records.

## Measurement

Use observed metrics only:

- Publication reach where a privacy-compatible source exists.
- Outbound commercial clicks.
- Affiliate approvals and attributed orders.
- Earned commissions after program confirmation.
- Leads and completed purchases for owned products.
- Active recurring customers, MRR, ARR, churn, refunds, and support cost.
- Time from publication to first validated commercial signal.

The required revenue reports contain observed values only. They do not include projected revenue. A separate optional scenario document can contain projections only when it names every input, source, formula, and uncertainty range. Do not report a scenario value as earned revenue. Do not treat clicks as sales or a created product as demand.

The runner produces a private weekly revenue report and a monthly reconciliation receipt. It updates each opportunity record when a verified event arrives. No revenue report is public by default.

The weekly report uses these formulas:

- Outbound clicks: count verified click events by article, program, and opportunity.
- Affiliate orders and earned commission: use confirmed program reports only. Use each program's recorded attribution window.
- Owned-product purchases: use confirmed payment receipts. Use a 30-day last-touch window unless the product record defines another versioned rule.
- MRR: sum the current normalized monthly value of active recurring subscriptions. ARR equals current MRR multiplied by 12.
- Customer churn: recurring customers lost during the period divided by active recurring customers at the period start. Report a zero denominator as unavailable, not zero.

Refund counts and amounts remain separate from gross purchases. Support cost uses observed hours and a versioned internal cost rate. The acceptance test generates a private report fixture with known events and verifies every formula, attribution rule, and unavailable value.

The monthly reconciliation recomputes the month from source receipts and compares:

- Tracked outbound clicks against the privacy-compatible analytics source.
- Affiliate orders and commissions against each program's official statement.
- Owned-product purchases, refunds, active subscriptions, and churn inputs against the payment processor.
- Weekly report totals against the recomputed monthly totals.
- Link program identity and attribution-window versions against the opportunity ledger.

Each receipt records the source, covered interval, retrieval time, source statement or export identifier, compared values, difference, and result. Missing source data records `UNAVAILABLE`, the reason, and the next retry time. A mismatch records both values and the difference as `UNRECONCILED`; the system cannot label that metric confirmed until a later receipt resolves it. Reconciliation receipts exclude raw customer data.

## Failure handling

- Weak editorial evidence: hold the Publication.
- Weak commercial fit: publish without monetization.
- Program unavailable: retain the opportunity and publish without the link.
- Terms require acceptance: prepare the packet and stop for approval.
- Paid validation required: stop with the exact cost, purpose, and expected falsifier.
- Existing product conflict: reconcile before creating a duplicate.
- Stale price or availability: remove the claim or reverify it at publication time.
- Disclosure failure: deny publication.
- Unverified live state: retain `MERGED_NOT_LIVE_VERIFIED` and block the next merge.

## Security, privacy, and trust

- Keep wedding goals private. Public pages discuss reader value, not personal financial pressure.
- Preserve the current client, employer-IP, attribution, and public-claims rules.
- Treat memory as discovery context, not public proof.
- Store no credentials or secret affiliate tokens in Git or public pages.
- Treat public Associate tags and referral parameters as identifiers, not secrets.
- Record terms and program access dates because affiliate rules can change.
- Independent review must check commercial claims, disclosure placement, link identity, and editorial independence.

## Implementation boundaries

Implementation will require coordinated changes in two locations:

1. The public site repository: Writing contract, schema data, validators, renderer metadata, disclosure page, tests, and articles.
2. The private publisher: discovery prompt, opportunity ledger, scoring rules, Superpowers state transitions, approval gates, tests, and receipts.

The site change and runner change should ship as separate reviewed slices. The runner must not emit new-schema articles until the site accepts and tests that schema.

## Acceptance criteria

1. A strong article with no commercial fit can publish unchanged.
2. One article can create both near-term and recurring opportunity records.
3. A commercial link cannot publish without the required visible disclosure.
4. Existing approved affiliate links retain the correct account identifier.
5. The system can execute a reversible zero-cost validation without per-action approval.
6. The system stops before spending, binding terms, financial commitments, or irreversible launches.
7. Opportunity failure does not block or rewrite a valid Publication.
8. The publisher preserves its one-PR limit, three-per-day capacity, exact-head review, merge guard, and live verification.
9. Public schema never exposes private opportunity scores or financial goals.
10. Revenue reports distinguish projections, clicks, orders, earned commission, MRR, and ARR.

## Initial migration

1. Mark the Neutrogena candidate as superseded by the owner correction. Retain it privately as an audit artifact only.
2. Extend the Writing contract and schema with the selected Publication families and commercial fields.
3. Add disclosure validation and the public affiliate-disclosure page.
4. Extend the private runner with dual-track opportunity records and zero-cost authority gates.
5. Reconcile existing Stripe, payment-link, paid-ad, and affiliate assets.
6. Run one ad hoc Publication through both tracks without spending money.
7. Publish only after exact-head review and public verification pass.

## Open implementation calls

The builder may choose internal class names, file splits, and serialization details. It may not change the two-track scoring model, authority boundary, public/private separation, or existing publication gates without owner approval.
