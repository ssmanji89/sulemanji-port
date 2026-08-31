---
layout: default
title: Projects
description: The real range of Suleman Manji's work — service-delivery automation, process-led AI systems, Microsoft 365 and cloud tools, decision systems, and a pile of experiments.
permalink: /projects
hero_eyebrow: Selected work
hero_title: What I've built.
hero_lede: "A few hundred repositories, most of them private. This is the honest shape of it — the production systems, the public tools, and the experiments I keep going back to."
---

## Proof

Start here if you want something you can actually click through: the case studies, and the work that's public and linkable.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3><a href="/case-studies/agentic-msp-delivery">MSP service delivery using agentic LLMs</a> <span class="proj-meta">· case study</span></h3>
    <p>How a senior services engineer re-tooled ticket, migration, billing, and security work around agent systems with evidence contracts, cross-vendor review, and typed confirmation gates.</p>
  </div>
  <div class="card">
    <h3><a href="/notes/agent-safety">A write is a claim, not evidence</a> <span class="proj-meta">· field note</span></h3>
    <p>How three real incidents became the destructive-action gating, approval kernel, and independent state re-read that guard every write against a client system.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/halopsa-workflows-mcp">halopsa-workflows-mcp</a> <span class="proj-meta">· public · npm</span></h3>
    <p>An MCP server exposing the HaloPSA Workflows API to Claude and other clients, with auth and token caching. A companion <a href="https://github.com/ssmanji89/halopsa-tickets-mcp">halopsa-tickets-mcp</a> covers tickets; both are listed publicly.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/postgres-mcp-tools">postgres-mcp-tools</a> <span class="proj-meta">· public · npm</span></h3>
    <p>A Postgres + pgvector memory system for AI apps — semantic search and persistent cross-session memory over MCP, with pluggable embeddings.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/toast-pos-mcp">toast-pos-mcp</a> <span class="proj-meta">· public · foundation in progress</span></h3>
    <p>An open-source MCP server foundation for Toast POS reporting. The current work establishes a strict TypeScript stdio runtime, synthetic fixture harness, traversal and symlink-boundary protections, and review gates before real Toast tools or API integration are exposed.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/teams-3cx-app">teams-3cx-app</a> <span class="proj-meta">· public</span></h3>
    <p>A Teams app integrating a 3CX phone system — call control inside Teams and automatic sync of M365 users to extensions.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/finBots">finBots</a> <span class="proj-meta">· public · paper research</span></h3>
    <p>A public paper-trading research platform exploring multi-agent analysis, structured disagreement, explicit risk review, and reproducible decision evidence. It is presented as research software, not a live account, performance claim, or investment recommendation.</p>
  </div>
  <div class="card">
    <h3>Early agent work <span class="proj-meta">· 2023</span></h3>
    <p>Before "agent" was a product category: an AutoGen-to-Azure SDK integration, an AI-SOAR prototype, and a public <a href="https://github.com/ssmanji89/aidiscordbot">aidiscordbot</a> — alongside hands-on forks of MetaGPT, AutoGen, and MemGPT.</p>
  </div>
</div>

## Production systems, described honestly

A note on honesty: most of my strongest work is private or client-facing, so I describe those by what they do, not by exposing internals, repository names, or client details. Forks and spec-stage work are labeled as such above.

