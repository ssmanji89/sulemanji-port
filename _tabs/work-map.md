---
layout: page
title: Work Map
icon: fas fa-map
order: 1
permalink: /work-map/
---

<div class="command-header">
  <p class="command-eyebrow">Work Map</p>
  <h1>Systems lanes, proof paths, and operator leverage.</h1>
  <p class="command-lede">This map groups the public-safe parts of my current work into systems lanes. It avoids client detail and focuses on problem surfaces, systems built, proof discipline, and operator leverage.</p>
</div>

{% for system in site.data.systems %}
  {% include system-lane.html system=system %}
{% endfor %}
