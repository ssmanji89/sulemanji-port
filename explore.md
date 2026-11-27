---
layout: default
title: Explore projects and interests | Suleman Manji
description: Browse independent projects, professional practice, published integrations, mathematics, and interests by subject or availability.
permalink: /explore/
wide_content: true
content_browser: true
hero_eyebrow: Explore
hero_title: Follow a project, a question, or a subject.
hero_lede: The work spans service practice, independent software, mathematical verification, knowledge tools, and interests that stand on their own. Each entry states what is public and where to continue.
---

<section class="explore-browser" aria-labelledby="explore-items-title" data-content-browser>
  <div class="explore-browser__intro">
    <div><p class="kicker">The catalog</p><h2 id="explore-items-title">Browse all projects and writing.</h2></div>
    <p>Availability describes the public material here. It does not promise support, maintenance, adoption, or a live deployment.</p>
  </div>

  <form class="content-filters" data-content-filters hidden>
    <label for="content-query">Search titles and summaries</label>
    <input id="content-query" type="search" data-content-query autocomplete="off">
    <fieldset>
      <legend>Filter by subject</legend>
      <div class="content-filter-topics">
        {% for topic in site.data.content_catalog.topics %}
        <label><input type="checkbox" value="{{ topic[0] | escape }}" data-content-topic> {{ topic[1] | escape }}</label>
        {% endfor %}
      </div>
    </fieldset>
    <button type="reset" class="btn btn-outline" data-content-reset>Clear filters</button>
    <p class="content-count" role="status" aria-live="polite" data-content-count></p>
  </form>

  <ul class="explore-grid" data-content-list>
    {% for item in site.data.content_catalog.items %}
    <li class="explore-card" data-content-item data-topics="{{ item.topics | join: ' ' | escape }}" data-search="{{ item.title | append: ' ' | append: item.summary | downcase | escape }}">
      <p class="kicker">{{ item.kind | replace: '-', ' ' | capitalize }} · {{ item.availability | join: ', ' | escape }}</p>
      <h3><a href="{{ item.canonical_url | relative_url }}">{{ item.title | escape }}</a></h3>
      <p>{{ item.summary | escape }}</p>
      <div class="explore-card__topics">
        {% for id in item.topics %}
          {% assign topic_label = site.data.content_catalog.topics[id] %}
          <a href="{{ '/explore/topics/' | append: id | append: '/' | relative_url }}">{{ topic_label | escape }}</a>
        {% endfor %}
      </div>
      {% include content-related.html item=item %}
    </li>
    {% endfor %}
  </ul>
  <p class="content-empty" data-content-empty hidden>No entries match these filters. Clear them to see everything.</p>
</section>
