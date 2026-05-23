---
layout: default
title: Work Map | Suleman Manji
description: Public-safe map of proof-gated MSP operations, agent runtime, financial-agent research, operator dashboards, and MCP/API tooling.
permalink: /work-map
---

<div class="command-header">
  <p class="command-eyebrow">Work Map</p>
  <h1>From service chaos to controlled action.</h1>
  <p class="command-lede">The map below reflects the actual operating lanes in my local work: platform CLIs, CWM ticket control planes, billing preview gates, live UI proof, session-memory infrastructure, and public-safe stakeholder outputs.</p>
</div>

<section class="command-section">
  <div class="section-kicker">Translation Layer</div>
  <h2>Private evidence, public pattern.</h2>
  <p class="command-lede">Much of the work touches employer systems or client operations, so the public artifact cannot be a raw ticket dump. The useful signal is the repeatable pattern: collect live state, identify the safe action boundary, create a reviewable control plane, execute only when gated, and leave durable proof.</p>
</section>

{% for system in site.data.systems %}
  {% include system-lane.html system=system %}
{% endfor %}
