---
layout: default
title: Writing
description: "Evidence-backed writing on engineering, practical tools, product categories, and interests beyond work."
permalink: /writing
---

# Writing on work and beyond.

Evidence-backed articles on engineering, useful tools, and interests beyond work. Each article starts with a question worth answering. Paid links are disclosed when they appear.

{% assign articles = site.data.writing_discovery.articles %}
{% assign legacy_notes = site.data.writing_discovery.legacy %}

{% if articles.size > 0 %}
  {% assign featured = articles | first %}
<section id="writing-latest" aria-labelledby="writing-latest-heading">
  <h2 id="writing-latest-heading">Latest article</h2>
  {% include writing-entry.html article=featured %}
</section>
  {% if articles.size > 1 %}
<section id="writing-more" aria-labelledby="writing-more-heading">
  <h2 id="writing-more-heading">More articles</h2>
    {% for article in articles offset:1 %}
      {% include writing-entry.html article=article %}
    {% endfor %}
</section>
  {% endif %}
{% else %}
<p id="writing-empty">No dated articles are listed yet.</p>
{% endif %}

{% if legacy_notes.size > 0 %}
<section id="writing-legacy" aria-labelledby="writing-legacy-heading">
  <h2 id="writing-legacy-heading">Earlier writing</h2>
  {% for note in legacy_notes %}
{% assign writing_legacy_url = site.baseurl | append: note.url %}
<article class="proj" data-writing-legacy-url="{{ note.url | escape }}">
  <h3><a href="{{ writing_legacy_url | escape }}">{{ note.title | escape }}</a></h3>
  <p>{{ note.description | escape }}</p>
  <p class="proj-meta">Publication date not recorded</p>
</article>
  {% endfor %}
</section>
{% endif %}
