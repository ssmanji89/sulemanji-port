---
writing_schema: 2
layout: writing-article
title: The .NET 8 deadline needs more than a runtime inventory
description: Prepare .NET 8 and .NET 9 applications for end of support with evidence from source, artifacts, hosts, and production-like tests.
permalink: /notes/dotnet-8-end-of-support-readiness
published: true
published_on: "2026-10-26"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - business-applications
  - infrastructure
  - service-operations
---

.NET 8 and .NET 9 reach end of support on November 10, 2026. A list of installed runtimes can find part of the exposure, but it cannot prove that an application has a supported build, a deployable replacement, or acceptable behavior on the next runtime. Treat the deadline as an application-ownership and acceptance problem, not only as a software-inventory problem.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public Microsoft and .NET sources cited below. It does not describe Viyu systems, products, customers, controls, or operating practices.

The practical question for an MSP engineer or application owner is: **what must you prove before calling a .NET 8 or .NET 9 workload ready for the November 10 deadline?** My answer is to connect four kinds of evidence: source target, published artifact, execution environment, and tested behavior. A green result at only one layer is an incomplete upgrade.

## What changes on November 10?

Microsoft states that [.NET 8 and .NET 9 both reach end of support on November 10, 2026](https://devblogs.microsoft.com/dotnet/dotnet-8-9-end-of-support/). Applications on those versions do not stop running on that date. Microsoft stops providing new security updates, servicing fixes, and technical support for them after the support window closes.

The current [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy) lists both releases in maintenance and lists .NET 10 as the supported Long Term Support successor through November 2028. That policy also requires supported installations to stay current on released patches during their lifecycle. Reaching a supported major version while retaining an old patch is therefore not the finish line.

This deadline concerns modern .NET 8 and .NET 9. It is not a general end-of-support announcement for the Windows-only .NET Framework product family. Use the target framework, deployment metadata, and running artifact to classify an application instead of searching for any file or registry entry containing “.NET.”

## Why is a runtime inventory not enough?

An installed runtime is host evidence, not application evidence. Microsoft documents `dotnet --list-runtimes`, `dotnet --list-sdks`, and `dotnet --info` as ways to inspect a particular .NET installation. Those commands do not show every runtime on another architecture, a runtime bundled inside an application, a runtime inside an unexamined container image, or which business process depends on each application.

The deployment model changes what must be found. A [framework-dependent deployment](https://learn.microsoft.com/en-us/dotnet/articles/core/deploying/index) uses a compatible runtime installed in its execution environment. A self-contained deployment carries its selected runtime with the application. Updating a server runtime can help the first case while leaving the second case unchanged.

Containers create the same ownership question in another place. The application may target one framework, build from one SDK image, and run from a different runtime image. The .NET documentation identifies the target framework, operating system, architecture, image type, and image variant as separate parts of the [container image selection](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images). A host scan alone cannot settle that chain.

Build the inventory around the application, not around the package. For each workload, record the business owner, technical owner, source or vendor, target framework, deployment model, release artifact, execution environment, current patch, and recovery route. Mark any unknown field as unknown; do not turn absence of evidence into a supported-state claim.

## What evidence makes an upgrade acceptable?

An acceptable upgrade connects four layers. Each layer answers a different failure question, so none can substitute for the others.

| Evidence layer | Question to answer | Minimum useful record |
| --- | --- | --- |
| Source | Can this code and its dependencies target a supported .NET release? | Repository or vendor, target framework, dependency findings, breaking-change review, and accountable owner |
| Artifact | What exactly will be released? | Build identifier, target framework, deployment mode, runtime identifier when applicable, dependency lock or equivalent, and artifact digest |
| Environment | Where and with which runtime will it execute? | Host or container class, operating system and architecture, installed or bundled runtime, configuration source, and rollback destination |
| Behavior | Does the candidate still perform the required work? | Named critical paths, production-like test conditions, results, unresolved exceptions, and approval owner |

The source layer starts with a retargeted build, not with a changed project-file value alone. Microsoft’s [.NET 10 breaking-change catalog](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10) separates binary, source, and behavioral changes. A clean compile can still leave a behavioral change, while a binary or source change can require explicit remediation before the candidate exists.

The artifact layer prevents a successful developer build from standing in for the release package. Record the output that moved through testing and deployment. My guide to [software artifact identity](/notes/package-version-artifact-identity) explains why a version label alone cannot identify those bytes.

The environment layer proves which runtime the released artifact will use. For a framework-dependent application, capture the runtime visible to the service identity and architecture that starts the process. For a self-contained application, inspect the published output and publishing inputs. For a container, identify the tested image by an immutable digest rather than relying only on a mutable tag.

The behavior layer tests the work that matters. Microsoft distinguishes unit tests, which focus on code under the developer’s control, from [integration tests](https://learn.microsoft.com/en-us/dotnet/core/testing/), which exercise multiple components and can include infrastructure. Use both where they answer real risks, then test the candidate’s critical authentication, data, scheduling, messaging, file, and recovery paths in a production-like environment.

## How should you triage the remaining work?

Triage by control and evidence, not by the number of runtime detections. Four paths cover most ownership states.

1. **You own the source and release path.** Retarget to a supported release, review applicable breaking changes, update dependencies, build the release artifact, and run the acceptance record against that artifact.
2. **A software vendor owns the application.** Obtain a current vendor statement that names the supported application release, .NET requirement, deployment steps, and support status. A host scan or a reseller assurance is not a substitute for product-specific evidence.
3. **The application owner is unknown.** Identify who can accept downtime, behavior changes, and rollback before changing the runtime. Unknown ownership raises priority because it blocks both testing and an accountable exception.
4. **The workload appears dormant.** Prove that the service, scheduled task, container, or user workflow no longer executes before removal. An old directory or stopped process is not sufficient retirement evidence.

Microsoft’s current [upgrade overview](https://learn.microsoft.com/en-us/dotnet/core/porting/) recommends assessment, a low-risk pilot, and validation that the application builds and its tests pass. It also marks .NET Upgrade Assistant as deprecated. Do not build a deadline plan around an old tool name without checking its current status and fit.

Prioritize externally reachable services, privileged components, shared business applications, and workloads without tested recovery. Use a documented exception when a safe upgrade cannot finish before the deadline. The exception should name the owner, affected artifact and environment, compensating limits, target release, next checkpoint, and expiry date. It should not rename an unsupported workload as low risk without evidence.

## What should the acceptance record say?

The final record should make one narrow claim: a named release artifact runs on a supported .NET release in a named environment and passes defined acceptance checks. Keep the claim bounded to the artifact, environment, and observation window that produced the evidence.

Use these fields:

- application and accountable owner;
- source or vendor release and target framework;
- artifact identifier, deployment model, and runtime source;
- tested environment, checks, results, and observation date;
- deployment decision, rollback evidence, exceptions, and next checkpoint.

Separate deployment from acceptance. A successful install proves that the deployment mechanism completed. It does not prove that authentication, data access, integrations, background work, or recovery still behave correctly. The same distinction applies to urgent fixes: [a security patch needs a testable acceptance claim](/notes/ai-security-patch-acceptance), not only an installation result.

The November 10 deadline is a forcing function for ownership. Inventory finds candidates. Source review finds change risk. Artifact identity prevents the wrong build from receiving credit. Environment evidence shows which runtime actually executes. Production-like tests support the final behavior claim. Close all four layers before calling the upgrade ready.

*Primary Microsoft and .NET sources reviewed October 26, 2026. Support dates, patch versions, tooling guidance, and compatibility notes can change. Recheck the support policy and linked documentation before approving or executing an upgrade.*
