---
layout: default
title: About Suleman Manji | Proof-Gated AI Operations
description: About Suleman Manji, a services engineer working across MSP systems engineering, agentic operations, Microsoft 365, MCP/API tooling, and proof-gated automation.
permalink: /about
---

<div class="command-header">
  <p class="command-eyebrow">About</p>
  <h1>Suleman Manji</h1>
  <p class="command-lede">Sr. Services Engineer at Viyu Network Solutions, working across MSP systems engineering, agentic operations, Microsoft 365, MCP/API tooling, and proof-gated automation.</p>
</div>

<section class="command-section">
  <h2>Current operating frame</h2>
  <p>My formal role is services engineering. The broader work is building operator systems: command planes, agent runtimes, memory-backed workflows, and safety gates that help technical teams move from scattered context to verifiable action.</p>
  <p>I care about the boundary between automation and operational reality: what state was checked, what action is safe, what proof exists, what needs human approval, and what can be resumed cleanly later.</p>
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
  <p>Public writing here abstracts employer and client-adjacent work. It avoids client names, ticket IDs, internal hosts, private repository names, and operational screenshots. Financial-agent material is research and engineering infrastructure only; it is not investment advice or a solicitation.</p>
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