<div class="card-grid" markdown="0">
  <div class="proj">
    <h3>Service delivery automation at Viyu <span class="proj-meta">· private · production</span></h3>
    <p>Internal tooling for professional-services and managed-services work: SOW intake, project-discovery runbooks, PBR/QBR prep, invoice-review support, and review gates around client-impacting actions. The pattern: make messy service work easier to scope, verify, and hand off.</p>
  </div>
  <div class="proj">
    <h3>Review-ready operations artifacts <span class="proj-meta">· private</span></h3>
    <p>Turns scattered tickets, notes, agreements, and operational evidence into reviewable artifacts — scope records, business-review packets, audit findings, and next-action lists.</p>
  </div>
  <div class="proj">
    <h3>Governed AI-assisted workflows <span class="proj-meta">· private</span></h3>
    <p>AI-assisted patterns with human review, evidence trails, and preview-before-write gates. What matters is showing what was used, what changed, and where a person approves the next step.</p>
  </div>
  <div class="card">
    <h3>Service-desk AI triage platform <span class="proj-meta">· private</span></h3>
    <p>AI triage middleware for a PSA workflow: expert-role perspectives analyze each ticket, suggest priority, and draft remediation steps for review.</p>
  </div>
  <div class="card">
    <h3>Evidence-first agent infrastructure <span class="proj-meta">· private · active</span></h3>
    <p>Agent-assisted engineering systems built around repository-native control planes, role-separated review, and durable execution evidence; my role is architecture, contracts, and evidence judgment. Counted from the primary platform repository in August 2026: 13 vendor-platform CLIs, 307 skill modules, 28 agent definitions.</p>
  </div>
  <div class="card">
    <h3>n8n × AI bridge <span class="proj-meta">· private</span></h3>
    <p>Custom n8n nodes for MSP AI workflows, plus an MCP server wrapping the full n8n API so an agent can build and trigger automation pipelines in natural language.</p>
  </div>
  <div class="card">
    <h3>Azure cost-analysis CLI <span class="proj-meta">· private</span></h3>
    <p>Identifies likely Azure waste, confidence-scores each finding, and prepares remediation guidance with effort estimates.</p>
  </div>
  <div class="card">
    <h3>M365 security recommendation processor <span class="proj-meta">· private</span></h3>
    <p>Ingests Microsoft 365 and Defender recommendations, prioritizes them by business impact, and prepares reviewable remediation guidance.</p>
  </div>
  <div class="card">
    <h3>Property finance &amp; compliance <span class="proj-meta">· private</span></h3>
    <p>Budget-and-forecasting ETL pipelines with scenario analysis and approval workflows, plus an inspection processor that tracks remediation work.</p>
  </div>
  <div class="card">
    <h3>Operational glue <span class="proj-meta">· private</span></h3>
    <p>Inspection scheduling, multi-entity payroll, expense reconciliation, and task reporting for a property portfolio.</p>
  </div>
  <div class="card">
    <h3>Private decision-system research <span class="proj-meta">· private · active</span></h3>
    <p>Ongoing work on data provenance, broker-state authority, simulation, and safety gates. Provider, strategy, and performance details remain private.</p>
  </div>
</div>

## Experiments

Smaller things, kept around because they're interesting.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>Dream-engineering experiment <span class="proj-meta">· private</span></h3>
    <p>A tool exploring targeted memory reactivation across sleep cycles. Exactly as strange as it sounds, and I mean that as a compliment to it.</p>
  </div>
  <div class="card">
    <h3>Beal Conjecture research platform <span class="proj-meta">· private</span></h3>
    <p>A research environment combining parallel counterexample search and formal-proof experiments. It remains research in progress, not a claim that the conjecture has been resolved.</p>
  </div>
  <div class="card">
    <h3>Privacy-first DNA analysis <span class="proj-meta">· private</span></h3>
    <p>An on-device pipeline that parses raw consumer-genetics exports and generates a local report without uploading the source data.</p>
  </div>
  <div class="card">
    <h3>Cloud-exposure scanner <span class="proj-meta">· private</span></h3>
    <p>A scanner that identifies exposed cloud resources and leaked credentials, ranks findings by severity, and prepares remediation guidance.</p>
  </div>
</div>

<div class="cta-buttons" markdown="0">
  <a href="https://github.com/ssmanji89" class="btn btn-primary" target="_blank" rel="noopener">All GitHub repos</a>
  <a href="/story" class="btn btn-outline">The story behind it</a>
</div>
