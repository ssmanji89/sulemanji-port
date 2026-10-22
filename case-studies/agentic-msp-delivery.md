---
layout: default
title: "MSP service delivery using agentic LLMs"
permalink: /case-studies/agentic-msp-delivery
description: "How I use agents in MSP investigations, technical scoping, operational research, shared memory, and accountable service delivery."
---

# MSP service delivery using agentic LLMs

I work as a Sr. Services Engineer at Viyu Network Solutions. My work spans service investigations, Microsoft 365, identity, infrastructure, migration planning, and technical scoping. Agents participate in that work by gathering evidence, comparing records, preparing changes, and preserving context between sessions.

My responsibility remains the engineering judgment: identify the actual problem, establish the affected environment, decide what action is justified, and verify the result.

## Start with the operational question

MSP work rarely arrives as a complete technical problem. A ticket describes a symptom. Documentation describes an earlier configuration. A monitoring system reports one part of the environment. The engineer must establish how those records relate to the service people actually use.

The useful questions are specific. Which system is affected? What changed? Does the reported configuration match the running environment? What evidence would distinguish the suspected cause from another explanation?

I use agents to help assemble that context. Vendor-specific command-line tools provide structured access to service records, endpoint information, documentation, and platform configuration. The investigation still needs correct target selection, appropriate access, and a clear distinction between observation and inference.

A ticket status cannot establish service recovery. A configured patch policy cannot establish that an endpoint installed an update. The investigation must reach the state that answers the original operational question.

## Turn discovery into a workable scope

Technical scoping is another part of service delivery where agents can help organize evidence. The difficult work starts before document generation.

A migration scope needs the source and destination environments, identity dependencies, endpoint state, business applications, access requirements, and an acceptable change window. Missing information affects the implementation plan, the estimate, and the recovery options.

I use agent-assisted research and document preparation to make those dependencies visible. An unresolved application requirement remains an unresolved requirement. The draft must not convert it into a confident implementation step.

The same discipline applies to acceptance. “Migration complete” needs a definition that the engineer and business can test. Data transfer, sign-in, application access, permissions, and user validation can represent different acceptance conditions.

My contribution is to connect discovery to those conditions. The resulting scope must give the people doing the work enough information to execute, identify a blocker, and explain what remains unfinished.

## Keep operational research connected to the environment

My current workflow includes recurring research into vendor changes, service advisories, security updates, and changes in the software we use.

The output needs to distinguish an external development from its relevance to our environment. A vendor advisory can establish that a product has a problem. Establishing our exposure requires evidence about the products, versions, configuration, and services actually in use.

That distinction shapes the research brief. It records what the source establishes, what remains unknown, and which operational check would resolve the uncertainty. Missing inventory or unavailable logs remain explicit gaps.

The brief supports investigation and prioritization. It does not establish that a client needs remediation simply because a related product appears in the news.

## Preserve knowledge between investigations

Shared memory helps carry operational context between sessions. Decisions, failed approaches, corrections, and unresolved dependencies can otherwise disappear into separate conversations or remain known to one engineer.

I use a memory service that supports personal records and access to shared team records. The distinction matters: saving a personal finding does not automatically publish it for the team.

The useful record explains the finding and its basis. It identifies when the observation applies, how the engineer establishes it, and what the next person must verify before reuse.

Memory supplies a starting point for investigation. A previously successful command may depend on an older configuration. A deployment record may describe a service that later changes. A newer correction must take precedence over an earlier conclusion.

This makes memory part of operational continuity. It preserves the reasoning needed to continue work while leaving the running system as the source for current state.

## Keep changes accountable

Agent-assisted implementation remains materially agent-assisted. My role is architecture, contracts, orchestration, review standards, and evidence judgment.

For a consequential change, the engineering work includes the intended target, permitted action, expected result, failure conditions, and recovery path. Human approval must apply to the actual scope presented.

Independent review helps challenge assumptions before execution. A reviewer needs the relevant evidence and acceptance conditions. A separate model or an approval verdict does not establish correctness by itself.

After execution, verification returns to the operational question. A successful API response records what the API reports. Reading the destination checks the resulting state. User or application testing may still be necessary to establish that the service works.

The final handoff must distinguish completed work, verified results, and remaining dependencies. That is the standard I apply to agents participating in service delivery: another engineer must be able to inspect the evidence and continue the work.
