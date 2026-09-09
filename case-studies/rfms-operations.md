---
layout: default
title: RFMS operations and infrastructure — practice note
permalink: /case-studies/rfms-operations
description: "Practice note: scoping RFMS infrastructure dependencies, vendor coordination, access, and workflow validation."
hero_eyebrow: Practice note
hero_title: RFMS operations and infrastructure
hero_lede: Make the application, infrastructure, and business responsibilities clear before a move.
---

This is a practice note, not a completed customer case study. It sets out discovery questions for an RFMS move or infrastructure change; it does not claim a performed engagement, customer outcome, vendor partnership, or endorsement.

## Separate the responsibilities

An application move needs more than an available destination. Agree what the application vendor will handle, what the infrastructure team must prepare, and what the business will validate.

| Responsibility | Questions to settle |
| --- | --- |
| Application and vendor work | Which migration or configuration tasks require RFMS involvement? Who confirms the supported plan and schedules that work? |
| Infrastructure | Who prepares the destination, connectivity, backups, access, and workstation dependencies? Which readiness checks are prerequisites? |
| Coordination | Who can authorize access and changes, connect the local technician with the vendor, and resolve a blocked dependency? |
| Business validation | Which workflows must be exercised, who knows their expected behavior, and who accepts the result? |

The RFMS migration outline describes scheduling, local-technician coordination, and vendor-service dependencies. Confirm the applicable requirements with the vendor before agreeing the change window. [RFMS migration outline](https://rfmsinc.zendesk.com/hc/en-us/articles/201982296-RFMS-Migration-Outline).

## Plan around the dependencies

Ask which integrations, shared paths, printers, user permissions, and workstation settings the actual environment depends on. Treat these as questions to inventory, not assumptions about every RFMS installation. Identify the owner and readiness evidence for each dependency; distinguish functional application configuration from infrastructure accountability.

Access should have a named approver, a defined purpose, and an agreed end to the work. Establish how the teams will coordinate without circulating credentials through discovery notes.

## Validate the workflow, then hand it over

- Which representative business tasks should be tested before the change and repeated afterward?
- Can the intended users reach the application and complete those tasks with the expected access?
- What records or outputs should the business compare, and who will review any differences?
- What would pause the move or trigger recovery, and who makes that decision?
- Who owns residual issues and support after the vendor's migration work ends?

The planning goal is a clear division of responsibility and an agreed validation checklist. Neither an application move nor ongoing support is promised by this note.

Working through an RFMS move or integration dependency? [Tell me what needs to keep working and where the project is stuck](/work-with-me#business-engagements). Business delivery is through Viyu Network Solutions.
