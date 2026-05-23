# AI Tooling Productization Audit

Date: 2026-05-23  
Control plane: `www.sulemanji.com` local repo control plane  
Storefront rail: GitHub Pages + Stripe  
Scope: General AI tooling only. Excludes direct MSP service delivery, private operational artifacts, CWM/CWA operational data, and organization-specific implementation details.

## Executive Read

The strongest product line is not a single MCP memory zip. The broader product category is:

> Field-tested operating documentation for reliable AI agents: memory, MCP, evals, workflow gates, context compression, local-first capture, and generated deliverable pipelines.

The local project history shows active development in multiple AI tooling lanes:

- `hermes-agent`: memory providers, mem0/Qdrant recall, LiteRAG/PTRI, per-job checkpoints, MCP, webhook subscriptions, skills.
- `hermes-mem0`: mem0-compatible CLI with embedded Qdrant/backend selection and JSON/agent output.
- `claude-optimized`: loop detection, local LLM critic, token compression, secret guard, escalation workflows.
- `notesTaker`: local-first capture/transcription/intelligence pipeline with hybrid search and routing gates.
- `space-agent`: browser-native agent workspace, skill discovery, web browsing, memory modules, prompt-budget UI.
- `finbots26` / `hermes-finbots`: multi-agent pipelines, prompt freezing, IC scoring, evaluation gates, cost logging, sentinels.
- `local agent tooling repository`: control-plane governance, generated deliverables, validation gates, content hygiene, proof-backed execution. Use only as abstracted methodology.
- `bodhi-teams`: agent gateway, bot test kit, tool schema validation, provider routing control plane.

## Candidate Scorecard

Scores are 1-5. Higher is better except IP risk, where higher means safer to publish.

| Rank | Candidate | Evidence | Buyer Clarity | Maturity | Cleanup Effort | IP Safety | Price Band | Status |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | Agent Memory Infrastructure Pack | 5 | 5 | 4 | 3 | 4 | $49-$149 | build-next |
| 2 | MCP Operator Field Manual | 5 | 4 | 4 | 2 | 4 | $39-$129 | build-next |
| 3 | Agent Anti-Loop and Context Compression Kit | 4 | 4 | 3 | 3 | 5 | $49-$149 | draftable |
| 4 | Agent Evaluation and Prompt Regression Pack | 5 | 4 | 4 | 4 | 3 | $79-$249 | draftable |
| 5 | AI Deliverable Pipeline Kit | 5 | 4 | 4 | 4 | 2 | $99-$299 | draftable |
| 6 | Local-First Meeting Intelligence Blueprint | 4 | 4 | 3 | 4 | 3 | $49-$199 | research |
| 7 | AI Work Control Plane Playbook | 5 | 3 | 4 | 5 | 2 | $79-$249 | draftable |
| 8 | Browser-Native Agent Workspace Design Guide | 4 | 3 | 3 | 5 | 3 | $49-$199 | research |
| 9 | Agent Skill System Builder Pack | 4 | 4 | 3 | 3 | 4 | $39-$149 | draftable |

## 1. Agent Memory Infrastructure Pack

**Source evidence**

- `hermes-agent` commits include self-hosted mem0 backend, unified-recall skill, LiteRAG PTRI, memory success logging, and live runtime fixes.
- `hermes-mem0` provides a pluggable-backend mem0-compatible CLI with embedded, platform, and remote backend modes.
- Memory history includes the concrete Qdrant recall failure mode: same collection availability did not mean actual cross-scope recall.

**Sellable deliverable**

- PDF/Markdown field guide.
- Qdrant + mem0 setup checklist.
- Memory scope model: write scope, read scope, actor scope, session scope.
- Recall audit worksheet.
- CLI command recipes.
- Troubleshooting matrix.
- Clean-room sample config files.

**Do not include**

- organization-specific repository paths, client memories, ticket references, internal actor names, or proprietary Hermes runtime config.

**First landing-page promise**

Build a local AI memory layer that survives sessions, supports scoped recall, and avoids the false confidence of "the vector database is up, so memory works."

