# Sulemanji experience design

**State:** Design proposal; not deployed.
**Date:** 2026-11-26.
**Scope:** The complete visitor experience, including the public content that background workers maintain.
**Companion:** [Annotated experience board](../reference/2026-11-26-sulemanji-rebuild/experience-board.html).

## Purpose

The site helps people discover, understand, use, and enjoy Suleman's work and interests.
It gives useful material a clear context and a human author.
A successful visit can end with learning, enjoyment, a useful tool, or a specific conversation.

Business needs have a clear route to Viyu.
That route does not determine every subject, page, or next step.
The site must also preserve enough maintenance capacity for Suleman to continue his engineering and independent work.

The design below is a recommendation.
Its copy and tokens remain proposed choices.
It does not establish visitor demand or approve a new claim.

## Experience structure

Use four main navigation links: **Explore**, **Writing**, **About**, and **Contact**.
The name links to Home.
Keep Writing's canonical route exactly `/writing`.

Explore becomes the browsable collection at `/explore/`.
Preserve `/work/`, every current case URL, existing article URLs, feeds, and useful historical routes.
About links directly to Experience and Resume.
A visitor must not need to guess a URL to find career history.

Use ordinary links and server-rendered content.
Search and filters improve an already usable collection.
The public site remains readable during an automation, model, memory, or JavaScript failure.

### Home

The introduction identifies Suleman and gives a short account of his range.
Show the real portrait at a modest size.
Keep employer context accurate and concise.

The first selection contains concrete material:
- The botStuff, finBots, and robinBots project family.
- A named public integration, such as Cavelo nodes for n8n.
- A mathematical explanation or practical astronomy article.
- A visible route to the broader collection.

Use one larger project feature beside shorter tool and curiosity entries.
Avoid equally sized generic cards for every item.
A visitor should see actual names and questions before general claims about engineering.

A small recent-changes section can show substantive updates.
Each entry explains what changes and why the reader may care.
Do not invent activity, refresh dates without changes, or reorder the whole page on every request.

Home ends with a short personal introduction and links to About and career history.
It does not end with a mandatory sales pitch.
The explicit selection in `_data/featured-content.yml` controls the featured IDs.

### Explore

Explore combines projects, tools, explanations, experiments, and selected writing.
It does not duplicate article bodies or replace maintained package documentation.

Provide search and filters for subject, format, and availability.
Use clear availability wording: public source, published package, demonstration, historical work, or explanation only.
Explain these states in ordinary language.
Do not confuse published source with supported production operation.

Each result has a concrete title, a useful summary, its format, and a destination.
Use relevant context before badges.
Support an understandable empty state with a clear reset action.

The collection should support several entry styles.
A visitor can search a tool name, browse a subject, or follow a related question.
Topic pages offer a small useful introduction and selected material.
They must not become automatically generated pages with thin filler.

### Work and project details

Preserve the six current work routes while improving their treatment.
The Work index can remain a selected subset of Explore.
Do not retain the number six as an editorial limit.

Use formats suited to the material.
A project family explains development across implementations.
A tool page explains its job and leads to maintained usage instructions.
An experiment explains the question, method, observations, and remaining uncertainty.

Place evidence beside the claim it supports.
Keep source and attribution visible.
A historical project must not appear maintained merely because its page changes.

The market account should explain how the projects relate.
It should distinguish data collection, analysis, recorded intentions, and external actions where relevant.
It makes no trading-performance claim.

The Cavelo tool treatment should name the workflow and available package.
It should explain relevant limits without repeating an entire README.
HaloPSA and ConnectWise work remain distinct tools with their own evidence and status.

### Writing and articles

Writing retains a dated publication index at `/writing`.
Preserve original publication dates and distinguish substantive updates.
Keep the existing Writing schema and its validation boundary.

Broaden the registered readers and topics through a reviewed data change.
Use actual subject names, including supported independent interests.
A nonprofessional subject does not need an operations lesson.

Article pages prioritize readable prose, nearby citations, and an explanatory figure when it helps.
Keep body text within 68 characters per line.
Use a compact contents list only when a long article benefits from one.

Display a clear title, description, author, publication date, and substantive update date.
Show source dates or research cutoffs where they affect interpretation.
Do not display internal review scores or worker-state jargon as reader-facing content.

Related material explains its relationship in a sentence.
A mathematical account may link to its checkers and another explanation.
A tool article may link to a package.
A business conversation appears only where the subject supports it.

### About, Experience, and Resume

About restores specific background and independent interests.
It can use public-safe details already available, including Houston, managed IT, and earlier mechanic work.
Connect those details to relevant material where a useful connection exists.

Give career history a direct, visible link.
Experience retains employer chronology and education.
Resume provides a concise professional account with reviewed claims.

Do not restore old autobiographical material or PDFs wholesale.
Some historical copy contains unsupported claims or private details.
Do not invent personal anecdotes from general memory.

A visitor should understand the person without requiring every interest to demonstrate professional competence.

### Contact

Present direct correspondence and business delivery as clear options.
Use ordinary language about discussing a project, a question, or professional work.
Use the existing verified email, GitHub, and LinkedIn destinations.

Explain that business delivery belongs with Viyu.
Link directly to its contact page.
Do not introduce a personal-site intake, workshop, inventory, or paid-discovery flow.

