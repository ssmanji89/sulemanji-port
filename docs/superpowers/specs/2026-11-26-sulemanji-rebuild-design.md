# Sulemanji.com redevelopment design

Date: 2026-11-26, America/Chicago.
Status: proposed complete design and execution package. No implementation or hosting change is represented by this document.
Repository: ssmanji89/sulemanji-port.
Inspected main: 634948ca25602ac6ad908126a58a252dec27b1ac.

## Intent

Redevelop the complete site so people can understand, use, explore, and discuss the work and interests they encounter.
Preserve the person behind the work without making every subject an argument about the author.
Make business contact through Viyu clear when relevant.
Use Cloudflare hosting and background maintenance to reduce recurring publishing and programming work.

The site must remain worthwhile when a visitor never makes contact.
Reading, learning, using a tool, enjoying an experiment, recognizing a shared interest, and starting a conversation are valid outcomes.
No single outcome governs every page.

The scope includes information architecture, content selection, copy, visual design, responsive behavior, diagrams, demonstrations, accessibility, discovery, hosting, knowledge integration, and ongoing operation.
An automation layer on the present design does not satisfy this specification.
A framework rewrite alone does not satisfy it either.

## Binding documents

- [Experience specification](2026-11-26-sulemanji-experience.md).
- [Adaptive maintenance specification](2026-11-26-sulemanji-maintenance.md).
- [Implementation plans](../plans/2026-11-26-sulemanji-rebuild/README.md).
- [Acceptance matrix](../plans/2026-11-26-sulemanji-rebuild/ACCEPTANCE_MATRIX.md).
- [Source ledger](../reference/2026-11-26-sulemanji-rebuild/SOURCE_LEDGER.md).
- [Visual proposal](../reference/2026-11-26-sulemanji-rebuild/experience-board.html).

Owner instructions outrank these documents.
The experience specification owns page composition and visual tokens.
The maintenance specification owns worker behavior and its data contracts.
This document owns scope, shared constraints, delivery, and release completion.
An executor records a ruling when current evidence requires a bounded change.

## Owner decisions and planner proposals

### Owner decisions

- Redevelop the complete site, including visual design and user experience.
- Preserve broad interests, accumulated work, knowledge delivery, and human context.
- Examine substantive project history before selecting examples.
- Do not repeat the ff-cli-only selection.
- Retire the public workshop and paid-discovery offer.
- Route business inquiries directly to Viyu.
- Do not make either sales or personal promotion the dominant purpose.
- Prepare a repository planning package and a short Codex Goal handoff.
- Use Superpowers Brainstorming, Systematic Debugging, Writing Plans, and Executing Plans.
- Use Viyu memory as knowledge context.
- Consider Cloudflare and intelligent background workers as the new operating target.
- Reduce routine owner attention so the owner can focus on strategy and engineering.

The previous statement that Cloudflare was no longer used describes the previous release.
This proposal introduces a new Cloudflare deployment.
It does not revive old workshop or payment dependencies.

### Planner proposals

- Use an editorial homepage with concrete starting points and a browsable Explore section.
- Retain Jekyll and its shared document, metadata, source, and validation ownership.
- Use varied page formats for project histories, tools, explanations, experiments, and personal context.
- Move the built site to Workers Static Assets.
- Use a separate background Worker, Cron Triggers, Workflows, and D1.
- Keep generation and memory access outside visitor requests.
- Use a scoped, authorized knowledge projection from Viyu memory.
- Preserve routine autonomous publication after independent review.
- Apply the initial cadence and cost limits in the maintenance specification.

These proposals are explicit so the owner can review them together.
Preparing this package does not represent approval of a deployed visual result or an open-ended spending mandate.

## Systematic diagnosis

