---
layout: default
title: Work Map | Suleman Manji
description: Public-safe map of proof-gated MSP operations, agent runtime, financial-agent research, operator dashboards, and MCP/API tooling.
permalink: /work-map
---

<div class="command-header">
  <p class="command-eyebrow">Work Map</p>
  <h1>Systems lanes, proof paths, and operator leverage.</h1>
  <p class="command-lede">This map groups the public-safe parts of my current work into systems lanes. It avoids client detail and focuses on problem surfaces, systems built, proof discipline, and operator leverage.</p>
</div>

{% for system in site.data.systems %}
  {% include system-lane.html system=system %}
{% endfor %}
