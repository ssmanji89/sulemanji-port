---
writing_schema: 2
layout: writing-article
title: A GitHub Actions lockfile is not a trust decision
description: Use GitHub Actions lockfiles to make dependency changes reviewable without mistaking fixed code for safe code.
permalink: /notes/github-actions-lockfile-trust-decision
published: true
published_on: "2026-10-30"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - service-operations
---

GitHub Actions workflow lockfiles make action resolution deterministic and reviewable, but they do not decide whether an action deserves trust. An architect should use the lockfile as a boundary around dependency change, then keep separate controls for source review, workflow permissions, triggers, secrets, runner exposure, and every input the lockfile does not cover.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research, then checked it against the public GitHub and OpenSSF sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what should a team change now that GitHub Actions workflow lockfiles are generally available?** My answer is to make action-code changes explicit before expanding enforcement. Generate the lockfile, identify its coverage gaps, assign reviewers to its diffs, verify that it stays current, and only then block workflows that do not satisfy the policy.

## What changed on October 28?

GitHub made workflow dependency lockfiles generally available on October 28, 2026. The [GitHub changelog](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/) lists GitHub Enterprise Cloud, GitHub Enterprise Cloud with data residency, Team, and Free plans.

The lockfile lives at `.github/workflows/actions.lock`. GitHub's [workflow dependency lockfile documentation](https://docs.github.com/en/enterprise-cloud@latest/actions/concepts/security/workflow-dependency-lockfiles) says it records an exact commit for each covered action reference, including transitive action dependencies. It also records the numeric owner and repository identities that GitHub checks at run time.

This changes the review surface. A workflow can retain a readable reference such as a release tag while GitHub executes the exact commit recorded in the lockfile. A moved tag no longer changes covered action code silently. A dependency update produces a lockfile change that a reviewer can inspect before merge.

Dependabot can update the matching lockfile entry when it opens a version update for an onboarded action. GitHub also provides a stale-lockfile check and a Require lockfile policy. The feature and the enforcement policy do not have identical plan coverage: the current [enforcement guide](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles) lists GitHub Enterprise Cloud for organization-wide policy rollout.

The status sources are not fully synchronized. At review time, GitHub's setup guide still labeled lockfiles as a public preview, while the later October 28 changelog declared general availability. Use the dated release notice for current status and the technical documentation for behavior, then recheck both before a broad rollout.

## How is a lockfile different from a SHA pin?

A full commit SHA in a workflow fixes one direct reference. A lockfile moves the resolved commit into a generated inventory and extends coverage to actions used by other actions. That transitive coverage is the important improvement because a direct pin cannot describe code hidden one action deeper.

The lockfile also keeps source identity beside the resolved commit. A changed `commit` means the workflow will execute different action code. A changed `owner_id` or `repo_id` means the repository behind a familiar name has changed identity. GitHub's [locking guide](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies) tells reviewers to treat those identity changes as rare and investigate them before merge.

| Evidence | Supported conclusion | Conclusion it does not support |
| --- | --- | --- |
| Action reference resolves to the locked commit | The covered workflow runs the recorded action code. | The code is safe, maintained, or suitable for this workflow. |
| Transitive action appears in the lockfile | The nested action dependency is visible and fixed. | The action's network downloads or other runtime inputs are fixed. |
| `owner_id` and `repo_id` match | The repository identity matches the recorded source. | The repository owner remains uncompromised or made a sound release decision. |
| Dependabot changes the lockfile with a version update | The proposed dependency change is visible in one pull request. | The update has received security or behavior review. |
| Require lockfile permits the run | The targeted workflow satisfies the lockfile policy. | The trigger, token permissions, secrets, and runner are safe. |

Locking and trusting are separate decisions. Locking answers, “Which action code will run?” Trust review asks, “Should this code run with these inputs and privileges in this environment?” A stable answer to the first question makes the second easier to audit, but it cannot answer it.

## What remains outside the lockfile boundary?

GitHub states that the lockfile does not control input parameters, secrets, or the runner image. It also does not pin calls to reusable workflows through `jobs.JOB_ID.uses`; those calls still need a full commit SHA, while dependencies inside the reusable workflow belong to that workflow's repository lockfile.

Runtime behavior can reach beyond the recorded action repository. An action can invoke package managers, download tools, call remote services, or execute files already present on a runner. The lockfile fixes the covered action code that makes those requests. It does not automatically identify or freeze every resource that code can reach. This is an analysis of the documented boundary, not a claim that every action performs remote downloads.

