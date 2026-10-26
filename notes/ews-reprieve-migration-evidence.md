---
writing_schema: 2
layout: writing-article
title: Treat the EWS reprieve as borrowed time
description: Restore a blocked Exchange Online application without turning temporary EWS access into an indefinite exception.
permalink: /notes/ews-reprieve-migration-evidence
published: true
published_on: "2026-10-26"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - microsoft-365
  - business-applications
  - service-operations
---

Exchange Online applications that still use Exchange Web Services can now fail because Microsoft has started the retirement process. Re-enabling a blocked application can restore service, but it cannot make the dependency current, supported past the final cutoff, or ready for Microsoft Graph. Treat the reprieve as incident containment with an expiry date.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public Microsoft sources cited below. It does not describe Viyu systems, products, customers, controls, or operating practices.

The practical question for an MSP engineer is: **how do you restore a necessary EWS application without losing the migration work inside the incident?** My answer is to keep two records. The restoration record proves why access resumed. The exit record identifies the dependency, its owner, its supported replacement, and the test that will let the temporary access end.

## The failure is current, but the cutoff is final

Microsoft began the phased disablement of EWS in Exchange Online in October 2026. Its current [EWS deprecation guidance](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-ews-exchange-online) says global disablement starts in October 2026 and completes in April 2027. The retirement applies to Exchange Online. EWS on Exchange Server is not part of the same retirement.

