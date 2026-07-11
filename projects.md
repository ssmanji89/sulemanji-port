---
layout: default
title: Projects | Suleman Manji
description: The real range of Suleman Manji's work — MSP automation platforms, AI agent and MCP infrastructure, autonomous finance systems, and a pile of experiments.
permalink: /projects
hero_eyebrow: Selected work
hero_title: What I've built.
hero_lede: "A few hundred repositories, most of them private. This is the honest shape of it — the production systems, the public tools, and the experiments I keep going back to."
---

A note on honesty: most of my strongest work is private or client-facing, so I describe those by what they do, not by exposing internals or client names. Where something is public, I link it. Forks and spec-stage work are labeled as such.

## Service delivery automation

The deepest work I do is turning recurring service operations into systems that are easier to scope, review, and trust.

<div class="card-grid" markdown="0">
  <div class="proj">
    <h3>Service delivery automation at Viyu <span class="proj-meta">· private · production</span></h3>
    <p>Internal tooling for professional-services and managed-services workflows: SOW intake and generation, project discovery runbooks, PBR/QBR report preparation, invoice-review support, operational evidence packets, and review gates around client-impacting actions. The important pattern is not any single platform. It is making messy service work easier to scope, verify, review, and hand off.</p>
  </div>
  <div class="proj">
    <h3>Review-ready operations artifacts <span class="proj-meta">· private</span></h3>
    <p>Systems that turn scattered tickets, notes, agreements, usage data, and operational evidence into reviewable artifacts: scope records, business-review packets, audit findings, client-safe clarifications, open questions, assumptions, risks, and next-action lists.</p>
  </div>
  <div class="proj">
    <h3>Governed AI-assisted workflows <span class="proj-meta">· private</span></h3>
    <p>AI-assisted workflow patterns with human review, evidence trails, preview-before-write gates, and explicit boundaries. I care less about autonomous demos than about systems that can show what they used, what they changed, what they skipped, and where a person needs to approve the next step.</p>
  </div>
</div>

## HaloPSA &amp; service-desk AI

A multi-year effort instrumenting a PSA platform with AI triage and public MCP servers.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>haloai-ticket-triage-pro <span class="proj-meta">· private</span></h3>
    <p>AI triage middleware for HaloPSA: seven expert-role personas analyze each ticket from different angles, suggest priority and category, draft PowerShell/Bash fixes, and write enrichment back to Halo. NestJS, multi-LLM, Next.js PWA.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/halopsa-workflows-mcp">halopsa-workflows-mcp</a> <span class="proj-meta">· public · npm</span></h3>
    <p>An MCP server exposing the HaloPSA Workflows API to Claude and other clients, with auth and token caching. A companion <a href="https://github.com/ssmanji89/halopsa-tickets-mcp">halopsa-tickets-mcp</a> covers tickets; both are listed publicly.</p>
  </div>
</div>

## AI agent &amp; MCP infrastructure

The substrate everything else runs on — and where I started early.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>Governed agent infrastructure <span class="proj-meta">· private</span></h3>
    <p>Private AI infrastructure for governed service-delivery automation: reviewable retrieval, decision support, evidence-backed recommendations, preview-before-write workflows, and clear approval points before client-impacting changes are made.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/postgres-mcp-tools">postgres-mcp-tools</a> <span class="proj-meta">· public · npm</span></h3>
    <p>A Postgres + pgvector memory system for AI apps — semantic search and persistent cross-session memory over MCP, with pluggable embeddings.</p>
  </div>
  <div class="card">
    <h3>n8n × AI bridge <span class="proj-meta">· private</span></h3>
    <p>Custom n8n nodes for MSP AI workflows plus an MCP server wrapping the full n8n API — so an agent can build and trigger automation pipelines in natural language.</p>
  </div>
  <div class="card">
    <h3>Early agent work <span class="proj-meta">· 2023</span></h3>
    <p>Before "agent" was a product category: an AutoGen-to-Azure SDK integration, an AI-SOAR prototype, and a public <a href="https://github.com/ssmanji89/aidiscordbot">aidiscordbot</a> — alongside hands-on forks of MetaGPT, AutoGen, and MemGPT.</p>
  </div>
