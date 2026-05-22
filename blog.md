---
layout: default
title: Blog Archive | Suleman Manji
description: Legacy technical blog archive. The primary curated writing surface is now Notes.
permalink: /blog
---

<div class="command-header">
  <p class="command-eyebrow">Legacy Archive</p>
  <h1>Blog archive</h1>
  <p class="command-lede">This route remains available for older posts. The primary curated writing surface is now Notes.</p>
  <a href="/notes" class="btn btn-primary">Open Notes</a>
</div>

<div class="blog-articles animate-on-scroll">
  {% for post in site.posts %}
    <article class="blog-article" data-categories="{{ post.categories | join: ',' }}">
      <div class="article-content">
        <div class="article-meta">
          <span class="article-date"><i class="far fa-calendar-alt"></i> {{ post.date | date: "%B %d, %Y" }}</span>
          {% for category in post.categories %}
            <span class="article-category">{{ category }}</span>
          {% endfor %}
        </div>

        <h2 class="article-title"><a href="{{ post.url }}">{{ post.title }}</a></h2>

        <div class="article-excerpt">
          {{ post.content | strip_html | truncatewords: 40 }}
        </div>

        <div class="article-tags">
          {% for tag in post.tags %}
            <span class="article-tag">{{ tag }}</span>
          {% endfor %}
        </div>

        <a href="{{ post.url }}" class="read-more">Read Article <i class="fas fa-arrow-right"></i></a>
      </div>
    </article>
  {% endfor %}
</div>
