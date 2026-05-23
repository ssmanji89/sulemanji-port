---
layout: default
title: Projects | Curated Command Center Systems
description: Curated public-safe systems by Suleman Manji across MSP operations, financial-agent research, agent runtime infrastructure, operator dashboards, and MCP/API tooling.
permalink: /projects
---

<div class="command-header">
  <p class="command-eyebrow">Projects</p>
  <h1>Curated systems, not a raw repo dump.</h1>
  <p class="command-lede">This page highlights public-safe systems that represent the current work. Some systems are linked to public repositories; internal or employer-adjacent systems are summarized without private names or implementation detail.</p>
</div>

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
  <p>Private and employer-adjacent systems are intentionally abstracted. Links are included only for public repositories or public-safe references.</p>
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
