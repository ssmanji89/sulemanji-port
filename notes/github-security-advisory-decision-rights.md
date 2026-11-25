---
writing_schema: 2
layout: writing-article
title: "Delegate GitHub security advisories by decision, not title"
description: "Map GitHub advisory permissions to lifecycle decisions, audit additive access, and test both allowed and denied paths."
permalink: /notes/github-security-advisory-decision-rights
published: true
published_on: "2026-11-25"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: it-leader
topics:
  - identity
  - service-operations
  - infrastructure
---

## The role name is not the control

Delegate repository security-advisory work by lifecycle decision, not by job title. GitHub's four generally available custom repository-role permissions make that separation possible, but the permission label alone does not prove that a person has only the intended authority. Effective access is additive, prerequisite permissions matter, and one sensitive remediation action still sits outside the new permission set.

An IT leader or open-source security lead needs a repository-level answer to a narrower question: “Who may make each disclosure decision for this repository, and which decisions must remain separate?”

I write from the perspective of a Sr. Services Engineer at Viyu Network Solutions. This guide uses only public GitHub sources; it does not describe Viyu implementation, customer environment, internal workflow, product, architecture, control, exposure, or roadmap.

GitHub announced four permissions on November 20, 2026: viewing repository security advisories, managing them, accepting or closing private vulnerability reports, and publishing advisories or requesting CVE identification numbers. GitHub says these permissions can be assigned to custom repository roles on selected repositories, rather than requiring broad repository administration. That is a meaningful reduction in the minimum authority needed for advisory work, not an automatic least-privilege design. The design still depends on how the organization divides decisions and verifies effective access. ([GitHub changelog](https://github.blog/changelog/2026-11-20-security-advisory-permissions-are-now-generally-available/))

## Which decision does each permission authorize?

Start with the advisory lifecycle, then attach a permission to each decision point. The following map keeps information access, case handling, disclosure approval, and code integration from collapsing into one “security” role.

| Lifecycle decision | GitHub permission or authority | What to decide before assignment |
| --- | --- | --- |
| Read an advisory and its discussion | View repository security advisories | Who needs confidential context without editing authority? |
| Edit the advisory and coordinate its content | Manage repository security advisories | Who may change the draft, participants, affected products, and remediation record? |
| Accept a private report into an advisory or close it | Accept or close private vulnerability reports | Who decides whether an inbound report enters the advisory workflow? |
| Publish an advisory or request a CVE | Publish repository security advisories and request CVEs | Who owns public disclosure and external identifier requests? |
| Merge changes from a temporary private fork | Repository administrator or security manager authority | Who may integrate remediation code into the repository? |

The first four rows come from GitHub's new custom-role model. The fifth is the important residual boundary: GitHub says merging changes from an advisory's temporary private fork still requires repository administrator or security manager authority. Do not infer that “manage advisories” includes remediation merge authority. ([GitHub changelog](https://github.blog/changelog/2026-11-20-security-advisory-permissions-are-now-generally-available/), [repository security-advisory permissions](https://docs.github.com/en/code-security/reference/permissions/repository-security-advisory))

Dependencies also matter. “Manage” includes the ability to view advisories. The accept-or-close and publish-or-request-CVE permissions each require either view or manage access. A role definition that lists a decision permission without its required advisory access is not a functioning control path. It is an incomplete configuration that should fail an allow-path test. ([About custom repository roles](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/about-custom-repository-roles))

One narrower collaboration path has a second dependency. GitHub documents that confidential commenting on a private vulnerability report requires Manage repository security advisories plus write access to the repository. A person who can edit advisory records but lacks repository write access should not be assumed able to participate in that comment channel. ([Managing vulnerability reports](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/fix-reported-vulnerabilities/manage-vulnerability-reports))

This produces a practical separation of duties:

1. A reader can inspect advisory context but cannot change it.
2. An advisory coordinator can maintain the draft without automatically accepting reports or publishing it.
3. An intake lead can accept or close private reports without automatically becoming disclosure authority.
4. A disclosure owner can publish or request a CVE without automatically receiving repository administration.
5. A remediation integrator retains the separate authority required to merge the temporary private fork.

That model is not mandatory. A small team may intentionally combine several decisions in one person. The control is the documented combination and its justification, not the number of role names.

## Why additive access can defeat a careful custom role

Custom repository roles do not subtract authority already granted elsewhere. GitHub describes repository access as additive: a user can receive permissions through multiple routes, and effective access is the sum of those grants. A narrowly named advisory role therefore cannot neutralize broader access inherited through a team, a base repository role, or another organization role. ([About custom repository roles](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/about-custom-repository-roles))

Review the person's effective access, not only the custom role assignment. For every assignee, record the repository, intended lifecycle decisions, custom role, other teams or roles that reach the repository, and the resulting effective authority. If someone already has administrator access, assigning a view-only advisory role does not make that person view-only.

Repository scope deserves the same care. The changelog says organizations can assign the permissions for specific repositories. Use that scope to avoid granting advisory authority across repositories merely because the same team owns or supports them. A decision owner for one repository is not automatically the right decision owner for another repository with a different maintainer group, release process, or disclosure risk. ([GitHub changelog](https://github.blog/changelog/2026-11-20-security-advisory-permissions-are-now-generally-available/))

A useful access-review record can be small:

| Field | Example of the question it answers |
| --- | --- |
| Repository | Where does this authority apply? |
| Lifecycle decision | View, manage, intake, disclosure, or remediation merge? |
| Required permission | Which GitHub permission enables the decision? |
| Prerequisite | Does the action also require view, manage, or repository write? |
| Other access paths | Does a team or broader role already grant more authority? |
| Evidence | Which allowed and denied actions were observed in the test? |

The record should describe a decision, not a person-shaped bundle such as “security lead access.” That makes later review possible when responsibilities, repositories, or GitHub's permission model change.

## How should the allow and deny paths be tested?

Test with representative accounts in a non-production repository before changing a live advisory workflow. An allowed action proves the intended work can proceed. A denied action proves that a neighboring decision did not arrive accidentally. Both are required because a role that enables the right action and three extra actions is still overbroad.

Use at least these cases:

| Test identity | Expected allowed action | Expected denied action |
| --- | --- | --- |
| Advisory reader | Open and read an advisory | Edit advisory content |
| Advisory coordinator | Edit the draft advisory | Accept or close a private report |
| Intake lead | Accept or close a private report | Publish the advisory or request a CVE |
| Disclosure owner | Reach the publish-ready state for an authorized draft; publish only during an approved real disclosure | Merge remediation changes from the temporary private fork without the separate required authority |
| Report collaborator | Post a confidential comment when both Manage and repository write are present | Post that comment after either dependency is removed |

Run a second dependency test for the intake and disclosure roles. Attempt to remove both View and Manage from a test role that carries the decision permission. Confirm whether GitHub rejects the update or removes the dependent permission, then verify with the saved role that the action is unavailable. Record the observed behavior instead of assuming that the administration screen prevented a broken combination.

Do not publish a fake advisory or request a CVE solely to test access. Publishing makes the current advisory public and removes its temporary private fork, so that action is not a harmless permission probe. Test reversible draft actions and every deny path in an authorized test repository. Bind the first successful publication check to an approved real disclosure, and treat the publisher allow path as unconfirmed until that event is read back. GitHub recommends identifying the fixed version before publication when practical. ([Publishing a repository security advisory](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/fix-reported-vulnerabilities/publish-repository-advisory))

Private vulnerability reporting adds an earlier state transition. GitHub says a new report begins in Triage, and accepting it creates a nonpublic draft security advisory. Closing the report rejects it without that acceptance transition. That makes accept-or-close authority a governance decision, not clerical inbox access. ([Managing vulnerability reports](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/fix-reported-vulnerabilities/manage-vulnerability-reports))

If a reporter marks a submission as AI-assisted, treat that marker as provenance for review routing, not proof of correctness, exploitability, or real-world use. The technical report still needs evidence-based validation. The same distinction applies in the opposite direction: absence of the marker does not prove that no AI system contributed to the report. ([Managing vulnerability reports](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/fix-reported-vulnerabilities/manage-vulnerability-reports))

## A five-step rollout for one repository

1. **Name the decisions.** List who may view, manage, accept or close, publish or request a CVE, and merge remediation changes.
2. **Build the minimum roles.** Add the required advisory permission and only its documented prerequisites for the selected repository.
3. **Review effective access.** Include teams, base roles, organization roles, and existing repository administration in the calculation.
4. **Prove both directions.** Capture successful allow cases and successful deny cases with representative test accounts.
5. **Recheck after change.** Repeat the affected tests when a role, team, repository assignment, or GitHub permission dependency changes.

The rollout should end with a decision-rights matrix and observed test evidence, not a screenshot of a role name. The matrix explains the intended governance. The tests show whether GitHub's effective access matches it.

Two related practices reinforce the same principle. A [GitHub Actions log-secret response](/notes/github-actions-log-secret-response/) needs explicit incident decisions rather than a generic alert role, and [GitHub's stateless tokens](/notes/github-stateless-tokens-two-runbooks/) need separate operational paths rather than one broad credential procedure. In each case, the useful boundary follows the decision being made.

GitHub's new permissions let organizations delegate advisory work without recreating administrator access for every participant. The durable design is to map each permission to a lifecycle decision, account for additive access and prerequisites, preserve the residual private-fork merge boundary, and prove that neighboring decisions remain denied.

*Public GitHub sources reviewed November 25, 2026. Availability, permission dependencies, and advisory behavior can change; recheck the linked documentation before changing a role or publishing an advisory.*
