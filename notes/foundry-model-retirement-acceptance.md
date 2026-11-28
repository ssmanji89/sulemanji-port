---
writing_schema: 2
layout: writing-article
title: "A replacement model is not a migration plan"
description: "Plan a Microsoft Foundry model retirement with workload inventory, representative evaluation, staged rollout, and rollback evidence."
permalink: /notes/foundry-model-retirement-acceptance
published: true
published_on: "2026-11-28"
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

A model-retirement schedule can identify a deadline and a recommended replacement. It cannot prove that the replacement preserves the behavior, interfaces, capacity, cost, or risk limits of a specific application. Treat a Microsoft Foundry model retirement as a bounded application release, not as a name change in configuration.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research and checked its factual core against the public Microsoft and NIST sources linked below. It does not describe or imply any Viyu product, system, customer, architecture, control, vendor relationship, workflow, evaluation method, or operating practice.

The practical question for an architect is: **what evidence should be complete before traffic moves to a replacement model?** My answer is an acceptance record that joins five things: the affected workload, the exact source and target deployments, a representative evaluation set, a staged production observation, and a tested rollback path.

## What does a retirement notice actually establish?

Microsoft's [model-retirement schedule](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule) lists lifecycle status, retirement date, and a replacement when one has been selected. The replacement is Microsoft's recommended migration target and, for supported deployment types, can also become the automatic-upgrade target. That makes the schedule an authoritative discovery source. It is not an application acceptance result.

The [Foundry lifecycle policy](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements) separates the notice from what happens to a deployment. Microsoft currently says Standard, Global Standard, and Data Zone Standard deployments can be automatically upgraded at retirement, while provisioned deployments require a manual migration. Batch and fine-tuned workloads have additional boundaries. The same retirement date can therefore lead to different operational work.

Notification is also a routing problem. Microsoft says owners of active GA deployments receive at least 60 days' notice and preview deployments receive at least 30 days' notice. It exposes lifecycle status and per-SKU dates through the Models API and sends Azure Service Health advisories. A message reaching a subscription owner does not prove that the person who owns the application, evaluation data, budget, or release decision has received it.

Use the published retirement date to calculate an earlier internal deadline:

`internal deadline = retirement date - validation time - rollout time - recovery margin`

The margin belongs in the plan because a replacement can be unavailable in the required region or deployment type, quota can be insufficient, an interface can change, or the first candidate can fail evaluation. A deadline that leaves no time to reject a candidate is not a decision window.

## Why is the recommended replacement not equivalent?

Microsoft warns that a model-version upgrade can change behavior and compatibility. A different model family can also require a different model identifier or API version. Even when the request still succeeds, output structure, instruction following, refusal behavior, tool selection, latency, token use, and error patterns can move enough to break the surrounding application.

A model is one component in a larger decision path. The acceptance question is not whether the new model is generally better; it is whether the complete target configuration performs the named task within the application's quality, safety, latency, capacity, and cost boundaries. Public leaderboards can help shortlist candidates, but they cannot represent a private workload's prompts, tools, data, users, or consequences.

NIST's [AI Risk Management Framework core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) calls for documented test sets, metrics, and evaluation tools, performance demonstrated in conditions similar to deployment, and production monitoring of system behavior. That supports a release claim bounded to a context. It does not support a universal claim that one model is safe or superior.

Keep the target identity exact. Record the provider, model and version, deployment type, region, API version, configuration, and release artifact that calls it. My guide to [software artifact identity](/notes/package-version-artifact-identity) explains the same principle for packages: a friendly version label is not enough to identify what was tested.

## What must be inventoried before evaluation?

Start with workload paths, not with a list of model deployments. One deployment can serve several applications, and one application can call several models. The useful unit is a path from an input through the model and any tools to an outcome someone relies on.

For each path, record:

| Boundary | Question to answer | Evidence to retain |
| --- | --- | --- |
| Purpose | What decision or task does this path support? | Named use case, owner, users, and consequence of a wrong or late result |
| Source | What runs today? | Exact model version, deployment type, region, API version, configuration, quota, and current baseline |
| Interface | What must remain compatible? | Input shape, system instructions, tool definitions, output schema, error handling, and downstream consumers |
| Quality | What counts as acceptable behavior? | Representative cases, scoring rubric, minimum thresholds, known limitations, and human-review rules |
| Operations | What envelope must hold? | Latency, throughput, rate limits, token use, cost boundary, observability, and support requirements |
| Authority | What can the path read or change? | Data classes, tool permissions, approval points, prohibited actions, and failure-safe behavior |
| Recovery | How can the release be stopped or reversed? | Traffic control, prior deployment availability, state considerations, owner, and tested recovery steps |

