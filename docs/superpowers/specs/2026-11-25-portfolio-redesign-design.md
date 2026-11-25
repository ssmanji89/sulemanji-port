# Sulemanji portfolio redesign — design

## Intent

Make the site explain Suleman's professional work and independent interests through a clear visitor journey.
Lead with dependable daily operations and practical automation for lean teams.
Route business inquiries directly to Viyu Network Solutions.
Preserve the personal profile, substantial projects, and complete current writing archive.

## Owner decisions

- Retire the public workshop and paid-discovery offer.
- Direct organizational inquiries to Viyu rather than mandatory personal intake.
- Review substantial project histories before selecting prominent work.
- Give market systems, published packages, knowledge tools, and professional practice appropriate space.
- Keep ff-cli as one substantial case within the broader portfolio.
- Select relevant personal subjects from supported career and project evidence.
- Use Superpowers with the requested research, diagram, review, and writing references where they help.
- Prepare a repository PR with complete plans and a Codex CLI prompt under 4,000 characters.

These decisions replace conflicting workshop and contact-routing rules.
They do not authorize private employer disclosures, unsupported outcomes, or automatic public release.

## Current state and important deltas

The canonical repository is `ssmanji89/sulemanji-port`.
The inspected main commit is `5ab5122b61a16ed0bb72067b8a346c67f3091bfa`.
It contains 53 `notes/*.md` files. Article eligibility still comes from the Writing contract.

The working private preview is available at <https://sulemanji-redesign.sulemanji-llc.chatgpt.site/>.
Its source revision is `159ce931d6aaa43b3fcd5dddcaad1c7fe6bb7eb3` in the separate Sites repository.
Its article data preserves 41 articles from production revision `e12229f07dfabb9287a944200955f451bc83fc9c`.
Do not replace newer production writing with that snapshot.

The preview demonstrates presentation, cases, diagrams, search, and navigation.
It does not implement the current Jekyll publisher or retire the live Worker.
Its noindex setting belongs to a private preview and must not disable production discovery.

## Approaches and implementation choice

| Approach | Consequence | Decision |
|---|---|---|
| Replace production with the preview's Python builder | Duplicates presentation ownership and risks losing current Writing controls | Reject |
| Adapt the design into the current Jekyll shell | Preserves publishing, metadata, deployment, and source ownership | Use |
| Keep the existing site and add another projects page | Leaves the fragmented navigation and retired offer flow | Reject |

The assistant selects the Jekyll adaptation because the repository explicitly requires shared presentation ownership.
This package contains no new runtime application.
Its frozen reference HTML is documentation and remains excluded from the public build.

## Visitor structure

| Route | Purpose |
|---|---|
| `/` | Introduce the person, professional positioning, selected work, writing, and Viyu contact |
| `/work/` | Present six meaningful case studies |
| `/work/service-operations/` | Explain the approved professional practice at Viyu |
| `/work/market-systems/` | Explain botStuff, finBots, robinBots, and later market-agent work |
| `/work/integrations/` | Explain published packages and current integration work |
| `/work/knowledge-tools/` | Explain persistence, memory, process, and agent continuity |
| `/work/ff-cli/` | Explain valuation and decision tools with the public demonstration |
| `/work/mathematical-verification/` | Explain independent exact reproduction with clear attribution |
| `/writing/` | Discover every eligible current article through search and categories |
| `/about/` | Connect the career, working method, and selected personal interests |
| `/contact/` | Separate direct Viyu business contact from personal correspondence |

Retain useful career, disclosure, and professional practice routes.
Redirect `/projects` to Work, `/story` to About's background, and `/beyond` to About's interests.
Redirect the replaced ff-cli and service-delivery cases to their current Work cases.
Keep all original eligible article URLs.

Do not advertise inventory or ask features in the visitor flow.
The inspected source has no dedicated `/inventory`, `/ask`, or `/grill-me` pages.
Harmless compatibility redirects for those aliases may lead to Contact.
Do not remove operational asset-inventory writing merely because its title contains “inventory.”

## Visual direction

The assistant selects an editorial design with warm paper, deep green, thin rules, and generous spacing.
Use a serif display face and a readable sans-serif body face.
Use the real public portrait and current demonstration assets.

| Token | Value |
|---|---|
| Paper | `#f4f2ec` |
| Ink | `#172c25` |
| Green | `#244c3d` |
| Muted text | `#626e65` |
| Rules | `#c9d0c5` |
| Clay accent | `#a34c31` |
| Pale green | `#e1e7dc` |

Implement tokens in `assets/css/components/theme.css`.
Implement shared presentation in `assets/css/style.scss`.
Reuse the existing font loading and update it only when the selected fonts require a justified change.
Use inline SVG arrows where font subsets lack a glyph.
Avoid synthetic performance charts, invented statistics, testimonials, and generic technology imagery.

The Home sequence is introduction, Viyu context, four primary work families, two personal cases, and selected writing.
The contact action remains clear in the header and relevant sections.
The six cases use readable prose, project states, sources, and explanatory diagrams.
The design must remain usable at 320 CSS pixels, 200% zoom, and without JavaScript.

## Shared production ownership