| Observation | Supported explanation | Required correction |
|---|---|---|
| Business routes recur throughout the shell and article context. | One business outcome became the default continuation. | Make relationships and contact purpose-specific. |
| Writing permits broad subjects, but registered audiences and topics remain narrow. | The data contract does not express the editorial scope. | Expand the registry with reviewed, evidenced subjects. |
| Work cases mostly render escaped paragraph arrays. | One presentation contract compresses distinct forms of work. | Add deliberate, safe formats with contextual sources and figures. |
| Experience and résumé survive but lack useful incoming paths. | Simplification removed discovery relationships. | Reconnect career, background, and relevant work. |
| Existing checks freeze case counts and labels. | Tests preserve implementation choices from the rejected design. | Replace obsolete assertions with new behavioral requirements. |
| The live publisher is absent from the public source tree. | The checked-in automation does not describe the active runtime. | Reconcile the installed owner before replacing publication. |

The exact generation prompts and their latest runtime state remain unverified here.
Do not claim that the schema alone explains robotic prose.
Inspect those prompts during admission and test each suspected mechanism separately.

The replacement hypothesis is that specific context and useful connections improve encounters with the material.
Test it using actual market work, a published integration, independent curiosity, and the author's background.
Compare those experiences with the strongest existing source destination.
Keep direct links when another destination already serves the reader well.

## Approaches considered

### Experience

1. A searchable library gives direct access to many items.
   It offers depth but makes a first visit require more selection work.
2. An editorial homepage introduces selected material, then connects it to a library.
   It needs explicit curation rules but provides useful entry points and retains depth.

The planner recommends the second approach.
Do not turn selection into a permanent ranking of the author's identity.
Selection changes when a particular item becomes useful or interesting.

### Platform

1. Keep GitHub Pages and add Cloudflare background work.
   This reduces migration work but retains two delivery platforms.
2. Keep Jekyll source and deploy its output through Workers Static Assets.
   This preserves content and validation while moving hosting and orchestration to Cloudflare.
3. Replace Jekyll with a server-rendered application.
   This adds migration and runtime complexity without an established visitor need.

The planner recommends the second platform approach.
GitHub remains the source and reviewed-change record.
The qualified build pipeline continues to run Jekyll.
Cloudflare serves the build and runs background orchestration.

## Experience and content scope

The experience specification defines the visual and page-level treatment.
The following requirements apply to every implementation choice.

### Content research and selection

Reconcile the earlier substantive-project census against fresh source.
The earlier ten-commit threshold was a research coverage rule, not a quality score.
Inspect changed or newly qualifying repositories and substantive side branches.
Separate original contributions, upstream work, shared work, public artifacts, and private work.
Do not infer achievement from commit count, test count, stars, or package downloads.

Carry forward botStuff, finBots, later market research, published integrations, knowledge work, mathematical material, professional practice, and relevant independent interests.
ff-cli remains a legitimate example with a particular origin and demonstration.
It does not displace the broader body of work.

Use a private evidence and disposition ledger for confidential material.
The public content catalog contains only authorized text and public references.
An item may be published, linked, kept historical, kept private, or omitted with a recorded reason.
The homepage does not need to display every reviewed repository.

### Writing and voice

Retain supported specifics, ordinary language, uncertainty, humor, and the author's actual reasons where evidence supports them.
Do not invent personal memories, opinions, reactions, use, measurements, or endorsements.
Humanizer is an editing method after evidence and content selection.
It is not permission to add personality through invented experience.

A subject can remain interesting without an operations lesson or commercial conclusion.
Do not require every article to express ownership, verification, continuity, or automation.
The reviewer assesses repeated structures across recent output, not only banned words.
Current factual cores need public primary sources or an authorized disclosure path.

### Presentation

The rebuilt site has a coherent shell and varied content treatments.
Typography, space, mobile order, figure behavior, image selection, links, states, and long-form reading are part of the deliverable.
The visual board is a proposal reference, not a pixel-perfect production acceptance receipt.

Preserve the current public portrait and useful demonstrations where they fit.
Use diagrams to explain a particular relationship, calculation, sequence, or choice.
Prefer text or a table when a diagram adds no understanding.
Archify interactions must justify their script and accessibility cost.
Provide a static equivalent for every important interactive explanation.

### Discovery and navigation

