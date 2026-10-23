---
writing_schema: 1
layout: writing-article
title: The work should outlast the agent session
description: "Building shared operational memory for MSP engineering without confusing remembered context with current evidence."
permalink: /notes/viyu-memory
published: true
published_on: "2026-10-22"
article_type: analysis
time_horizon: durable
topics:
  - service-operations
  - ai-assisted-delivery
  - identity
reader: msp-engineer
---

**In brief:** I’m a Sr. Services Engineer at Viyu Network Solutions, developing viyu-memory as part of my service-delivery work. The goal is simple: useful engineering context should survive the agent session that produced it. The harder part is making that context portable without turning yesterday’s explanation into today’s truth.

My [MSP service-delivery case study](/case-studies/agentic-msp-delivery) describes my use of personal and shared memory. This article develops the design question behind that work: memory should live outside any one model, terminal, or chat interface. Implementation is materially agent-assisted; my role is architecture, contracts, orchestration, review standards, and evidence judgment.

## The expensive part is reconstructing context

A resolved incident contains more than its final fix. It can contain the symptoms that mattered, the paths that went nowhere, the environmental detail that changed the diagnosis, and the check that finally established whether the change worked.

That knowledge is expensive to reconstruct when it is scattered across tickets, documentation, terminal sessions, and individual recollection. A new engineer has to rebuild the story before making the next decision. An agent starting a fresh session has the same problem, except its immediate working context may be gone entirely.

The problem I’m trying to solve with viyu-memory is therefore not “how do I give an agent a bigger prompt?” It is: **how do I preserve useful context in a form another engineer or agent can inspect, challenge, and reuse later?**

## Put memory outside the interface

The first design decision is separation. The memory service should not belong to whichever chat interface happens to be open.

