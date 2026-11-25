---
writing_schema: 2
layout: writing-article
title: "Zero data retention is a route property, not a provider label"
description: "Verify zero data retention across the exact AI inference route, including endpoint eligibility, fallbacks, logs, tools, and incident triggers."
permalink: /notes/zero-data-retention-route-acceptance
published: true
published_on: "2026-11-24"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - ai-assisted-delivery
  - infrastructure
  - service-operations
---

Three public records in November 2026 turned zero data retention from a policy phrase into an architecture question. Dragos reported canary activity after sending nearly two million seeded prompts through AI services. Together AI confirmed that an unauthorized party downloaded stored prompt samples after a repository credential was exposed. OpenRouter then said it had off-boarded three providers and removed 125 endpoints from zero-data-retention eligibility. ([Dragos research](https://www.dragos.com/blog/ai-supply-chain-security-canary-tokens), [Together AI incident notice](https://www.together.ai/blog/security-event-prompt-leakage-for-requests-in-june-and-july-of-2026), [OpenRouter response](https://openrouter.ai/blog/data-processing-incidents-on-inference-providers/))

I work as a Sr. Services Engineer at Viyu Network Solutions. This article is analysis of public research, vendor disclosures, and standards guidance. It does not describe a Viyu implementation, customer environment, internal product, architecture, control, or operating method.

Zero data retention should be accepted as a time-bound property of an exact request route, not inherited from a model name, provider logo, or account toggle. The acceptance record has to identify every eligible endpoint, fallback, tool, cache, and log that can receive the payload, then state which event forces the decision to be reopened.

## What did the November findings establish?

The three records support different conclusions, and combining them carelessly would overstate the evidence.

Dragos ran a research experiment from July through November using unique URLs and canary credentials. The researchers reported later access to some seeded values and activity consistent with prompt exposure. They also stated an important limit: a canary can show that a prompt escaped its expected boundary, but it does not by itself identify which hop in a brokered route leaked it. ([Dragos research](https://www.dragos.com/blog/ai-supply-chain-security-canary-tokens))

Together AI disclosed a narrower confirmed incident. It said prompt samples from a subset of June and July serverless-inference requests had been stored in a private repository for authorized testing. A credential for that repository was later committed to public code by an AI coding agent, and an unauthorized party used it to download the samples. Together said its review of the affected contents and customer scope was still ongoing when the notice was published. ([Together AI incident notice](https://www.together.ai/blog/security-event-prompt-leakage-for-requests-in-june-and-july-of-2026))

OpenRouter said the researchers did not find a breach of OpenRouter itself. Its response was still operationally significant: it off-boarded three providers, removed 125 endpoints from ZDR eligibility, notified potentially affected customers, and began additional path verification. That is a vendor-reported response, not independent proof that every remaining path is compliant. ([OpenRouter response](https://openrouter.ai/blog/data-processing-incidents-on-inference-providers/))

The defensible conclusion is not that every ZDR service failed. The evidence falsified data-handling assurances on specific paths and forced a broker to reconsider specific endpoint eligibility. That is enough to change how an architect should approve a route.

## What does zero data retention actually cover?

ZDR addresses storage after inference. OpenRouter's current explanation says an eligible provider processes the prompt and completion without routinely persisting them after the response. It separately identifies data in transit, training use, processing region, request metadata, application logs, plugins, tools, and caches as different questions. ([OpenRouter ZDR explanation](https://openrouter.ai/blog/insights/zero-data-retention/))

Those distinctions prevent attractive but invalid substitutions:

| Statement | What it answers | What it leaves open |
| --- | --- | --- |
| Zero data retention | Whether an eligible inference endpoint routinely stores prompts and completions after processing | Transit, region, tools, local logs, metadata, and every policy exception |
| No training | Whether submitted data may improve a model | Temporary storage for safety, abuse, legal, or operational purposes |
| Regional processing | Where the request is processed | Whether it is retained afterward |
| A provider is approved | Which organization may receive traffic | Which endpoint, feature, subcontractor, and fallback actually handled this request |

Endpoint detail matters because one provider can expose several models and features under different policies. OpenRouter says it tracks policy at the endpoint level and treats unclear policies conservatively. Its data-processing agreement also says that a ZDR designation reflects a provider's published or represented policy and is not an OpenRouter guarantee of the provider's compliance. ([OpenRouter ZDR documentation](https://openrouter.ai/docs/guides/features/zdr), [OpenRouter data-processing agreement](https://openrouter.ai/assets/data-processing-agreement.pdf))

Even the request flag needs context. OpenRouter documents that `zdr: true` limits routing according to the account and guardrail configuration, but Safety Retention endpoints can remain eligible when those settings allow them. Safety Retention permits some prompt and response storage for abuse prevention and is not strict ZDR. An acceptance record therefore needs the effective settings, not just the request body. ([OpenRouter ZDR documentation](https://openrouter.ai/docs/guides/features/zdr))

## Why is ZDR a route property?

A brokered request can cross an application, an observability layer, a router, one or more providers, an endpoint, and optional tools before the answer returns. The model name describes only one element. It does not reveal which organization processed the prompt, whether a fallback changed the path, or which surrounding system kept a copy.

Dynamic routing makes that path useful and risky. A router can optimize for price, latency, throughput, or availability and then fail over when the preferred endpoint is unavailable. OpenRouter's public routing controls illustrate the relevant choices: restrict providers, require ZDR-eligible endpoints, and decide whether failure may widen the provider set. ([OpenRouter provider-routing guide](https://learn.openrouter.ai/courses/control-routing/provider-selection))

The architectural claim must therefore be precise: this data class may use this model through these named provider endpoints under these effective retention settings, with these tools and logs disabled or separately governed. If any element changes, the old conclusion no longer describes the route.

## What belongs in a ZDR acceptance record?

A useful acceptance record does not say "ZDR enabled." It says which data class may use which model through which broker and provider endpoint, which storage and safety-retention modes are permitted, what happens when no compliant endpoint is available, and when the record expires.

1. **Define the data boundary.** Name the permitted data class and the inputs that remain prohibited even on an approved route. Separate ordinary business text from credentials, regulated records, customer content, and material that policy forbids any third party from processing.
2. **Map the complete path.** Record the application, broker, model, provider endpoint, region, tools, plugins, caches, logs, tracing systems, and fallback behavior. Unknown upstream processing is an unresolved dependency, not an acceptable blank.
3. **Bind enforcement to the route.** Capture the provider allowlist, endpoint eligibility, ZDR and Safety Retention choices, data-collection setting, and failover rule. Read back the effective policy after saving it.
4. **Attach dated evidence.** Keep the applicable policy and contract versions, endpoint-eligibility record, configuration readback, test scope, limitations, and reviewer. Avoid copying prompts or sensitive payloads into the evidence file.
5. **Set reopening triggers.** Reassess after a provider incident, eligibility removal, contract or policy change, new tool or cache, routing change, unplanned fallback, or expiration of the review window.

This is conventional supplier and change control applied to an AI value chain. NIST's Generative AI Profile recommends approved provider lists, inventories of third parties with access to organizational content, ongoing supplier monitoring, incident plans, and continuous monitoring of deployed third-party systems. It does not reduce those duties to a one-time vendor questionnaire. ([NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/AI/NIST.AI.600-1.pdf))

The record should also survive the person or agent that performed the check. A dated route, evidence boundary, reviewer, and reopening condition make the decision inspectable later; a screenshot of a green toggle does not. That is the same durability requirement behind [work that outlasts the agent session](/notes/work-outlasts-agent-session).

## What can a canary test prove?

A controlled canary is a falsifier. If a unique value appears where it should not, the expected confidentiality boundary failed somewhere along the tested route. Dragos's research shows why that signal is valuable and why attribution still requires path investigation. ([Dragos research](https://www.dragos.com/blog/ai-supply-chain-security-canary-tokens))

Silence is not the opposite proof. A canary that receives no callback may never have been inspected, may have been stored without being opened, or may have taken a different route from later production traffic. The safe conclusion is bounded: no callback was observed for the tested value during the stated window.

Do not use real credentials, customer data, or production secrets as test material. Use synthetic values only on systems and routes you are authorized to test, with an agreed observation window and a response owner. A test that creates another sensitive artifact defeats its own purpose.

Canaries should sit beside, not replace, policy review, contract review, route telemetry, configuration readback, and incident notification. A passing experiment can reject one feared failure mode; it cannot certify an entire privacy boundary. The same distinction is explained in [why a privacy testbed is not a privacy verdict](/notes/ppfl-testbed-privacy-verdict).

## When should the route stop accepting sensitive prompts?

Pause the sensitive path when the actual upstream provider cannot be identified, strict retention cannot be distinguished from Safety Retention, a plugin or log keeps the payload, or an incident leaves the affected scope unresolved. The remedy may be a narrower provider list, a non-sensitive fallback, a separately approved route, or no external inference for that workload.

The practical default is fail closed for sensitive prompts: if the approved route cannot be served, return an error or move the work to a separately approved path. Quietly widening the provider set preserves availability by spending the privacy guarantee, which is the wrong trade when retention is a hard requirement.

An incident also reopens prior approval. Rotate exposed credentials, bound the affected data and time window, remove unsafe copies, and require fresh evidence before restoring the route. [A leaked credential is an incident, not an alert](/notes/github-actions-log-secret-response); the same response discipline applies when that credential exposes retained prompt samples.

ZDR remains useful. It narrows provider-side storage when the request reaches an eligible endpoint under the intended settings. Treating it as a dated route acceptance decision preserves that value without pretending a product label can account for every hop.

*Public sources reviewed November 24, 2026, between approximately 7:20 and 7:25 p.m. America/Chicago. Provider eligibility, policies, incident scope, and routing behavior can change; recheck the linked sources and effective route before approving sensitive data.*
