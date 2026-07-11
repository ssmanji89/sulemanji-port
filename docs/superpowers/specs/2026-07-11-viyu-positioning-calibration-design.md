# Viyu Positioning Calibration Design Spec

## Summary

Calibrate the public portfolio copy so Viyu work is described by outcomes,
process, and operating discipline rather than internal project names,
technology inventory, or implementation details.

This change complements the AI Workflow Clinic positioning. The site should make
the public offer credible by showing a pattern of work: turning messy service
operations into scoped, reviewable, evidence-backed workflows.

## Evidence Reviewed

- Portfolio repo: `/Users/sulemanmanji/Documents/GitHub/sulemanji`
- Viyu agents repo canonical remote: `https://github.com/ssmanji89/viyu-agents.git`
- Clean Viyu scan worktree:
  `/Users/sulemanmanji/tmp/viyu-agents-origin-main-scan-20260711`
- Viyu scan commit: `224fc6c67`

The refreshed Viyu repo shows substantial work around:

- SOW intake and generation
- SOW estimate calibration, source-scale grounding, and readiness gates
- project engagement discovery runbooks
- PBR/QBR report contracts and entitlement-led report planning
- invoice audit review
- board health and operational reporting
- evidence ledgers, review gates, preview-before-write controls, and proof
  artifacts

Public copy should draw from those broad themes, not from internal names,
platform inventories, or architecture details.

## Goals

- Remove public mentions of `bodhi-teams`, `Bodhi`, `Commissions console`,
  and commissions dashboard/console work for now.
- Reframe Viyu work as service-delivery automation, professional-services
  scoping, operational review tooling, and governed AI-assisted workflows.
- Correct role language to: **Sr. Services Engineer at Viyu Network Solutions,
  acting as a solutions architect and automation engineer.**
- Surface SOW, PBR/QBR, invoice-review, project-discovery, evidence, reporting,
  and review-gate tooling as broad process achievements.
- Avoid leaking internal IP, client names, implementation details, tool counts,
  or sensitive system topology.

## Non-Goals

- Do not publish a Viyu architecture inventory.
- Do not name internal private repos as product names when process language is
  safer.
- Do not mention specific internal platform lists such as "eight TypeScript
  CLIs" or named private integration surfaces.
- Do not describe per-customer isolation, containers, database topology, role
  models, or internal API adapters.
- Do not mention commissions or Bodhi anywhere in public pages.
- Do not alter non-Viyu historical roles except where needed for consistency.

## Public Copy Model

### Preferred Section Name

Use:

`Service delivery automation`

instead of:

`MSP automation platforms`

### Preferred Lead Project Card

Use:

`Service delivery automation at Viyu`

instead of:

`viyu-agents`

### Preferred Themes

The public story should emphasize:

- recurring service work made more repeatable
- SOW intake and generation support
- project discovery and scoping
- PBR/QBR and operational review packet preparation
- invoice-review and agreement-line reconciliation support
- evidence ledgers and proof artifacts
- preview-before-write and approval gates
- human review around client-impacting actions
- documentation handoffs and open-loop tracking

### Forbidden Public Terms

The implementation verifier should fail if public pages contain:

- `bodhi`
- `Commissions console`
- `commission console`
- `commission dashboard`
- `commission operations`
- `earned/paid/owed`
- `eight-platform`
- `eight TypeScript CLIs`
- `per-customer isolation`
- `Docker container`
- `typed adapter`
- `viyu-agents APIs`

The term `commission` may remain only inside planning documents under `docs/`,
not in public pages.

## Page-Specific Requirements

### `projects.md`

- Rename the lead section to `Service delivery automation`.
- Remove `bodhi-teams` and `Commissions console` entirely.
- Replace the `viyu-agents` project card with broad process-oriented cards:
  - `Service delivery automation at Viyu`
  - `Review-ready operations artifacts`
  - `Governed AI-assisted workflows`
- Avoid private technology inventory and internal architecture details.

### `experience.md`

- Change the current Viyu role title to `Sr. Services Engineer`.
- Make the description say he is acting as a solutions architect and automation
  engineer.
- Replace technology-heavy Viyu highlights with process/outcome highlights:
  service-delivery automation, migration/operations support, operational review
  artifacts, governed AI-assisted workflows.
- Keep proven migration scale metrics if they remain useful, but avoid turning
  the section into an internal platform inventory.

### `resume.md`

- Change current Viyu role line to:
  `**Sr. Services Engineer; acting as Solutions Architect & Automation Engineer**`
- Replace bullet points about private tool counts and specific platform lists
  with safer achievement bullets around:
  - M365 migration support
  - professional-services scoping and SOW tooling
  - PBR/QBR/invoice-review/reporting support
  - evidence-backed review gates
  - public MCP work only when it is public and safe to link/name

### `story.md`

- Replace the "Now" paragraph with a safer first-person description:
  Sr. Services Engineer, acting as solutions architect/automation engineer,
  focused on Microsoft 365 migration work, professional-services scoping, SOW
  and project-discovery tooling, PBR/QBR and invoice-review support,
  operational evidence, approval gates, and governed AI-assisted workflows.

### `about.md`

- Keep the broad identity, but adjust the opening to avoid implying the formal
  title is "solutions architect and automation engineer".
- Prefer "I work as a Sr. Services Engineer in Houston, often acting as a
  solutions architect and automation engineer..."

### `index.md`

- Adjust the hero lede if needed so it says "I work on" or "I help architect"
  rather than implying the formal Viyu title.
- Keep homepage concise and portfolio-first.

## Verification Requirements

Implementation is complete only when:

- public pages no longer mention Bodhi or commissions.
- public Viyu copy uses `Sr. Services Engineer` and "acting as" framing.
- `projects.md` no longer contains `viyu-agents`, `bodhi-teams`, or
  `Commissions console`.
- `projects.md` contains `Service delivery automation at Viyu`.
- public pages mention SOW and PBR/QBR/reporting or review artifacts in broad
  process terms.
- public pages avoid the forbidden internal architecture terms listed above.
- `bundle exec jekyll build` succeeds.
