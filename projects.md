---
layout: default
title: Projects | Suleman Manji
description: Selected work by Suleman Manji — enterprise MSP automation, AI/MCP infrastructure, and personal experiments.
permalink: /projects
---

# Projects

Most of my output is private or client-facing, so this is a representative slice, not a full inventory.

## Enterprise MSP automation

**MSP operations platform** *(private / client work)*
A multi-platform operations engine for managed services — bridging Microsoft 365, ITGlue, ConnectWise Manage and Automate, ScreenConnect, VMware vCloud, Sophos Central, Meraki, and Cavelo. It ships a family of purpose-built CLIs and a set of autonomous agents for employee lifecycle, incident response, license optimization, and ticket enrichment. Roughly 100+ callable tools across the ecosystem (approximate — counted from CLI command surfaces, not a single manifest).

**Enterprise Microsoft 365 migrations**
Full-lifecycle tenant-to-tenant migrations — one project moved 6,543 GB across 641 users and 23 locations (122 SharePoint sites, 305 OneDrive accounts, 273 mailboxes), with Exchange Hybrid, Azure AD Connect, and Intune/Autopilot orchestration.

## AI & MCP infrastructure (public)

**[halopsa-workflows-mcp](https://github.com/ssmanji89/halopsa-workflows-mcp)**
A TypeScript/Node MCP server for the HaloPSA Workflows API — exposes workflow automation to Claude and other MCP clients, with auth and token caching. Published to npm.

**[postgres-mcp-tools](https://github.com/ssmanji89/postgres-mcp-tools)**
A PostgreSQL + pgvector memory system for AI applications, with MCP integration for semantic search and persistent cross-session memory. Docker-composed; supports OpenAI/Anthropic/mock embeddings.

**[msgraph-secure_score-mcp](https://github.com/ssmanji89/msgraph-secure_score-mcp)**
An MCP server surfacing Microsoft 365 Secure Score data via Microsoft Graph into AI assistants.

## Personal & experimental

**Beal Conjecture research platform** *(private)*
An AI-augmented attack on an unsolved number-theory problem — parallel computational counterexample search plus formal proof development in Lean 4.

**DNA-analysis pipeline** *(private)*
Privacy-first genomics tooling — parses raw consumer-DNA exports and generates a fully on-device report. A tool for exploring personal genomics without uploading anything.

**Algorithmic trading** *(mix of public/private)*
A long-running line of work that began with [finBots](https://github.com/ssmanji89/finBots) (2021) — Robinhood/market integrations, strategy frameworks, and paper-to-live execution harnesses.

<div class="cta-buttons">
    <a href="https://github.com/ssmanji89" class="btn" target="_blank" rel="noopener">All GitHub repos</a>
    <a href="/beyond" class="btn btn-outline">Beyond Work</a>
</div>