Permissions remain independent. GitHub's [secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) recommends minimum `GITHUB_TOKEN` permissions, careful secret handling, review of third-party action code, and protection for workflow files. The [OpenSSF project security baseline](https://baseline.openssf.org/versions/2026-08-28) separately requires minimum necessary permissions for CI/CD jobs. A locked malicious action with a write token is predictably dangerous.

Triggers also remain independent. A workflow that checks out untrusted pull-request code in a privileged context can expose secrets or write access even when every action dependency is locked. Runner boundaries matter for the same reason. A deterministic action can still reach sensitive services from an over-connected runner.

The right model is layered:

1. **Dependency identity:** Lock direct and transitive action code.
2. **Dependency trust:** Review who maintains the action, what changed, and what the code does.
3. **Execution authority:** Limit events, actors, token permissions, secrets, and deployment approvals.
4. **Runtime boundary:** Restrict runner access, persistence, and network reach according to consequence.
5. **Output acceptance:** Verify the artifact or state change produced by the workflow instead of trusting a green run alone.

## How should a team adopt lockfiles?

Start with one consequential workflow and one owner. A small pilot exposes local actions, reusable workflows, policy interactions, and update behavior before an account-wide rule can stop unrelated work.

Use this sequence:

1. **Map the workflow.** List every `uses:` reference, reusable workflow, local action, runner type, secret boundary, and granted permission.
2. **Review current references.** Confirm that each action and reusable workflow points to an intended, supported source before preserving its current resolution.
3. **Generate the lockfile.** Use GitHub's `gh actions-lock` extension, then inspect the complete diff because the tool can also rewrite workflow references.
4. **Assign review.** Add the lockfile and workflow paths to `CODEOWNERS`, require approval, and give reviewers a specific identity-and-permission checklist.
5. **Verify before enforcement.** Check for staleness in pull requests, observe policy results in a pilot, and activate Require lockfile only after every targeted workflow is ready.

Do not treat generation as approval. A generator can accurately preserve the dependency state that exists today, including a dependency the team never evaluated. The first lockfile pull request therefore needs a deeper review than an ordinary update: source ownership, maintenance state, direct and transitive code, requested permissions, network behavior, and the consequence of compromise.

The rollout record should remain small and explicit:

| Field | Evidence to retain | Decision it supports |
| --- | --- | --- |
| Scope | Repository and onboarded workflow paths | Which runs the lockfile is expected to govern |
| Coverage | Direct actions, transitive actions, reusable workflows, and exclusions | Where separate pinning or review remains necessary |
| Initial resolution | Lockfile commit, owner IDs, repository IDs, and review date | Which action code received initial acceptance |
| Update path | Dependabot or manual regeneration with required reviewers | How future action-code changes enter review |
| Verification | Staleness check and representative workflow runs | Whether the lockfile stays synchronized and the workflow still functions |
| Enforcement | Policy target, evaluation result, activation time, and recovery owner | Whether the organization can block uncovered runs safely |

Review lockfile updates as executable changes. Compare the old and new commits, inspect upstream release notes and source differences, investigate repository-identity changes, and recheck the workflow's permissions. A small version label can conceal a large code change; a large label change can contain no change relevant to the workflow. The diff and consequence matter more than the label.

Keep the stale-lockfile check after policy activation. GitHub's enforcement guide makes a useful distinction: the policy blocks an invalid run, while a pull-request check tells the author about drift before merge. Prevention at execution time and feedback during authoring solve different problems.

## When is a lockfile not the next action?

A repository without third-party actions may have little action-code exposure to lock. A workflow that only calls a reusable workflow still needs the reusable-workflow reference pinned and the called repository governed. A team that cannot yet review dependency changes should establish ownership before it creates a generated file that nobody reads.

Incident response is another exception. If an action is suspected of compromise, do not preserve the current resolution and call the result controlled. Stop or constrain the affected workflow, identify the exact commits that ran, assess exposed credentials and outputs, and use current maintainer or platform guidance. A lockfile can show what should have run; execution records and incident evidence show what did run and what it reached.

The lockfile also cannot replace artifact verification. A workflow can run the intended action code and still build from an unexpected source, use a changed runner image, retrieve a mutable tool, or publish the wrong artifact. [A package version is not an artifact identity](/notes/package-version-artifact-identity) explains why a release decision should bind the output to exact bytes, publisher identity, build provenance, and observed behavior.

The durable result is not an `actions.lock` file by itself. It is a maintained review boundary with named coverage, visible changes, an owner, a verification path, and an enforcement rule that matches repository consequence. Lock what runs. Review whether it should run. Limit what it can do.

*Primary GitHub and OpenSSF sources reviewed October 30, 2026. GitHub can change feature availability, lockfile format, CLI behavior, and policy coverage. Recheck the current documentation before adoption or enforcement.*