</div>

## Autonomous finance

A five-year arc from a single trading script to a multi-agent system.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/finBots">finBots</a> <span class="proj-meta">· public</span></h3>
    <p>An AI trading platform (paper only). Four analysts debate fundamentals, sentiment, news, and technicals in parallel; a bull/bear round follows; a risk manager and fund manager can veto; a dozen gates run before execution. Python agents, a Fastify API, a Tauri desktop app.</p>
  </div>
  <div class="card">
    <h3>schwab <span class="proj-meta">· private</span></h3>
    <p>A personal financial operating system — Schwab + Plaid data, a pgvector "financial memory," a Discord bot as the trading interface, and Grafana monitoring. A CFP-in-a-box experiment.</p>
  </div>
  <div class="card">
    <h3>rhAgentic <span class="proj-meta">· private · active</span></h3>
    <p>A shadow-to-live Robinhood agent with a research-and-safety gate in front of execution. The current edge of the trading work.</p>
  </div>
</div>

## Microsoft 365 &amp; Azure tools

Standalone tools that predate and coexist with the platform work.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>azure-cost-copilot <span class="proj-meta">· private</span></h3>
    <p>A CLI that hunts Azure waste with eight analyzers (idle VMs, zombie resources, oversized SKUs…), confidence-scores each finding, and outputs remediation with effort estimates.</p>
  </div>
  <div class="card">
    <h3>ISRP <span class="proj-meta">· private</span></h3>
    <p>Ingests raw M365/Defender security recommendations, risk-scores them by business impact, and generates step-by-step PowerShell remediation for hybrid environments.</p>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/teams-3cx-app">teams-3cx-app</a> <span class="proj-meta">· public</span></h3>
    <p>A Teams app integrating a 3CX phone system — call control inside Teams and automatic sync of M365 users to extensions.</p>
  </div>
</div>

## Real-estate operations

A vertical I automated end-to-end for a property group.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>Property finance &amp; compliance <span class="proj-meta">· private</span></h3>
    <p>Budget-and-forecasting ETL pipelines (Excel → Postgres → Django, with what-if analysis and approval workflows) and a HUD/NSPIRE inspection processor that turns inspection reports into Microsoft Planner tasks.</p>
  </div>
  <div class="card">
    <h3>Operational glue <span class="proj-meta">· private</span></h3>
    <p>Inspection-calendar scheduling, multi-entity payroll processing, Expensify reconciliation, and Planner/To-Do reporting — the unglamorous automation that gives people their afternoons back.</p>
  </div>
</div>

## Experiments

Smaller things, kept around because they're interesting.

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>Svapna <span class="proj-meta">· private</span></h3>
    <p>A "dream engineering" tool exploring targeted memory reactivation across sleep cycles. Exactly as strange as it sounds, and I mean that as a compliment to it.</p>
  </div>
  <div class="card">
    <h3>sully-beal-conjecture <span class="proj-meta">· private</span></h3>
    <p>A research platform attacking the Beal Conjecture — parallel counterexample search plus formal proof work in Lean 4. A million-dollar problem I don't expect to solve.</p>
  </div>
  <div class="card">
    <h3>smanji-ancestry <span class="proj-meta">· private</span></h3>
    <p>A privacy-first DNA pipeline — parses raw consumer-genetics exports and builds a report entirely on-device, nothing uploaded.</p>
  </div>
  <div class="card">
    <h3>storagemon <span class="proj-meta">· private</span></h3>
    <p>A cloud-exposure scanner that finds open buckets, databases, and leaked keys, severity-ranks them, and auto-drafts remediation guides.</p>
  </div>
</div>

<div class="cta-buttons" markdown="0">
  <a href="https://github.com/ssmanji89" class="btn btn-primary" target="_blank" rel="noopener">All GitHub repos</a>
  <a href="/story" class="btn btn-outline">The story behind it</a>
</div>
