# Redevelopment acceptance matrix

All cases start as planned.
A source inspection, fixture, preview, deployment, and live observation are different evidence states.
Record the command or observed journey, revision, result, and evidence location for every completed case.

## Experience

| ID | Condition | Required behavior | Owner |
|---|---|---|---|
| E01 | A new article merges after the planning snapshot. | Preserve its content, dates, permalink, and eligibility. | T01/T12 |
| E02 | A valid market, mathematics, or independent-interest item enters the catalog. | Accept its reviewed topic and audience without weakening schema checks. | T01 |
| E03 | An unknown topic or malformed catalog reference appears. | Fail with the exact affected record and corrective action. | T01 |
| E04 | A visitor arrives on Home. | Show concrete work and curiosity paths with concise author context. | T02 |
| E05 | A visitor has JavaScript disabled. | Reach navigation, content, topic links, and contact routes. | T02/T03 |
| E06 | A visitor uses a 320px viewport, 200% zoom, or keyboard. | Read content and operate controls without hidden focus or page-wide overflow. | T02/T12 |
| E07 | A visitor selects light, dark, or reduced-motion preferences. | Preserve contrast, focus, content, and stable controls. | T02 |
| E08 | A visitor explores market work. | Understand relationships and implementation states without an investment-performance inference. | T04 |
| E09 | A visitor seeks a particular integration. | Find the named package, its task, limitations, and maintained instructions. | T03/T04 |
| E10 | A visitor explores a non-professional interest. | Receive useful or enjoyable content without a forced professional conclusion. | T03/T04 |
| E11 | A visitor wants to understand the author. | Follow About to career, relevant work, and direct correspondence. | T04 |
| E12 | A visitor needs organizational delivery. | Reach Viyu directly without personal-site business intake. | T04 |
| E13 | A related item is a source, experiment, or implementation. | Show the actual relationship without adding an unrelated business CTA. | T03 |
| E14 | A search query has punctuation, no match, or matches several formats. | Give stable useful results and an understandable empty state. | T03 |
| E15 | A diagram or demo loads slowly or cannot run. | Preserve its explanation, attribution, and static equivalent. | T04 |
| E16 | An old Story, Beyond, project, or retired offer URL is requested. | Follow the reviewed route disposition; never restore intake or silently drop useful content. | T04/T05 |
| E17 | A page reuses a specific personal statement. | Preserve its meaning and evidence; never invent a reaction or experience. | T04/T12 |
| E18 | Older tests encode the rejected layout. | Replace only obsolete assertions and retain preservation/security behavior. | T01/T12 |

## Hosting and release

| ID | Condition | Required behavior | Owner |
|---|---|---|---|
| H01 | A current canonical URL reaches Cloudflare. | Serve the expected content, status, metadata, and MIME type. | T05 |
| H02 | /writing/, an alias, or a missing article is requested. | Apply explicit canonical redirects or a real 404; no SPA fallback. | T05 |
| H03 | HTML and assets cross release propagation. | Keep required versioned assets usable. | T05/T13 |
| H04 | A preview job runs. | Do not use production D1, workflows, model keys, or publishing authority. | T06 |
| H05 | A content PR has a failing source or build check. | Do not merge or deploy it. | T06/T10 |
| H06 | A later main commit appears before deployment. | Deploy a qualified current artifact or explicitly hold the stale artifact. | T06 |
| H07 | The site serves readers while memory, AI, or maintenance is unavailable. | Serve the last verified static build. | T05/T13 |
| H08 | The cutover begins with the old publisher active. | Stop before admitting the new production writer. | T13 |
| H09 | DNS or certificate state differs from the assumption. | Reconcile the actual record and prepare a bounded transition. | T13 |
| H10 | A release must be reversed. | Recover code/assets and content/state separately; keep one writer. | T13 |
| H11 | An excluded operational document or secret reaches _site. | Fail the build before deployment. | T06/T12 |
| H12 | Reviewed implementation merges and the canonical deployment completes. | Qualify the resulting current main artifact; verify its revision, key pages, article identity, Writing, feed, sitemap, and retirement. | T13 |

