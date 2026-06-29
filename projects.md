---
layout: default
title: Projects | Suleman Manji
description: Selected work by Suleman Manji — enterprise MSP automation, AI/MCP infrastructure, and personal experiments.
permalink: /projects
---

# Projects

Most of my output is private or client-facing, so this is a representative slice — not a full inventory.

## Enterprise MSP automation

<div class="proj" markdown="0">
  <h3>MSP operations platform <span class="proj-meta">· private / client work</span></h3>
  <p>A multi-platform operations engine for managed services — bridging Microsoft 365, ITGlue, ConnectWise Manage and Automate, ScreenConnect, VMware vCloud, Sophos Central, Meraki, and Cavelo. It ships a family of purpose-built CLIs and a set of autonomous agents for employee lifecycle, incident response, license optimization, and ticket enrichment. Roughly 100+ callable tools across the ecosystem (approximate — counted from CLI command surfaces, not a single manifest).</p>
</div>

<div class="proj" markdown="0">
  <h3>Enterprise Microsoft 365 migrations</h3>
  <p>Full-lifecycle tenant-to-tenant migrations — one project moved 6,543 GB across 641 users and 23 locations (122 SharePoint sites, 305 OneDrive accounts, 273 mailboxes), with Exchange Hybrid, Azure AD Connect, and Intune/Autopilot orchestration.</p>
</div>

## AI &amp; MCP infrastructure <span style="font-weight:400;color:var(--text-muted);font-size:1rem">(public)</span>

<div class="card-grid" markdown="0">
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/halopsa-workflows-mcp">halopsa-workflows-mcp</a></h3>
    <p>A TypeScript/Node MCP server for the HaloPSA Workflows API — exposes workflow automation to Claude and other MCP clients, with auth and token caching. Published to npm.</p>
    <span class="tag">TypeScript · MCP</span>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/postgres-mcp-tools">postgres-mcp-tools</a></h3>
    <p>A PostgreSQL + pgvector memory system for AI applications, with MCP integration for semantic search and persistent cross-session memory. Docker-composed; OpenAI / Anthropic / mock embeddings.</p>
    <span class="tag">Node · pgvector · MCP</span>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/msgraph-secure_score-mcp">msgraph-secure_score-mcp</a></h3>
    <p>An MCP server surfacing Microsoft 365 Secure Score data via Microsoft Graph into AI assistants.</p>
    <span class="tag">Microsoft Graph · MCP</span>
  </div>
</div>

## Personal &amp; experimental

<div class="card-grid" markdown="0">
  <div class="card">
    <h3>Beal Conjecture platform</h3>
    <p>An AI-augmented attack on an unsolved number-theory problem — parallel computational counterexample search plus formal proof development in Lean 4.</p>
    <span class="tag">Python · Lean 4</span>
  </div>
  <div class="card">
    <h3>DNA-analysis pipeline</h3>
    <p>Privacy-first genomics tooling — parses raw consumer-DNA exports and generates a fully on-device report. A tool for exploring personal genomics without uploading anything.</p>
    <span class="tag">Python · client-side</span>
  </div>
  <div class="card">
    <h3><a href="https://github.com/ssmanji89/finBots">Algorithmic trading</a></h3>
    <p>A long-running line of work that began with finBots in 2021 — Robinhood/market integrations, strategy frameworks, and paper-to-live execution harnesses.</p>
    <span class="tag">Python</span>
  </div>
</div>

<div class="cta-buttons" markdown="0">
  <a href="https://github.com/ssmanji89" class="btn btn-outline" target="_blank" rel="noopener">All GitHub repos</a>
  <a href="/beyond" class="btn btn-outline">Beyond Work</a>
</div>
