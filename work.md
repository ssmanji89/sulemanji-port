---
layout: default
title: Work
description: Six cases spanning dependable service operations, practical automation, independent market systems, integrations, knowledge tools, and verification.
permalink: /work/
hero_eyebrow: Selected work
hero_title: "Dependable operations and useful systems."
hero_lede: "Professional practice at Viyu and independent projects that explore how software, evidence, and decisions fit together."
---

<div class="work-index-grid">
{% for case in site.data.work-cases %}
  <article class="work-index-card">
    <p class="kicker">{{ case.category | escape }}</p>
    <h2><a href="{{ '/work/' | append: case.slug | append: '/' | relative_url }}">{{ case.title | escape }}</a></h2>
    <p>{{ case.dek | escape }}</p>
    <p class="work-state">{{ case.status | escape }}</p>
    <a class="text-link" href="{{ '/work/' | append: case.slug | append: '/' | relative_url }}">Read the case <span aria-hidden="true">→</span></a>
  </article>
{% endfor %}
</div>

<section class="conversation-note"><div><h2>Business work stays with Viyu.</h2><p>Contact Viyu Network Solutions directly about business needs.</p></div><a class="btn btn-primary" href="https://viyu.net/contact-support/contact-us/">Contact Viyu <span aria-hidden="true">↗</span></a></section>
