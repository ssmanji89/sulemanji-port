# Command Center Portfolio Redesign

Date: 2026-05-21
Repo: `/Users/sully/Documents/GitHub/sulemanji`
Live site: `https://www.sulemanji.com`

## Goal

Reposition the live GitHub Pages site from a narrow "MSP Solutions Architect" portfolio into an operator/engineering command center that reflects Suleman Manji's current work across Viyu services engineering, MSP control planes, agentic operations, financial-agent runtimes, MCP/API tooling, and memory-backed local automation.

The site should make the work easy to scan without exposing client-sensitive details. It should show the systems being built, the operational problems they address, and the proof-oriented engineering style behind them.

This document is internal planning context. Absolute local paths, workspace scans, source repo names, and employer-adjacent evidence in this spec must not be copied directly into public pages, metadata, generated data files, or visible source comments.

## Evidence Base

The design is grounded in a git-based scan of `/Users/sully/Documents/GitHub`, with emphasis on recent authored work. The strongest public-safe clusters are:

- `viyu-agents`: proof capture, billing readiness, SPLA and cloud-import paths, AlgaPSA overlays, closure queue gates, ConnectWise safety standards, SOW readiness, Graph and Teams gates, deployment proof, and GitHub control-plane governance.
- `finbots26`, `hermes-finbots`, and `TradingAgents`: forecasting modules, paper-trading gates, Alpaca adapters, risk gates, reconciliation, scalping signal engines, Telegram delivery, backtest IC scoring, and runtime verification.
- `hermes-agent` and `hermes-mem0`: mem0/Qdrant memory, local skills, Viyu CLI persistence, LiteRAG/PTRI-style recall, model health, Telegram resilience, and agent runtime packaging.
- `am-dashboard`, `bodhi-teams`, and managed-services repos: ConnectWise and ITGlue integrations, engineer dashboards, QA route audits, Teams panels, dispatch scoring, capacity thresholds, and Claude-assisted reasoning.
- MCP/API tooling repos: HaloPSA, n8n, M365/mailbox, Graph, and related toolchain work.

The existing live site already uses Jekyll on GitHub Pages and should remain the delivery surface for the first phase.

## Positioning

Primary headline:

> Proof-Gated AI Operations for MSP Systems

Supporting line:

> I build command planes, agent runtimes, and memory-backed automation loops that turn MSP work into safer, verifiable operator workflows.

Supporting identity facets:

- Sr. Services Engineer at Viyu Network Solutions.
- MSP systems engineer.
- Agentic operations engineer.
- Control-plane governance builder.
- Financial-agent runtime builder.

"MSP Solutions Architect" remains valid, but it should be a facet rather than the whole site identity.

## Information Architecture

Phase 1 navigation should be:

- Home
- Work Map
- Projects
- Notes
- About

Contact should be a homepage/about section and footer route target, not a separate top-level page in phase 1. Case Studies should be deferred until at least one public-safe case study passes redaction review.

Existing `Experience` and `Technical Skills` pages should remain reachable but move out of primary navigation unless they are rewritten into the new story. `Experience` should be folded into `About`; `Technical Skills` should be folded into `Work Map` and `Projects` through stack metadata.

For the first implementation phase, new pages should be limited to:

- `/work-map`
- `/notes` if the current `/blog` page cannot be safely repurposed in place

The current `/blog` route should remain accessible for backwards compatibility. If `/notes` is added, `/blog` should either redirect to `/notes` or display a short pointer to curated notes.

## Homepage Design

The homepage should feel like a command center: dense, calm, current, and operational. It should not feel like a marketing landing page, resume dump, or fake terminal toy.

Sections:

1. Status Header
   - Headline: "Proof-Gated AI Operations for MSP Systems"
   - Short current-state line.
   - Primary actions: view work map, view featured systems, contact.
   - Compact metadata chips: Viyu, MSP operations, Microsoft 365, MCP, Qdrant/mem0, financial agents.

2. Featured Systems Strip
   - Two or three concrete systems above the fold on mobile and desktop.
   - Each item should show public-safe display name, problem, proof type, and stack chips.
   - The strip should anchor the page in real work before the broader lane taxonomy appears.

3. Active Systems Lanes
   - MSP Control Plane
   - Agent Runtime and Memory
   - Financial Agent Systems
   - MSP Platform Apps
   - MCP/API Tooling
   - Technical Writing and Runbooks

   Each lane should follow this narrative sequence:
   - Problem surface
   - System built
   - Proof discipline
   - Operator leverage

   Each lane should include a one-sentence purpose, representative public-safe systems, and a proof/output indicator.

