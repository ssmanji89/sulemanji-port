---
writing_schema: 2
layout: writing-article
title: Reachability is a priority signal, not a closure rule
description: Use dependency reachability to order vulnerability work without mistaking a call path verdict for exploitability or safety.
permalink: /notes/dependency-reachability-priority-signal
published: true
published_on: "2026-10-29"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - service-operations
---

Reachability can make a dependency-alert backlog more useful, but it cannot decide that a vulnerability is safe. An architect should use a reachability verdict to order investigation, preserve the evidence and observation time behind that verdict, and keep exploit activity, exposure, impact, and update risk as separate decision inputs.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public GitHub, CISA, and FIRST sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **how should a team use dependency reachability without turning “unreachable” into an automatic dismissal?** My answer is a bounded triage record. Reachability should change the order of work. It should not erase the alert, replace exploitation evidence, or outlive the code and advisory state that produced it.

## What changed in Dependabot?

GitHub released [reachability analysis for Dependabot alerts](https://github.blog/changelog/2026-10-28-prioritize-dependabot-alerts-with-reachability-analysis/) in public preview on October 28, 2026. The service uses CodeQL static analysis and curated vulnerable-function data to search for call paths from repository code to affected dependency functions.

The preview assigns four verdicts to open alerts: Reachable, Potentially reachable, Unreachable, and Reachability unavailable. A reachable result means the analysis found at least one call path. A potentially reachable result means the analysis could not rule one out. An unreachable result means the completed analysis found no call path. An unavailable result means the service could not provide a verdict.

Those labels contain useful context, but their scope is narrow. GitHub's [reachability documentation](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-reachability-analysis-for-dependabot-alerts) says the preview supports JavaScript and TypeScript repositories with npm, Yarn, or pnpm lockfiles. It runs on GitHub-hosted runners, not self-hosted runners. Large repositories and monorepos can hit resource limits or a three-hour analysis limit.

The result also has a time boundary. GitHub says scans run once every 24 hours while open alerts exist. A code push does not trigger a new scan, and the preview does not support an on-demand scan. A verdict shown after a change can therefore describe the earlier code state until the next scan finishes.

## What does each verdict actually prove?

A reachability verdict reports whether the static call-path analysis found a path, found no path, or could not determine one under its supported model. It does not answer whether an attacker can control the required input, whether the affected component is deployed, or whether exploitation would create material impact.

| Verdict | Supported conclusion | Required response |
| --- | --- | --- |
| Reachable | The analysis found at least one call path to a vulnerable function. | Inspect the path, confirm the affected artifact and deployment, and prioritize remediation. |
| Potentially reachable | The analysis could not rule out a call path. | Treat the uncertainty like a reachable result until better evidence narrows it. |
| Unreachable | The completed analysis found no call path in the analyzed code state. | Lower the alert's order when other signals allow, but retain it with an expiration and review trigger. |
| Reachability unavailable | The service produced no verdict because coverage or execution was insufficient. | Use the normal vulnerability-triage process without assuming reduced exposure. |

GitHub states that reachability is not exploitability. A reachable function can still lack an attacker-controlled path or the conditions needed for exploitation. The inverse matters just as much: an unreachable result is not a guarantee that the dependency is safe.

The call-path display also shows sample evidence, not a complete proof of every possible path. GitHub says an alert can show up to five sample paths and that the samples are not exhaustive. Use them to begin review, not to define the complete attack surface.

## Why is “unreachable” not a closure rule?

An unreachable verdict is a negative result from one analysis at one time. It can reduce priority, but automatic dismissal asks it to prove more than it measured. Code can change before the next scan. Advisory data can change. The preview also has documented ecosystem, repository-size, runner, and execution-time limits. The verdict remains bounded by the analysis that GitHub completed under those limits.

The feature's own states expose this limit. “Potentially reachable” preserves uncertainty when the analysis cannot rule out a path. “Reachability unavailable” preserves the absence of a result. A sound policy must preserve those distinctions instead of converting every non-reachable label into “not affected.”

Even a stable unreachable result does not replace threat evidence. CISA's official [Known Exploited Vulnerabilities data](https://github.com/CISAGov/kev-data) records vulnerabilities with confirmed exploitation. FIRST's [Exploit Prediction Scoring System](https://www.first.org/epss/) estimates the probability that a published CVE will be exploited in the wild during the next 30 days. These signals answer different questions from local call-path analysis.

EPSS is also not a complete risk score. FIRST states that it does not measure local exposure, probable damage, or compensating controls. A team still needs the affected asset, deployed artifact, external exposure, business consequence, and change risk before it can make a complete remediation decision.

## Use a five-part triage record

The record should keep unlike evidence separate. This prevents a strong result in one field from silently filling an unknown field elsewhere.

1. **Threat:** Record confirmed exploitation, KEV status, current EPSS probability, public exploit information, and the observation time.
2. **Reachability:** Record the verdict, observation or export time, manifest, affected function, and available call-path evidence.
3. **Deployment:** Identify the exact package or image digest, dependency relationship, runtime environment, and whether the affected artifact is deployed.
4. **Consequence:** State what an attacker could gain, which service or data is exposed, and which controls could reduce or detect that outcome.
5. **Treatment:** Name the owner, action, due date, validation evidence, exception expiration, and triggers that force review.

No field should inherit certainty from another. A high EPSS score does not prove local exposure. A reachable path does not prove exploitability. An unreachable path does not prove safety. A successful package update does not prove that the changed artifact reached the running service.

The artifact field is especially important for transitive dependencies and container builds. My guide to [artifact identity](/notes/package-version-artifact-identity) explains why a package coordinate or version does not identify the exact accepted bytes. The reachability result and the deployment decision must refer to compatible code and artifact states.

The treatment field should use an expiration, not a permanent exception. GitHub's alert workflow supports dismissal comments and audit records, but the decision still needs a local review trigger. A code change, advisory update, deployment change, new exploit evidence, or changed reachability verdict should reopen the decision.

## How should a team order the work?

Start with explicit overrides, then use reachability to refine the remaining order. Confirmed exploitation affecting a deployed asset, active compromise evidence, or a controlling requirement can outrank every other signal. Do not defer that work because a preview analysis did not find a call path.

For the rest of the queue, use this order:

1. Review Reachable and Potentially reachable alerts with material exposure or consequence.
2. Triage Reachability unavailable alerts through the normal process because no reduction in exposure was established.
3. Review Unreachable alerts with strong threat evidence, high consequence, or uncertain deployment before lower-consequence work.
4. Lower the remaining Unreachable alerts while preserving an owner, expiration, and review trigger.
5. Schedule the lowest-risk updates through normal dependency maintenance so deferred alerts do not become permanent drift.

This order is analysis, not a universal service-level agreement. An emergency change can create more risk than the vulnerability it addresses. A regulated deadline can control the sequence. A vulnerable development dependency can still affect a build or release path. The triage record should make the exception visible instead of forcing every case through one score.

My article on [AI-assisted vulnerability evidence](/notes/ai-vulnerability-triage-evidence) separates candidate findings, forecasts, confirmed exploitation, and local exposure. Reachability fits inside that model as local analysis evidence. It does not collapse those states into one answer.

## What should a pilot measure?

Pilot the feature on a small set of supported repositories with enough open alerts to make prioritization useful. Choose JavaScript or TypeScript repositories with current lockfiles, known service owners, and a deployment record that can connect an alert to an artifact and environment.

Measure decision quality, not only alert-count reduction. Record how many alerts receive each verdict, how often call-path evidence changes the next action, how many results remain unavailable, and how long verdicts lag behind code changes. Review a sample of unreachable results manually before authorizing any broad deferral rule.

Write the policy before the pilot ends. Define which signals override reachability, how long an unreachable decision remains valid, which events trigger review, and which evidence an owner must record before dismissal. Without those rules, the feature can make the queue look smaller while leaving the underlying decisions unaudited.

The pilot should also test the path from alert to accepted change. A corrected dependency still needs the exact artifact, focused security and behavior checks, and verification of the running state. My guide to [security patch acceptance](/notes/ai-security-patch-acceptance) covers those later gates.

## When should reachability stay out of the decision?

Do not use this preview's verdicts for unsupported ecosystems or repositories that fail to produce a result. Do not transfer a verdict from one repository, branch, manifest, or artifact to another. Do not use a stale result to clear code changed after the scan.

Reachability also has limited value when a response decision already exists. Confirmed compromise can require containment and investigation before an update. A vendor withdrawal can require artifact removal. A controlling deadline can require remediation regardless of a lower local priority. My guide to [emergency patching decisions](/notes/emergency-patching-service-decision) separates patching from isolation and service-stop decisions when the evidence is incomplete.

The useful boundary is simple: reachability can reorder work when the team still has a prioritization decision to make. It cannot overrule stronger evidence or prove the absence of risk.

## What should happen next?

Select one supported repository with a real dependency-alert backlog. Enable the preview, wait for the initial scan, export the verdicts, and record the export time. For each Reachable, Potentially reachable, and Unavailable result, create the five-part triage record. Manually sample the Unreachable group.

Then compare the old queue with the new decisions. The result should identify which work moved forward, which work moved later, which evidence caused the move, and when each decision expires. If the pilot only produces a smaller alert count, it has measured presentation rather than risk.

Reachability analysis is valuable because it adds application context to dependency data. Its value disappears when context becomes certainty. Use the verdict to choose where to look first, preserve what it measured, and require stronger evidence before closing the decision.

*Primary sources reviewed October 29, 2026. GitHub's reachability analysis remains a public preview, and its coverage and behavior can change. Recheck the linked GitHub documentation before setting policy.*
