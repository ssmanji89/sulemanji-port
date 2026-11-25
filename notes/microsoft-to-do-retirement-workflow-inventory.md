---
writing_schema: 2
layout: writing-article
title: "Microsoft To Do retirement needs a workflow inventory"
description: "Prepare for Microsoft To Do retirement by inventorying task access, shared workflows, integrations, retention needs, and Planner tests."
permalink: /notes/microsoft-to-do-retirement-workflow-inventory
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - microsoft-365
  - service-operations
---

Microsoft To Do apps are scheduled to retire on June 30, 2027. Microsoft says the change covers the web, Windows, Mac, iOS, and Android apps for work, school, and personal accounts. For work and school accounts, Planner becomes the destination for personal work tasks alongside assigned work. ([Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

I work as a Sr. Services Engineer at Viyu Network Solutions. This guide analyzes public Microsoft material; it does not describe a Viyu implementation, customer environment, or internal roadmap.

The useful question for a Microsoft 365 administrator is not whether Planner can open. It is whether people can still capture, find, share, preserve, and automate the tasks on which their work depends.

## What is actually retiring?

The transition has three clocks: To Do app access ends on June 30, 2027; existing To Do tasks remain accessible through Planner only through that date; and the underlying To Do service, APIs, and synchronization support have separate, later retirement timelines that Microsoft has not yet announced. Treating those clocks as one deadline creates either premature integration work or a late data-access surprise.

Microsoft plans to begin rolling out an updated My tasks experience in Planner in December 2026. New private tasks created there will use a Planner-backed private plan, but existing To Do tasks and lists will not migrate into it. Microsoft also distinguishes access from deletion: the app retirement does not itself schedule existing task data for deletion. ([Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

Personal Microsoft accounts need a separate decision. Microsoft says Planner is not available for those accounts, even though the To Do apps retire for them on the same date. An inventory that looks only at organization-managed identities will miss people who keep a second task set under a personal account.

Classic Outlook's native Tasks experience is another separate path. Microsoft says it will continue working and synchronizing with Exchange; that is different from the To Do experience hosted in Outlook. This is why a product name is a poor inventory key. Record the account, entry point, storage model, and workflow instead. ([Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

## Why isn't this just a Planner deployment?

Planner does not reproduce every To Do behavior. Microsoft identifies differences in individual reminders, shared-list membership and permissions, categories, attachments, list groups, printing, email-list features, and offline access. Native Planner apps for Windows and Mac are not planned as replacements for the To Do desktop apps, and the web and Teams experiences do not provide equivalent desktop offline functionality. ([Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

Those differences turn a software rollout into a workflow migration. A user who can sign in to Planner may still lose a reminder pattern, a shared handoff, or the ability to work during an outage. A help desk that tests only launch and authentication will not see those failures.

Licensing also needs a read-back, not an assumption. Microsoft says Planner capabilities depend on the user's assigned licenses, and its transition guidance tells administrators to confirm that affected users can access Planner. Test with the licenses and policies that representative users actually have. ([Microsoft's Planner admin guidance](https://learn.microsoft.com/en-us/planner/planner-for-admins), [Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

## What should an administrator inventory now?

Build the inventory around dependencies rather than counting app installations.

1. **People and accounts.** Separate work or school accounts, personal accounts, mixed-account users, and government-cloud users. Record who owns each transition decision.
2. **Entry points.** Capture the To Do apps, the To Do experience in Outlook or Teams, classic Outlook Tasks, and any browser or mobile dependency. Note offline and accessibility needs.
3. **Task behavior.** Identify important lists, shared membership, assignments, reminders, recurrence, categories, attachments, list groups, and low-frequency work that may not appear during a short observation window.
4. **Integrations.** Find applications, scripts, and automations that read or write To Do. The current Microsoft Graph To Do API uses `todoTaskList` and `todoTask` resources, while the Planner v1.0 API uses plans and tasks with different containers and authorization rules. That difference is a reason to inspect each integration, not proof that it must be rewritten by the app-retirement date. ([Microsoft Graph To Do API](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0), [Microsoft Graph Planner API](https://learn.microsoft.com/en-us/graph/api/resources/planner-overview?view=graph-rest-1.0))
5. **Preservation obligations.** Name task data that must remain available for operational, legal, or records reasons. Microsoft says export guidance is still forthcoming and warns that an export will preserve supported data without migrating it into Planner or guaranteeing that another application can import it. ([Microsoft's transition guidance](https://support.microsoft.com/en-us/planner/to-do-to-planner))

Do not turn this inventory into an unbounded survey. Prioritize task sets whose failure would miss a deadline, break a shared handoff, or remove required evidence. Record unknowns explicitly so silence is not mistaken for zero use.

## How should the pilot work?

Pilot after the updated Planner experience reaches the test users, because Microsoft labels the current preview as subject to change. Choose users by dependency: a heavy reminder user, a shared-list owner, a mobile-only user, someone who needs offline access, an integration owner, and a user subject to retention requirements.

For each workflow, run a paired test: complete the real task pattern in the current To Do path, then attempt the intended replacement in Planner. Compare what was created, who could see and edit it, which reminders fired, what metadata survived, and what happened without network access. A screenshot of Planner's home page answers none of those questions.

Keep rollout state separate from user acceptance. The same discipline used for a [Microsoft 365 validation ring](/notes/targeted-release-retirement-validation-ring) applies here: vendor rollout, assigned access, successful launch, and successful workflow are different observations. The [Classic Outlook RDS guide](/notes/classic-outlook-november-change-rds-help-desks) is also a useful reminder to separate a user-interface change from the policy or workflow around it.

## What should count as acceptance evidence?

A Planner sign-in is not acceptance evidence. Acceptance is a dated record showing that each named critical workflow completed with the intended account, permissions, reminders, metadata, access path, and owner; any gap has a disposition and a retest date. The record should also say which user groups, entry points, and low-frequency workflows were not tested.

At minimum, require evidence for these claims:

- affected users can access the intended Planner experience with their assigned licenses;
- critical individual workflows can be recreated without losing a required behavior;
- shared workflows have an explicit replacement for membership, assignment, and permission behavior;
- integrations have an owner and are tested against their current API until Microsoft publishes the separate service timeline;
- preservation requirements have an approved method based on Microsoft's final export guidance, not an assumed import path.

The handoff should identify the source dates, pilot population, known gaps, and next Microsoft checkpoint. That lets another engineer distinguish a tested decision from a product announcement. It also follows the broader rule that [the work should outlast the agent session](/notes/work-outlasts-agent-session).

## When should the migration wait?

Do not finalize the data-preservation procedure before Microsoft publishes the export instructions and their limitations. Do not move a business-critical integration merely because the desktop app has an end date; Microsoft has explicitly placed service and API retirement on separate timelines. Do not assume the standard rollout applies to government environments, which Microsoft directs administrators to track through environment-specific communications.

The practical decision is to start the inventory now, pilot the updated Planner experience when it reaches representative users, and keep data preservation and API retirement as separately dated workstreams. June 30, 2027 is a real access deadline, but it is not evidence that every task, permission, reminder, integration, or retention requirement has a safe replacement.

*Primary Microsoft sources reviewed November 24, 2026. Rollout dates, licensing, export guidance, and service retirement timelines can change; verify current Microsoft documentation and tenant-specific Message Center notices before acting.*