4. Proof Stream
   - A compact strip that communicates how work is validated.
   - Examples: proof capture, dry-run gates, runtime verification, readiness snapshots, audit trails, GitHub issue/project governance.
   - This should be conceptual and public-safe, not a raw ticket feed.

5. Featured Systems Detail
   - Four to five high-signal project cards.
   - Initial public-safe display candidates:
     - MSP Operations Control Plane
     - Financial-Agent Paper Runtime
     - Agent Memory and Runtime Infrastructure
     - Operator Dashboard Systems
     - MCP/API Toolchain

   Each card should use a consistent structure:
   - Problem
   - System built
   - Proof or output
   - Stack
   - Status

6. Audience Routes
   - MSP/service leaders: operational leverage, proof gates, safer automation.
   - Engineering peers: architecture, runtime boundaries, tooling choices.
   - Recruiters/hiring managers: scope, stack, and delivery evidence.
   - Agent/tooling collaborators: MCP, memory, runtime, and workflow patterns.

7. Operating Principles
   - Live evidence before claims.
   - Safety gates before writes.
   - Durable handoffs over chat-only status.
   - Public-safe abstraction of client work.
   - Automation with accountability.

8. Contact / Work With Me
   - Direct contact links.
   - Concise note about useful collaboration: operational automation, MSP systems, M365 diagnostics, agentic workflows, proof-oriented engineering.

## Work Map

The Work Map page should organize the breadth of work without forcing every repo onto the homepage.

Recommended groups:

- MSP Operations Control Planes
- Microsoft 365 and Graph Diagnostics
- PSA/RMM and Documentation Integrations
- Agent Runtime, Memory, and Skills
- Financial-Agent Systems
- Dashboards, QA, and Operator Interfaces
- Technical Writing, Runbooks, and Evidence Artifacts

Each group should have a short description, representative repos/systems, and public-safe outcomes.

Work Map entries should be backed by curated data rather than a generated full-workspace inventory. The display model for each lane is:

- `display_name`
- `public_summary`
- `problem_surface`
- `system_built`
- `proof_examples`
- `operator_leverage`
- `stack`
- `status`
- `public_links`
- `safety_notes`

## Case Studies

Case studies should be written as system stories, not client disclosures. They are phase-2 unless a candidate passes the redaction rubric below and has enough public-safe detail to be useful.

Initial case study candidates:

- Proof-Gated MSP Billing Readiness
- Closure Queue and Ticket Safety Gates
- Financial-Agent Paper Runtime and Reconciliation
- Agent Memory and Local Runtime Infrastructure
- Teams / AM Dashboard Operator Surface

Each case study should follow:

- Context
- Operational problem
- Constraints and safety boundaries
- System design
- Proof and verification
- Resulting operator leverage
- What changed after the work

## Projects

The Projects page should use a manual allowlist of public-safe projects. It must not enumerate, classify, or publish metadata from the full `/Users/sully/Documents/GitHub` tree.

Each project item should include:

- Name
- Category
- Status
- Stack
- Public-safe summary
- Link to repo when appropriate
- Evidence/output type

Avoid listing every local repo. Prioritize systems that support the current identity and have an explicit public-safe display name.

Phase 1 should create or update a curated data source, preferably `_data/systems.yml`, rather than hardcoding repeated project cards in multiple pages. The data source should contain only public-safe fields:

- `id`
- `display_name`
- `category`
- `status`
- `summary`
- `problem`
- `system`
- `proof`
- `stack`
- `links`
- `visibility`

Allowed `visibility` values:

- `public_repo`
- `public_summary_only`
- `private_internal_do_not_link`

Items with `private_internal_do_not_link` may appear only as abstracted systems with no repo URL, no internal name, and no employer/client-specific implementation detail.

## Notes

Notes should be curated. Generated blog posts, low-signal article automation, and unrelated content should not compete with serious engineering work.

Recommended note categories:

- Operational engineering
- MCP and agent tooling
- Microsoft 365 / Graph
- Financial-agent runtime experiments
- Proof and governance patterns

Migration rule:

- Phase 1 should replace "Blog" with "Notes" in primary navigation.
- Existing `/blog` content should remain reachable for backwards compatibility.
- `/notes` should either curate selected `_posts` or provide a small hand-curated list of publishable notes.
- If no note is clearly publishable, use a concise empty state and route visitors back to Work Map and Projects.

## Visual Direction

The design should be operational and polished:

- Dense but readable.
- Dark/light compatible.
- Status accents and compact metadata.
- Cards styled as operational panels, not decorative marketing tiles.
- No fake terminal gimmicks as the primary interface.
- No animation-heavy or template-heavy presentation.
- Strong typography, tight spacing, and clear hierarchy.

The command-center feel should come from information design: lanes, signals, status, proof, and routing.

## Content Safety

Public copy must avoid raw client names, ticket numbers, internal hostnames, credentials, and operational details that reveal customer environments.

Allowed framing:

- "billing readiness and cloud-import proof pipelines"
- "PSA/RMM workflow gates"
- "Microsoft 365 diagnostics"
- "deployment proof and rollback hygiene"
- "agentic service-desk workflows"

Avoid:

- Specific client incidents unless already public and intentionally approved.
- Raw ticket IDs.
- Vendor/client email addresses.
- Internal infrastructure names.
- Screenshots or excerpts with sensitive operational data.

Employer boundary:

- Viyu references are descriptive biography only and must not imply Viyu endorsement.
- Do not use employer logos, internal screenshots, proprietary process detail, customer names, or employer-branded case studies unless explicitly approved.
- Prefer public-safe display names such as "MSP Operations Control Plane" over source labels such as internal repo names.

Financial-agent boundary:

- Financial-agent content must be framed as research, engineering, paper trading, or simulation infrastructure.
- Do not provide investment advice, trading recommendations, solicitation language, broker endorsement, client-capital claims, or live-return/performance claims.
- If a broker or market-data provider is named, describe only integration shape and engineering constraints.

Redaction rubric for every system, project, note, and case study:

- Allowed nouns: tool categories, public product names, general platform names, public repo names that are intentionally linked.
- Banned nouns: client names, ticket IDs, private repo names, internal hostnames, usernames outside public profiles, vendor/client email addresses, credentials, tenant identifiers, screenshots with operational data.
- Quantitative claims must be source-backed from public-safe evidence or omitted.
- Proof examples must be abstracted: "dry-run output," "readiness snapshot," "redacted runtime check," "local validation artifact," "GitHub issue gate," or "test suite result."
- Employer/client-adjacent work requires manual review before publication.

## Implementation Approach

Phase 1 should keep the current Jekyll site and redesign the main public narrative:

- Update homepage into command-center structure.
- Update about page to match the broader identity.
- Create or update Work Map.
- Curate Projects page.
- Tighten navigation.
- Preserve working GitHub Pages deployment path.
- Add curated data in `_data/systems.yml` if repeated cards appear on more than one page.
- Add or update includes only when they reduce duplication across homepage, Work Map, and Projects.

Phase 2 can improve the curated project index, but it must remain allowlist-driven:

- Use git metadata only as private research input.
- Never publish a full local repo inventory.
- Never auto-classify private/internal repos into public output.
- Require manual allowlist review before any generated item appears on the site.
- Feed the Projects page from curated metadata.

## Validation

Before publishing:

- Run local Jekyll build if the Ruby environment supports it.
- If local build is blocked, use the repo's GitHub Pages workflow or an isolated compatible Ruby environment.
- Validate key phase-1 routes: `/`, `/work-map`, `/projects`, `/notes` or `/blog`, `/about`.
- Check mobile and desktop layout.
- Confirm `https://www.sulemanji.com/` still serves the intended content after deploy.
- Confirm no client-sensitive details appear in generated HTML.
- Scan source and built artifacts for client names, ticket-like IDs, internal hostnames, private repo names, email addresses beyond approved contact info, credentials, GUIDs, tenant identifiers, and accidental private links.
- Review image filenames, alt text, front matter, data files, comments, and outbound links, not only visible page text.

## Implementation Defaults

Use these defaults unless the implementation review changes them:

- Keep "Projects" in navigation for familiarity, but frame page content as systems and work lanes.
- Replace "Blog" with "Notes" in primary navigation; keep existing blog content accessible but not prominent.
- Feature these five systems on the first homepage pass:
  - MSP Operations Control Plane
  - Financial-Agent Paper Runtime
  - Agent Memory and Runtime Infrastructure
  - Operator Dashboard Systems
  - MCP/API toolchain
- Defer generated repo indexing indefinitely unless it is allowlist-driven. Phase 1 should use curated project data to reduce implementation risk and keep the narrative sharp.
- Keep `Contact` out of top-level navigation in phase 1; use section anchors and footer links.
- Keep `Case Studies` out of top-level navigation in phase 1 unless at least one public-safe case study is drafted and reviewed.
