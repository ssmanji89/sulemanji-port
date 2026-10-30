---
writing_schema: 2
layout: writing-article
title: Pilot AI application scanning as a sensor, not a gate
description: Evaluate GitHub AI application scanning against its current coverage before treating a clean pull request as security evidence.
permalink: /notes/ai-application-scanning-pilot
published: true
published_on: "2026-10-30"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - ai-assisted-delivery
  - service-operations
---

GitHub's AI application scanning preview can identify a risky data flow in a pull request, but it cannot establish that an AI application is secure. An architect should pilot it as one review sensor, measure what it sees, and keep separate controls for existing code, excluded pull requests, model permissions, tool execution, and production behavior.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public GitHub and OWASP sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what evidence should a team require before it adds GitHub's new detector to an AI application review process?** My answer is a bounded pilot. Define the detector's current coverage, submit known risky and known safe changes, record every alert and miss, test the proposed fixes, and keep the result advisory until the evidence supports a narrower use.

## What is actually in the public preview?

GitHub announced AI application scanning on October 28, 2026. The [release notice](https://github.blog/changelog/2026-10-28-code-scanning-for-ai-applications-in-public-preview/) discusses indirect prompt injection, sensitive information disclosure, and excessive agency as the product area. The current [technical documentation](https://docs.github.com/en/code-security/concepts/code-scanning/ai-applications-scanning-for-pull-requests) sets a narrower boundary: during the public preview, the detector finds only indirect prompt injection in AI agents.

That difference is not a contradiction to smooth over. It is the current evaluation contract. A team can test whether the detector helps with indirect prompt injection in the kinds of pull requests it actually receives. The same team cannot use a clean result as evidence that the preview checked sensitive-data exposure or excessive agency.

GitHub describes this detector as separate from both CodeQL and AI Scan for pull requests. [CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning) uses language-specific static analysis. [AI Scan for pull requests](https://docs.github.com/en/code-security/concepts/code-scanning/ai-powered-security-detections) looks for traditional code-security problems in selected languages and frameworks outside CodeQL coverage. AI application scanning uses an LLM-based approach to inspect AI-specific code patterns and data flows without a stated language or framework limit.

The three scanners can produce findings in a similar review surface while answering different questions. A shared interface does not make their coverage interchangeable.

| Detector | Current question | Important boundary |
| --- | --- | --- |
| CodeQL | Does supported-language code match a modeled vulnerability query? | Unsupported or unmodeled code can remain outside analysis. |
| AI Scan for pull requests | Does changed code show a traditional code-security problem in supported gaps? | Findings are advisory and coverage can change. |
| AI application scanning | Does a changed AI-agent path expose an indirect prompt-injection risk? | The preview currently detects only this AI risk category. |

The preview requires GitHub Advanced Security on GitHub Enterprise Cloud and consumes AI credits in addition to the license. It is off by default. Enterprise policy must allow the feature, the organization must enable it separately, and repository administrators can opt out. GitHub says the preview is not available on GitHub Enterprise Server.

## What does a clean pull request fail to prove?

A clean result proves only that this detector reported no finding for that eligible scan under its current behavior. GitHub states that the preview covers pull requests only. It does not scan the repository's existing backlog, pull requests from forks, or pull requests created by Dependabot.

The findings are advisory. They cannot become a required merge check through GitHub rulesets. A team can require review conversations to be resolved, but that workflow choice is not the same as an enforceable security result from the detector.

The current limits create four distinct gaps:

1. **Risk-category gap:** The preview does not yet claim detection of every AI application risk described in the release notice.
2. **History gap:** A pull-request scan says nothing about unchanged vulnerable paths already on the default branch.
3. **Contribution gap:** Fork and Dependabot pull requests do not receive this detector's scan.
4. **Behavior gap:** Source review does not show how a deployed model behaves with real retrieval content, permissions, tools, identities, or approval boundaries.

Indirect prompt injection also depends on more than one suspicious string. [OWASP defines indirect prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) as external content, such as a file or website, changing model behavior in an unintended way. The consequence depends on the surrounding application, especially the data and actions available to the model. A source-level alert can identify a path worth review; runtime permissions and action controls determine how much harm that path can cause.

## How should an architect run the pilot?

Start with one repository and one owner. Choose an AI application with a clear boundary between untrusted content, model input, tool access, and an observable effect. Do not start with an organization-wide enablement that produces findings before anyone owns triage.

Use five steps:

1. **Write the coverage statement.** Record the current detector, eligible repository, pull-request-only scope, indirect-prompt-injection category, exclusions, license, credit budget, and review date.
2. **Create a small test set.** Submit representative pull requests with known risky flows, nearby safe controls, and changes that should remain outside the detector's scope. Keep synthetic examples separate from production secrets and customer data.
3. **Triage every result.** For each alert, identify the untrusted source, the model boundary, reachable tools or data, the proposed mitigation, and the reviewer decision. Record expected findings that did not appear.
4. **Test the fix as behavior.** Apply or adapt the suggested change, then verify the application still performs its intended task and blocks the risky path. Treat Copilot Autofix as a proposal because GitHub's [alert-triage guidance](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/triage-alerts-in-pull-requests) says to assess and test generated suggestions before committing them.
5. **Decide the narrow role.** Keep, change, or reject the detector based on observed utility, review cost, missed scenarios, false alarms, and credit use. State which conclusion the pilot supports and which it does not.

The test set must include negative evidence. A detector that misses a clear, eligible indirect-prompt-injection path fails that scenario. A detector that finds every synthetic example still does not prove complete coverage because the examples represent only the paths the team knew to test.

Retain a small pilot record:

| Field | Evidence to retain | Decision it supports |
| --- | --- | --- |
| Eligibility | Cloud plan, license, policy, repository setting, and credit budget | Whether the expected scan can run |
| Coverage | Current documentation date, risk category, pull-request scope, and exclusions | What a result may mean |
| Test set | Risky, safe, and out-of-scope changes with expected outcomes | Whether the detector handles known scenarios |
| Findings | Alerts, misses, dismissals, reviewer reasons, and feedback sent | Whether the review signal is useful |
| Remediation | Applied change plus functional and security tests | Whether a proposed fix preserves the intended behavior |
| Decision | Adopted role, owner, review interval, and stop condition | How the team will use or remove the detector |

## Which controls must stay outside the scanner?

The scanner should add evidence to a threat model, not replace one. OWASP recommends constraining model behavior, validating expected outputs, limiting privileges, requiring human approval for high-risk actions, separating untrusted content, and performing adversarial tests. These controls address consequences that a pull-request detector cannot settle by itself.

Apply those controls at the execution boundary:

- Give the model and each tool only the permissions required for the task.
- Validate tool arguments and model outputs with deterministic code before they reach a sensitive operation.
- Require a separate approval for high-impact or irreversible actions.
- Mark and isolate external content instead of presenting it as trusted instruction.
- Record attempted and completed actions so a reviewer can compare intent with effect.

The detector can help locate code where untrusted content reaches a model with tool or data access. It cannot prove that deployed credentials have least privilege, that a human approval cannot be bypassed, or that a production integration matches the reviewed branch. Those require configuration evidence and behavior tests from the actual boundary.

The same separation applies to remediation. An automatically generated patch can remove the reported pattern while breaking the intended task or moving the risk to another path. Review the complete change, test the legitimate behavior, repeat the adversarial case, and verify the resulting permissions.

## When is this scanner not the next action?

Do not make this preview the next action when the immediate problem is an existing repository backlog. GitHub says the detector scans pull requests rather than the full repository. A backlog review needs another method, such as a bounded manual threat model, targeted code review, or an appropriate repository-level assessment.

Do not depend on it for contributions that arrive through forks or Dependabot. Those pull requests are excluded. Keep a review path that works when no AI application scan appears.

Do not present it as a merge gate. The current findings are advisory and cannot be enforced through rulesets. If a high-consequence repository needs a blocking decision, define a separate required review or test that the repository can enforce and audit.

Do not enable it only because the release category sounds broad. The useful decision comes from the present documentation and a local pilot: current coverage, actual eligibility, observed findings, missed cases, review effort, and cost. Recheck the documentation before each expansion because the feature is a public preview and GitHub says its behavior can change.

AI application scanning can still be valuable under those limits. A timely alert can expose an indirect prompt-injection path before merge and give a reviewer a concrete source-to-model flow to inspect. That is a useful sensor. The control comes from the team's response: constrained authority, verified behavior, recorded exceptions, and a review process that still works when the sensor is silent.

*Primary GitHub and OWASP sources reviewed October 30, 2026. GitHub can change feature coverage, eligibility, billing, settings, and enforcement behavior during the preview. Recheck the current documentation before enabling or expanding the detector.*