Unknown fields are findings, not blanks to fill with assumptions. An unowned workload cannot receive an accountable acceptance decision. A path without a baseline cannot show whether the replacement improved, preserved, or degraded the behavior that matters.

## How should the evaluation set be built?

Build the evaluation set before tuning the replacement. Otherwise, every prompt edit can quietly move the definition of success toward the candidate's strengths. The set should represent ordinary work, difficult but valid cases, known failures, malformed input, boundary conditions, and cases where refusal or escalation is the correct response.

Use production-derived examples only when collection, retention, access, and redaction are authorized for that purpose. A safer default is a controlled set of synthetic or sanitized cases that preserves the decision shape without copying secrets, personal data, customer material, or privileged instructions. Record what the set cannot represent.

Define the rubric before comparison. Structured outputs need schema validity and field-level correctness. Tool-using paths need correct tool choice, argument validation, permission boundaries, and effect verification. Retrieval paths need groundedness and citation checks. Human-facing content needs task-specific quality criteria rather than a single generic score.

Measure non-functional behavior beside output quality. Run the source and target against the same set and capture latency distributions, error classes, token use, and estimated cost under the intended deployment type. A target that improves average answer quality but violates a hard latency or capacity limit has not passed the complete workload contract.

Microsoft's current [model-migration process](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-migration) uses six phases: Discover, Assess, Adapt, Validate, Roll out, and Retire. It specifically treats prompt, parameter, tool-definition, output-schema, and calling-code changes as adaptation work. Preserve those changes as part of the candidate configuration; testing only the bare model would test a different release.

## When is the candidate ready for production?

An offline pass makes a candidate eligible for controlled exposure. It does not establish production acceptance. Start with a non-production check, then use shadow traffic, a canary, or a small weighted share when the application's data rules and architecture permit it. Compare live errors, latency, cost, and task-specific quality with the pre-migration baseline.

Set the pass, pause, and rollback conditions before exposure. A rollback trigger can be a schema-error rate, a latency threshold, a high-severity safety failure, an unacceptable task score, or a capacity limit. The trigger must point to an owner and an action; a dashboard without a decision rule only records the failure.

The minimum release record should say:

1. which workload path and source deployment are being replaced;
2. which exact target deployment and application artifact were evaluated;
3. which cases, rubric, thresholds, and limitations governed the decision;
4. what changed in prompts, tools, schemas, code, permissions, quota, and monitoring;
5. what the staged rollout observed, when it was observed, and who accepted the residual risk;
6. how rollback was tested and when the source deployment can be retired.

Retire the old deployment only after the rollback window closes and the evidence-retention requirement is satisfied. Leaving it active indefinitely creates cost and ambiguity; deleting it immediately removes recovery. The release plan should name the point at which recovery changes from traffic rollback to restoration from a retained configuration.

The same evidence discipline applies to generated fixes. [An AI security patch is a testable claim](/notes/ai-security-patch-acceptance), and so is a model migration: the conclusion is only as broad as the cases, configuration, environment, and observation window that produced it.

## When does this guide need a different path?

Fine-tuned models need separate planning. Microsoft's migration guide states that fine-tuned workloads carry their own training and deployment retirement clocks and cannot be automatically upgraded like an unchanged base-model deployment. Moving them can require retraining or distillation rather than only prompt and schema adaptation.

Low-consequence experiments can use a lighter record, but they still need exact target identity and a stop condition. High-consequence decisions need stronger domain review, independent evaluation, production safeguards, and evidence proportionate to the harm of a wrong result.

An automatic upgrade may preserve availability while changing behavior. A manual migration may preserve behavior while missing a capacity or regional constraint. Neither path is complete until the application-level acceptance record closes the relevant risks.

The durable lesson is simple: a retirement schedule starts the work; it does not finish the decision. Inventory the path, freeze the rubric, evaluate the complete candidate, expose it gradually, observe it in context, and keep a tested way back until the release claim has earned its scope.

## Sources reviewed

- Microsoft, [Model retirement schedule](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule)
- Microsoft, [Foundry Models lifecycle and support policy](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements)
- Microsoft, [Model migration process](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-migration) and [model versioning](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/model-versions)
- NIST, [AI Risk Management Framework 1.0 core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) and [Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)

*Sources last reviewed November 28, 2026, at approximately 9:09 a.m. America/Chicago. Model dates, lifecycle states, replacement targets, deployment behavior, regional availability, quota, pricing, and product interfaces can change. Recheck the live schedule, policy, and application evidence before approving a migration.*
