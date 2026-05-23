---
layout: default
title: About Suleman Manji | Proof-Gated AI Operations
description: About Suleman Manji, a services engineer working across MSP systems engineering, agentic operations, Microsoft 365, MCP/API tooling, and proof-gated automation.
permalink: /about
---

<div class="command-header">
  <p class="command-eyebrow">About</p>
  <h1>Suleman Manji</h1>
  <p class="command-lede">Sr. Services Engineer at current services organization, working across MSP systems engineering, platform automation, Microsoft 365 diagnostics, billing/runtime proof, MCP/API tooling, and memory-backed agent operations.</p>
</div>

<section class="command-section">
  <h2>Current operating frame</h2>
  <p>My formal role is services engineering. The broader work is building operator systems that span MSP tickets, PSA/RMM data, Microsoft 365, billing platforms, stakeholder deliverables, repo governance, and agent runtime memory.</p>
  <p>I care about the boundary between automation and operational reality: what live state was checked, what action is safe, what proof exists, what needs human approval, what got posted to the system of record, and what another operator can resume later.</p>
</section>

<section class="command-section">
  <h2>What that looks like in practice</h2>
  <div class="proof-grid">
    <div><strong>Ticket as control plane</strong><span>CWM tickets become ordered tasks, notes, schedule entries, status gates, and time-entry records rather than loose chat instructions.</span></div>
    <div><strong>Repo as operating memory</strong><span>GitHub Project 4, issue hierarchy, proof comments, validation commands, and session-harvest maps keep engineering work durable.</span></div>
    <div><strong>Agent work with guardrails</strong><span>Platform CLIs, generated contracts, Qdrant/mem0 recall, and preview-first write flows make assistant work auditable.</span></div>
    <div><strong>Stakeholder-ready outputs</strong><span>Technical evidence is converted into decision packets, fillable HTML, XLSX return paths, and verified PPTX decks when the audience is not an operator.</span></div>
  </div>
</section>

<section class="command-section">
  <h2>Working lanes</h2>
  <div class="lane-summary-grid">
    {% for system in site.data.systems %}
      <a class="lane-summary" href="/work-map#{{ system.id }}">
        <span>{{ system.category }}</span>
        <strong>{{ system.display_name }}</strong>
        <small>{{ system.summary }}</small>
      </a>
    {% endfor %}
  </div>
</section>

<section class="command-section principles-panel">
  <h2>Safety and publication boundaries</h2>
  <p>Public writing here abstracts organization and client-adjacent work. It avoids raw ticket notes, internal hosts, private screenshots, secrets, and customer-specific implementation detail. The goal is to show the engineering pattern without turning operational evidence into public leakage. Financial-agent material is research and engineering infrastructure only; it is not investment advice or a solicitation.</p>
</section>

<section class="command-section">
  <h2>Contact</h2>
  <p>Useful conversations include operational automation, MSP systems, Microsoft 365 diagnostics, agentic workflows, MCP/API tooling, and proof-oriented engineering.</p>
  <div class="command-actions">
    <a href="mailto:ssmanji89@gmail.com" class="btn btn-primary">Email</a>
    <a href="https://github.com/ssmanji89" class="btn btn-outline" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.linkedin.com/in/{{ site.linkedin_username }}" class="btn btn-outline" target="_blank" rel="noopener">LinkedIn</a>
  </div>
</section>
