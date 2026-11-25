---
writing_schema: 2
layout: writing-article
title: "A GitHub notification reason is not a work queue"
description: "Separate GitHub attention signals from ownership and workflow state before the December notification migration changes filters and automations."
permalink: /notes/github-notification-reason-work-queue
published: true
published_on: "2026-11-24"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: service-leader
topics:
  - service-operations
---

GitHub will migrate notifications on GitHub.com over the week beginning December 1, 2026. The displayed notification reason will follow a fixed priority, email headers will carry all applicable reasons, routine activity will no longer undo a manual unsubscribe, and the Subscriptions page will narrow to threads subscribed to manually. GitHub says the rollout may behave differently for different users during that week and does not apply to GitHub Enterprise Server. ([GitHub's notification announcement](https://github.blog/changelog/2026-11-24-more-predictable-notifications-on-github-com/))

I work as a Sr. Services Engineer at Viyu Network Solutions. This article is analysis of public GitHub announcements and documentation. It does not describe a Viyu implementation, internal workflow, product, architecture, control, customer environment, or acceptance standard.

The change should prompt a small operating review, not a wholesale process rewrite. A notification reason explains why an update reached someone. It does not establish who owns the next action, what state the work is in, or what evidence would close it. Teams that keep those meanings separate can improve filters without turning a changing inbox label into a fragile work queue.

## What changes on December 1?

The migration changes several behaviors at once, so testing only the inbox label would miss the larger effect.

| Surface | Documented change | Operational question |
| --- | --- | --- |
| Manual unsubscribe | Commenting, reviewing, changing thread state, or merge-queue activity will no longer resubscribe someone who manually unsubscribed. A mention, assignment, or review request will still resubscribe that person. | Does a rule assume that participation always restores delivery? |
| Displayed reason | The inbox and email footer will show a priority-based reason rather than the reason tied to the most recent activity. For issues, assignment has the highest priority. | Does a saved filter, mailbox rule, or automation treat the displayed reason as the only reason? |
| Email headers | Notification email headers will include all applicable reasons. | Can the downstream rule handle several reasons without duplicating, dropping, or misrouting the item? |
| Team mentions | Future notifications will follow current team membership and whether the mention remains. | Does a handoff rely on a historical team mention after membership changes? |
| Subscriptions page | The page will list only threads subscribed to manually. Other notification sources belong in the notification inbox. | Is someone using the Subscriptions page as a complete workload inventory? |

GitHub documents the current inbox as a place to receive and triage updates from subscriptions. It supports `reason:` filters such as `reason:assign`, `reason:review-requested`, `reason:mention`, and `reason:team-mention`. Those labels remain useful; the migration makes their boundaries more explicit. ([About notifications](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications), [inbox filters](https://docs.github.com/en/subscriptions-and-notifications/reference/inbox-filters))

The risky shortcut is to convert “why I received this” into “what the organization expects me to do.” Those are different questions.

## Why isn't a notification a work assignment?

GitHub's own documentation separates these concepts. Notifications are updates about activity to which a person is subscribed. Assignees clarify who is working on an issue or pull request. A pull-request review request asks a person or team to perform a specific review and sends a notification as a consequence. ([About notifications](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications), [issue and pull-request assignees](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/assigning-issues-and-pull-requests-to-other-github-users), [requesting a pull-request review](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/requesting-a-pull-request-review))

That gives a service leader four distinct layers:

| Layer | GitHub signal | Question it should answer |
| --- | --- | --- |
| Attention | Notification, mention, email header, or inbox reason | Why did this reach me? |
| Ownership | Assignee or requested reviewer | Who owes the next action? |
| Workflow state | Issue status, pull-request state, or agreed team field | Where is the work now? |
| Acceptance | Review, check, test result, linked evidence, or other defined exit condition | What proves this step is complete? |

One event can touch several layers. Assigning an issue can notify the assignee, identify an owner, and update the issue's status. GitHub's November 23 public preview makes that coupling visible: assigning a user moves an issue to `Todo`, assigning an agent moves it to `In progress`, and linking a pull request can move the issue to `In progress` or `In review`. The same announcement also exposes issue status through repository boards, APIs, and automation. ([GitHub issue statuses and repository boards](https://github.blog/changelog/2026-11-23-issue-statuses-and-repository-boards-are-in-public-preview/))

Coupling does not make the fields interchangeable. A `Todo` status does not name the person who must act. An assignee does not prove the work started. A notification does not prove the recipient accepted the request. An approval does not prove a changed pull-request head received the same review.

That distinction follows the same evidence rule as [an Intune assignment not being proof of application](/notes/intune-policy-verification): metadata can state intent without proving the intended state occurred.

## How should each notification reason be treated?

A reason should begin triage, not finish it.

- **Assignment:** treat it as an explicit ownership signal, then open the item and confirm the current assignee, status, priority, and exit condition. The notification is a pointer to the record.
- **Review requested:** treat it as a bounded request for review. The pull request, requested reviewer, current changes, and repository rules define the work; the email does not.
- **Mention or team mention:** treat it as a request for attention. The recipient may need to answer, advise, or convert the discussion into an assigned task. A mention alone should not silently create durable ownership.
- **Comment, author, manual, state change, or subscribed:** treat it as context unless a documented team rule creates an action. Participation and awareness are not default assignments.

GitHub provides team review controls that reinforce the distinction. A team can use review auto-assignment to replace a broad team request with selected individual reviewers, and it can limit notifications when a specific team member is requested. Those controls reduce noise and clarify individual responsibility without pretending every team notification is a personal commitment. ([GitHub team code-review settings](https://docs.github.com/en/organizations/organizing-members-into-teams/managing-code-review-settings-for-your-team))

The policy should stay small enough to remember. If every reason has a bespoke response path, the notification taxonomy becomes another queue that requires its own maintenance.

## What should a team test before the rollout?

Start with the places where notification reasons leave GitHub: saved inbox filters, email rules, forwarding, bots, scripts, and any dashboard or ticket route derived from notification mail.

1. **Inventory reason-dependent rules.** Record the input, reason value, destination, owner, and expected behavior. Include rules that inspect the inbox label, footer text, `Cc` address, or other email headers.
2. **Create representative low-risk events.** In an authorized test repository, exercise assignment, direct mention, team mention, review request, manual subscription, comment, and manual unsubscribe. Use synthetic content and named test owners.
3. **Compare the complete signal.** During the rollout, capture the displayed reason and all applicable email reasons. Check whether a multi-reason event reaches the intended destination once, with enough context to find the source item.
4. **Read back ownership and state.** Confirm that the issue or pull request shows the intended assignee or reviewer and the expected workflow state. Do not infer those facts from delivery of the notification.
5. **Test the quiet path.** Verify that routine activity does not restore a manual subscription, while a new mention, assignment, or review request does. A filter test is incomplete if it checks only messages that should arrive.

Keep the test record outside the inbox. GitHub says unsaved notifications are retained for three months, while Saved notifications remain indefinitely. That retention model is useful for personal triage, but it is a weak foundation for an operational backlog. ([About notifications](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications))

A durable item belongs on the issue, pull request, or agreed system of record with its owner, state, and closing evidence. That is how [the work outlasts the agent session](/notes/work-outlasts-agent-session), the mailbox rule, and the person who first noticed it.

## What counts as acceptance evidence?

The acceptance record should prove both routing and meaning.

| Check | Evidence to retain |
| --- | --- |
| Reason parsing | The synthetic event, displayed reason, complete email reasons, rule version, and observed destination |
| Delivery behavior | Expected delivery or non-delivery after unsubscribe, mention, assignment, and review request |
| Ownership | Current assignee or requested reviewer read from the issue or pull request |
| Workflow state | Current issue or pull-request state, including whether a preview automation changed it |
| Failure handling | Named owner and fallback when a rule drops, duplicates, or misroutes a notification |

Run the check from the actual path that processes the message. A rule copied into a document is configuration evidence; a representative event observed at its destination is behavior evidence. Neither proves every future notification, so the record should state the tested event types and date.

The rollout itself creates a temporary comparison problem. GitHub says different users may see different behavior while migration proceeds over the week. A mismatch between two users during that window is a reason to identify their rollout state and repeat the same bounded test, not proof that one account is configured incorrectly.

## When should nothing change?

A small team with no reason-based automation may need only to understand the new behavior and review personal filters. GitHub explicitly says no action is required. Process weight should follow actual dependency, not the size of the changelog.

GitHub Enterprise Server is outside this announced migration. Do not apply the December GitHub.com schedule to it. Separately, issue statuses and repository boards are in public preview, so a team considering them as a durable workflow surface should verify current availability and behavior before making them authoritative.

Notifications also stop at the collaboration boundary. They are not a substitute for an incident page, an on-call route, a service commitment, or another channel that requires delivery and acknowledgment evidence. The right design is usually simple: notifications attract attention, explicit fields assign work and show state, and acceptance evidence closes the decision.

*Public GitHub sources reviewed November 24, 2026, at approximately 7:50 p.m. America/Chicago. The GitHub.com rollout, preview features, documentation, and notification behavior can change; recheck the linked sources and repeat representative tests before changing production rules.*