This is not only a future migration deadline. Microsoft published a current [recovery procedure for applications that stopped working](https://techcommunity.microsoft.com/blog/exchange/exchange-online-ews-application-stopped-working-do-this-/4566215) after tenant-level enforcement began. The procedure can temporarily restore access, but Microsoft states that the relief ends when EWS is fully disabled in April 2027.

That creates two different clocks. The incident clock asks how quickly a required business function can return. The retirement clock asks how the dependency will leave EWS before temporary access disappears. Solving only the first clock converts an outage into a quieter deadline risk.

## A 403 is a branch point, not a diagnosis

Do not begin by changing every EWS setting. Microsoft documents several controls that can deny the same request: organization or mailbox EWS enablement, the application-ID allow list, and the older user-agent access policy. These controls can overlap.

The current [EWS access-control documentation](https://learn.microsoft.com/en-us/exchange/client-developer/exchange-web-services/how-to-control-access-to-ews-in-exchange) tells applications to inspect the `X-EWS-Policy-Reason` response header. A value that says EWS is disabled points toward organization or mailbox enablement. A value that says EWS is blocked by policy points toward the application-ID or user-agent policy. The latter message does not identify which policy failed.

An HTTP 403 by itself proves less. Microsoft documents 403 when these EWS access controls block a request, and the response header supplies the diagnostic detail. A bare status therefore cannot identify which access control caused the block. Keep the HTTP status separate from the EWS error payload and response header when recording evidence.

Use a short diagnostic sequence:

1. Record the affected workflow, start time, mailboxes, application identity, and exact response evidence.
2. Check the tenant Message center for the seven-day warning or disablement notice that Microsoft describes.
3. Read the organization setting, the affected mailbox setting, the application-ID allow list, and any user-agent policy.
4. Match the application ID to an accountable application or vendor before allowing it.
5. Change the narrowest control that restores the approved dependency, then retest the business workflow.

The last step matters. A successful sign-in or a clean configuration read does not prove that notifications, calendar access, mailbox processing, backup, or another required workflow resumed.

## Restore service with a bounded exception

The temporary access decision should be explicit. Record which application is allowed, which workflow requires it, who approved the exception, and when the exception ends. April 2027 is the outer service boundary, not the target completion date.

Microsoft documents that `EwsAllowedAppIDs` and an existing user-agent allow or block policy are evaluated separately. Passing one does not bypass the other. It also warns that changes to the application-ID list can take up to 24 hours because of caching. Build that delay into the incident plan instead of making repeated changes while the earlier state can still be active.

The restoration record should contain these facts:

| Field | What it proves |
| --- | --- |
| Application identity | The allowed principal is the dependency under review, not an unexplained identifier |
| Workflow and owner | A named function justifies temporary access and has an accountable decision-maker |
| Policy evidence | The observed header and configuration support the chosen change |
| Functional test | The required workflow works after the change |
| Scope and expiry | The exception is limited and cannot silently become permanent |
| Exit work | A named replacement path, next checkpoint, and acceptance test exist |

Avoid broad enablement as the default recovery choice. If the application identity is unknown, preserve the outage evidence and investigate the identity before granting durable access. Urgency can justify a temporary exception. It does not justify an exception that nobody can later explain or remove.

## Usage data finds calls, not ownership

Microsoft's [EWS usage report](https://learn.microsoft.com/en-ca/microsoft-365/admin/activity-reports/ews-usage?view=o365-worldwide) is the best starting point for Exchange Online discovery. It lists application IDs, EWS SOAP actions, call volume, and the last recorded activity. Administrators can select a 7-, 30-, or 90-day period and export the details.

The report has important limits. Microsoft says the data is aggregated weekly and can take up to 10 days to appear. It shows observed calls, not the business purpose, source repository, support status, replacement release, or person who can accept a behavior change. A quiet report also cannot prove that a quarterly or event-driven process no longer exists.

Turn each observed application ID into a dependency record. Attach the vendor or code owner, the mailboxes or workflow class involved, the EWS operations in use, the authentication model, the supported replacement, and the next test. Keep unknowns visible. An unidentified application ID is work to resolve, not evidence that the call is harmless.

For source-controlled .NET applications, Microsoft's public [EWS Migration Tools repository](https://github.com/OfficeDev/ews-migration-analyzer) includes a code analyzer that finds EWS references and links them to migration guidance. Microsoft describes the analyzer as supporting applications built with the .NET EWS SDK. That boundary matters: it is a useful code-discovery aid, not a complete inventory of purchased software, scripts in other languages, or dormant integrations.

## Graph migration is a behavior change

Replacing a SOAP endpoint with a REST endpoint is not the acceptance claim. Microsoft publishes an [EWS-to-Graph mapping](https://learn.microsoft.com/en-us/graph/migrate-exchange-web-services-api-mapping) for many mail, folder, attachment, notification, synchronization, calendar, and group operations. A mapping identifies a candidate API. It does not prove equivalent behavior under the application's real permissions, data volume, timing, or failure handling.

Some patterns change shape. For example, Microsoft maps EWS pull notifications to message delta queries, while push notifications use Graph subscriptions. That changes how an application detects work, stores state, handles missed events, and recovers after downtime. The test must cover those behaviors, not only a successful request.

Parity also remains uneven. Microsoft's current deprecation page lists target dates for several remaining gaps and says those dates can change. It separately identifies capabilities that will not receive generic Graph equivalents, including general public-folder CRUD, general Microsoft 365 group-mailbox CRUD, and discovery-mailbox access. A plan that says only “move to Graph” is incomplete until it classifies the exact EWS operations.

Use four acceptance questions for each migration:

1. **Identity:** Does the new application use the intended principal and only the required permissions?
2. **Data:** Does it read, create, update, or export the required content with the needed fidelity?
3. **Timing:** Does polling, subscription, retry, and reconciliation behavior meet the workflow's real delay tolerance?
4. **Recovery:** Can the application resume after throttling, token failure, missed events, partial processing, or an interrupted deployment without duplication or loss?

Do not remove EWS access because one Graph request succeeded. Remove it after the replacement release passes the named workflow, the observation period closes, and the old dependency no longer produces required calls.

## Close the loop before removing the exception

The exit record should make one bounded claim: a named application release performs a named workflow without EWS under stated test conditions. Keep deployment and acceptance separate. A vendor update can install successfully while a scheduled mailbox process still fails later. Store the result where the next engineer can check it.

Use this closure sequence:

1. Identify the EWS operations and the business workflow they support.
2. Select the supported replacement or document why no direct Graph equivalent exists.
3. Test identity, data behavior, timing, error handling, and recovery with production-like conditions.
4. Observe the replacement across the workflow's full execution interval.
5. Remove the application from temporary EWS access and verify both the new workflow and the absence of required EWS calls.

The observation interval must fit the workflow. An interactive calendar feature can produce evidence quickly. A monthly export or event-driven process needs a longer or deliberately triggered test. The usage report's reporting delay also means an immediate blank chart cannot serve as the only retirement proof.

If a vendor owns the application, ask for a product-specific statement that names the fixed release, replacement protocol, required permissions, known gaps, and support timeline. “Graph ready” is a label. A versioned release and an acceptance test are evidence.

The EWS reprieve is useful because it can turn an outage into planned work. Use it that way. Restore the approved function, keep the policy change narrow, identify the real dependency, and bind the exception to a tested exit. The incident ends when service returns. The retirement work ends when the service no longer needs EWS.

*Primary Microsoft sources reviewed October 26, 2026. Enforcement timing, roadmap dates, reporting behavior, and migration guidance can change. Recheck Microsoft documentation and tenant Message center notices before changing access or approving a migration.*
