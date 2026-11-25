---
writing_schema: 2
layout: writing-article
title: "Treat GitHub's new user ID as a schema migration"
description: "Migrate GitHub usage reporting to header-based parsing, durable account IDs, explicit business mappings, and reconciled totals before December 1."
permalink: /notes/github-user-id-usage-report-migration
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: it-leader
topics:
  - identity
  - service-operations
---

GitHub will add a `user_id` column beside `username` in several usage reports on December 1, 2026. Every later column will move one position to the right. GitHub's immediate instruction is simple: tools that read fields by position should switch to reading them by header name before the change. ([GitHub's usage-report announcement](https://github.blog/changelog/2026-11-23-usage-reports-will-include-a-user-id-column-starting-december-1/))

I work as a Sr. Services Engineer at Viyu Network Solutions. This guide analyzes public GitHub material; it does not describe a Viyu implementation, customer environment, internal workflow, product, architecture, control, or acceptance standard.

The parser fix is necessary, but it is not the whole migration. The new field creates a better account-level join across username changes, deleted accounts, and audit events. It does not turn a GitHub account into a verified employee record or decide which business unit should own the resulting spend.

## What changes on December 1?

The change applies to detailed usage, AI usage, and premium-request usage reports, including relevant exports created through the GitHub REST API. The summarized usage report does not change. GitHub scopes the announcement to GitHub Enterprise Cloud account types and standalone organizations on GitHub Team. ([GitHub's usage-report announcement](https://github.blog/changelog/2026-11-23-usage-reports-will-include-a-user-id-column-starting-december-1/))

The new field changes both the schema and some row behavior:

| Change | Documented behavior | Migration consequence |
| --- | --- | --- |
| Column insertion | `user_id` appears immediately after `username`; later columns shift right. | Position-based parsers can silently assign valid values to the wrong fields. |
| Account scope | The ID identifies the account that generated usage, including bot accounts. It is blank when usage is not tied to an account. | A nonblank value is not proof of a human actor, and a blank value is not a parser error by itself. |
| Identity continuity | The ID remains useful after a username change and can identify usage from a deleted account. | Reports can use one account key while retaining the username as a time-specific label. |
| Audit correlation | GitHub says the ID can match usage rows to audit-log events. | The join becomes stronger, but only for events and access paths that expose the corresponding ID. |
| Deleted-account rows | Different deleted accounts will no longer be combined into one blank-username row. | Row counts can rise even when the underlying amounts are calculated the same way. |
| Rounding | GitHub will round the newly separated rows individually. | A recomputed total can differ in the last decimal places without representing new usage. |

GitHub's billing reference already distinguishes summarized, detailed, and AI usage reports. The detailed and AI forms provide per-user context, while summarized reporting groups usage at broader dimensions. That distinction matters when deciding which pipelines need a schema test. ([GitHub billing reports reference](https://docs.github.com/en/billing/reference/billing-reports))

## Why isn't a user ID the person?

A durable account identifier solves an identity-continuity problem. It does not decide which employee, team, project, or cost center should own a charge. That second decision needs an explicit, time-bounded business mapping.

GitHub documents its numeric user ID as durable even when the login changes. The same documentation also shows why resolution is contextual: looking up an Enterprise Managed User or some GitHub App bots requires authorized access to the organization, and an unauthorized lookup can return `404 Not Found`. An ID that cannot be resolved from one credential has not ceased to exist; the observer may simply lack the required view. ([GitHub REST user endpoint](https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-a-user-using-their-id))

The migration should preserve uncertainty rather than erase it. A blank account ID means the usage is not tied to an account; a bot ID means the actor is an account but not necessarily a person; a deleted-account ID preserves continuity without restoring the deleted profile.

Business attribution has another dimension. GitHub's cost-center rules vary by product: some usage follows a repository or organization, while licenses and certain AI-credit usage can follow a user or the organization that granted the license. Direct user assignment, enterprise-team membership, organization membership, and product rules can all affect the result. A stable user ID can support those rules, but it is not a substitute for them. ([GitHub cost-center allocation reference](https://docs.github.com/en/billing/reference/cost-center-allocation))

Treat four records as separate:

| Record | Stable key | Question it answers |
| --- | --- | --- |
| Raw usage row | Export identity plus row contents | What did GitHub report at this time? |
| GitHub account | Provider plus `user_id` | Which account generated the attributable usage? |
| Business subject | Internal person, service, team, or owner key | Who or what does the organization recognize? |
| Allocation decision | Effective dates, product rule, and cost center | Where should this amount be reported? |

Collapsing those records into one table makes later corrections dangerous. A renamed login can rewrite history, a reassigned employee can move old spend into a new department, and a bot can inherit a person's label. Keeping the records separate lets the organization change a business mapping without altering the source evidence.

## How should the reporting pipeline change?

Make the smallest change that preserves evidence and fails visibly.

1. **Parse headers, not positions.** Resolve required fields by exact header name. Reject duplicate headers and fail with a named schema error when a required field is absent. Store unknown columns so the next additive change does not require an emergency rewrite.
2. **Keep the raw export.** Retain the source file, retrieval time, account scope, report type, requested window, and a content hash under the organization's normal access and retention controls. A normalized table should be reproducible from that record.
3. **Use an account key.** Store the provider and `user_id` as the durable account key. Keep `username` as an observed label, not as the primary key. Represent bot, deleted, unresolved, and unattributed states explicitly rather than forcing them into a person row.
4. **Version business mappings.** Map the account key to a person, service, team, or cost center with effective dates and a named evidence source. Do not rewrite an earlier period merely because the current owner changed.
5. **Reconcile at two levels.** Compare source-row counts and amounts before and after normalization, then compare the pipeline total with the report total. Record last-decimal differences caused by GitHub's new row-level rounding; investigate larger or unexplained differences.

The account key also makes audit correlation more precise. GitHub documents `actor_id` and `user_id` on many enterprise audit events, while the usage announcement explicitly identifies audit-log matching as a benefit. Test the join only with authorized events and keep the event's action, timestamp, and scope attached; an equal ID does not prove that one particular event caused a billing row. ([GitHub enterprise audit events](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/audit-log-events-for-your-enterprise))

This is the same data-quality distinction behind [Copilot adoption metrics needing a data-quality gate](/notes/copilot-adoption-metrics-data-quality-gate): a more precise field improves a measurement only when its collection, joins, exclusions, and interpretation remain visible. It also follows the rule that [an LLM usage spike is an identity incident, not merely a billing anomaly](/notes/llm-usage-spike-identity-incident): cost is an observation, while identity and authorization require separate evidence.

## What should the pre-change test prove?

Build two fixtures from authorized, sanitized report shapes: one with the current header order and one with `user_id` inserted after `username`. Include a human account, a bot account, an unattributed row, and two deleted-account rows. The fixtures need not contain production names or amounts.

Run both fixtures through the same ingestion path. The old shape should either remain supported for historical reprocessing or fail with an intentional version message; the new shape should place every later value under the same semantic field as before. A test that only confirms the file opened is too weak because a positional parser can succeed while corrupting columns.

Acceptance evidence should show that the same source rows reach the same downstream fields, that account categories remain visible, and that totals reconcile within a documented rounding explanation. A dashboard screenshot cannot prove any of those conditions.

The test record should answer five questions:

- Did header-based parsing preserve every required field after the insertion?
- Did the pipeline keep the user ID, username, account category, and unattributed state distinct?
- Did deleted-account rows remain separate without inventing people for them?
- Did audit correlation match only on compatible account-ID fields and authorized data?
- Did the total reconcile, with any final-decimal difference explained by the documented row split?

Do not make a username change, delete an account, or alter a cost center merely to exercise the pipeline. Static fixtures can prove schema handling. Current authorized exports, audit records, and cost-center configuration can validate live joins without creating destructive test events.

## When should the business process stay unchanged?

A team that reads reports manually and has no position-based import may not need a new pipeline. It should still recognize the new field, the separate deleted-account rows, and the possible final-decimal difference before comparing December data with an earlier report.

The summarized usage report is outside the announced schema change. Do not redesign a summary-only process merely because a detailed report gained a column. Likewise, the announcement names GitHub Enterprise Cloud and standalone GitHub Team organizations; do not project the December 1 schedule onto another GitHub product without its own current documentation.

Existing cost-center policy also should not change by accident. GitHub's product-specific allocation rules remain the billing authority; the new account ID is additional evidence for identity continuity and joins. Any proposal to change who owns a charge is a governance decision with its own effective date, not a side effect of a CSV migration.

The smallest safe response is therefore bounded: parse by header, preserve the raw source, model account states honestly, keep business mappings separate, and reconcile the changed row shape. The new ID can make reporting more durable. It cannot decide what the organization means by ownership.

*Public GitHub sources reviewed November 24, 2026, at approximately 10:50 p.m. America/Chicago. The December rollout, report fields, APIs, access requirements, and billing rules can change; verify the linked GitHub sources and repeat the schema test before changing production reporting.*
