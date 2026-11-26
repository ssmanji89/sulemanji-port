# Portfolio Redesign Acceptance Matrix

All 48 cases start as **planned**. The private preview does not satisfy canonical implementation acceptance.
Record each result, tested revision, evidence, and remaining limitation in the execution checkpoint.
Use the task graph for dependencies. A release gate can remain unresolved after authorized engineering work completes.

## T01 — Source and decision reconciliation

| ID | Condition and required result | Evidence |
|---|---|---|
| A01 | The implementation starts from freshly fetched main in an isolated worktree. The checkpoint records main and planning SHAs. | Git status, refs, and worktree record |
| A02 | Existing changes, branch owners, open PRs, and the daily article publisher remain intact. | Ownership and open-work reconciliation |
| A03 | Current instructions and policies are read. Only superseded workshop and mandatory personal-routing rules change. | Reviewed policy diff and decision record |
| A04 | The baseline records every eligible article, canonical URL, publication metadata, and source hash. No fixed article count controls acceptance. | Sanitized baseline manifest |
| A05 | Baseline checks distinguish observed failures from unavailable dependencies. Later gate changes have a documented behavioral reason. | Commands, exit states, and baseline results |
| A06 | The checkpoint names the public-content boundary, private evidence location, preview role, and unresolved obligation decision. | Sanitized execution record |

## T02 — Shared shell and main pages

| ID | Condition and required result | Evidence |
|---|---|---|
| A07 | Home, About, and Contact use the existing document layout. Each rendered page has one main, one H1, and a working skip link. | Rendered assertions and keyboard check |
| A08 | Navigation shows Work, Writing, About, and Contact. Business actions use the exact verified Viyu contact URL. | Link assertions and browser checks |
| A09 | Without JavaScript, navigation and primary content remain available. Failed enhancement does not hide the menu. | Disabled-JavaScript browser check |
| A10 | Keyboard users can operate navigation, see focus, and dismiss an enhanced mobile menu with Escape. Focus remains predictable. | Browser interaction record |
| A11 | At 320 CSS pixels and 200% zoom, content remains readable without page-level horizontal overflow. Reduced motion is respected. | Viewport and zoom screenshots |
| A12 | Shared metadata preserves one stable Person identity, correct canonicals, and production discovery. Preview noindex does not enter production. | Rendered metadata and production-config checks |

## T03 — Work cases and public content boundaries

| ID | Condition and required result | Evidence |
|---|---|---|
| A13 | All six specified Work routes render through the shared shell. Home and Work link to them. | Route and link assertions |
| A14 | Each case retains its project states, attribution, evidence limits, and public source links. Market work has no investment-performance claim. | Independent content review |
| A15 | Seven diagrams retain accessible titles, descriptions, captions, and correct source associations. Narrow rendering remains legible. | SVG checks and browser inspection |
| A16 | The ff-cli demonstration uses the existing public asset and a text description. Synthetic auction names and the actual snake-draft distinction remain clear. | Media and content review |
| A17 | About, Experience, Résumé, and work pages use the corrected career framing. They contain no unsupported metrics or private employer architecture. | Complete public-copy review |
| A18 | Both stale résumé PDFs and their links are absent from public output. A safe replacement requires separate complete review. | Build-output and link assertions |
| A19 | Public-safety checks include nested Work content and relevant generated text. A forbidden-content fixture proves the new scope. | Targeted regression test and safety result |

## T04 — Writing discovery and controls

| ID | Condition and required result | Evidence |
|---|---|---|
| A20 | Every eligible current article remains discoverable at its original canonical route. Baseline article bytes and metadata remain intact unless a specific reviewed fix requires change. | Baseline comparison and rendered discovery |
| A21 | The existing discovery catalog owns eligibility. Future, noindex, legacy, image, date, and commercial-link rules still pass. | Existing Writing and discovery suites |
| A22 | Category mapping uses canonical URLs. An unmapped eligible article appears under All and Other. Other appears only when nonempty. | New-article fixture and filter check |
| A23 | Search matches title, summary, and display category without case sensitivity. Multiple terms and the selected category combine with AND. | Behavioral browser or DOM test |
| A24 | Counts, empty state, reset, and query parameters remain synchronized. Unknown category parameters resolve to All. | State-transition checks |
| A25 | All eligible entries remain available without JavaScript. Search text never becomes executable markup. | No-JavaScript and hostile-query checks |
| A26 | A later eligible article merge becomes discoverable without modifying its schema for categories. Feed, sitemap, and social images remain correct. | Merge-fixture or fresh-main integration evidence |

