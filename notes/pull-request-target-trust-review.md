---
writing_schema: 2
layout: writing-article
title: Do not allow pull_request_target before a trust review
description: Review each pull_request_target workflow before GitHub blocks the trigger, then allow only the narrow paths that need privileged access.
permalink: /notes/pull-request-target-trust-review
published: true
published_on: "2026-11-04"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - identity
  - service-operations
---

GitHub will block `pull_request_target` by default in affected public repositories on December 2, 2026. An architect should not answer that deadline with a broad allow rule. Use the warning period to prove which workflows need privileged pull-request access, remove the trigger where they do not, and allow only a reviewed workflow path with a bounded job.

I work as a Sr. Services Engineer at Viyu Network Solutions. This guide uses agent-assisted research and the public GitHub sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **when should a public repository allow `pull_request_target` after GitHub's default block takes effect?** My answer is only when the workflow needs base-repository authority, never executes contributor-controlled code or data as instructions, and has a written reason that survives review. A passing workflow is not evidence that this trust boundary is sound.

## What changes before December 2?

GitHub's [November 2 announcement](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/) says the platform will block `pull_request_target` by default in public repositories unless an applicable Actions event policy explicitly allows it. The default rule is currently in evaluate mode. GitHub scheduled two temporary enforcement periods for November 9 and November 16, from 16:00 to 18:00 UTC, before permanent enforcement starts on December 2.

The default applies to public repositories on GitHub Free, Team, and Enterprise Cloud. GitHub says private repositories, internal repositories, and GitHub Enterprise Server are outside this change. An existing applicable event policy also changes the result because the new default does not replace it.

Evaluate mode creates useful evidence. Policy Insights shows runs that the rule would block while those runs can still execute. During each brownout, affected attempts fail with an annotation and do not run. Treat those records as an inventory source, not as a complete security review: they show which observed runs met the rule, but they do not prove that an unobserved workflow is absent or safe.

This is a deadline for a trust review, not a request to restore old behavior. A repository can keep the default block, replace the trigger where possible, or create a policy that permits selected workflow files. The correct choice depends on what authority the job needs and what contributor-controlled material can reach it.

## Why is this trigger different?

`pull_request_target` runs trusted workflow code from the base repository with base-repository authority. GitHub's [security guide](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) says that authority can include a privileged `GITHUB_TOKEN` and repository or organization secrets. That makes the trigger useful for actions such as labeling or commenting on pull requests from forks, where an ordinary fork pull-request job receives less authority.

The dangerous step is not the event name by itself. The boundary fails when the privileged job retrieves contributor-controlled code and executes it. A checkout can place a fork's pull-request head in the working directory. A later build, test, package install, script, configuration loader, or dependency hook can then execute code selected by the contributor with the job's authority.

The same risk can bypass an obvious checkout step. GitHub lists `git fetch`, `gh pr checkout`, fork artifacts, and other downloaded inputs as paths that can bring untrusted material into a privileged job. Its guide also warns that `issue_comment` and `workflow_run` can create the same class of failure. Renaming the trigger does not repair the trust boundary.

Keep four questions separate:

| Question | Evidence | Decision |
| --- | --- | --- |
| Who can start the run? | Event and actor policy | Whether this identity may request execution |
| Which workflow definition runs? | Base branch and workflow path | Which reviewed instructions control the job |
| What material can influence execution? | Checkouts, artifacts, fields, files, dependencies, and commands | Whether contributor input remains data or becomes code |
| What can the job change or reveal? | Token permissions, secrets, environments, runner reach, and cache mode | The consequence if the boundary fails |

A narrow event allowlist answers only the first two questions. It does not inspect every command, remove secrets, or prove that pull-request content remains inert. Admission policy and workflow safety are different controls.

## Which workflows should keep pull_request_target?

Most test and build jobs should use `pull_request` when they do not need privileged access. GitHub recommends that event for running fork code because the fork path receives a read-only token, no repository secrets, and the platform's fork approval protections. Moving a job to `pull_request` is not only a syntax change; it deliberately places untrusted code in a lower-authority execution context.

A `pull_request_target` workflow can remain appropriate when it performs a narrow base-repository action without executing contributor-controlled material. Examples include applying labels, assigning reviewers, or posting a constrained comment. Even then, parse pull-request fields as untrusted data. A title, branch name, issue body, or file path can become a command-injection input if a workflow inserts it into a shell command.

Do not preserve the trigger because a test needs a private registry or deployment credential. That requirement combines two incompatible activities: evaluating untrusted code and holding privileged access. Split the work instead. Let an unprivileged job build or test the proposed change. Let a separate privileged job consume only a small, validated result needed for its action. Treat every artifact and text field from the first job as untrusted, because separation without validation only moves the input path.

The decision table should be strict:

| Workflow behavior | Default decision | Reason |
| --- | --- | --- |
| Builds or tests fork code without secrets | Use `pull_request` | The job needs untrusted code, not base authority |
| Labels, assigns, or comments without fetching fork material | Consider a narrow `pull_request_target` allow | The action may need write authority while input can stay data |
| Fetches a pull-request head and runs any project command | Do not allow | Contributor code and repository authority share one job |
| Downloads a fork artifact into a privileged job | Redesign before allowing | The artifact is an untrusted input even when another job created it |
| Uses a secret because a test dependency requires it | Separate the trust domains | A test requirement does not make untrusted execution safe |

