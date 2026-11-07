---
writing_schema: 2
layout: writing-article
title: "Classic Outlook’s November change for RDS help desks"
description: "Prepare RDS users for Classic Outlook’s visual refresh and What’s New dialog. See what the suppression policy controls."
permalink: /notes/classic-outlook-november-change-rds-help-desks
published: true
published_on: "2026-11-06"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - microsoft-365
  - service-operations
---

Classic Outlook for Windows is scheduled for a visual refresh in November 2026. Microsoft expects the changes in Beta in early November and in Current Channel production in late November. The first updates are visual and aim to make Outlook more consistent across versions. ([Microsoft’s Classic Outlook update](https://learn.microsoft.com/en-us/microsoft-365-apps/outlook/user-interface/whats-new-classic-outlook-windows))

Microsoft’s November 3 update also restores the **What’s New** dialog. It can appear automatically at most once per month on Current Channel. Users can close it or reopen it from a ribbon button. ([LazyAdmin’s November 5 report](https://lazyadmin.nl/office-365/classic-outlook-turn-off-the-whats-new-dialog/))

This article summarizes public Microsoft documentation and LazyAdmin’s practitioner report about Message Center notice MC1506730. It does not confirm whether a specific tenant received or currently displays that notice.

## Why should RDS help desks plan for the dialog?

A monthly notice may help users understand why Outlook looks different. In a shared desktop environment, it may also interrupt a task or prompt support requests from users who did not expect a change. That support impact is an operational judgment, not a Microsoft claim.

For help desks, predictable communication can matter more than suppressing the dialog for everyone. Decide how users will learn about expected interface changes and where they should report unexpected ones. For a related guide to staged Microsoft 365 rollout validation, see [rebuilding the Targeted Release validation ring](/notes/targeted-release-retirement-validation-ring).

## What does the suppression policy control?

Microsoft documents this per-user registry value:

- Key: `HKEY_CURRENT_USER\Software\Policies\Microsoft\Office\16.0\Outlook`
- Value: `DontShowWhatsNew`
- Type: `REG_DWORD`
- Data: `1`

The value hides the What’s New dialog and its ribbon button. It does **not** stop the visual refresh. Because the setting is under `HKEY_CURRENT_USER`, validate it with the user profiles and policy method in your RDS environment before broad deployment. ([Microsoft’s configuration details](https://learn.microsoft.com/en-us/microsoft-365-apps/outlook/user-interface/whats-new-classic-outlook-windows))

For a separate example of checking assigned policy state, see [the Intune policy verification guide](/notes/intune-policy-verification). Its checks apply to Intune, not to Outlook’s registry policy.

## What should the help desk do next?

Treat the visual refresh and the dialog as separate changes. Pilot the suppression policy only if existing user communications make the dialog unnecessary. Otherwise, leave it available to explain the change.

Set a short support response before rollout: explain that icons or spacing may change, tell users which changes are expected, and identify where they can report unexpected behavior. This keeps communication consistent while the visual updates arrive.
