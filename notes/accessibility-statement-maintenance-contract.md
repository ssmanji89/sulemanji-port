---
writing_schema: 2
layout: writing-article
title: An accessibility statement is a maintenance contract, not a badge
description: Turn ACCESSIBILITY.md into a scoped promise with reporting, evidence, ownership, and review rules maintainers can keep.
permalink: /notes/accessibility-statement-maintenance-contract
published: true
published_on: "2026-11-10"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: durable
reader: architect
topics:
  - infrastructure
  - service-operations
---

An accessibility statement is a maintenance contract, not a badge. GitHub has made ACCESSIBILITY.md easier to discover, but discovery only helps when the file tells users what the project supports, what remains difficult, how to report a barrier, and who will keep that information current.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research and checked its factual core against the public GitHub and W3C sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, workflows, evaluation methods, or operating practices.

The practical question is: **what should an open-source maintainer promise in an accessibility statement?** My answer is a bounded service promise: identify the experience in scope, disclose known barriers and tested environments, offer a reporting route, explain what happens after a report, and name the evidence that supports any conformance language.

## What did GitHub change?

GitHub now recognizes `ACCESSIBILITY.md` as a community health file and displays it from a repository's `.github` directory, root, or `docs` directory. If a repository has no local file, it can inherit one from the organization's `.github` repository. Public repositories can also start from GitHub's Community Standards workflow.

That change improves placement, not substance. GitHub's [November 5 guidance](https://github.blog/open-source/maintainers/accessibility-statements-now-have-a-home-on-github/) says a useful statement can cover accessibility goals, supported environments, known limitations, contributor expectations, reporting, ownership, and maintenance. GitHub's [repository documentation](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-an-accessibility-page-to-your-repository) describes the discovery behavior and file locations.

The new surface matters because accessibility information is often scattered among issues, audits, contribution guidance, and conversations. A predictable file can shorten the path from encountering a barrier to finding a workaround or reporting it. It cannot make the underlying software accessible by itself.

The maintenance boundary is the heart of the file. A project should promise only the environments, response steps, evidence practices, and update cadence it can actually sustain; every unsupported promise turns discoverability into ambiguity.

## What does an accessibility statement prove?

An accessibility statement proves that a project has published the claims in that file. The strength of those claims depends on their scope, evidence, date, and accuracy.

