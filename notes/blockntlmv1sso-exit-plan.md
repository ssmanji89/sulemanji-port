---
writing_schema: 2
layout: writing-article
title: BlockNtlmv1SSO needs an exit plan, not a patch rollback
description: Use BlockNtlmv1SSO evidence to ship the October 2026 Windows update, contain MS-CHAPv2 exceptions, and retire the dependency.
permalink: /notes/blockntlmv1sso-exit-plan
published: true
published_on: "2026-11-09"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - identity
  - infrastructure
  - service-operations
---

BlockNtlmv1SSO turns an authentication dependency into an update decision. The wrong response is to pause the October 2026 Windows security update everywhere or leave Audit mode enabled everywhere. The useful response is to keep the update moving, contain any temporary exception, and give each confirmed MS-CHAPv2 dependency an owner and a retirement test.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research and checked its factual core against the public Microsoft and IETF sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, protocols, authentication methods, or operating practices.

The practical question is: **how should an endpoint or identity team handle the BlockNtlmv1SSO change without turning a security exception into the permanent fix?** My answer is to separate update deployment, dependency detection, temporary continuity, and dependency retirement. A registry value can buy investigation time. It cannot complete the migration.

## What did BlockNtlmv1SSO change?

Windows updates released on and after October 13, 2026 changed the internal default on eligible devices. When Credential Guard is disabled and the `BlockNtlmv1SSO` registry value is absent, Windows now uses Enforce mode instead of Audit mode. Enforce mode blocks requests to generate NTLMv1-derived credentials for single sign-on.

Microsoft's [NTLMv1 change guidance](https://support.microsoft.com/en-us/servicing/os/windows/docs/2025/08/upcoming-changes-to-ntlmv1-in-windows-11-version-24h2-and-windows-server-2025) currently lists Windows 11 versions 24H2, 25H2, 26H1, and 26H2, plus Windows Server 2025. The [October Windows 11 security-update record](https://support.microsoft.com/en-us/servicing/os/windows-11/2026/10/kb5127648-windows-11-24h2-25h2-26h2-security-update) confirms the new default for its supported Windows 11 releases.

The change is narrower than “Windows disabled all NTLM.” Microsoft says it can affect Wi-Fi, Ethernet, and VPN connections that use MS-CHAPv2-based authentication for single sign-on. Manually supplied credentials can still work in these scenarios. Devices with Credential Guard enabled already block the affected legacy single-sign-on behavior, so this default change does not apply to them.