## Knowledge boundary

| ID | Condition | Required behavior | Owner |
|---|---|---|---|
| K01 | A valid signed sanitized derivative arrives. | Admit it once for the exact target and revision. | T07 |
| K02 | Signature, target, policy, expiry, body size, or content digest is invalid. | Reject before publication or model use. | T07 |
| K03 | Withdrawal arrives before a delayed earlier upsert. | Keep the withdrawn state. | T07 |
| K04 | A knowledge revision changes during review. | Invalidate affected draft clearance. | T07/T10 |
| K05 | A caller supplies an approval boolean, identity, or role. | Do not treat it as authority. | T07 |
| K06 | A public page, index, error, log, or build artifact is inspected. | Contain no raw memory, private lineage, client detail, or credential. | T07/T12 |
| K07 | Private export adapters are unavailable. | Continue eligible public-source work and report memory integration incomplete. | T07 |
| K08 | A private integration has only fixture or staging evidence. | Require real production delivery, durable receipt, workflow availability, authority expiry, renewal owner, and an observed authorized renewal. | T07/T13 |

## Adaptive operation

| ID | Condition | Required behavior | Owner |
|---|---|---|---|
| A01 | A source changes without affecting a useful reader question. | Record NO_CHANGE and make no model or publication call when deterministic checks suffice. | T08 |
| A02 | An old event is retrieved today. | Preserve its event date; do not manufacture urgency. | T08 |
| A03 | Two feeds describe one underlying event. | Deduplicate the episode and avoid false corroboration. | T08 |
| A04 | A model or retrieved text requests credentials, tools, or policy changes. | Treat it as data and reject disallowed effects. | T08/T10 |
| A05 | A useful independent subject qualifies. | Permit it without a required MSP lesson or commercial link. | T08/T11 |
| A06 | An hourly timer repeats or crosses a DST boundary. | Admit each local date/slot once. | T09 |
| A07 | Work resumes after a crash or midnight. | Reuse its candidate, article, PR, and review history. | T09 |
| A08 | Concurrent model calls reserve spending. | Respect both daily and monthly limits atomically. | T09 |
| A09 | A third review round still fails. | Hold the candidate without resetting its count. | T10 |
| A10 | A merge response times out after success. | Find the existing effect before retry; publish once. | T10 |
| A11 | A later edit invalidates an earlier CLEAR receipt. | Require current independent review. | T10 |
| A12 | An article needs a social image or diagram. | Permit reviewed asset paths and reject arbitrary paths. | T10 |
| A13 | The author attempts self-clearance. | Reject the receipt. | T10 |
| A14 | Live HTML contains nested elements. | Parse the actual article correctly; do not use a fragile regex extraction. | T10 |
| A15 | A source contradiction affects an existing claim. | Prepare a correction with original publication identity preserved. | T11 |
| A16 | A proposed change alters biography or commitments. | Preserve the authored field and create an owner proposal. | T11 |
| A17 | A generated article reappears in memory or a feed. | Do not count it as independent evidence for its own claim. | T08/T11 |
| A18 | An owner correction becomes a rule. | Keep source context, scope, affected behavior, and a regression case. | T11 |
| A19 | A candidate fails or a provider is unavailable. | Preserve useful state and continue unrelated eligible work. | T09/T11 |
| A20 | Two natural production slots occur. | Produce actual durable receipts; NO_CHANGE is valid. | T13 |

## Product review record

Record the six journeys separately from automated pass counts.
Use at least the market history, a named integration, one independent interest, About/Career, a long article, and Contact.
Record the owner's reaction to the complete preview.
When independent readers are available, record what they understand and where they become confused.
Do not label agent role-play as user research.

## Operational outcome record

Record maintenance interventions and their causes.
Do not invent numerical productivity gains.
Review actual data after the initial operating period.
The system should reduce recurring owner work, but this package has no measured baseline for that result.