The upstream foundation is [Mem0](https://docs.mem0.ai/open-source/overview), whose open-source stack supports self-hosting and configurable model, embedding, and storage components. I’m building the Viyu-specific contracts and access layer around that foundation rather than treating an upstream memory engine as the finished operational system.

That distinction matters. A memory engine can store and retrieve information; an MSP engineering environment also needs identity boundaries, provenance, correction behavior, audit decisions, and a way to distinguish remembered context from live evidence.

The October 14, 2026 client release describes setup paths for Claude Code, Codex, and Copilot. That is release evidence, not a team-adoption result. Packaging several integrations does not establish that every integration is installed, current, or used across a team. The aim remains to change interfaces without resetting the engineering history.

## Identity belongs at the service boundary

Shared memory becomes a security problem as soon as more than one person can use it.

The access model I’m using binds memory ownership to the authenticated caller rather than trusting a user identifier supplied by an agent request. Personal work memory and shared team knowledge are separate scopes, and retrieved results keep that distinction visible.

The gateway contract includes Authentik-backed OAuth/OIDC for interactive authentication. That describes the supported access model, not a fresh audit of the deployed authentication path. [Authentik’s OAuth2/OIDC provider](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/) supports authorization-code flows, PKCE, token validation, discovery, and related identity controls. On the MCP side, the protocol’s [authorization model](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) treats a protected HTTP MCP server as an OAuth resource server rather than as the authority that invents user identity for itself.

That still does not make “team memory” equivalent to customer authorization. A source label can explain where a record came from; it does not decide who is entitled to read a customer system. Those are different boundaries and should remain different boundaries.

## Provenance matters more than confidence

A retrieved memory should help answer two questions:

1. Why did this result surface?
2. Why should I believe it applies now?

I want records to retain enough context to make those questions answerable: what the earlier symptom was, what environment mattered, what action was taken, how it was verified, and where the record came from.

Consider a deliberately fictional example:

> **Earlier observation:** A shared remote session repeatedly disconnected after a storage interruption.
>
> **Earlier resolution:** The session recovered after the storage problem was corrected.
>
> **Current applicability:** Unknown. Check the current session, storage, and network evidence before selecting a remedy.

The useful part is not “memory says storage, therefore fix storage.” The useful part is that the next engineer gets a concrete hypothesis and the reason it exists.

A source reference or content hash can help establish provenance. It cannot certify that the original diagnosis was correct, and it certainly cannot establish the present state of a system.

## A four-question check before reusing a memory

When retrieved context suggests a fix, I would treat it as a lead for an investigation, not an instruction to execute:

1. **What was actually observed?** Find the original symptom, source date, environment, and whether the earlier result was verified or inferred. If those fields are missing, mark the lead uncertain.
2. **Does the boundary match?** Compare tenant, identity scope, application version, dependencies, and the permissions required for the proposed action. A team-visible note cannot grant access to a customer's systems.
3. **What does the live system say?** Gather fresh logs, configuration, and health state from an authoritative source. If the evidence contradicts the memory, the live state wins.
4. **How will the next person know?** Record the new outcome and verification, and explicitly qualify or supersede outdated guidance. Do not convert one repeated anecdote into universal policy.

This is a proposed inspection practice, not a measured retrieval-quality result or a claim that every step is enforced automatically.

## Test the failure paths before trusting the memory

A successful search demo is useful, but it does not establish that the memory boundary is safe or that the retrieved guidance is reliable. Before treating a memory service as an operational dependency, I would want evidence from at least three deliberately controlled scenarios:

- **Cross-user isolation:** Create a harmless personal test record as one user and search for its unique wording as another. It should not appear. Then confirm that an authorized team reader can retrieve a separate team record without gaining permission to alter it.
- **Correction and supersession:** Store a fictional diagnosis, correct it with a later observation, and search using the original symptom. The result needs to make the correction discoverable, not simply rank the older and newer answers as if both were current.
- **Uncertain write outcome:** In a test environment, interrupt the response after a harmless memory write is sent. Reconcile by identifier or readback before attempting to retry; check that the record was neither lost nor duplicated.

These are **proposed acceptance tests**, not claims that I have completed a production security assessment or measured retrieval accuracy. They target different failure classes: authorization, knowledge quality, and delivery semantics. Passing one does not imply the others pass.

## Keep remembering narrower than rewriting

A memory interface needs explicit mutation semantics. Storing a supplied statement, extracting a fact, updating an existing record, and removing obsolete guidance are different operations.

Mem0’s current [add-memory documentation](https://docs.mem0.ai/core-concepts/memory-operations/add) describes additive storage and an inference option. The versioned gateway contract I am working with also accounts for an older inference path that can update or delete related records. These version differences are a reason to inspect the actual backend contract rather than infer behavior from an operation named “add.”

That can be useful, but it also means an innocent-looking “remember this” operation can have much wider effects than its name suggests.

One of the contracts I’ve been working toward is deliberately narrower: adding context and reconciling existing context are different operations with different consequences. The same principle applies to corrections. A corrected record should not silently erase the fact that earlier guidance existed; the system needs a way to make supersession visible enough that a later retrieval does not present stale guidance as current truth.

The tradeoff is explicit correction work in exchange for a smaller mutation boundary. That boundary is easier to review than an operation whose name hides updates or deletes.

## Treat ambiguous writes as ambiguous

There is another failure mode that looks mundane until automation depends on it: the connection drops after a write is sent but before the caller receives the acknowledgement.

At that point, retrying blindly can duplicate the operation, while assuming failure can lose it. The October 14 client release describes an outbox and read-back behavior for uncertain writes: distinguish work that was never sent from work whose acknowledgement may have been lost, and read back state before deciding what happened.

That is the same reliability rule I use elsewhere in agentic service delivery: **a write attempt is not evidence that the resulting state exists.** I described the broader version of that rule in [A write is a claim, not evidence](/notes/agent-safety).

## MCP is the access protocol, not the memory model

For remote agent clients, the gateway uses the Model Context Protocol rather than inventing a separate integration for every interface. MCP currently defines standard `stdio` and [Streamable HTTP transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports); Streamable HTTP can return ordinary JSON responses or optionally use Server-Sent Events for streaming.

That distinction is useful because MCP solves the client-to-tool contract, not the underlying memory semantics. Identity, personal-versus-team scope, provenance, correction rules, and operational verification still belong to the service behind the protocol.

In other words: making memory accessible through MCP does not make the memory trustworthy by itself.

## The measurement comes after the architecture

The released client and gateway contract give me concrete behavior to inspect. They do not prove an improvement in service delivery.

The measurements I care about next are operational rather than promotional:

- Does retrieval surface applicable history when an engineer needs it?
- Does the source survive the handoff clearly enough to be checked?
- Do corrections displace obsolete guidance reliably?
- How often does irrelevant memory create more work instead of less?
- Can an engineer tell when a retrieved result is historical context rather than current evidence?

Until those are measured, I do not have a defensible “time saved” or “faster resolution” number, and I do not need one to explain why the architecture matters.

The principle is smaller and more durable: **an agent session is temporary; the useful engineering knowledge it produces should not have to be.**

*Source and architecture references reviewed October 22, 2026. This analysis describes a design and dated observations, not an audit of the deployed service or a claim of measured savings.*