GitHub hardened `actions/checkout` in 2026 to refuse common fork-checkout patterns in privileged pull-request workflows. The [release notice](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/) also states the limit: direct `git` or `gh` commands, unrelated repositories, and other privileged triggers remain outside that protection. A platform guard can stop a common mistake. It cannot prove the entire dataflow safe.

## How should a team use the warning period?

Start with observed policy results, then inspect the complete workflow inventory. Search every default and active branch for `pull_request_target`, `workflow_run`, and `issue_comment`. Include reusable workflows and local actions because the top-level file can hide the command that turns untrusted input into execution.

Use one review record per affected workflow:

1. **Name the privileged purpose.** State the exact write operation, secret, or base-repository capability that `pull_request` cannot provide.
2. **Trace every untrusted input.** Include checkouts, downloads, artifacts, event fields, filenames, caches, generated configuration, and network responses.
3. **Find every execution sink.** Include shells, interpreters, build tools, package managers, test runners, local actions, and programs that load repository configuration.
4. **Reduce authority.** Set minimum token permissions, remove unused secrets, prefer ephemeral isolated runners, and restrict network reach according to consequence.
5. **Choose the event policy.** Keep the default block, or allow only the reviewed workflow path. Record the owner, approval date, recovery path, and next review trigger.

Use the November brownouts as controlled failure tests. Confirm that an expected run fails for the expected policy reason. Then confirm that the repository still receives the pull-request checks it needs through the safer route. A failed brownout run proves enforcement reached that attempt; it does not prove the replacement workflow is correct.

GitHub's [workflow execution protections](https://github.blog/changelog/2026-06-18-control-who-and-what-triggers-github-actions-workflows/) support rules for events and actors, workflow targeting, and evaluate mode. Apply the narrowest rule that matches the reviewed need. An organization-wide allow for `pull_request_target` removes the useful pressure to prove each exception.

Retain the review beside the workflow change. At minimum, record the workflow path, privileged purpose, untrusted inputs, execution sinks, permissions, secrets, runner type, applicable policy, negative tests, and owner. [Work should outlast the agent session](/notes/work-outlasts-agent-session) explains why a durable decision needs its source, scope, verification, and next trigger.

## What should verification prove?

Verification should exercise the boundary, not only the happy path. Open a fork pull request that contains harmless canary values in every input the privileged job reads. Confirm those values remain data and never become a command, executable file, loaded configuration, trusted artifact, or privileged cache entry.

Run negative tests for the dangerous shapes. Try a pull-request title with shell metacharacters. Change a build script, package lifecycle hook, test configuration, or local action in the fork. Supply an unexpected artifact name and archive path. The privileged job should reject or ignore each input before an execution sink.

Read the effective permissions from the run, not only from the YAML. Repository defaults, organization policy, reusable workflows, and called actions can affect authority. Confirm which secrets are actually available and whether the runner can reach internal services. Configuration is the intended state; the run is evidence of the active state.

The review should also identify what GitHub's controls do not cover. The default event block governs `pull_request_target`, not every privileged event. The checkout protection rejects specified fork-ref patterns, not every untrusted repository or retrieval command. Read-only cache behavior reduces one persistence path, but it does not make secret-bearing execution safe.

Dependency controls remain separate. [A GitHub Actions lockfile is not a trust decision](/notes/github-actions-lockfile-trust-decision) explains why fixed action code does not validate a trigger, permission set, secret boundary, or runtime input. A fully locked workflow can still execute contributor code with a write token.

## When does this guidance not apply?

The December 2 default does not apply to private or internal repositories, but the trust question still applies wherever an untrusted person can influence a privileged run. Absence of the default rule is not evidence that a workflow is safe. Apply the same review when outside collaborators, compromised accounts, automated dependencies, or imported artifacts can cross the boundary.

A public repository with no `pull_request_target` use may need no workflow change. Confirm that Policy Insights and a complete branch search agree, retain that result, and leave the default block in place. Do not add a policy exception in anticipation of a future need.

A repository that accepts no fork contributions can have a smaller exposure, but same-repository branches are not automatically trusted. Write access, automation identities, and compromised contributor accounts can still start workflows or change inputs. Actor rules can reduce that surface; they do not replace least privilege and input review.

The safest result may be a broken convenience. A label, preview, or authenticated test can be redesigned, delayed for a maintainer, or removed if its value does not justify privileged processing of untrusted input. Availability matters, but restoring a job without restoring its trust boundary converts a visible failure into a hidden security decision.

Keep the default block unless a workflow earns an exception. The useful artifact is not an allow rule. It is a small proof that names the required authority, shows where untrusted input stops, limits the consequence of failure, and gives the next reviewer enough evidence to revoke the exception.

*Primary GitHub sources reviewed November 3, 2026. GitHub can change enforcement dates, plan coverage, policy behavior, and workflow protections. Recheck the current announcement and security guide before changing an Actions event policy.*
