---
writing_schema: 2
layout: writing-article
title: A GitHub Actions log secret is an incident, not an alert
description: Turn GitHub Actions log-secret alerts into a response runbook that revokes credentials before cleanup and treats silence as incomplete evidence.
permalink: /notes/github-actions-log-secret-response
published: true
published_on: "2026-11-10"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - identity
  - infrastructure
  - service-operations
---

A GitHub Actions log secret is a credential incident, not a notification to clear. GitHub's new workflow-log scanning can reveal a leak after a run completes, but the safe response still starts with revocation, continues through exposure review and log cleanup, and ends only when the workflow stops producing the secret.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research and checked its factual core against the public GitHub and OWASP sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, workflows, or operating practices.

The practical question is: **what should a platform architect require when secret scanning finds a credential in an Actions log?** My answer is a response contract with four separate gates: invalidate the credential, bound the possible access, remove the exposed copy, and prove that the corrected workflow no longer emits it. Closing the alert is recordkeeping. It is not containment evidence.

## What changed in GitHub Actions workflow logs?

GitHub [announced workflow-log secret scanning](https://github.blog/changelog/2026-11-09-secret-scanning-detects-secrets-in-github-actions-workflow-logs/) in public preview on November 9, 2026. When an enabled workflow run completes, GitHub scans its logs for provider patterns. A finding appears with the repository's other secret-scanning alerts and links back to the workflow log.

The preview has important boundaries. GitHub says it scans only runs completed after the feature is enabled, so it does not backfill existing logs. The workflow-log scanner currently excludes generic patterns, custom patterns, AI-detected secrets, and values that Actions already masks. Alerts also do not generate notifications during the preview; someone must inspect the secret-scanning alert list.

Those facts change the operating question. Enabling the policy creates a new detection source, but it does not establish complete historical coverage or an attended queue. A team needs an owner, a review interval, and an escalation path before it can treat the feature as an active control.

The feature is also post-run detection. The credential may have been printed, retained, or used before the scan finishes. GitHub says validity checks run for supported secret types, but a validity result is one input to triage, not permission to postpone revocation.

## Why is detection not containment?

A scanner can locate evidence of a credential without changing the credential's authority. GitHub's broader [secret-scanning guidance](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) tells responders to rotate an affected credential immediately. Removing a string from a log does not stop an already copied token, key, or password from working.

Keep four claims separate:

| Evidence | Supported conclusion | Conclusion it does not support |
| --- | --- | --- |
| A provider-pattern alert exists | A matching value appeared in a completed workflow log. | The credential was used, or the alert covers every exposed copy. |
| A validity check says active | The provider currently recognizes the supported credential type as active. | No one has copied or used it. |
| The workflow logs are deleted | That copy is no longer available through the normal log view. | The credential is revoked or absent from other systems. |
| A later run has no alert | No supported provider-pattern match was reported for that completed run. | The workflow contains no generic, custom, historical, or otherwise undetected secret. |

A clean alert list is therefore a bounded observation, not a proof that the workflow is secret-free. The preview does not scan old runs, does not notify responders, and does not cover several pattern classes. Silence supports closure only when prevention, queue ownership, and a direct log review cover the same workflow path.

This is the same control boundary that matters in credential migrations. [GitHub's stateless tokens need two runbooks](/notes/github-stateless-tokens-two-runbooks) because compatibility and incident response answer different questions. Workflow-log scanning adds a useful detector to the response runbook; it does not replace the runbook.

## What should the response runbook do first?

The first action is to preserve safe identifiers, not the secret value. Record the repository, workflow, run, job, alert identifier, credential type, detection time, and responder. Do not paste the credential into a ticket, chat, evidence file, or command history.

Then execute the response in this order:

1. **Invalidate the credential.** Revoke or rotate it at the issuing provider. If service continuity requires a replacement, scope the replacement to the smallest current need.
2. **Bound possible access.** Identify what the credential could reach, when the exposed run occurred, and which provider or repository audit evidence can show activity during that window.
3. **Remove exposed copies.** Delete the affected workflow logs after the minimum safe evidence record exists. Search other runs, artifacts, caches, issue text, and copied diagnostics where the same output path could have written the value.
4. **Fix the producer.** Remove the command, debug mode, echo, exception path, or third-party output that emitted the value. Add masking only as a defense for sensitive values that legitimately enter the job.
5. **Verify the correction.** Run the smallest representative workflow path, confirm its intended function, inspect the completed log, and confirm the old credential is denied outside the workflow.

The order matters. Deleting the log first can remove useful context while leaving the credential active. GitHub says the secret-scanning alert remains available after log deletion, but the linked log evidence will no longer be available through the normal workflow view. Retain identifiers and conclusions, not the secret itself.

GitHub's [workflow-log documentation](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs) allows users with write access to delete logs through the interface or API. Treat that permission as a response dependency: the alert owner must know who can revoke the credential and who can remove the log. Those may be different people.

## How should a workflow prevent the next leak?

Prevention starts by reducing how many long-lived secrets the job can receive. GitHub's [Actions secret guidance](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) recommends OpenID Connect when a supported cloud provider can issue access directly, avoiding stored long-lived cloud credentials. GitHub's [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use#authenticating-to-your-cloud-provider) further recommends short-lived, well-scoped tokens for that path.

OIDC is not a universal replacement. A workflow may still need a provider token, signing key, package credential, or other secret. For every remaining value, document five properties:

| Property | Decision |
| --- | --- |
| Issuer | Which system can revoke or replace the credential? |
| Scope | Which repository, environment, resource, and action can it reach? |
| Lifetime | When does it expire without operator action? |
| Exposure path | Which command, process, action, or error handler can print it? |
| Response owner | Who invalidates it and who reviews the resulting alert? |

GitHub says sensitive values that are not stored as Actions secrets should be masked with `::add-mask::VALUE`. Masking is a defense, not permission to print the value deliberately. A command can expose a secret through process arguments, verbose output, transformed encodings, partial values, or a tool's own diagnostic path.

OWASP's [logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude) gives the broader rule: access tokens, passwords, connection strings, encryption keys, and other primary secrets should usually be removed, masked, sanitized, hashed, or encrypted rather than recorded directly. Apply that rule to the workflow design before relying on a later scanner.

Review debug settings as part of the fix. GitHub documents that step and runner debug modes increase log detail. Extra detail can be useful for a bounded investigation, but leaving verbose output enabled expands the material that a workflow retains and a responder must review.

## What evidence is enough to close the incident?

Closure needs evidence from both the credential provider and the corrected workflow. A dismissed alert alone answers neither side.

Use a compact acceptance record:

| Gate | Required evidence |
| --- | --- |
| Invalidation | The old credential is revoked, expired, or otherwise denied by the issuer. |
| Exposure scope | The credential's authority, exposure window, and reviewed activity sources are recorded. |
| Cleanup | The affected logs and any confirmed copies are removed without copying the secret into the record. |
| Correction | The emitting command or path is identified and changed. |
| Prevention | The replacement uses the narrowest practical scope, lifetime, and masking boundary. |
| Verification | A representative completed run works, its log contains no credential value, and the current alert queue is reviewed. |

The verification run should use a bounded, non-production path when practical. Do not print a real secret to test whether the scanner catches it. Verify the workflow's required function, inspect the resulting log for the known value outside GitHub's display layer, and use provider-side denial to prove the old credential no longer works.

Retain the result so another operator can see what was invalidated, what was checked, and what future event reopens the issue. [The work should outlast the agent session](/notes/work-outlasts-agent-session); a transient success message is not a durable incident record.

## Where does this guidance stop?

This guide does not claim that every string matching a provider pattern was exploitable or used. It also does not claim that GitHub's scanner detects every credential representation. Provider validity, credential scope, timing, audit evidence, and the actual workflow path determine incident scope.

The preview is limited to eligible GitHub Enterprise Cloud environments and is disabled by default. GitHub can change availability, licensing, detection coverage, notification behavior, and alert semantics while the feature is in preview. Check the current product documentation before designing an unattended process around today's behavior.

Deleting a log is not always the only cleanup action. The same workflow may have copied output to an artifact, external log service, cache, issue comment, deployment system, or another provider. Search only the systems the observed path could have reached, and expand scope when evidence identifies another copy.

The durable lesson is that detection creates an obligation, not containment. Revoke first, investigate the authority and time window, remove exposed copies, fix the producer, and prove the old credential is dead. Then use the scanner for what it can show: one more source of evidence that the corrected workflow is behaving as intended.

*Public GitHub and OWASP sources reviewed November 10, 2026, at approximately 8:05 a.m. America/Chicago. GitHub's workflow-log scanning is a public preview and can change. Recheck the linked product documentation before enabling the feature or relying on its coverage.*
