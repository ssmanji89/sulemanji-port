---
layout: default
title: Work With Me Request Received
description: Confirmation for Work With Me intake submissions.
permalink: /work-with-me/thanks
---

# Request received

Your intake has been submitted.

{% if site.priority_discovery_checkout_ready %}
If you chose normal review, it enters the manual review queue. If you chose Priority Discovery, follow the priority link with your case token to request deposit checkout.
{% else %}
If you chose normal review, it enters the manual review queue. If you chose Priority Discovery, payment will not be available until the legal/tax review gate is complete.
{% endif %}

Do not send secrets, credentials, attachments, regulated records, or private third-party data in follow-up messages. Sanitized examples are preferred.

<div class="cta-buttons">
  <a href="/work-with-me" class="btn btn-outline">Back to Work With Me</a>
</div>
