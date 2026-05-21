# Command Center Portfolio Redesign

Date: 2026-05-21
Repo: `/Users/sully/Documents/GitHub/sulemanji`
Live site: `https://www.sulemanji.com`

## Goal

Reposition the live GitHub Pages site from a narrow "MSP Solutions Architect" portfolio into an operator/engineering command center that reflects Suleman Manji's current work across Viyu services engineering, MSP control planes, agentic operations, financial-agent runtimes, MCP/API tooling, and memory-backed local automation.

The site should make the work easy to scan without exposing client-sensitive details. It should show the systems being built, the operational problems they address, and the proof-oriented engineering style behind them.

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

> AI Operations Architect for MSP Systems

Supporting line:

> I build proof-driven agentic workflows across MSP operations, Microsoft 365, PSA/RMM platforms, financial-agent runtimes, and local memory infrastructure.

Supporting identity facets:

- Sr. Services Engineer at Viyu Network Solutions.
- MSP systems engineer.
- Agentic operations engineer.
- Control-plane governance builder.
- Financial-agent runtime experimenter.

"MSP Solutions Architect" remains valid, but it should be a facet rather than the whole site identity.

## Information Architecture

Navigation should be:

- Home
- Work Map
- Case Studies
- Projects
- Notes
- About
- Contact

For the first implementation phase, these can map onto existing Jekyll pages where possible. New pages should be added only when they remove clutter or create a clearer route through the work.

## Homepage Design

The homepage should feel like a command center: dense, calm, current, and operational. It should not feel like a marketing landing page, resume dump, or fake terminal toy.

Sections:

1. Status Header
   - Headline: "AI Operations Architect for MSP Systems"
   - Short current-state line.
   - Primary actions: view work map, view featured systems, contact.
   - Compact metadata chips: Viyu, MSP operations, Microsoft 365, MCP, Qdrant/mem0, financial agents.

2. Active Systems Lanes
   - MSP Control Plane
   - Agent Runtime and Memory
   - Financial Agent Systems
   - MSP Platform Apps
   - MCP/API Tooling
   - Technical Writing and Runbooks

   Each lane should include a one-sentence purpose, representative systems, and a proof/output indicator.

3. Proof Stream
   - A compact strip that communicates how work is validated.
   - Examples: proof capture, dry-run gates, runtime verification, readiness snapshots, audit trails, GitHub issue/project governance.
   - This should be conceptual and public-safe, not a raw ticket feed.

4. Featured Systems
   - Four to five high-signal project cards.
   - Initial candidates:
     - Viyu operations control plane
     - FinBots / TradingAgents runtime
     - Hermes memory and agent runtime
     - AM / Teams operational dashboards
     - MCP/API toolchain

   Each card should use a consistent structure:
   - Problem
   - System built
   - Proof or output
   - Stack
   - Status

5. Operating Principles
   - Live evidence before claims.
   - Safety gates before writes.
   - Durable handoffs over chat-only status.
   - Public-safe abstraction of client work.
   - Automation with accountability.

6. Contact / Work With Me
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

## Case Studies

Case studies should be written as system stories, not client disclosures.

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

The Projects page should eventually become a git-derived index, but the first phase can use curated data.

Each project item should include:

- Name
- Category
- Status
- Stack
- Public-safe summary
- Link to repo when appropriate
- Evidence/output type

Avoid listing every local repo. Prioritize systems that support the current identity.

## Notes

Notes should be curated. Generated blog posts, low-signal article automation, and unrelated content should not compete with serious engineering work.

Recommended note categories:

- Operational engineering
- MCP and agent tooling
- Microsoft 365 / Graph
- Financial-agent runtime experiments
- Proof and governance patterns

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

## Implementation Approach

Phase 1 should keep the current Jekyll site and redesign the main public narrative:

- Update homepage into command-center structure.
- Update about page to match the broader identity.
- Create or update Work Map.
- Curate Projects page.
- Tighten navigation.
- Preserve working GitHub Pages deployment path.

Phase 2 can add a git-derived project index:

- Generate a data file from local git metadata.
- Cluster repos into public-safe categories.
- Mark public/private/internal-safe display status.
- Feed the Projects page from curated metadata.

## Validation

Before publishing:

- Run local Jekyll build if the Ruby environment supports it.
- If local build is blocked, use the repo's GitHub Pages workflow or an isolated compatible Ruby environment.
- Validate key routes: `/`, `/work-map`, `/projects`, `/case-studies`, `/about`, `/contact`.
- Check mobile and desktop layout.
- Confirm `https://www.sulemanji.com/` still serves the intended content after deploy.
- Confirm no client-sensitive details appear in generated HTML.

## Implementation Defaults

Use these defaults unless the implementation review changes them:

- Keep "Projects" in navigation for familiarity, but frame page content as systems and work lanes.
- Replace "Blog" with "Notes" in primary navigation; keep existing blog content accessible but not prominent.
- Feature these five systems on the first homepage pass:
  - Viyu operations control plane
  - FinBots / TradingAgents runtime
  - Hermes memory and agent runtime
  - AM / Teams operational dashboards
  - MCP/API toolchain
- Defer generated repo indexing to phase 2. Phase 1 should use curated project data to reduce implementation risk and keep the narrative sharp.
