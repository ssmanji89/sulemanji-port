---
writing_schema: 2
layout: writing-article
title: "An adversarial AI taxonomy is not a threat model"
description: "Turn NIST's adversarial AI taxonomy into a scoped threat model by binding attacks to assets, access, consequences, controls, and tests."
permalink: /notes/adversarial-ai-taxonomy-threat-model
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - ai-assisted-delivery
  - infrastructure
  - service-operations
---

NIST published an initial draft of its 2026 adversarial machine learning taxonomy on November 9. The draft adds a substantial focus on agentic systems and invites public comments through December 18. It can help an architect find attack classes that a narrow review would miss, but a complete index is not a local risk decision. ([NIST publication page](https://csrc.nist.gov/pubs/sp/2400-102/e2026/ipd))

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted public-source research. It does not describe a Viyu system, customer, product, architecture, control, vendor relationship, threat model, or operating method.

This guide is for an architect reviewing an AI system, especially one that retrieves untrusted data or can use tools. The practical question is: **how do you turn a broad attack taxonomy into a bounded threat model that can drive a control and a test?** My answer is to keep the taxonomy as a coverage index, then bind each relevant attack to the system's actual assets, access paths, consequences, and evidence.

## What does the NIST draft actually provide?

The draft provides a common language for adversarial machine learning. NIST organizes the subject around system types, stages in the life cycle, attacker goals and objectives, attacker capabilities, and attacker knowledge. Its agentic-system section covers user interaction, model supply chains, untrusted data, malicious tools and skills, multi-agent systems, and long-horizon tasks. ([NIST draft PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.2400-102e2026.ipd.pdf))

That structure is useful because teams often use the same words for different failures. Prompt injection, data poisoning, model tampering, tool misuse, and ordinary software compromise do not share one precondition or one mitigation. A taxonomy lets reviewers name the class, find neighboring classes, and compare their assumptions.

The document is still an initial public draft. NIST describes it as voluntary, says it creates no legal requirement, and is explicitly asking whether the attack coverage, mitigations, and terminology need changes. The publication state matters: it is a strong input to a review, not a finished compliance checklist.

The preceding 2025 NIST report also warns that many adversarial-ML mitigations are empirical and limited rather than backed by broad security guarantees. A listed mitigation therefore starts an engineering question. It does not close the risk by citation. ([NIST AI 100-2e2025](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf))

A taxonomy gives an architect a shared name for a class of attack. A threat model decides whether that attack can reach this system, which asset it can affect, what consequence matters, and which evidence would change the decision.

## Why is the taxonomy not the threat model?

The fastest way to turn a taxonomy into theater is to copy every attack into a risk register and mark each one high. That creates coverage without prioritization, because the record no longer distinguishes possible from reachable or consequential.

NIST's AI Risk Management Framework Playbook begins its Map function with context: intended purpose, users, deployment setting, assumptions, limitations, and potential impacts. Its Measure function then says to select methods and metrics for the most significant mapped risks. That order prevents a catalog from becoming an unranked queue. ([NIST AI RMF Map](https://airc.nist.gov/airmf-resources/playbook/map/), [NIST AI RMF Measure](https://airc.nist.gov/airmf-resources/playbook/measure/))

MITRE ATLAS provides another useful distinction. Its public data model gives techniques platforms and an authored maturity assessment of Feasible, Demonstrated, or Realized. Case studies and mitigations are separate objects. A technique name, an evidence-maturity label, a case study, and applicability to a particular system are related facts, not interchangeable verdicts. ([MITRE ATLAS data](https://github.com/mitre-atlas/atlas-data))

Prompt injection shows why context changes the decision. OWASP's 2026 entry describes input arriving through direct user text, retrieved content, tool output, media, reasoning, or persistent memory. It also says the consequence changes with the system's business context and agency. A read-only assistant that drafts text for review and an agent authorized to perform an external action can share an attack class while presenting very different consequences. ([OWASP LLM01:2026](https://genai.owasp.org/llm2026/llm012026-prompt-injection/))

That example does not prove either system is vulnerable. It identifies questions the architecture must answer: which inputs can carry untrusted instructions, what authority can be reached, what deterministic checks sit between model output and an effect, and what a reviewer can observe after a test.

## How should an architect turn names into decisions?

Use the taxonomy as the top of a five-step reduction. Each step should make the record smaller and more specific.

1. **Freeze the system boundary.** Name the reviewed version, purpose, users, models, data sources, tools, identities, external effects, and environments. Draw only the trust boundaries needed to explain how information or authority moves. If the system changes, reopen the affected paths.
2. **Bind the attack to a precondition.** Record what the adversary must control or observe: training data, retrieved content, a user input, a model artifact, a tool definition, credentials, or a response renderer. Mark a class not applicable when the necessary surface is absent, and state the evidence for that conclusion.
3. **Write the consequence before the control.** Name the asset and effect: disclosure, unauthorized action, corrupted decision, unavailable service, persistence, or cost. State who or what is affected and the maximum effect the design is allowed to produce.
4. **Place the control on the path.** Choose a control that interrupts the stated precondition or limits the stated consequence. Least privilege, content isolation, deterministic argument validation, approval, provenance checks, rate limits, and recovery controls answer different parts of the path.
5. **Define the falsifier.** Specify the test input, expected observation, prohibited effect, evidence location, and stop condition. A passing synthetic test covers that scenario and build; it does not certify every attack in the class.

This reduction keeps a threat record connected to the architecture without turning the record into a diagram of every component. It also makes disagreement productive. A reviewer can challenge the boundary, precondition, consequence, control, or test instead of arguing over a color.

A useful threat record ends with a testable decision. It names the attack precondition, the protected asset, the maximum tolerated effect, the control that is supposed to interrupt the path, and the observation that would prove the control failed.

## What should the evidence record retain?

A compact record is enough when it preserves the path from public taxonomy to local decision.

| Field | What to record | Why it matters |
| --- | --- | --- |
| Source identity | Framework, attack or technique ID, title, version, and review date | Prevents a changing taxonomy from silently changing an old decision |
| System scope | Version, purpose, environment, data, tools, identities, and external effects | Defines where the decision applies |
| Applicability | Attacker capability, reachable surface, protected asset, and excluded assumptions | Separates a named possibility from a local path |
| Consequence | Prohibited effect, affected party or service, tolerance, and escalation owner | Gives the control a reason and a limit |
| Control and test | Control location, expected behavior, test case, evidence, owner, and reopening trigger | Turns advice into a falsifiable acceptance decision |

Link supporting artifacts instead of flattening them into a single score. Source review, configuration evidence, authorization policy, test output, and recovery evidence answer different questions. A green result from one layer should not erase an unknown in another.

This is the same evidence boundary behind treating [AI application scanning as a sensor](/notes/ai-application-scanning-pilot) rather than a gate. A scanner can identify a path worth review; the threat model still has to establish reachability, authority, consequence, and behavior. When the result must move to a leadership decision, the separate [cyber risk record](/notes/cyber-risk-register-executive-decision) should retain the scenario and uncertainty rather than only the technique label.

Reopening triggers deserve the same attention as the first review. Reassess the affected records when a model, retrieval source, tool, identity, permission, output consumer, deployment boundary, attack source, or mitigation claim changes. Date-based review is useful, but a material path change is a stronger trigger.

## When should this draft change a decision?

Use the draft now to improve vocabulary and coverage. An architect can compare an existing threat model with the new agentic-system sections, identify attack classes that lack an applicability decision, and submit specific feedback to NIST before the comment period closes.

Do not convert the draft into an automatic priority list. The presence of an attack in a taxonomy does not establish confirmed exploitation, local reachability, likelihood, impact, or a remediation deadline. A MITRE maturity label can describe evidence behind a technique, but the system owner still has to establish whether the technique's preconditions and consequences apply to the reviewed system.

Do not treat a mitigation reference as proof that a control works. NIST's 2025 report describes limitations in current adversarial-ML mitigations, while the AI RMF Playbook calls for testing under conditions close to deployment. The acceptance claim should remain narrow: this control interrupted this path, in this version, under this test, with these limits.

The draft is most valuable when it causes one of four concrete outcomes: a missing path is added to the threat model, an inapplicable class receives a defensible exclusion, a control moves to the boundary that matters, or a vague review becomes a test with a falsifier. If it produces only a longer list, the architecture has gained vocabulary without gaining a decision.

*NIST, MITRE, OWASP, and public employment sources reviewed November 24, 2026, between approximately 8:40 and 8:46 p.m. America/Chicago. NIST SP 2400-102e2026 is an initial public draft, and the linked frameworks can change. Recheck their current versions before using this method for a live decision.*