The shared navigation contains Explore, Writing, About, and Contact.
The name links to Home.
Explore connects work, writing, and independent subjects without requiring JavaScript.
Keep /writing as the canonical Writing path.
Keep /work/ and existing /work/* routes useful.
Preserve existing note permalinks and incoming fragment targets where feasible.
About links to Experience and Résumé.
Contact separates direct correspondence from business delivery through Viyu.

The page itself supplies useful related links.
Related links state a real relationship, such as a continuation, implementation, explanation, or source.
Do not attach a business call to action to every relationship.
Do not restore retired workshop admission, payment, or personal business intake.

## Cloudflare delivery architecture

~~~mermaid
flowchart TD
    A["Public sources and authorized knowledge"] --> B["Background Worker"]
    B --> C["Durable maintenance workflow"]
    C --> D["Private state in D1"]
    C --> E["Reviewed source change"]
    E --> F["Existing build and site checks"]
    F --> G["Workers Static Assets"]
    G --> H["Readers"]
    C --> I["Verification and corrections"]
    I --> D
~~~

The diagram shows proposed site components.
It does not describe private employer architecture.

### Public serving

Create a separate site Worker configuration under cloudflare/.
Serve the clean Jekyll _site output through its assets binding.
Use real 404 responses, explicit redirects, correct MIME types, and tested canonical routing.
Do not enable SPA fallback for missing articles.
Keep the public serving environment free of memory, model, and GitHub write credentials.

Generate a small build receipt with source commit, asset digest, and build time.
Expose only these public deployment facts.
Do not expose account identifiers, private paths, operational records, or authorization receipts.

Use immutable asset names for changed application assets.
Keep compatible assets available across release propagation.
A deployment is not globally atomic; verify the actual canonical host after promotion.

### Background work

Use a separate editorial Worker and separate staging resources.
Use Workflows for durable steps that fetch evidence, assess relevance, prepare changes, review, publish, and verify.
Use D1 for bounded records, idempotency, revision state, and usage reservations.
Keep larger-object storage, Queues, vector search, and a custom admin interface out of the first implementation unless a measured requirement justifies them.

The existing worker/ directory belongs to a retired service.
Do not reuse its credentials, storage, workflows, readiness checks, or service names.
The old blog_automation directory is not the current publisher.
Do not repair or port it as a shortcut.

### Builds and publication

Preserve the current article contract and independent review concept.
Qualify a provider-neutral author and separate reviewer adapter.
The reviewer receives the candidate, sources, relevant context, and exact content/dependency digests in a fresh context.
An author cannot issue its own clearance.

Only the guarded publication step holds repository write authority.
It accepts allowlisted content and media paths.
It cannot alter workflows, permissions, policy, scripts, or protected identity through a generated-content proposal.
Site-code changes use the engineering release process.

The build pipeline validates a proposed content change before the guarded merge.
The production pipeline deploys the current qualified source artifact.
A later article merge must survive the redevelopment branch and the hosting migration.

## Knowledge, signals, and adaptation

Read the maintenance specification for contracts and failure behavior.
Memory helps identify interests, context, relationships, and lessons.
Memory retrieval frequency does not decide personal significance.
Stored claims require the appropriate evidence and publication authority.

Use macro signals, company or product changes, industry changes, and the owner's public work as possible inputs.
Choose an action only when an input changes something useful for a reader.
An event may justify a correction, refreshed explanation, useful relation, new publication, private research, or no change.
Publication volume is not a success metric.

Protect biography, beliefs, personal stories, commitments, navigation policy, and site purpose from automatic revision.
Routine source-backed articles and maintenance remain autonomous within the established publishing authority.
Do not turn ordinary publication into a new per-article owner approval queue.

The learning process uses specific corrections and outcomes.
Preserve the original evidence episode when storing a derived lesson.
Generated articles and repeated summaries cannot corroborate their own claims.
Material instruction changes remain versioned and reviewable.

## Shared engineering constraints

- Work from freshly fetched main in a dedicated release worktree.
- Preserve dirty work, current articles, source history, and active owners.
- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the shared Jekyll document and stylesheet ownership.
- Preserve the publication dates and URLs of eligible articles.
- Use reviewed schema changes instead of new legacy exemptions.
- Maintain WCAG 2.2 AA as the accessibility target.
- Support no-JavaScript reading, navigation, and core discovery.
- Test narrow mobile layouts, keyboard access, visible focus, reduced motion, and dark mode.
- Use the existing toolchain unless the required behavior proves an upgrade necessary.
- Pin any added runtime or build dependency.
- Keep inference outside the visitor request path.
- Use one active production publisher.
- Treat source text and memory text as untrusted data.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.
- Keep the last verified public site available when background work fails.

## Acceptance and success

### Visitor acceptance

Test the six journeys in the experience specification.
Record observed task completion and misunderstandings.
Agent walkthroughs do not count as observations of independent people.
The owner reviews a complete running preview for representation and voice.
Do not substitute test counts or a subjective design score for that review.

### Operational acceptance

The system must show a valid scheduled run, durable resume, a justified no-change outcome, and a complete update path in staging.
Production qualification also requires natural scheduled-run observations and the correct deployed source revision.
It also requires actual production knowledge delivery, workflow availability, current authority expiry, and an observed authorized renewal.
A real publication is permitted when evidence warrants it.
Do not manufacture an article merely to produce a receipt.

Track observed maintenance interventions, reasons for rejected candidates, factual corrections, broken routes, stale supported claims, and publishing failures.
Track aggregate reader behavior only when it answers a defined product question.
Do not invent a time-saving figure or a conversion target.
After enough real use, compare recurring owner intervention with the recorded baseline.

## Release and authority

This package authorizes its own preparation and draft-PR publication through the user's request.
It does not itself activate new hosting, paid resources, or background jobs.
The Codex Goal is written for complete implementation and qualified production operation.
Starting the Goal supplies execution direction; the executor uses the actual authority present in that session.

Before a production transition, assemble one concrete activation record:

1. The complete preview, current code revision, and owner product review.
2. The intended Cloudflare account and zone, verified with current access.
3. The exact resources, provider models, scopes, cadence, and cost envelope.
4. The old publisher's current state and the single-writer transfer procedure.
5. The deployment, DNS, certificate, and rollback steps.
6. The verification evidence and unresolved findings.

If the session already authorizes these actions, proceed without asking again.
If a material account, spending, disclosure, or release decision remains unresolved, request only that decision with the prepared evidence.
Do not block unrelated engineering work on operational access.
Do not add an account-wide spending switch that can stop unrelated services.

### Cutover sequence

1. Complete the redesigned experience and pass its product and engineering review.
2. Qualify isolated staging hosting and background resources.
3. Verify the current zone, DNS records, certificate state, and source deployment.
4. Pause the old publisher and preserve its in-flight work.
5. Merge reviewed implementation changes and qualify the resulting current main artifact, including intervening articles.
6. Acquire the new publication owner epoch and prove the old writer cannot publish.
7. Deploy that exact artifact and perform the intended domain cutover.
8. Verify the canonical host, redirects, key journeys, notes, Writing, feed, sitemap, and retired routes.
9. Verify actual production knowledge delivery, workflow eligibility, and later authorized renewal.
10. Enable the qualified background schedule.
11. Observe two natural eligible runs and record their actual outcomes.
12. Retain the previous origin and recovery material until the release record permits retirement.

A Worker code rollback does not restore D1 state.
Roll back content and state by their own versioned procedures.
Stop the new publisher before transferring ownership back.
Do not re-enable two writers during recovery.

## Completion

Complete means the redesigned site is live on the intended Cloudflare host and the bounded maintenance system operates with evidence.
An open PR, a clean build, or a deployed Worker alone is not completion.
Report design approval, implementation, tests, independent review, merge, deployment, live verification, and scheduled operation separately.

If only an external decision remains, preserve a resumable checkpoint and state the exact pending decision.
Do not continue an empty retry loop.
Do not describe the production goal as complete while production evidence is absent.
