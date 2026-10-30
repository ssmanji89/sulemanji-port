---
writing_schema: 2
layout: writing-article
title: A webhook IP range is not sender authentication
description: Use GitHub webhook IP ranges for network admission while signatures protect the payload and idempotency protects each effect.
permalink: /notes/github-webhook-ip-range-authentication
published: true
published_on: "2026-10-30"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - identity
  - service-operations
---

GitHub's new webhook IP ranges can keep legitimate deliveries from being blocked, but they do not prove who created a payload. An architect should treat the ranges as network-admission data, keep signature verification as the sender-and-integrity check, and make every accepted event safe to process more than once.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public GitHub and OWASP sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what should a team change when GitHub adds webhook IP ranges?** My answer is to update the network path without collapsing three separate decisions. The edge decides whether a connection may reach the handler. The handler decides whether GitHub signed the exact payload. The application decides whether that valid event may produce an effect now.

## What changed on October 29?

GitHub announced three additional CIDR prefixes for webhook deliveries on `github.com` on October 29, 2026. The [GitHub changelog](https://github.blog/changelog/2026-10-29-webhook-ip-ranges-added-to-the-meta-api/) says the ranges now appear in the `hooks` field of the Meta API and apply across all `github.com` plans, including GitHub Enterprise Cloud.

The immediate action depends on how the allowlist is maintained. GitHub says teams with a static allowlist should add the new prefixes alongside their existing webhook ranges. Teams that already keep the allowlist current from the Meta API need no special change for these additions.

That distinction matters more than the three values. A copied list creates a future task each time GitHub changes its delivery network. A maintained feed creates a different obligation: retrieve the correct field, detect a change, update the enforcement point safely, and show that legitimate deliveries still pass.

GitHub's [webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) say the company changes IP addresses from time to time and recommends periodic allowlist updates. Its broader [IP-address guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses) recommends regular monitoring when a team uses the Meta API ranges.

## What does an IP allowlist prove?

An allowlist can reduce unwanted traffic reaching a webhook endpoint. It can also fail closed when a legitimate publisher adds an address and the subscriber does not update its edge. Neither outcome makes the source address a payload identity.

OWASP's [Webhook Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html) describes IP allowlisting as an extra layer because ranges change and shared egress is not proof of identity. GitHub separately tells subscribers to use a webhook secret to verify that a delivery came from GitHub and that the payload was not modified.

Keep the claims separate:

| Evidence | Supported conclusion | Conclusion it does not support |
| --- | --- | --- |
| Source address is in the current `hooks` ranges | The connection passed one network-admission rule. | GitHub signed this payload. |
| `X-Hub-Signature-256` matches the HMAC of the raw body | A holder of the webhook secret signed these exact bytes. | The event is new, authorized for every downstream action, or safe to parse without limits. |
| Event type and action match the handler's contract | The message belongs to a supported processing path. | The message has not been processed before. |
| Delivery identifier has not been processed | This handler has no retained record of that delivery. | The requested downstream effect is automatically safe or still appropriate. |

This separation prevents a common control substitution. A network team can correctly update the allowlist while an application still accepts unsigned requests. An application can correctly verify a signature while a stale allowlist drops every legitimate delivery. Both controls can work while a duplicate event repeats a non-idempotent action.

The same reasoning applies beyond webhooks. Identity evidence answers who or what presented a request; authorization answers what that identity may do. I use that distinction in [an AI agent identity is not an authorization decision](/notes/ai-agent-identity-authorization). A GitHub source range is weaker evidence than a cryptographic sender check, and neither one grants unlimited application authority.

## Where should each control run?

Place each control at the layer that can evaluate its evidence without changing it. The network edge can compare the observed source address with the current `hooks` ranges. The webhook handler can verify the signature against the raw request body. The application can validate the event contract and control the resulting state change.

The order should be explicit:

1. **Admit the connection.** Apply the current GitHub webhook ranges at the actual public ingress point. Document which component observes the source address.
2. **Preserve the signed bytes.** Read the raw request body before parsing or re-serializing it. GitHub computes the signature from the payload contents.
3. **Verify the signature.** Compute HMAC-SHA-256 with the webhook secret and compare it with `X-Hub-Signature-256` using a constant-time comparison. Reject a missing or invalid signature before processing.
4. **Constrain the event.** Accept only the event types and actions the handler supports. Apply payload-size and schema limits before using fields downstream.
5. **Control the effect.** Use the delivery identifier to detect ordinary redeliveries, make state changes idempotent, and durably queue or complete accepted work before acknowledging it.

GitHub documents the signature format and publishes [validation examples](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) for several languages. It warns that parsing or modifying the payload before verification can cause a mismatch. It also says to use a constant-time comparison instead of a plain equality operator.

The delivery identifier needs a narrower claim. GitHub recommends `X-GitHub-Delivery` to identify a delivery and says a requested redelivery keeps the original value. OWASP notes that GitHub signs the body, not that header. Use the identifier for deduplication and idempotency, but do not present it as cryptographically authenticated replay protection.

Fast acknowledgement is also a reliability boundary. GitHub expects a `2XX` response within ten seconds and recommends asynchronous processing when work may take longer. A quick response should mean the event is durably accepted, not that the handler discarded its evidence and hopes later processing succeeds.

## How should a team apply the range change?

Start with the enforcement point, not a repository-wide search for the new CIDRs. The active rule may live in a firewall, reverse proxy, API gateway, load balancer, hosted webhook relay, or another service boundary. A list in source control is only evidence of intent until the active path reads it.

Use one change record for the network update:

| Field | Evidence to retain | Decision it supports |
| --- | --- | --- |
| Ingress | Public endpoint, enforcement component, and owner | Where the range rule must change |
| Source | Meta API `hooks` response and retrieval time | Which publisher ranges were current |
| Difference | Added and removed prefixes | Whether the change is expected and bounded |
| Deployment | Applied rule version and effective time | Whether the active edge received the change |
| Delivery test | Genuine delivery accepted through the normal route | Whether the updated path admits GitHub |
| Negative tests | Invalid signature, unsupported event, and duplicate delivery | Whether later controls still fail safely |
| Recovery | Previous rule, rollback condition, and owner | How to restore service without removing signature checks |

Add new ranges before removing old ones unless GitHub says an old range is unsafe. That order reduces an avoidable delivery gap. Treat removals as a separate review because an unexpected deletion can indicate a retrieval error, a changed API shape, or a real publisher transition.

For an automated feed, validate more than an HTTP success code. Confirm that the response contains the expected `hooks` field, every value parses as an allowed CIDR, the set is not unexpectedly empty, and the difference stays within a reviewed change path. Preserve the last known accepted set so a malformed or unavailable response does not erase the active allowlist.

Test the layers independently. A genuine signed delivery through the public route checks admission and application acceptance together. A known invalid signature checks that the handler rejects a request even when it reaches the application. A repeated delivery identifier checks that an accepted event does not repeat its effect.

The record must survive the person or agent that performed the update. [Work should outlast the agent session](/notes/work-outlasts-agent-session) explains why a durable result needs its source, scope, verification, and next trigger rather than a transient success message.

## When does this guidance not apply?

The October 29 change is specific to webhook deliveries on `github.com`. It is not evidence about a GitHub Enterprise Server deployment, a different webhook publisher, or every GitHub service. Bind the change to the service and field named in the current notice.

A team without an IP allowlist does not need to add one only because GitHub published new ranges. Signature verification, HTTPS, event validation, resource limits, and idempotent effects remain the more direct webhook controls. An allowlist can add useful filtering when the network path can maintain it without creating a fragile outage dependency.

A hosted relay also changes the boundary. If GitHub delivers to the relay and the relay sends a new request to the application, the application may observe the relay's source address instead of GitHub's. Apply each publisher's control to the connection it actually creates, and verify the authentication contract at every trust transition.

No single passing test proves the complete handler is safe. A valid signature does not make payload fields safe for a database or shell. A recognized event does not prove that its requested state change is still permitted. An idempotency record does not recover an event that the edge rejected before the application saw it.

The useful response to a range announcement is therefore not “add three CIDRs and close the ticket.” Update the real ingress, verify the public route, test signature failure and duplicate handling, and retain the evidence. The ranges keep the door reachable. The signature and application rules decide what may enter and what it may change.

*Primary GitHub and OWASP sources reviewed October 30, 2026. GitHub can change its webhook ranges and guidance. Retrieve the current Meta API `hooks` value and recheck the current webhook documentation before changing an allowlist.*
