---
writing_schema: 2
layout: writing-article
title: Treat an LLM usage spike as a possible identity incident, not only a billing anomaly
description: Treat unauthorized model use as cloud identity compromise, then verify containment, persistence removal, and cost recovery separately.
permalink: /notes/llm-usage-spike-identity-incident
published: true
published_on: "2026-11-02"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: service-leader
topics:
  - identity
  - infrastructure
  - service-operations
  - ai-assisted-delivery
---

An unexpected spike in LLM usage can arrive as a billing alert, but the response cannot stop at cost control. Current threat research shows that unauthorized model use can begin with stolen cloud credentials, service-account keys, repository tokens, session tokens, or exposed model endpoints. A service leader should treat the spike as evidence of possible identity compromise until the team establishes the access path, the changes made with that access, and the boundary of the resulting activity.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research, then checked it against the public Google, Wiz, NIST, and cloud-provider sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **how should a service leader respond when unauthorized model use first appears as a cloud-spend spike?** My answer is to run two connected tracks. The security track contains the identity, finds persistence, and establishes the affected scope. The financial track limits further charges and reconciles the account. Neither track can clear the other.

## What changed in the public threat evidence?

Google Threat Intelligence Group and Mandiant published [new LLMjacking research](https://cloud.google.com/blog/topics/threat-intelligence/llmjacking-monetizing-compromised-cloud-models/) on November 2, 2026. Their incident investigations covered multiple cloud and model providers. Across those investigations, the dominant initial-access path was exposed or stolen cloud identity material, including IAM credentials, service-account keys, repository access tokens, and active sessions.

The observed activity did not remain inside a model endpoint. The report describes actors enumerating cloud services, repositories, data stores, and identity policies. It also describes unauthorized account creation, permission changes, new credentials, service enablement, compute deployment, and quota changes. Model consumption was the monetization path, but the access could reach a wider cloud control plane.

[Wiz reported a related campaign](https://threats.wiz.io/all-incidents/threat-actors-targeting-gcp-billing-accounts-for-llm-usage) on October 20. In that account, phishing captured corporate credentials and multifactor authentication tokens. The actors then changed billing access and linked outside projects to the victim's billing account, so the costly model calls occurred outside the victim's own project logs.

These reports support a bounded conclusion. Unauthorized LLM use can be one visible effect of broader identity access. They do not establish that every model-usage spike is malicious, that one access path explains every case, or that any specific organization is exposed.

## Why is the billing alert not the incident boundary?

A cost alert answers a financial question: did measured or forecasted spend cross a configured threshold? It does not identify the principal that created the usage, prove which credential was used, show whether that principal changed permissions, or reveal activity recorded in another project or account.

Google Cloud's [budget documentation](https://docs.cloud.google.com/billing/docs/how-to/budgets) makes a narrower limitation explicit. An alerts-only budget sends notifications, but it does not automatically cap usage or spending. Cost reporting can also lag resource use. A billing alert is therefore useful detection evidence, but it is neither immediate containment nor a complete activity log.

The opposite mistake is also possible. Stopping a model endpoint or disabling billing can limit one effect while leaving the access path intact. An actor with valid cloud identity material may have created another key, account, role binding, project link, workload, or session before the visible usage stopped. The cost curve can flatten while persistence remains.

Treat the first alert as the start of a timeline, not as the scope. Preserve when the alert fired, which account and service produced it, when the unusual usage began, and which identities or projects appear in the available records. Then use identity, administrative, audit, workload, repository, and billing evidence to extend or narrow the timeline.

## What should the first response decide?

The first decision is whether the team has enough evidence to contain a credential, principal, project, or service without causing a larger outage. That decision should name both the suspected access and the expected operational effect of containment.

Google's [compromised-credential guidance](https://docs.cloud.google.com/docs/security/compromised-credentials) shows why deleting one key may be insufficient. A service-account key can be used to obtain a short-lived access token. Removing the key prevents future use of that key, but an existing token can remain usable until it expires. Google recommends controls that address the represented service account or active-token permissions when immediate blocking is required.

The exact mechanism depends on the provider and credential type, but the decision questions remain stable:

| Decision | Evidence needed | Failure to avoid |
| --- | --- | --- |
| What access should stop now? | Suspected principal, credential type, token lifetime, and reachable resources | Rotating an unrelated secret while the active path remains valid |
| What service impact is acceptable? | Workloads that depend on the identity or service | Disabling a shared principal without an outage plan |
| What evidence must be preserved? | Audit records, usage records, identity changes, and relevant timestamps | Destroying the only useful timeline during cleanup |
| What is the initial search boundary? | First suspicious access, affected accounts, projects, repositories, and regions | Treating the first expensive API call as the first attacker action |

Containment must not wait for perfect attribution. It should still be explicit about uncertainty. A response record can say that a credential is disabled because its use is unexplained while the investigation continues. It should not say the incident is contained merely because one charge source stopped increasing.

## How should the team search for persistence and expansion?

Search from the compromised authority outward. Start with what the suspected principal could do, then inspect what it actually did during the bounded timeline. The public reports make five change classes especially important:

1. **Identity changes:** new users, service accounts, keys, tokens, group membership, federation changes, or role assignments.
2. **Billing and quota changes:** linked projects, billing-role changes, new subscriptions, enabled services, quota increases, or regional expansion.
3. **Workload changes:** new compute, containers, proxies, gateways, scheduled jobs, startup data, or remote-access paths.
4. **Credential access:** repository reads, secret-store access, environment inspection, database queries, or attempts to create further credentials.
5. **Evidence gaps:** calls made through an outside project, missing data-access logs, short retention, or a shared identity that prevents reliable actor attribution.

This list is an investigation frame, not proof that every class occurred. Each item needs its own evidence. Absence from one console is not absence from the environment, especially when a billing relationship or stolen credential lets activity occur across account boundaries.

Google's [service-account key guidance](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys) also warns that removing a public copy does not neutralize a leaked key. The key itself must be disabled or deleted, and the response must consider the resources available to that identity. Prevention should reduce long-lived keys, restrict who can create them, and preserve audit evidence for impersonation and administrative changes.

## What does a defensible closure record contain?

Closure needs separate claims because cost recovery, access containment, persistence removal, and service recovery can finish at different times. [NIST SP 800-61 Revision 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) places incident response across preparation, detection, response, recovery, and continuing improvement. That lifecycle is a better fit than a single “resolved” checkbox.

A useful closure record states:

- which original credentials, sessions, and principals can no longer authorize access;
- which unauthorized identities, role changes, resources, services, and billing links were removed;
- which audit periods and account boundaries were reviewed, including named gaps;
- which legitimate workloads were restored with known-good access; and
- which usage and identity signals remained normal during a defined observation window.

The financial record remains separate. It can document stopped usage, provider contact, disputed charges, and reconciled billing without claiming that the security investigation is complete. Likewise, a clean identity review cannot promise that a provider will reverse charges.

Do not let a familiar total replace the harder acceptance evidence. A return to normal spend can result from rate limits, exhausted quota, a disabled model service, or an attacker moving elsewhere. Closure requires evidence about authority and effects, not only a quieter graph.

## Where does this advice stop?

Not every spike is an intrusion. A planned batch job, a new product launch, an incorrect retry loop, a model change, or a misconfigured proxy can create unusual usage. The identity-first method still helps because it tests who authorized the activity and what changed instead of assigning intent from cost alone.

Provider controls also differ. The Google guidance above explains Google Cloud tokens, service accounts, budgets, and logs. Teams using another provider must map the same claims to that provider's identity, billing, audit, quota, and incident-response controls. The general model does not make provider-specific commands interchangeable.

The durable lesson is that an LLM usage spike is a signal, not a boundary. Stop the financial loss, but investigate the authority that made the usage possible. Prove that the original access is invalid, search for changes made through it, remove persistence, restore legitimate service, and verify each result independently.

This conclusion also connects to two earlier notes. [An AI agent identity is not an authorization decision](/notes/ai-agent-identity-authorization) separates runtime identity from permitted action. [AI changes the patch clock, not the evidence](/notes/ai-vulnerability-triage-evidence) separates an urgent signal from the proof needed for the next claim.
