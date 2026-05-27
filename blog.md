---
layout: page
title: Blog Archive | Suleman Manji
description: Legacy archive of technical articles and resources by Suleman Manji.
permalink: /blog/
---

<div class="command-header">
  <p class="command-eyebrow">Legacy Archive</p>
  <h1>Blog archive</h1>
  <p class="command-lede">This route remains available for older posts. The primary curated writing surface is now Notes.</p>
  <a href="/notes/" class="btn btn-primary">Open Notes</a>
</div>

<div class="blog-articles">
  {% for post in site.posts %}
    <article class="blog-article">
      <div class="article-content">
        <div class="article-meta">
          <span class="article-date">{{ post.date | date: "%B %d, %Y" }}</span>
          {% for category in post.categories %}
            <span class="article-category">{{ category }}</span>
          {% endfor %}
        </div>
        <h2 class="article-title"><a href="{{ post.url }}">{{ post.title }}</a></h2>
        <div class="article-excerpt">
          {{ post.content | strip_html | truncatewords: 40 }}
        </div>
        <a href="{{ post.url }}" class="read-more">Read Article</a>
      </div>
    </article>
  {% endfor %}
</div>