## T05 — Public routes and existing obligations

| ID | Condition and required result | Evidence |
|---|---|---|
| A27 | Public workshop, personal intake, and priority-discovery entry routes lead to Contact. Navigation, Home, and discovery do not promote the retired offer. | Route and link checks |
| A28 | Public entry pages expose no new workshop forms, prices, deposit actions, or intake scripts. Business contact goes directly to Viyu. | Rendered output and script checks |
| A29 | Existing servicing paths remain until obligations and already-created checkout sessions receive a verified disposition. Late payments remain handled. Unlisted servicing stays outside promotion and discovery. | Sanitized obligation and hosted-session state, plus route tests |
| A30 | Missing operational access creates an explicit release blocker with owner and next action. Source work continues without deleting or modifying live records. | Release-gate record |
| A31 | Privacy and disclosure copy describe the actual resulting site and preserved services. Legacy aliases have a documented destination. | Copy review and route map |

## T06 — Worker admission control

| ID | Condition and required result | Evidence |
|---|---|---|
| A32 | `PUBLIC_OFFER_MODE` accepts active or retired. Missing and unknown values resolve to retired. | Configuration and unit tests |
| A33 | A valid-origin retired intake request returns 410 with `error: offer_retired` and the exact Viyu `contactUrl`. | Handler test |
| A34 | A valid-origin retired deposit-checkout request returns the same 410 contract. No new purchase can start through the direct route. | Handler test |
| A35 | Retired admission performs no body parse, database write, counter reservation, payment, email, calendar, or workflow call. | Throwing body and zero-call dependency spies |
| A36 | Existing origin checks precede retirement responses. Direct, forged, malformed, and missing-flag requests cannot bypass admission control. | Negative request matrix |
| A37 | Existing eligible paid-case quote holds and balance checkout remain available. Ineligible states remain denied. Webhook and refund idempotence remain intact. | State fixtures and existing regression tests |
| A38 | Existing case reads, administration, workflows, and retention remain supported. Deployment and rollback instructions separate admission mode from scheduled-service mode. | Regression results and release runbook |

## T07 — Integrated qualification

| ID | Condition and required result | Evidence |
|---|---|---|
| A39 | A clean production Jekyll build and the current Ruby, Python, and Worker checks pass at the same implementation revision. | Command receipts and CI result |
| A40 | Every changed legacy assertion maps to replacement coverage. Public-safety, Writing, metadata, and output-boundary checks remain effective. | Gate replacement table and regression results |
| A41 | Public output excludes docs, instructions, private evidence, Worker source, dependencies, and stale PDFs. Canonicals, Person, feed, sitemap, and robots match current contracts. | Generated-output audit |
| A42 | Fresh-main reconciliation preserves later articles and other owners' work. Eligible route and metadata comparison shows no unexplained loss. | Final source comparison |
| A43 | An actual Jekyll preview passes representative desktop, mobile, keyboard, zoom, no-JavaScript, diagram, media, and Writing checks. Performance findings use measured evidence. | Browser receipts and measured asset/network results |

## T08 — Reviewed release handoff

| ID | Condition and required result | Evidence |
|---|---|---|
| A44 | An independent reviewer examines the exact candidate revision against this design and acceptance matrix. Material findings receive fixes and targeted rechecks. | Review record with reviewed SHA |
| A45 | Final verification applies to the actual implementation PR head. Later changes receive the checks relevant to their risk. | Head SHA, command receipts, and PR checks |
| A46 | A real implementation PR explains the changes, tests, compatibility decisions, and remaining release gates. The working preview represents its source. | PR URL and preview evidence |
| A47 | The release owner receives a deployment sequence, obligation and hosted-session decisions, late-payment handling, verification, and rollback. Merge and live mutation remain separately authorized. | Release runbook |
| A48 | The final checkpoint separates package, acknowledgment, implementation, tests, review, PR, merge, and production states. It ends with complete or precise blocked status. | Final execution summary |

## Evidence rules

Do not mark an unavailable live check as passed.
Do not publish payment, customer, credential, or private employer records as evidence.
Use sanitized statuses and approved private evidence references where operational records are required.
Passing source tests proves source behavior. Production completion additionally requires an authorized release and observed live behavior.
