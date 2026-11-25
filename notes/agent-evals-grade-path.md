---
writing_schema: 2
layout: writing-article
title: Agent evals must grade the path, not only the answer
description: Build agent evals that check tool use, side effects, final state, and answer quality before a customization moves forward.
permalink: /notes/agent-evals-grade-path
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - ai-assisted-delivery
  - service-operations
---

Agent evals should fail an agent that reaches the right answer through the wrong tool, an unauthorized change, or a damaged workspace. A polished response is only one output of a tool-using system. The files it changed, calls it made, approvals it observed, and state it left behind belong in the test.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted public-source research and checked its factual core against the public GitHub, NIST, and OpenAI sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, workflows, or evaluation methods.

The practical question is: **what should an architect require from an eval before accepting a change to a skill, agent, or MCP tool?** My answer is to grade four layers separately: the final state, prohibited side effects, the execution path, and the visible answer. A run passes only when every hard boundary passes; fluent prose cannot compensate for a broken state or an unsafe action.

## What changed with GitHub Copilot Evals?

GitHub [released Copilot Evals in public preview](https://github.blog/changelog/2026-11-17-github-copilot-evals-is-now-in-public-preview/) on November 17, 2026. The product can create repeatable tests for Copilot skills, custom agents, and MCP tools, then compare results after a customization changes. GitHub's definition is useful because it includes both what the agent produced and how the agent got there.

The public [GitHub Copilot Evals repository](https://github.com/github/evals) makes the execution boundary clearer. An eval can include setup scripts, tools, custom graders, and AI judges. GitHub says these components can execute code under the operator's normal local permissions, and the run presents execution effects and token or credit costs for approval before it starts. Saved reports can include outputs and the conversation trace.

Those capabilities make an eval more than a prompt comparison. They also make the eval itself an active workload. A test that can invoke tools and execute code needs its own fixtures, permissions, isolation, cleanup rules, and evidence record.

GitHub also states that one passing check does not guarantee the AI will behave correctly every time. The preview therefore creates a useful comparison surface, not a universal certification. The release decision still belongs to the team that defines the task, risk boundary, and acceptable residual failure.

## Why can the right answer still be a failed run?

An agent can satisfy the visible request while violating an operating constraint. It can edit the right file and an unrelated one, retrieve the correct fact through an unapproved source, leave a temporary credential in a log, or report success after a partial mutation. An answer-only grader may reward the response while missing the larger failure.

OpenAI's public [agent-evaluation guidance](https://developers.openai.com/api/docs/guides/agent-evals) draws the same distinction through traces. A trace records model calls, tool calls, guardrails, and handoffs for one run. The guidance proposes grading questions such as whether the agent selected the right tool, handed work off at the right point, or violated an instruction or safety policy.

The final answer and the execution trace are still not enough by themselves. A trace can say that a write tool ran without proving that the intended state exists afterward. A clean-looking workspace can hide an unauthorized external action. A correct final state can follow a path that would be unacceptable with live data or broader permissions.

Keep four claims separate:

| Layer | Question | Strong evidence | A pass does not prove |
| --- | --- | --- | --- |
| Final state | Did the required artifact or system state end correctly? | Deterministic read-back of files, records, tests, or API state | The path was authorized or free of unrelated changes |
| Side effects | Did anything outside the allowed change set move? | Before-and-after inventory, mutation log, and explicit deny checks | The visible answer is accurate or useful |
| Execution path | Were tools, approvals, sources, and handoffs used as required? | Trace checks tied to named policy rules | The final state persisted after the run |
| Visible answer | Did the response explain the result accurately and at the right scope? | Deterministic checks plus calibrated human or model review | The underlying action occurred safely |

The evaluation should combine those layers, not average them. A severe side effect is not a low score that better prose can offset. It is a hard failure.

## What should an agent eval define before it runs?

The eval contract should be written before anyone sees a result. Otherwise the team can move the pass rule toward whichever behavior the latest run happened to produce.

Define these five parts:

1. **Task and fixtures.** Specify the request, starting state, allowed inputs, expected outputs, and cases that should trigger refusal, escalation, or no change.
2. **Authority boundary.** List the tools, data, network destinations, paths, and mutation types the agent may use. Deny everything the task does not require.
3. **Terminal invariants.** State what must be true after the run: required artifacts exist, protected inputs are unchanged, temporary state is removed, and every claimed write can be read back.
4. **Path rules.** Name required approvals, source classes, handoffs, and verification steps. Mark safety and authorization rules as hard gates rather than weighted preferences.
5. **Comparison rule.** Freeze the agent, model, instructions, tools, permissions, fixtures, graders, and runtime identity for each result. Change one intended variable, run enough trials to expose variability, and compare the full failure pattern rather than one best response.

NIST's [AI Risk Management Framework](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) supports this separation. Its Measure function calls for documented test sets, metrics, tools, uncertainty, deployment-like conditions, and regular reassessment. It also separates measurement from the management decision about whether deployment should proceed.

NIST's [Measure playbook](https://airc.nist.gov/airmf-resources/playbook/measure/) adds two useful requirements: define acceptable performance limits, and document the conditions under which the system was tested and can fail safely. That means an eval record should include the untested boundaries, not just the passing cases.

## How should checks be matched to the claim?

Use the least interpretive check that can answer each question. Save human or model judgment for properties that cannot be reduced to a stable state assertion.

For files and structured data, compare exact paths, schemas, hashes, counts, or parsed values. If the task says to update one record, assert that record's final value and assert that protected sibling records did not change. If the agent claims it created an artifact, open and inspect the artifact rather than accepting a tool success message.

For external mutations, capture a bounded before-and-after inventory. Record the object identifier, relevant version or timestamp, and the fields allowed to change. Re-read through the authoritative interface. A successful request proves that the interface accepted something; it does not prove that the intended state is live.

For the execution path, grade named events rather than a vague impression. Did the agent request approval before the protected action? Did it use the required source class? Did it verify the current state before mutation? Did it stop when a hard precondition failed? A trace is useful when each check points to a concrete rule.

For prose quality, use a rubric with examples and calibrate automated grading against human judgment. OpenAI's [evaluation best-practices guide](https://developers.openai.com/api/docs/guides/evaluation-best-practices) recommends task-specific datasets, explicit success criteria, continuous evaluation, and human calibration. It also warns against generic metrics, unrepresentative datasets, and evaluation by impression.

This is where a small, difficult task set beats a large decorative one. Include ordinary success, an ambiguous request, a denied action, a partial failure, stale state, and a case based on a real near-miss. Add a new case when production or review reveals a failure the existing set did not catch.

## What evidence should support a release decision?

A saved eval result should identify exactly what was tested. Without configuration identity, the result cannot be attached to the change under review.

Use a compact release record:

| Field | Record |
| --- | --- |
| Subject | Exact skill, agent, MCP tool, instructions, model, and version or content hash |
| Environment | Runtime, tool versions, permissions, network boundary, and fixture revision |
| Task set | Case identifiers, starting states, expected outcomes, and protected state |
| Checks | Deterministic assertions, trace rules, judgment rubric, and hard-fail conditions |
| Runs | Trial count, pass and failure pattern by case, cost, duration, and unexpected effects |
| Decision | Accept, narrow, revise, or reject, with the evidence owner and unresolved limits |

Do not reduce this record to one average. A high pass rate can hide one repeatable unauthorized mutation. Report hard-boundary failures beside answer-quality failures so the decision maker can see whether the problem is safety, reliability, usefulness, or measurement.

Repeat runs when behavior can vary, but do not use repetition to hunt for a lucky success. GitHub recommends rerunning the same eval after a customization changes and comparing saved results. The useful comparison asks whether the changed configuration improves the intended behavior without introducing new path or state failures.

Keep evaluation and release separate. A builder can run the suite and explain the output. Acceptance should require someone who did not make the change to inspect the evidence when the risk warrants it. NIST notes that independent assessment can reduce developer bias and conflicts of interest.

This extends two existing measurement boundaries. [Copilot adoption metrics need a data-quality gate](/notes/copilot-adoption-metrics-data-quality-gate) because a correct number can still be unfit for its decision. [An AI security patch is a testable claim](/notes/ai-security-patch-acceptance) because generated output, tested behavior, released identity, and deployed state are different facts. Agent evals need the same claim discipline.

## Where does this guidance stop?

This guide does not claim that traces expose every relevant effect or that deterministic checks can cover every agent failure. External systems may have delayed writes, incomplete audit data, or actions outside the captured trace. The eval must label those blind spots and narrow its conclusion.

It also does not claim that every agent needs the same test depth. A read-only drafting helper and an agent authorized to change production systems have different consequences. Match isolation, trial count, independent review, and deployment monitoring to the authority and reversibility of the task.

GitHub Copilot Evals remains in public preview. Its installation, runtime, costs, supported hosts, telemetry, saved-result format, and execution behavior can change. Review the current product documentation and the proposed execution effects before running an eval on a real workspace.

The durable rule is to test the whole action. Grade the terminal state, deny prohibited side effects, inspect the execution path, and then judge the answer. When those claims remain separate, an eval can support a bounded release decision without pretending to certify every future run.

*Public GitHub, NIST, and OpenAI sources reviewed November 24, 2026, between approximately 9:18 and 9:25 p.m. America/Chicago. Product previews and evaluation guidance can change. Recheck the linked sources before building a release gate.*
