---
layout: page
title: Projects
icon: fas fa-layer-group
order: 2
permalink: /projects/
---

<div class="command-header">
  <p class="command-eyebrow">Featured Systems</p>
  <h1>Curated project surface.</h1>
  <p class="command-lede">A public-safe view of the systems I have been building across MSP operations, agent runtimes, financial-agent research, operator dashboards, and MCP/API tooling.</p>
</div>

<div class="systems-grid">
  {% for system in site.data.systems %}
    {% include system-card.html system=system %}
  {% endfor %}
</div>
