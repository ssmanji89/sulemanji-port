---
layout: default
title: Writing
description: "Evidence-backed writing on engineering, practical tools, security, research, and interests beyond work."
permalink: /writing
writing_browser: true
hero_eyebrow: Writing
hero_title: "Notes from the work and the questions around it."
hero_lede: "Current articles remain available as ordinary links. Search titles and summaries, or choose a topic category."
---

{% assign articles = site.data.writing_discovery.articles %}
{% assign legacy_notes = site.data.writing_discovery.legacy %}

<section class="writing-browser" data-writing-browser aria-label="Browse writing">
  <div class="writing-controls" data-writing-controls hidden>
    <label for="writing-query">Search articles</label>
    <input id="writing-query" type="search" autocomplete="off" placeholder="Search titles and summaries" data-writing-query>
    <div class="writing-categories" role="group" aria-label="Filter by category" data-writing-categories>
      <button type="button" data-writing-category="all" aria-pressed="true">All</button>
      <button type="button" data-writing-category="operations" aria-pressed="false">Operations</button>
      <button type="button" data-writing-category="automation" aria-pressed="false">Automation</button>
      <button type="button" data-writing-category="security" aria-pressed="false">Security</button>
      <button type="button" data-writing-category="research" aria-pressed="false">Research</button>
      <button type="button" data-writing-category="other" aria-pressed="false">Other</button>
    </div>
    <button class="writing-reset" type="button" data-writing-reset>Reset filters</button>
    <p class="writing-count" role="status" aria-live="polite" data-writing-count>{{ articles.size }} articles</p>
  </div>

  <section id="writing-results" aria-label="Articles">
    {% if articles.size > 0 %}
      {% for article in articles %}{% include writing-entry.html article=article %}{% endfor %}
    {% else %}
      <p id="writing-empty">No dated articles are listed yet.</p>
    {% endif %}
    <p class="writing-no-results" data-writing-empty hidden>No articles match these filters. Try another search or reset the filters.</p>
  </section>
</section>

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
