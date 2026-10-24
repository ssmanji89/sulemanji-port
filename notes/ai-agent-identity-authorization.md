---
writing_schema: 1
layout: writing-article
title: An AI agent identity is not an authorization decision
description: "Separate agent identity, delegated authority, action scope, and outcome before autonomous work reaches business systems."
permalink: /notes/ai-agent-identity-authorization
published: true
published_on: "2026-10-24"
article_type: analysis
time_horizon: durable
topics:
  - identity
  - ai-assisted-delivery
  - service-operations
reader: architect
---

Giving an AI agent a distinct identity improves accountability, but it does not prove that a specific action is authorized. An architect still needs to bind the acting agent, the authority it received, the requested action, the target resource, and the allowed time. Otherwise, the system can identify who acted while remaining unable to explain why that action was permitted.

I work as a Sr. Services Engineer at Viyu Network Solutions. This article presents a public-source architecture method. It does not describe Viyu systems, products, customers, controls, or operating practices.

The practical question is narrower than whether agents need identities. **What must an architect prove before a tool-enabled agent can act on a business system?** My answer is that identity starts the authorization decision; it does not finish it.

## Why is a separate agent identity necessary?

A shared human credential removes a distinction that an audit needs. The resource sees the human account, even when software selected the action, chose the parameters, and sent the request. The log can show whose credential opened the door without showing which agent crossed it.

[NIST's August 2026 identity guidance](https://www.nist.gov/blogs/cybersecurity-insights/back-future-why-agentic-ai-needs-strong-identity-foundation) recommends treating agents as first-class entities with unique identifiers, credentials, and entitlements. It also warns against credential sharing, static tokens, broad access, and excessive approval prompts. This guidance describes the control problem without assuming that every agent needs a new identity protocol.

Microsoft's public [Agent ID service-principal documentation](https://learn.microsoft.com/en-us/entra/agent-id/agent-service-principals) gives a concrete example. It separates the credential source, the acting agent identity, and the subject of an operation in sign-in and audit records. It also distinguishes application permissions for autonomous work from delegated permissions for work performed on behalf of a user.

A distinct identity therefore proves something useful: the platform can recognize the software actor separately from a person or another workload. It can assign that actor a permission set, disable it, and attribute token use to it. Those capabilities are necessary for control and investigation.

They are not sufficient. A valid identity can still hold excessive permissions. A valid delegated token can still be used for the wrong object. A correctly authenticated agent can still propose a destructive action that does not match the task a person approved.

## Identity, authority, and intent are different claims

An authorization record should keep three claims separate:

1. **Identity:** Which agent or workload sent the request?
2. **Authority:** Which policy, administrator, service, or user allowed that actor to do a defined class of work?
3. **Intent:** Does this specific action, against this specific resource, fit the approved task now?

Authentication can answer the first claim. A role, permission grant, or delegated token can contribute to the second. The third requires the policy enforcement point to examine the requested action and current context before the business system accepts it.

The distinction already exists in public standards. [OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) defines an `act` claim that can identify a current actor acting for a subject. It also states that earlier actors in a delegation chain are informational for access-control decisions. The resource must still apply policy to the token's current claims and current actor.

The [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700) adds two useful limits. It recommends restricting token privileges to the minimum required for the use case, and it describes audience restriction so a token intended for one resource is rejected by another. These controls reduce the consequences of leakage and reuse. They do not prove that every allowed request supports the original business task.

That gap matters because a permission is normally broader than one transaction. Permission to update a record does not establish which record, which fields, or which value is appropriate. Permission to send a message does not establish the correct recipient or content. The agent's model can influence those details, but the model's confidence is not an authorization source.

## What should the enforcement point decide?

The enforcement point should evaluate the smallest meaningful business action before it reaches the target. An API gateway, tool service, application, or authorization service can perform that check. The product name matters less than the decision it can make.

I would require five inputs:

1. **Actor:** the distinct agent identity presenting the request.
2. **Authority:** the user delegation, service grant, or application role that permits a bounded action.
3. **Action:** the operation and important parameters, not only the API name.
4. **Resource:** the exact target, with the intended audience and environment.
5. **Time:** the grant's start, expiry, and any condition that ends the task early.

Microsoft's public [Agent ID authorization guidance](https://learn.microsoft.com/en-us/entra/agent-id/authorization-agent-id) illustrates why the mode matters. It recommends delegated permissions for user-centered work and sparse application permissions for autonomous service work. It also blocks some high-risk Microsoft Graph permissions for agent identities. That is a product-specific implementation, but the general lesson transfers: choose the authority model from the task, then narrow its scope.

The system should deny the request when any required input is missing or conflicts with policy. It should not ask a person to approve every low-risk step. NIST warns that repeated human prompts can cause consent fatigue, which turns approval into a reflex. A useful approval names the consequence, target, and scope. Routine actions can then execute within that boundary, while exceptions return for a new decision.

This is also why a prompt is not a permission boundary. A system instruction can guide model behavior, but the target service cannot use prose alone to establish who delegated authority or which resource is allowed. The enforceable boundary must exist where the action is accepted.

## Build the audit record before the incident

An audit record should let a reviewer reconstruct the authorization decision without replaying the agent's full conversation. Record the actor, subject or service authority, requested action, target resource, policy result, decision time, and observed outcome. Keep the model's explanation as supporting context, not as the authorization decision itself.

That record answers different questions from a sign-in log. A sign-in log can establish which identity received or used a token. The authorization record can establish why a particular operation was allowed. A result check can then establish what the target system reports after the operation.

The separation becomes important during delegation. One agent may ask another service to perform part of a task. OAuth Token Exchange can express the current actor and preserve delegation history, but RFC 8693 does not make every prior actor part of the access-control decision. The architect must define which current claims the receiving service trusts, which audience it accepts, and what happens when the delegation chain cannot be validated.

For a write, the outcome belongs in the same decision trail. An allowed request is not proof that the target reached the intended state. Read the relevant state after the write, record the observation time, and keep any unresolved claim open. My note on [checkable engineering handoffs](/notes/work-outlasts-agent-session) explains why the result and its limits must survive the work session.

## A practical acceptance test

Before an agent receives production authority, test the authorization path with allowed and denied cases. The test should prove more than successful authentication.

- Use the correct agent identity and a permitted action against an allowed test resource. Confirm the action succeeds and the audit record names the actor and authority.
- Repeat the action against the wrong resource or audience. Confirm the system denies it before the target changes.
- Change a material parameter beyond the approved scope. Confirm the policy evaluates the parameter, not only the tool name.
- Expire or revoke the authority. Confirm a cached or replayed request no longer works within the defined revocation limit.
- Complete an allowed write. Confirm an independent read shows the intended target state and no broader change.

The acceptance evidence should also identify the residual boundary. A delegated permission may prevent the agent from exceeding the user's access while still allowing many actions within that access. An application permission may support unattended work while increasing the need for strict resource and action limits. A human approval may cover one high-consequence operation without making later operations safe.

NIST's [2026 software and AI agent identity project](https://www.nccoe.nist.gov/news-insights/new-concept-paper-identity-and-authority-software-agents) treats identification, authorization, auditing, non-repudiation, and prompt-injection controls as related but separate questions. That separation is the useful design test. If the architecture only proves that the agent logged in, the authorization design remains unfinished.

The durable rule is simple: give the agent its own identity, then make each consequential action earn authority at the boundary where it can take effect. Identity makes the actor visible. Authorization makes the action defensible. Verification establishes what actually happened.

*Primary references reviewed October 24, 2026. Agent identity products and standards work can change; verify current platform documentation and local policy before granting access.*