The [W3C guidance for accessibility statements](https://www.w3.org/WAI/planning/statements/) draws a useful line: a statement should explain standards, contact options, known limitations, tested environments, and other practical information, but it is not itself a technical assessment or declaration of conformance. GitHub makes the same distinction between naming WCAG as a target and making a verified conformance claim.

Keep these statements separate:

| Wording in the file | What it can support | What it does not establish |
| --- | --- | --- |
| We target WCAG 2.2 Level AA. | The standard guides project decisions. | The current product conforms at that level. |
| We tested these tasks in these environments on this date. | The named evaluation covered that scope and time. | Every task, environment, or assistive technology works. |
| These barriers are known, with these workarounds. | Maintainers have documented specific limitations and alternatives. | The list is complete. |
| Reports receive this triage process. | The project has published a response path. | Every barrier will be fixed by a promised date. |

The difference is operational, not semantic. A target directs work. A test records an observation. A conformance claim needs an evaluation with an identified scope, method, date, and evaluator. Mixing those states makes the statement less useful to both users and contributors.

## What should maintainers put in the file?

Start with the person who encountered a barrier. The statement should help that person decide whether a workaround exists, whether the affected environment is in scope, and how to report the problem without having to decode standards language.

Use five sections:

1. **Scope and priorities.** Name the product surfaces, tasks, and versions covered. If the repository contains a library, command-line tool, documentation site, and examples, say which of them the statement addresses.
2. **Supported and tested environments.** Record the relevant operating systems, browsers, input methods, assistive technologies, and test dates. Separate supported environments from environments that happened to be tested once.
3. **Known barriers and workarounds.** Describe the affected task in plain language, link to tracked remediation when public, and provide an alternative path when one exists.
4. **Reporting and response.** Ask for the task, observed behavior, environment, and optional assistive-technology context. Do not require disability disclosure, screenshots, or recordings. Explain acknowledgement, triage, status, and follow-up without promising a deadline the project cannot keep.
5. **Ownership and evidence.** Name the role or team that maintains the file, link any relevant evaluation report, and state which event or review date will cause the statement to be updated.

GitHub CLI's public [`ACCESSIBILITY.md`](https://github.com/cli/cli/blob/trunk/.github/ACCESSIBILITY.md) shows why specificity matters. It documents settings, known barriers, workarounds, reporting information, supported environments, the scope of an accessibility conformance report, contributor expectations, and ownership. The useful pattern is not its length; it is the connection between a claim, a user action, and supporting evidence.

## How does the file become part of maintenance?

Treat the statement as a versioned interface between users, contributors, and maintainers. A file that is accurate on publication day can become misleading after a new user interface, support change, or ownership transfer.

Define update triggers in the file or its maintenance procedure:

- A release adds or materially changes an interaction named in scope.
- Testing finds a new barrier, confirms a fix, or changes a workaround.
- Supported environments or assistive-technology coverage changes.
- The reporting route, responsible owner, or triage process changes.
- A referenced evaluation expires or no longer matches the released product.

Each trigger should produce a small review: update the statement, connect the changed claim to current evidence, and check that linked reports and issues still resolve. Documentation without ownership becomes session residue; [the work should outlast the agent session](/notes/work-outlasts-agent-session).

Contributor guidance belongs in the same loop. If a pull request changes prompts, focus behavior, output structure, navigation, or another accessibility-sensitive interaction, the project can require evidence appropriate to that change. The evidence might include a keyboard-only pass, screen-reader observations, before-and-after output, or an automated scan. The requirement should name what was checked and what the result can support.

Automated checks remain bounded sensors. The [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) describes success criteria intended for testing with a combination of automated checks and human evaluation. A clean scan can show that the scanner found no supported violation in the tested artifact; it cannot prove that every user task is accessible.

## What review keeps the promise honest?

Review the file as a set of falsifiable claims rather than a policy page that receives ceremonial approval.

| Gate | Review question | Evidence to retain |
| --- | --- | --- |
| Scope | Can a reader tell which product, version, task, and environment each claim covers? | Release identifier and scoped statement text. |
| Currency | Do known barriers, workarounds, links, and owners still match the current release? | Review date and changed claims. |
| Reporting | Can a person report a barrier without disclosing a disability or supplying media? | Working accessible route and requested context. |
| Response | Does the published triage path match what maintainers can sustain? | Owner, states, and communication expectations. |
| Evidence | Does every target, test, or conformance statement use the right state? | Evaluation scope, method, date, and evaluator where applicable. |

The review should result in one of three honest states: current, current with named limitations, or stale and awaiting correction. Hiding a gap to keep the file polished defeats the reason the file exists.

## Where does this guidance stop?

WCAG is a web-content standard, so a command-line tool, native application, design asset, or hardware interface may need additional standards, platform guidance, and user research. GitHub CLI's statement, for example, says the terminal does not have an accessibility standard as complete as WCAG for the web and explains the other inputs used for its work.

Jurisdictions and contractual contexts can also impose specific accessibility-statement requirements. This analysis does not make a legal-compliance claim. Maintainers subject to a law, procurement rule, or contractual standard should verify the required content and evaluation method for that context.

An organization-level default can be useful for shared commitments and reporting routes, but inheritance can also hide product-specific limits. A repository should add local details when its supported environments, barriers, workarounds, evidence, or ownership differ from the default.

The durable value of ACCESSIBILITY.md is not that GitHub can display it. The value is that a person who hits a barrier can find an honest scope, a usable workaround or reporting route, and a maintainer accountable for what happens next.

*Public GitHub and W3C sources reviewed November 10, 2026, at approximately 8:33 a.m. America/Chicago. GitHub's display behavior, templates, and examples can change; recheck the linked documentation before relying on the current repository workflow.*