## 2. MCP Operator Field Manual

**Source evidence**

- Hermes MCP skills cover native MCP config, stdio/HTTP transports, security filtering, and `mcporter` CLI workflows.
- Local repos include MCP examples for n8n, browser control, code research, Stripe agent toolkit, and workflow builders.
- Current ecosystem demand favors MCP connector setup, auth, debug, and tool boundary guidance.

**Sellable deliverable**

- MCP setup manual for Claude/Cursor/Codex/Hermes-style clients.
- Stdio vs HTTP/SSE transport decision table.
- Auth/secrets checklist.
- MCP Inspector and `mcporter` debug flow.
- Tool schema review checklist.
- Example configs for local filesystem-safe, browser, n8n, and Stripe-style servers.

**Do not include**

- Organization-specific MCP servers, MSP vendor adapters, or copied third-party server code unless license and attribution are handled.

**First landing-page promise**

Stop treating MCP setup as trial-and-error JSON. Use a repeatable operator workflow for installing, inspecting, authenticating, and debugging MCP tools.

## 3. Agent Anti-Loop and Context Compression Kit

**Source evidence**

- `claude-optimized` implements deterministic loop detection, local LLM critic review, escalation, RTK/headroom/distill integration, token savings analytics, and secret guard concepts.
- Local `distill` guidance already treats semantic compression as a token-efficiency layer for large command output.

**Sellable deliverable**

- Agent loop pattern catalog.
- PreToolUse and post-turn detection design.
- Local critic prompt templates.
- Command-output compression recipes.
- Secret guard checklist.
- Token savings report template.

**Do not include**

- Any copied code from incompatible plugins or private credentials. Package as docs, prompts, and clean-room pseudo-code first.

**First landing-page promise**

Give coding agents a second-opinion layer before they waste turns, loop on the same tool calls, or leak secrets into commands.

## 4. Agent Evaluation and Prompt Regression Pack

**Source evidence**

- `finbots26` has prompt-freeze, walk-forward harness, IC scoring, forecast accuracy scoring, evaluation gates, integration fixtures, cost logging, and multi-agent pipeline validation.
- `hermes-finbots` adds runtime delivery, cron, safe-mode checks, and alert formatting.

**Sellable deliverable**

- Prompt freeze methodology.
- Prompt hash and run artifact template.
- Eval fixture layout.
- Gate design: pre-inference, post-inference, output schema validation.
- Cost and cache-hit report template.
- Regression checklist for agent behavior changes.

**Do not include**

- Trading logic, brokerage workflows, account details, live/paper portfolio details, or financial advice.

**First landing-page promise**

Move agent prompts from vibes to versioned, testable artifacts with scoring, fixture data, and run evidence.

## 5. AI Deliverable Pipeline Kit

**Source evidence**

- `local agent tooling repository` contains mature manifest-driven generation patterns: interview/input to YAML manifest to HTML/DOCX/XLSX outputs, with validation gates.
- Stakeholder briefing work used YAML-rendered HTML plus browser-side XLSX export.
- SOW generation work demonstrated component-template defects, manifest correction, and validator gates.

**Sellable deliverable**

- Manifest schema template.
- Renderer architecture guide.
- Validation gate checklist.
- HTML/PDF/DOCX/XLSX output contract.
- Example public-safe business deliverable.
- "Do not hand-edit generated output" operating rule.

**Do not include**

- SOW text, client pricing, private templates, customer names, MSP service details, or internal generated artifacts.

**First landing-page promise**

Turn AI-assisted deliverables into a controlled pipeline: structured inputs, repeatable renderers, validation gates, and clean regenerated outputs.

## 6. Local-First Meeting Intelligence Blueprint

**Source evidence**

- `notesTaker` implements local audio capture, whisper.cpp transcription, Claude intelligence extraction, SQLite knowledge store, hybrid search, and approval-gated routing.

**Sellable deliverable**

- Architecture blueprint.
- Local capture checklist.
- Transcription model selection notes.
- Intelligence extraction schema.
- Knowledge store schema.
- Approval-gated routing pattern.

**Do not include**

