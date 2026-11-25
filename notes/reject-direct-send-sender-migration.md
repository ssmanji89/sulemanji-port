---
writing_schema: 2
layout: writing-article
title: "Reject Direct Send is a sender migration, not a toggle"
description: "Plan Reject Direct Send as a sender migration: inventory anonymous mail, establish connector attribution, and verify delivery before enforcement."
permalink: /notes/reject-direct-send-sender-migration
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - microsoft-365
  - service-operations
---

Reject Direct Send is now generally available for Exchange Online worldwide tenants. Microsoft says the setting blocks anonymous messages when the envelope sender uses one of the tenant's accepted domains and the message is not attributed to an inbound connector. Existing tenants opt in; Microsoft is rolling it out as an always-on default for new tenants. ([Microsoft's GA announcement](https://techcommunity.microsoft.com/blog/exchange/reject-direct-send-now-generally-available-in-exchange-online/4573787))

I work as a Sr. Services Engineer at Viyu Network Solutions. The guidance below is analysis of public Microsoft material, not a report of a Viyu implementation or customer environment.

The safe decision is not simply whether to turn the setting on. It is whether every legitimate sender that depends on anonymous Direct Send has been retired, moved to a better sending method, or made attributable before enforcement begins.

## What does Reject Direct Send actually evaluate?

The setting evaluates two facts that are easy to blur together: the P1 MAIL FROM address used in the SMTP conversation and whether Exchange Online attributes the message to a connector. It does not evaluate the visible P2 From header for this decision. If the P1 domain is an accepted domain and the message is anonymous and unattributed, Exchange Online rejects it with `550 5.7.68`. ([Microsoft's GA announcement](https://techcommunity.microsoft.com/blog/exchange/reject-direct-send-now-generally-available-in-exchange-online/4573787))

That scope matters. Reject Direct Send is one control for mail that claims your own accepted domain through this specific path. Microsoft says it does not replace the anti-spoofing controls used for domains you do not own, and it is not the same as restricting all mail sent directly to the tenant's public Exchange Online endpoint. ([Microsoft's Direct Send explainer](https://techcommunity.microsoft.com/blog/exchange/direct-send-vs-sending-directly-to-an-exchange-online-tenant/4439865))

An admin should therefore avoid a vague goal such as "close the direct-delivery loophole." Name the path being changed: anonymous, connector-unattributed mail whose envelope sender belongs to an accepted domain. Other mail-flow questions need their own controls and evidence.

## Why isn't the Change Optics report a complete inventory?

Microsoft's Change Optics report includes a Direct Send scenario designed to help admins find legitimate traffic before enabling the setting. Its summary shows volume trends, and its detail view provides example messages that can start an investigation. ([Microsoft's Change Optics announcement](https://techcommunity.microsoft.com/blog/exchange/the-change-optics-report-is-now-generally-available-in-exchange-online/4565858))

Microsoft also states that Change Optics shows samples rather than an exhaustive message trace. A clean-looking report can narrow the search, but it cannot prove that every monthly device alert, low-frequency application, seasonal job, or failure-only notification has appeared.

The report is a discovery surface, not acceptance evidence. Use it to identify sending patterns, then test the named senders and trace representative messages through the route they will use after the change.

## How should an admin stage the migration?

Treat each observed Direct Send pattern as a small migration with an owner and a disposition.

1. **Observe a representative window.** Start with the Direct Send scenario in Change Optics, but include enough business cycles to catch low-frequency senders. Record the observation dates and the known gaps instead of calling the inventory complete.
2. **Classify each sender.** Capture the device or service owner, business purpose, recipients, P1 MAIL FROM domain, current route, and what would reveal a missed message. Separate required senders from abandoned or unknown traffic.
3. **Choose a disposition.** Retire unused flows. Move legitimate flows to an authenticated sending method when practical. Where a partner inbound connector is appropriate, Microsoft recommends matching its TLS certificate, with sending IP addresses as an alternative. ([Microsoft's GA announcement](https://techcommunity.microsoft.com/blog/exchange/reject-direct-send-now-generally-available-in-exchange-online/4573787), [Microsoft's connector guidance](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/use-connectors-to-configure-mail-flow/use-connectors-to-configure-mail-flow))
4. **Prove attribution.** Send a controlled message from each retained path and inspect its trace details. Microsoft's GA guidance uses `Get-MessageTraceV2` with `Get-MessageTraceDetailV2` to confirm that a message was attributed to the expected connector. ([Microsoft's GA announcement](https://techcommunity.microsoft.com/blog/exchange/reject-direct-send-now-generally-available-in-exchange-online/4573787), [Microsoft's message trace reference](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-faq))
5. **Enable with a support record.** Preserve the tested senders, expected rejection, observation time, responsible owner, and unresolved exceptions so the next engineer can distinguish a planned block from an outage.

This sequence turns an attractive security switch into a reviewable change. It also avoids granting a permanent exception merely because a sender is old or business-critical; importance establishes the need for a supported route, not a reason to preserve anonymous delivery.

## What should count as acceptance evidence?

Acceptance should cover both sides of the decision: mail that must continue and mail that should stop.

- A legitimate sender moved to its intended route and delivered a controlled message.
- A retained connector-based sender was attributed to the expected connector in trace details.
- A controlled anonymous Direct Send test using an accepted envelope domain received the documented `550 5.7.68` rejection after the setting propagated.
- The support record names any sender that remains untested, the reason, and the next check.
- The configuration value and evidence timestamps were read after the change, not copied from the plan.

No single success closes the whole claim. A rejected test proves that one tested path was blocked. A delivered application message proves that one tested path still worked. The inventory and handoff explain how far those observations can be generalized.

That is the same evidence boundary behind [separating assignment from application](/notes/intune-policy-verification) and writing [handoffs that outlast the agent session](/notes/work-outlasts-agent-session).

## When should the change wait?

Wait when a required sender has no owner, a recurring business cycle has not been observed, or the replacement path cannot yet be tested. Those are migration blockers, not reasons to declare the control unsuitable.

Microsoft also documents limits that change the decision. Reject Direct Send is not currently available in GCC High or DoD. A known issue can reject mail forwarded back to the organization by a third party that does not support Sender Rewriting Scheme. Complex third-party MX routing may require controls beyond Reject Direct Send because direct delivery to the Exchange Online endpoint is a separate path. ([Microsoft's GA announcement](https://techcommunity.microsoft.com/blog/exchange/reject-direct-send-now-generally-available-in-exchange-online/4573787), [Microsoft's Direct Send explainer](https://techcommunity.microsoft.com/blog/exchange/direct-send-vs-sending-directly-to-an-exchange-online-tenant/4439865))

The practical takeaway is narrow: enable Reject Direct Send after legitimate anonymous senders have a tested disposition, not after a dashboard appears quiet. The setting enforces a mail-flow boundary; the migration work makes that boundary safe to enforce.

*Primary Microsoft sources reviewed November 24, 2026. Exchange Online behavior and availability can change; verify the current documentation and tenant evidence before a live change.*