Relevant professional accounts explain dependable daily operations and the particular automation that supports them.
Describe client fit through an evidenced operating need, such as continuity, identity, migration, or integration work.
Do not infer a company size, industry specialization, service promise, or result from private planning records.
Let a specific account explain why a Viyu conversation may help.

## Content and relationship ownership

`_data/content-catalog.yml` provides stable records for the collection.
It references canonical material rather than copying note bodies.
Existing work-case data receives a migration adapter.
The Writing front matter remains authoritative for articles.

`_data/content-relations.yml` records meaningful relationships and optional next steps.
Each relationship has a reason a reader can understand.
`_data/featured-content.yml` stores deliberate featured selections.

`_plugins/content_catalog.rb` produces the public content index and topic pages.
The implementation plan owns exact interfaces.
These records must not contain private source material or internal evidence.

Background workers can propose or make authorized updates to these records.
Stable author context and historical attribution receive different treatment from changing public-source facts.
The presentation never makes a source refresh look like new firsthand experience.

## Editorial acceptance

An item qualifies when it supplies a useful explanation, usable artifact, interesting observation, or honest account of an investigation.
It does not need commercial intent.
It does need enough substance to justify its place.

Use specific project names and the actual question.
Preserve attribution, uncertainty, and delivery state.
Avoid repeated abstract claims about evidence, ownership, or reliability when a concrete example communicates more.

Select material across sustained work and real interests.
Do not rank projects solely by a demo, release badge, popularity, or commit count.
Comprehensive research supports selection; it does not require equal prominence for every repository.

A macro or industry signal can identify a relevant change.
A project release can identify a concrete update.
Neither permits invented opinion, urgency, personal experience, or investment results.

A worker can conclude that no public update is useful.
Its success measure includes maintained usefulness and reduced owner interruption.
An output quota must not override the editorial criteria.

## Visual system proposal

| Token | Light proposal | Dark proposal | Use |
|---|---|---|---|
| Background | `#F7F5EF` | `#111B29` | Main page |
| Surface | `#FFFEFA` | `#182537` | Selected panels |
| Text | `#18232E` | `#EDF1F5` | Body and headings |
| Muted text | `#586372` | `#B8C4D2` | Supporting context |
| Link | `#234FD4` | `#93B2FF` | Underlined text links and focus |
| Data emphasis | `#9C4630` | `#E9A28C` | One meaningful figure or annotation |
| Rule | `#C9CDD1` | `#465469` | Dividers; never sole state signal |

Use system sans-serif for body text and controls.
Use Georgia for display headings.
Use monospace only for code or values that need exact alignment.
No downloaded font is required.

Set body text near 18px with a line-height near 1.65.
Use a 68ch prose measure and an approximately 1180px main layout.
Headings scale without changing their hierarchy.
Use restrained borders, small corner radii, and ample spacing.

Keep links identifiable without color alone.
Provide visible keyboard focus and 44px minimum control targets.
Respect reduced-motion and color-scheme preferences.
Avoid decorative movement and live updates that shift focused content.

The board reuses the actual portrait.
Its mathematical figure is an unchanged existing asset used to show placement.
A later figure revision must follow the approved visual tokens and preserve its meaning.

## Six visitor journey checks

1. **Market history:** From Home, find the market family and explain how at least two implementations relate.
   Reach a valid public source and identify the limits of the account.
2. **Practical integration:** From Explore, find Cavelo, HaloPSA, or ConnectWise by name or workflow.
   Identify its job, availability, and maintained destination.
3. **Independent curiosity:** Reach a mathematical or astronomy item from Home or Explore.
   Understand its subject without a forced professional conclusion or business CTA.
4. **Human and career context:** From About, reach Experience and Resume through visible links.
   Find specific public-safe background and accurate employment context.
5. **Relevant contact:** Find direct correspondence and the Viyu business route.
   Complete the choice without encountering the retired intake or workshop.
6. **Return visit:** Identify a substantive update and distinguish it from original publication.
   Follow the update to its source while historical material remains available.

Test these journeys with real content.
Passing source tests does not establish reader understanding.
Record observed task completion and confusion separately from visual preference.

## Responsive and verification requirements

Check 320px, 390px, 768px, and 1440px layouts.
Check light and dark themes, keyboard use, no JavaScript, reduced motion, and 200% zoom.
Allow local scrolling for a necessary code block or table; avoid page-level horizontal scrolling.

Check a long article, a tool, a project family, a diagram, and an empty collection state.
Verify image descriptions, link text, focus order, headings, and canonical destinations.
The standalone board demonstrates the proposal.
It does not verify production behavior, external links, automation, or a deployed application.

## Source basis and artifact verification

Seed material uses the current public [market account](https://www.sulemanji.com/work/market-systems/), [integration account](https://www.sulemanji.com/work/integrations/), and [mathematical account](https://www.sulemanji.com/work/mathematical-verification/).
The [About](https://www.sulemanji.com/about/), [Experience](https://www.sulemanji.com/experience/), and [Writing](https://www.sulemanji.com/writing) pages supply the remaining public context.
These sources establish public accounts, not new deployment or performance evidence.

Static checks cover local assets, fragment links, and proposed text-color contrast.
The Chromium wrapper exists, but its browser executable is absent.
Playwright also has no installed browser binaries.
No screenshot or visual-browser validation is claimed.
