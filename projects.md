---
layout: default
title: Projects | Curated Command Center Systems
description: Curated public-safe systems by Suleman Manji across MSP operations, financial-agent research, agent runtime infrastructure, operator dashboards, and MCP/API tooling.
permalink: /projects
---

<div class="command-header">
  <p class="command-eyebrow">Projects</p>
  <h1>Systems with operational weight.</h1>
  <p class="command-lede">This is a public-safe map of what I am actively building: MSP command planes, CWM execution patterns, billing/runtime proof loops, memory-backed agent workflows, and API tooling that works against real platforms.</p>
</div>

<section class="command-section">
  <div class="section-kicker">Evidence Basis</div>
  <h2>Not scraped from a resume.</h2>
  <div class="proof-grid">
    <div><strong>Local project surface</strong><span>The current workstation includes the local-agent-tooling control plane, AlgaPSA/vArida billing lanes, Portainer deployment work, stakeholder renderers, and MSP operational artifacts.</span></div>
    <div><strong>Work accounting</strong><span>CWM and timesheet artifacts show member 346 time-entry reconciliation, internal development backfill review, and status-gated posting behavior.</span></div>
    <div><strong>Delivery governance</strong><span>GitHub Project 4, issue hierarchy, control-validate checks, proof comments, and audit-project output are part of the operating model.</span></div>
  </div>
</section>

<div class="project-filters">
  <button class="filter-btn active" data-filter="all">All Systems</button>
  <button class="filter-btn" data-filter="msp-operations">MSP Operations</button>
  <button class="filter-btn" data-filter="financial-agent-systems">Financial Agents</button>
  <button class="filter-btn" data-filter="agent-runtime">Agent Runtime</button>
  <button class="filter-btn" data-filter="operator-interfaces">Dashboards</button>
  <button class="filter-btn" data-filter="mcp-and-api-tooling">MCP/API</button>
</div>

<div class="systems-grid animate-on-scroll">
  {% for system in site.data.systems %}
    {% include system-card.html system=system %}
  {% endfor %}
</div>

<section class="command-section principles-panel">
  <h2>Publication boundary</h2>
  <p>Private and organization-adjacent systems are intentionally abstracted. Links are included only for public repositories or public-safe references.</p>
</section>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.system-card');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const value = button.getAttribute('data-filter');

      cards.forEach(card => {
        if (value === 'all' || card.getAttribute('data-category') === value) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
});
</script>
