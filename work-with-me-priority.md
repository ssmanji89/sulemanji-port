---
layout: default
title: Priority Discovery Deposit
description: Priority Discovery deposit summary for Work With Me intake cases.
permalink: /work-with-me/priority
work_with_me_form: true
---

# Priority Discovery Deposit

Priority Discovery is the faster path for one defined messy problem after you submit the Work With Me intake.

One Priority Discovery Deposit covers one defined messy problem and includes:

- agent-driven Gmail discovery;
- an explicit, customer-confirmed project vision;
- an action blueprint;
- a recommended live-session scope;
- access to a priority scheduling window; and
- a one-time credit toward that session.

The fixed Priority Discovery Deposit is $295. Session prices are quoted privately after the blueprint, not published as a price ladder.

## Credit and refund rules

Payment alone does not make the deposit non-refundable. The deposit becomes non-refundable when the first discovery email is successfully sent because delivery has begun.

If Suleman declines the engagement or the system cannot start discovery, the payment is refunded automatically. The 60-day credit window begins when the blueprint is delivered, not when the deposit is paid. The credit has no cash value and applies only once toward the recommended live session.

## Review boundary

AI participates in discovery and blueprint generation, and Suleman may review any thread. Do not send secrets, credentials, attachments, regulated records, sensitive third-party data, or material you lack authority to share.

Live checkout is unavailable until legal/tax review is recorded. The button below is the intended deposit handoff for an eligible case token, but it will not open payment until that review gate is complete.

<div class="priority-actions">
  <button id="priority-checkout" class="btn btn-primary" type="button" data-endpoint-base="{{ site.work_with_me_api_base }}/v1/cases" data-checkout-ready="false" aria-describedby="priority-status">Request deposit checkout</button>
  <p id="priority-status" class="form-status" role="status" aria-live="polite">Deposit checkout is unavailable until legal/tax review is recorded.</p>
</div>
