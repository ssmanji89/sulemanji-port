---
layout: default
title: Writing
permalink: /writing
---

# Writing

Field notes from running MSP service delivery on agentic-LLM systems. Short, specific, evidence-first.

The long-form version: [MSP service delivery using agentic LLMs](/case-studies/agentic-msp-delivery).

<ul class="writing-index">
{% for note in site.pages %}{% if note.dir == '/notes/' %}<li><a href="{{ note.url }}">{{ note.title }}</a> — {{ note.description }}</li>{% endif %}{% endfor %}
</ul>
