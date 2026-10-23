---
writing_schema: 1
layout: writing-article
title: An Intune assignment is not proof of application
description: "A practical acceptance method for Intune changes that separates assignment, check-in, policy status, and endpoint evidence."
permalink: /notes/intune-policy-verification
published: true
published_on: "2026-10-23"
article_type: technical-guide
time_horizon: durable
topics:
  - microsoft-365
  - service-operations
  - identity
reader: msp-engineer
---

**In brief:** An Intune policy assignment records administrative intent. It does not prove that the intended device received the policy, evaluated every setting, or reached the business outcome behind the change. I would close an Intune change only after checking four separate claims: target, receipt, evaluation, and outcome.

I work as a Sr. Services Engineer at Viyu Network Solutions. This distinction matters in MSP work, where the engineer who makes a change may not be the person who later handles the exception. A useful handoff must show what Intune was asked to do, what the device reported, when it reported it, and what remains unverified.

## What does an assignment actually prove?

An assignment proves that an administrator selected a user or device scope, subject to group membership and any assignment filters. It describes who should receive the policy. It does not establish that every intended device has checked in since the assignment changed.

Microsoft separates assignments from device and user check-in status in its [configuration policy reports](https://learn.microsoft.com/en-us/intune/device-configuration/monitor-device-profile). Those reports can show `Succeeded`, `Error`, `Conflict`, `Pending`, or `Not applicable`. Microsoft also notes that assignment and check-in reports can differ because they update on different schedules and depend on device check-in.

That reporting model makes one shortcut unsafe: taking a correct group assignment as evidence that the endpoint is configured. Targeting is the first claim, not the final claim.

## Use four claims for acceptance

A four-part acceptance model separates four questions:

1. **Target:** Did the intended user or device fall inside the assignment, including the active filter and platform applicability?
2. **Receipt:** Did that device check in after the relevant assignment or policy revision?
3. **Evaluation:** What did Intune report for the policy and its individual settings: succeeded, error, conflict, pending, or not applicable?
4. **Outcome:** Did the control achieve the operational result that justified the change?

The fourth claim depends on the purpose of the policy. If the purpose is device compliance, inspect the compliance result that Microsoft Entra Conditional Access can consume. If the purpose is a configuration setting, inspect the per-setting status and the device state that matters. If the purpose is Windows update health, use update evidence rather than treating configuration assignment as installation evidence.

The layers should remain separate in the handoff. A record can say “target confirmed; receipt pending” without pretending that the work failed. It can also say “policy succeeded; business outcome not yet tested” without pretending that policy status answers a broader service question.

## A current status needs a current timestamp

The timestamp is part of the evidence, not decoration. Microsoft Graph exposes `lastSyncDateTime` on the Intune `managedDevice` resource as the last successful Intune sync. A compliant or successful state without its observation time can describe an earlier environment.

Microsoft’s [compliance reporting guidance](https://learn.microsoft.com/en-us/intune/device-security/compliance/monitor-policy) explains that reports reflect the most recently known state from device check-in. It also identifies cases where a shared device can show the last user’s state, one device can have more than one report entry, and summary views can update at a different time from detailed views.

Those are not reasons to distrust the platform. They are reasons to state exactly which record supports the decision. “The tenant is compliant” is usually too broad. “This device reported this policy state at this time, for this user or system context” is reviewable.

## Compliance is not the same as configuration

Intune compliance policies and device configuration policies answer different questions. A configuration policy applies settings. A compliance policy evaluates rules and reports a compliance state. Microsoft Entra Conditional Access can then use that reported compliance state when it decides whether to grant access.

The distinction creates a practical trap. A device can receive a configuration profile while the compliance or access result remains unresolved. The reverse can also mislead: Microsoft documents a tenant setting that can treat devices without an assigned compliance policy as compliant unless the administrator changes the default behavior.

For an access-control change, I would therefore inspect the configuration state, the compliance state, and the access decision as separate evidence. One green status should not silently stand in for all three.

## Pending is a state to investigate, not a verdict

`Pending` can mean that the device has not checked in to receive the policy, or that it received the policy but has not yet reported status. The next action depends on which boundary is stale.

Start with the device’s last successful Intune sync. Then compare that time with the policy revision and assignment change. If the device checked in afterwards, inspect per-setting status and conflicts. If it did not, investigate enrollment, connectivity, management channel, and device availability before changing the policy again.

This sequence avoids a common form of accidental churn: editing a correct policy because a disconnected endpoint has not reported. It also avoids the opposite error, which is waiting indefinitely when the device has checked in and returned a real conflict or error.

## What should the handoff contain?

A concise acceptance record can fit in a ticket or change note:

- **Target:** the intended group or device and any relevant filter.
- **Receipt:** the device check-in observed after the change.
- **Evaluation:** the policy and per-setting states, including conflicts or exclusions.
- **Outcome:** the service result tested, or the reason it remains open.
- **Freshness:** the observation time and the source used for each conclusion.

This is an inspection method, not a claim that every Intune workload exposes identical evidence. Different workloads have different reporting paths and delays. Windows Update for Business reports, for example, use client diagnostic data and document their own refresh behavior, so update evidence needs its own freshness check.

The practical takeaway is narrow: **close the claim you can prove, and keep the remaining claim open.** An assigned policy can be correct while receipt is pending. A succeeded policy can be real while the operational outcome still needs testing. The handoff becomes safer when it preserves those boundaries instead of compressing them into “done.”

*Primary references reviewed October 22, 2026. Product behavior can change; verify the current Microsoft documentation and tenant evidence before using this method for a live change.*