The protocol history explains the concern. [RFC 2759](https://www.rfc-editor.org/rfc/rfc2759.html) defines MS-CHAPv2 challenge-response processing from an MD4 password hash. Microsoft describes the resulting credential material as cryptographically equivalent to NTLMv1 and recommends moving supported Wi-Fi and VPN connections from MS-CHAPv2 to certificate-based authentication in its [Credential Guard compatibility guidance](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/considerations-known-issues).

The registry state matters:

| State | Current documented behavior | Operational meaning |
| --- | --- | --- |
| Value absent on an eligible updated device | Enforce mode is the internal default, but Windows does not create the value | Do not infer the mode from registry presence alone |
| Value `0` | Audit and allow the request; write warning event 4024 | Temporary security exception while the dependency is removed |
| Value `1` | Block the request; write error event 4025 | Explicit enforcement |

Microsoft states that a change to this value takes effect without a restart. That makes Audit mode useful for a controlled continuity decision. It also makes an unowned, broad exception easy to create.

## Why is Audit mode not the fix?

Audit mode restores the credential behavior that Enforce mode is intended to block. Microsoft calls value `0` a temporary security exception and says it reduces the protection provided by Enforce mode. The exception can therefore preserve access while a team investigates, but it cannot be the desired end state.

A patch rollback creates the same category error. It can restore an earlier behavior on one device, but it also removes the security update that introduced the new default and any other fixes in that cumulative release. Treat the update and the authentication dependency as two related decisions rather than one forced choice.

The decision should have four separate states:

1. **Update state:** Has the applicable security update installed successfully?
2. **Protection state:** Is the device in Audit mode, Enforce mode, or outside this change because Credential Guard applies?
3. **Dependency state:** Did a current observation show an MS-CHAPv2 single-sign-on dependency?
4. **Retirement state:** Does the dependency have a tested replacement, owner, and removal date?

Do not collapse these into “patched” or “working.” A device can be updated and temporarily allowed. It can be updated and enforced. It can also fail for an unrelated network or update problem. The state must carry the reason.

This separation matches the service decision in [Emergency patching is a service decision](/notes/emergency-patching-service-decision). The security update, business continuity, evidence, and exception owner belong in one decision record, but each remains a different fact.

## What evidence shows that a device is affected?

Start with applicability, not symptoms. A failed Wi-Fi or VPN connection after an update does not prove that BlockNtlmv1SSO caused the failure.

Confirm these facts for the affected device:

- The Windows release is within Microsoft's current applicability list.
- The October 13, 2026 security update or a later applicable update is installed.
- Credential Guard is disabled.
- `BlockNtlmv1SSO` is absent or set to Enforce mode.
- The failure coincides with NTLM Operational event 4025.
- The connection uses an MS-CHAPv2-based single-sign-on flow.

Microsoft places warning event 4024 and error event 4025 in `Microsoft-Windows-NTLM/Operational`. Event 4024 records an allowed attempt in Audit mode. Event 4025 records a blocked attempt in Enforce mode. Both include process and target fields that can help connect the event to the attempted flow.

An event is stronger than a help-desk symptom, but it still needs context. Match its time to a reproduced connection attempt. Record the device state, connection type, and current policy. A stale event can describe an old dependency. An empty log can reflect retention, collection, or test-coverage limits rather than the absence of a dependency.

Use a small pilot group before broad enforcement. Include the connection paths that matter, not only the most common device model. Test Wi-Fi, wired 802.1X, and VPN separately when each exists because success on one path does not exercise the others.

Deployment assignment is not acceptance evidence. [An Intune assignment is not proof of application](/notes/intune-policy-verification) explains the same distinction for device policy. Here, the acceptance evidence is the observed registry or protection state, the relevant event, and a successful connection test under the intended mode.

## What belongs in the exception record?

A useful exception is narrow enough to remove. Record one row for each materially different authentication path rather than one fleet-wide note.

| Field | Question it answers |
| --- | --- |
| Scope | Which device cohort and connection path need Audit mode? |
| Evidence | Which current event and test confirm the dependency? |
| Continuity | What access must remain available during remediation? |
| Protection | Which other safeguards remain active while Audit mode is allowed? |
| Owner | Who can change the authentication path and who approves the exception? |
| Expiration | When must the evidence and business need be reviewed again? |
| Exit test | What proves that Enforce mode can return without breaking access? |

Avoid an exception with only a registry instruction and no expiration. That document describes how to preserve the dependency, not how to remove it.

The exit test should exercise the replacement authentication path and the final protection state. Microsoft's public guidance recommends certificate-based authentication, such as PEAP-TLS or EAP-TLS, for affected Wi-Fi and VPN designs. The exact replacement depends on the authorized environment, supported clients, identity lifecycle, certificate lifecycle, and recovery requirements. Do not copy a reference protocol into production without validating those dependencies.

Run the exit test in this order:

1. Confirm that the test device uses the replacement path rather than cached or manually supplied credentials.
2. Put the device in Enforce mode.
3. Test initial connection, reconnection, restart, password change where relevant, and loss-and-return of network access.
4. Confirm that event 4025 does not appear for the intended flow and that the service remains usable.
5. Remove the temporary exception from the controlled cohort, then read back the final state.

A clean connection proves the observed path worked under the tested conditions. It does not prove that every device, profile, network location, or recovery case uses the same path. Expand only after the pilot evidence covers the next cohort.

## Should a team delay the Windows update?

Uncertainty about MS-CHAPv2 is a reason to stage the update, not a reason to stop security servicing indefinitely. Microsoft's Core Infrastructure and Security team explicitly advises administrators not to defer the October update when the dependency is uncertain. Its [BlockNtlmv1SSO field guidance](https://techcommunity.microsoft.com/blog/coreinfrastructureandsecurityblog/bracing-for-blockntlmv1sso/4567273) recommends setting Audit mode before the update for uncertain endpoints, then using the resulting evidence to find the dependency.

That advice needs a control boundary. Apply Audit mode only to the cohort that needs investigation. Capture an owner and expiration before deployment. Preserve enough NTLM Operational log history to observe normal work patterns. Then move confirmed dependencies into a replacement plan and return cleared devices to Enforce mode.

Use three rollout rings:

- **Known clear:** Current evidence shows no affected flow; update and keep Enforce mode.
- **Unknown:** Apply the update with a time-limited Audit exception while representative workflows run.
- **Confirmed dependency:** Keep the smallest continuity exception, replace the affected authentication path, and require the exit test.

Do not classify an unobserved device as known clear. Reachability and fresh evidence matter because a disconnected device cannot produce a meaningful negative result. [Reachability is a priority signal, not a closure rule](/notes/dependency-reachability-priority-signal) gives the broader rule: missing telemetry changes the next action, but it does not settle the dependency.

## Where does this guidance stop?

This guide does not identify an affected device, network, VPN, identity provider, RADIUS service, or authentication profile in any organization. It does not test a registry change, security update, Credential Guard state, MS-CHAPv2 flow, or certificate-based replacement.

It also does not say that every post-update connection failure has this cause. The October cumulative update contains other changes, and a network path can fail for unrelated reasons. Require the applicability facts, a reproduced attempt, and the matching NTLM event before assigning this diagnosis.

The replacement guidance is a direction, not a complete architecture. Certificate-based authentication introduces certificate issuance, renewal, revocation, trust, recovery, and device-lifecycle decisions. Those decisions need their own design and tests. Do not remove a password-based dependency by creating an unowned certificate dependency.

Start with one bounded action: find the updated devices that have Credential Guard disabled, then reproduce each important connection path while collecting the NTLM Operational log. That evidence separates devices that can stay in Enforce mode from devices that need a temporary exception and an exit plan.

The durable lesson is not about one registry value. Security defaults expose hidden dependencies. A responsible rollout preserves the security update, makes the exception visible, and treats restored connectivity as the start of migration evidence rather than the end of the incident.

*Public Microsoft and IETF sources reviewed November 9, 2026, at approximately 1:05 p.m. America/Chicago. Microsoft can change affected versions, update behavior, event guidance, and migration recommendations. Recheck the linked sources before a live change.*
