---
layout: default
title: Writing
description: "Articles on Microsoft 365, business applications, infrastructure, and the decisions involved in keeping organizations running."
permalink: /writing
---

# Notes on systems and service.

Microsoft 365, business applications, infrastructure, service operations, and the decisions involved in keeping organizations running.

{% assign notes = site.pages | where: "dir", "/notes/" %}
{% assign articles = notes | where: "writing_schema", 1 | where: "published", true %}
{% assign date_groups = articles | group_by: "published_on" | sort: "name" | reverse %}
{% assign legacy_notes = notes | sort: "url" %}
{% assign legacy_count = 0 %}
{% for note in legacy_notes %}
  {% if site.data.writing.legacy_paths contains note.path %}
    {% assign legacy_count = legacy_count | plus: 1 %}
  {% endif %}
{% endfor %}

{% if articles.size > 0 %}
  {% assign newest_group = date_groups | first %}
  {% assign newest_group_articles = newest_group.items | sort: "url" %}
  {% assign featured = newest_group_articles | first %}
<section id="writing-latest" aria-labelledby="writing-latest-heading">
  <h2 id="writing-latest-heading">Latest article</h2>
  {% include writing-entry.html article=featured %}
</section>
  {% if articles.size > 1 %}
<section id="writing-more" aria-labelledby="writing-more-heading">
  <h2 id="writing-more-heading">More articles</h2>
    {% for date_group in date_groups %}
      {% assign group_articles = date_group.items | sort: "url" %}
      {% for article in group_articles %}
        {% unless article.url == featured.url %}
          {% include writing-entry.html article=article %}
        {% endunless %}
      {% endfor %}
    {% endfor %}
</section>
  {% endif %}
{% else %}
<p id="writing-empty">No dated articles are listed yet.</p>
{% endif %}

{% if legacy_count > 0 %}
<section id="writing-legacy" aria-labelledby="writing-legacy-heading">
  <h2 id="writing-legacy-heading">Earlier writing</h2>
  {% for note in legacy_notes %}
    {% if site.data.writing.legacy_paths contains note.path %}
<article class="proj" data-writing-legacy-url="{{ note.url | escape }}">
  <h3><a href="{{ note.url | relative_url | escape }}">{{ note.title | escape }}</a></h3>
  <p>{{ note.description | escape }}</p>
  <p class="proj-meta">Publication date not recorded</p>
</article>
    {% endif %}
  {% endfor %}
</section>
{% endif %}