- private routing targets, MSP call profiles, customer conversations, or proprietary integrations.

**First landing-page promise**

Design a local-first meeting intelligence system where audio stays local, structured outputs are reviewable, and nothing routes externally without approval.

## 7. AI Work Control Plane Playbook

**Source evidence**

- `local agent tooling repository` and `bodhi-teams` show issue-led execution, proof comments, Project metadata validation, blockers, control-plane validators, content hygiene, and recovery from interrupted sessions.
- Memory includes repeated preference for proof-backed status and durable checkpointing.

**Sellable deliverable**

- Issue-led execution model.
- Proof artifact taxonomy.
- Blocker and status vocabulary.
- Handoff prompt template.
- GitHub Pages/public-safety checklist.
- Qdrant/memory checkpoint pattern.

**Do not include**

- GitHub Project 4 internal details, private issue content, service ticket data, client names, or organization governance internals.

**First landing-page promise**

Run AI-assisted work through an execution ledger that records decisions, proof, blockers, and handoffs instead of relying on chat memory.

## 8. Browser-Native Agent Workspace Design Guide

**Source evidence**

- `space-agent` includes browser-layer agent runtime, skill discovery, memory modules, web browsing, prompt-budget UI, per-user file-index shards, and admin/time-travel ideas.
- `browser-use-mcp-server` provides browser automation through MCP/SSE and VNC-visible browser sessions.

**Sellable deliverable**

- Browser-agent workspace architecture guide.
- Runtime/module boundary notes.
- Skill discovery model.
- Prompt budget UI pattern.
- Browser automation safety checklist.
- Rollback/admin control concepts.

**Do not include**

- Third-party Space Agent code or branding. Make this a design guide unless a clean-room implementation is built.

**First landing-page promise**

Design agent workspaces where the agent can inspect, operate, and reshape the browser surface without losing operator control.

## 9. Agent Skill System Builder Pack

**Source evidence**

- Hermes skills, `claude-skills`, MemStack, and local Codex skills show repeated skill packaging, trigger rules, progressive disclosure, and skill validation patterns.

**Sellable deliverable**

- Skill authoring guide.
- Trigger-rule checklist.
- Skill folder template.
- Progressive disclosure pattern.
- Validation and packaging checklist.
- Marketplace/store copy template.

**Do not include**

- Third-party proprietary skill content, organization-specific skills, or direct copies from restricted sources.

**First landing-page promise**

Write agent skills that load when needed, avoid token bloat, and give agents reliable procedures instead of vague prompt snippets.

## Recommended First Publishing Sequence

1. **MCP Operator Field Manual**  
   Fastest to publish. Strong market demand. Low organization overlap. Low code burden.

2. **Agent Memory Infrastructure Pack**  
   Strongest match to local differentiated experience. Needs careful public-safe examples.

3. **Agent Anti-Loop and Context Compression Kit**  
   Distinctive and practical. Can ship as docs/prompts/checklists first.

4. **Agent Evaluation and Prompt Regression Pack**  
   Strong but needs abstraction away from finance/trading specifics.

5. **AI Deliverable Pipeline Kit**  
   High-value, but highest sanitization burden because the deepest proof comes from organization/client-adjacent work.

## Stripe/GitHub Pages Packaging Model

Each product should have:

- Public landing page on GitHub Pages.
- Stripe Payment Link or Checkout link.
- Paid zip with Markdown/PDF, templates, example configs, and checklists.
- Versioned changelog.
- Public free excerpt.
- Private fulfillment note or simple email delivery.
- Later: Hermes receives Stripe webhook and sends the correct product access/follow-up.

## Control-Plane Next Actions

- [ ] Pick first product to publish.
- [ ] Create public landing page draft under site content.
- [ ] Create paid package source folder outside public route or in a private repo.
- [ ] Create Stripe Payment Link.
- [ ] Add product metadata to `product-candidates.yml`.
- [ ] Add public-safe validation terms for product pages.
- [ ] Write fulfillment checklist for manual delivery.
- [ ] Later, wire Stripe webhook to Hermes fulfillment.