`_layouts/default.html` keeps the document, skip link, one main landmark, hero, and script loading.
The existing header, navigation, and footer includes keep their responsibilities.
Use `page.body_class` and `page.wide_content` when they help the new layouts.
Keep metadata in the current head, schema, and front-matter paths.
Keep one stable Person identity.

Use the current navigation script rather than adding a second menu implementation.
Enable mobile disclosure only after its event handlers attach.
Keep links available when JavaScript fails or is disabled.

## Content and attribution

The reference directory contains curated case, About, career, privacy, and disclosure copy.
It also contains the seven accessible diagrams and a provenance manifest.
Treat these as implementation input. Reconcile them with later owner corrections and current public source.

Keep professional framing as a services engineer at Viyu.
State the agent-assisted implementation role accurately: direction, architecture, contracts, orchestration, review, and evidence judgment.
Do not imply sole authorship of upstream or shared work.
Keep published packages, historical source, prototypes, methods, and deployed systems distinct.

The market case describes engineering history and makes no performance claim.
The ff-cli auction demo uses synthetic owner names. The actual league uses a snake draft.
The mathematics case credits discovery and the external formalization separately from independent reproduction.
The professional diagram explains a general working method, not private employer architecture.

Use the corrected career copy. Remove unsupported metrics and unnecessary employer implementation details.
Exclude both old résumé PDFs from public output unless a safe replacement is generated and reviewed.
Removing a link alone does not remove the old public asset.

## Writing and discovery

`_plugins/writing_discovery.rb` remains the article-eligibility owner.
Render search entries from `site.data.writing_discovery.articles` and `.legacy`.
Preserve schema-v1 article bytes, original dates, legacy exceptions, sources, images, and commercial-link attributes.
Do not add a legacy exemption to make the redesign pass.

Use `_data/writing-categories.yml` for display categories keyed by canonical article URL.
Categories are Operations, Automation, Security, and Research.
Use Other for an eligible article with no explicit mapping. Show that filter only when it has results.
This fallback keeps new articles visible without changing the publisher's article schema.

Search titles, summaries, and display categories.
Combine case-insensitive search terms with category selection using AND.
Keep count, empty state, reset, and URL query state consistent.
Provide all eligible articles without JavaScript.

Preserve feed, sitemap, canonical, social image, publisher validation, and robots ownership.
New Work and Contact pages need appropriate discovery entries.
Retired public routes must not remain promoted in the sitemap or navigation.

## Contact and offer retirement

Business actions use <https://viyu.net/contact-support/contact-us/>.
Personal correspondence uses the existing public address and profile links.
Do not add a new lead form or collect business details on the personal site.

Remove workshop promotion, personal intake, priority discovery pricing, and new checkout entry points.
Public landing, intake, and priority routes lead to Contact.
Keep quote, thanks, and terms routes available only where current obligations require them.
Remove them from discovery and navigation while preserving necessary customer servicing.
After a verified zero-obligation disposition, those routes can also redirect through a separately authorized release.

Already-created hosted checkout sessions can still accept payment after new session creation stops.
Reconcile unpaid sessions, payment links, pending callbacks, and paid cases through authorized read-only inspection.
The release owner decides which existing offers remain honored and which sessions require authorized expiration.
Preserve late-payment callbacks and record their servicing outcome. Do not claim complete retirement from route denial alone.

The private preview redirects all legacy offer routes. Production needs the additional obligation check described here.
Do not treat the preview's routing as proof that existing obligations are absent.

Add `PUBLIC_OFFER_MODE` with `active` and `retired` values to the existing Worker contract.
Treat missing or unknown values as retired.
Retired mode closes new intake and deposit-checkout creation.
Keep the existing origin check before the retirement response.
Return HTTP 410 with `{ "error": "offer_retired", "contactUrl": "https://viyu.net/contact-support/contact-us/" }` for valid-origin retired requests.
Do not parse request bodies, create records, reserve counters, or call external providers on that branch.

Do not use `SERVICE_MODE=setup` as a substitute. Current source uses it for scheduled work, not public admission.
Keep existing paid-case quote and balance-checkout servicing, webhook processing, refunds, administration, and retention until their disposition is known.
The existing quote hold route can create a balance checkout for a paid scheduling case. Do not disable it indiscriminately.
Test that only the existing eligible case states retain that servicing path.

No Worker deletion, database deletion, remote migration, live flag change, payment, or message occurs during this handoff run.
Prepare the code, deployment sequence, rollback, and obligation record for the release owner.

## Verification and acceptance

The [acceptance matrix](../plans/2026-11-25-portfolio-redesign/ACCEPTANCE_MATRIX.md) defines 48 cases across eight tasks.
The [source ledger](../plans/2026-11-25-portfolio-redesign/SOURCE_LEDGER.md) identifies current files and existing gates.
Replace assertions for retired behavior with explicit coverage for the new behavior.
Preserve useful public-safety, writing, metadata, navigation, and output-boundary checks.
Extend public-safety coverage to new nested Work content and generated output.

The final engineering handoff needs a real source PR, build and test receipts, independent review, browser evidence, and exact remaining release actions.
Production completion additionally requires authorized release and observed live behavior.
The planning package alone establishes neither implementation nor production completion.
