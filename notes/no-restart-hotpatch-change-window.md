---
writing_schema: 2
layout: writing-article
title: "A no-restart hotpatch still needs a change window"
description: "Treat Windows Server Hotpatch as a live change: verify scope, prerequisites, service behavior, and reboot-dependent recovery before rollout."
permalink: /notes/no-restart-hotpatch-change-window
published: true
published_on: "2026-11-27"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - infrastructure
  - service-operations
---

Windows Server Hotpatch can remove the planned restart from an update, but it does not remove the change. A patch can install without a reboot and still alter live code, depend on a precise baseline, expose a functional regression, or require a reboot if recovery becomes necessary.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research and checked its factual core against the public Microsoft and NIST sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, protocols, patching methods, exposure, or operating practices.

The practical question is: **what should a Windows Server engineer prove before treating a no-restart update as low-risk?** My answer is to keep the smaller availability interruption while preserving an ordinary change standard: prove applicability, prerequisites, service behavior, observation time, and a recovery path that includes the restart the normal installation avoided.

## What changed on November 25?

Microsoft released [KB5138318](https://support.microsoft.com/en-au/servicing/os/hotpatch/windows-server-2025/2026/kb5138318-windows-server-2025-security-update) on November 25, 2026. The notice describes it as an out-of-band, non-security cumulative Hotpatch update for Windows Server 2025 Datacenter: Azure Edition. Microsoft says the update installs and takes effect without a restart.

The update corrects a specific regression. Microsoft says that after the November security Hotpatch, KB5131077, some Windows Server 2025 devices with Router Advertisement enabled and receiving time-bound IPv6 routes might stop unexpectedly with error `0x139` when a route timer expires. The new notice says Microsoft is not currently aware of issues with KB5138318.

Those facts do not make KB5138318 a universal Windows Server update. The published applicability is one edition, and the described failure depends on named network conditions. An engineer should first establish the server edition, update channel, installed build, prior Hotpatch state, and whether the relevant IPv6 route behavior exists. A fleet count without those fields cannot answer which systems belong in the decision.

The notice also names installation prerequisites: baseline update KB5126646 and servicing stack version 26100.33634 or later. Microsoft says the latest servicing stack update installs with KB5138318, but that does not erase the pre-installation requirement. The acceptance record should preserve the observed baseline and servicing stack state rather than infer eligibility from enrollment alone.

## What does “no restart” actually remove?

No restart removes one planned interruption: the reboot normally needed to load an operating-system update. It does not prove that the changed code is consequence-free.

Microsoft's [Windows Server Hotpatch overview](https://learn.microsoft.com/en-us/windows-server/get-started/hotpatch) explains that Hotpatch changes the in-memory code of running processes. It also says that the absence of a restart does not remove the performance or functionality implications of the patch itself. KB5138318 makes that distinction concrete because it exists to correct a stop error associated with an earlier Hotpatch under specific network conditions.

The broader servicing model still contains restarts. Microsoft's [Windows Server release information](https://learn.microsoft.com/en-us/windows/release-health/windows-server-release-info) shows a cycle of baseline updates and Hotpatch months. Baselines require a restart; the following Hotpatch updates normally do not. Microsoft also notes that unplanned baselines can replace a Hotpatch when an important update cannot be delivered as a Hotpatch.

Other update classes remain outside the normal Hotpatch scope. The Windows Server Hotpatch overview names non-security Windows updates, .NET updates, drivers, and firmware as examples that can still require conventional updating. KB5138318 is an out-of-band exception labeled non-security, which is another reason to read the exact update notice instead of applying a generic monthly rule.

The operational conclusion is narrow: no restart is a delivery property. It is not an applicability result, a compatibility test, a service-health observation, or a rollback plan.

## Should every in-scope server receive the update immediately?

The answer depends on evidence, not on the convenience of a no-restart install. Use four dispositions instead of one fleet-wide status.

| Disposition | Evidence | Next decision |
| --- | --- | --- |
| Not applicable | A different edition, release, update channel, or Hotpatch state | Follow the current update history for that exact platform; do not force this package into scope |
| In scope, condition not observed | The published platform matches, but current evidence does not show the named IPv6 route conditions or stop error | Confirm that the observation is fresh and that the relevant network state was actually measured |
| In scope, condition present | The platform matches and Router Advertisement with time-bound IPv6 routes is observed after the earlier Hotpatch | Prioritize a representative deployment and test the route-expiry behavior plus required services |
| Service already affected | The named stop error or a matching failure is observed | Treat this as a recovery decision with an accountable service owner, not as routine background patching |

“Condition not observed” is intentionally different from “unaffected.” A stale configuration record, an incomplete network inventory, or a short observation window can all miss the state named in the notice. The result should say what was checked, when it was checked, and which system supplied the observation.

This is also where an out-of-band release differs from an automatic approval rule. The release date signals that Microsoft published outside the ordinary cadence. It does not establish the priority of every local system. Priority follows the combination of applicability, the failure condition, service consequence, and the strength of the available recovery path.

## What belongs in the change record?

A useful change record is short enough to read during the deployment and precise enough to support recovery. Five fields cover the decision.

1. **Scope:** Record the exact edition, OS build, Hotpatch channel, installed KBs, servicing stack version, and the evidence for Router Advertisement and time-bound IPv6 routes.
2. **Candidate:** Record KB5138318, its source URL, retrieval time, expected build, and the baseline and servicing stack prerequisites from the current notice.
3. **Sequence:** Name the representative first ring, the observation window, the hold point, and the person authorized to expand or stop deployment.
4. **Acceptance:** Verify the installed update and build, then test the server's required services, relevant IPv6 route behavior, system stability, and monitoring signals for long enough to exercise the condition being corrected.
5. **Recovery:** Record the last functional baseline, the method and authority to return to it, the restart requirement, the service check after recovery, and the condition that triggers the backout.

The recovery field matters even when installation is expected to be interruption-free. Microsoft says Hotpatch does not support automatic rollback. If a problem occurs during or after an update, its Windows Server guidance says to uninstall the latest update, install the last functional baseline, and restart the virtual machine.

That means “no reboot required” and “no reboot possible” are very different statements. A team can deploy without a planned restart while still needing a window in which a restart is permitted if the acceptance checks fail. If the service cannot tolerate that recovery path, the engineer needs a different ring, a different time, or a stronger redundancy plan before installation.

## How should deployment rings change when there is no restart?

The safest ring is not simply the smallest number of servers. It is the smallest group that reproduces the relevant failure conditions while limiting business consequence: the same Windows Server edition, update channel, baseline, network role, and time-bound route behavior.

A convenient but unrepresentative test machine can produce false confidence. A server without the named IPv6 conditions can prove that the package installs on that build. It cannot prove that the corrected route-expiry path behaves properly. Conversely, a production server with the right network behavior but no service fallback can make the first test unnecessarily consequential.

Use three gates:

1. **Representative gate:** Install on a system that matches the relevant platform and network conditions. Confirm the intended build, servicing state, route behavior, system stability, and required services.
2. **Limited-service gate:** Expand to a small production failure domain with a known recovery path. Hold through the relevant observation window rather than expanding as soon as installation reports success.
3. **Fleet gate:** Expand only after the prior ring's evidence is complete. Keep exceptions explicit for servers with a different edition, baseline, update source, network role, or service constraint.

NIST's [enterprise patch-management guide](https://csrc.nist.gov/pubs/sp/800/40/r4/final) treats patching as more than installation. It includes identifying, prioritizing, acquiring, installing, and verifying patches, and it recommends scheduling, validating, and testing before deployment when appropriate. It also calls for verifying that the risk response took effect and monitoring that it remains in place.

That sequence is useful here. Installation status proves execution. The observed build proves state. Route and service checks prove behavior under the tested conditions. Continued monitoring tests whether the conclusion survives past the first successful health check.

My guide to [emergency patching decisions](/notes/emergency-patching-service-decision) covers the broader choice among patching, isolation, and stopping a service. The [Windows Update certificate recovery guide](/notes/windows-update-certificate-recovery-test) applies the same evidence discipline to a different problem: readiness and recovery are separate claims.

## When does this guidance not apply?

This guide does not say that KB5138318 applies to every Windows Server 2025 installation, every Hotpatch-supported platform, or every Azure Arc-connected server. The out-of-band notice names Windows Server 2025 Datacenter: Azure Edition. Engineers responsible for other editions or servicing models should use the current Microsoft update history for those exact systems.

The guide also does not diagnose an observed stop error. Matching one symptom or error code is not enough to establish the cause. Preserve crash evidence and use the applicable Microsoft support and incident procedures when the failure does not match the published conditions or continues after the documented update.

Finally, a no-restart plan does not replace application-owner acceptance, cluster or redundancy procedures, regulated change requirements, or vendor support terms. Those constraints can require a different sequence and a longer observation period.

A no-restart update earns a shorter outage plan, not a lighter acceptance standard. The change closes only when the intended build is installed, the relevant network behavior survives its observation window, required services remain healthy, and the team still has a tested path to a functional baseline.

*Public sources reviewed November 27, 2026, at approximately 12:15 p.m. America/Chicago. Microsoft can revise applicability, prerequisites, known issues, and recovery guidance. Recheck the linked update notice and Windows Server documentation before acting.*
