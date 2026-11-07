---
writing_schema: 2
layout: writing-article
title: "GitHub's stateless tokens need two runbooks"
description: Separate GitHub App token compatibility from credential response before the temporary format header retires on November 30.
permalink: /notes/github-stateless-tokens-two-runbooks
published: true
published_on: "2026-11-07"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - identity
  - infrastructure
---

GitHub's stateless installation tokens change the shape of a credential, not the decisions that grant or stop access. Platform architects need one runbook for format compatibility and a separate runbook for credential response. Combining them can produce an integration that accepts the new token while remaining unclear about how to contain a compromised key or installation.

I work as a Sr. Services Engineer at Viyu Network Solutions. This guide uses agent-assisted research. Its factual core was checked against the public GitHub sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what should a platform architect change after GitHub's stateless installation-token rollout?** My answer is to test every interface that carries the longer token, then rehearse credential response by incident layer. The new format creates a migration deadline. It does not merge token revocation, private-key rotation, and installation containment into one action.

## What changed, and what stayed the same?

GitHub [completed the staged rollout](https://github.blog/changelog/2026-10-02-stateless-github-app-installation-tokens-rolled-out/) on October 2, 2026. Newly minted GitHub App installation tokens now use the stateless `ghs_APPID_JWT` format by default. The tokens still begin with `ghs_`, but GitHub says they are about 520 characters long instead of 40.

The token format changed; its documented authorization contract did not. GitHub says repository scope, token permissions, the one-hour expiration, and the REST endpoint for creating an installation access token remain unchanged. A token created before the change remains valid until its normal expiration.

One temporary migration control remains. GitHub will deprecate the `X-GitHub-Stateless-S2S-Token` request header on November 30, 2026. After that date, GitHub says it will ignore the header and eligible apps will always receive stateless installation tokens. Teams that used the header must remove it after they validate both formats.

That creates two different questions:

| Question | Evidence needed |
| --- | --- |
| Can every component carry the new token? | An end-to-end test covers issuance, storage, transport, use, redaction, and expiration. |
| Can the team contain each credential incident? | A drill distinguishes an exposed installation token, an exposed private key, and a compromised installation. |

The first question is a compatibility migration. The second is an access-control and incident-response design. The rollout makes the first question urgent, but it does not answer the second.

## Why must a JWT-format token remain opaque?

The new token contains dots and uses a JWT-format shape. That does not make token claims a supported application interface. GitHub explicitly tells integrators to treat installation tokens as opaque strings.

The distinction protects the integration from an attractive shortcut. A library may successfully decode the token today, but local decoding can create assumptions about claims, encoding, signature validation, or future format stability that GitHub did not ask the application to own. The supported contract remains the token returned by GitHub, its documented scope, and the API response.

GitHub's [migration guidance](https://github.blog/changelog/2026-05-15-github-app-installation-tokens-per-request-override-header/) identifies the practical failure points. It calls out fixed-length checks, regular expressions, database columns, secret stores, environment variables, and token introspection. The completed-rollout notice adds proxies, gateways, middleware, `Authorization` header limits, and redaction rules.

Logging deserves the same priority as transport. A redaction rule that only recognizes the old 40-character value can turn a successful migration into a credential disclosure. A compatibility test should prove that the new token reaches GitHub intact and that no test output, error path, trace, or access log prints it.

## The first runbook tests the complete token path

A useful migration runbook follows the token from creation through disposal. Testing only the API client can miss the component that truncates a header, rejects a value, stores a partial secret, or fails to redact the new shape.

Use one bounded test installation and record five checkpoints:

1. **Issue:** Request an installation token through the production library or documented REST path. Record only the response status, expiration, requested scope, and test identifier.
2. **Carry:** Pass the token through every real boundary, including the secret store, job environment, proxy, gateway, and API client. Do not copy the token into the evidence record.
3. **Use:** Call one read-only endpoint that requires the intended repository access and permissions. Confirm that a deliberately out-of-scope call fails.
4. **Redact:** Search the bounded test logs and traces for the token value and its recognizable prefix. Confirm that error paths also hide the credential.
5. **Expire or revoke:** Stop reuse at the planned boundary. Verify that a revoked token cannot make another authenticated request.

GitHub's [installation authentication documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) says the creation response includes the token, expiration, permissions, and repository access when applicable. It also says an installation token expires after one hour. Those response fields can support the test record without exposing the credential itself.

Run both token-format paths before November 30 if the temporary header remains part of the integration. GitHub's current guidance allows `enabled` or `disabled` on the token-creation request to force a format during the transition. Remove the header after the test because it stops being a control when GitHub retires it.

The test passes only when the same application path can accept the new token and the evidence shows the intended scope, successful use, failed excess access, and complete redaction. An HTTP success from the token endpoint proves issuance. It does not prove that the whole path is ready.

## The second runbook separates credential incidents

An installation token, an app private key, and an app installation are related but different control layers. The response must match the layer that failed.

| Observed condition | Immediate public GitHub action | Verification question |
| --- | --- | --- |
| One installation token is exposed | Revoke that token with `DELETE /installation/token`, then create a replacement if service must continue. | Does the revoked token now fail, and does the replacement retain only the intended scope? |
| A GitHub App private key is exposed | Generate a new key, update the app to use it, verify the new path, and delete the old key. | Can the app issue and use a bounded token with the replacement key after the old key is removed? |
| An installation must stop accessing one account | Suspend or uninstall the app installation at that account. | Does access stop for the affected installation without an unsupported claim about other accounts? |

GitHub's [token-revocation endpoint](https://docs.github.com/en/rest/apps/installations?apiVersion=2026-03-10#revoke-an-installation-access-token) revokes the installation token used to call it. GitHub says the revoked token becomes invalid and other requests need a new token. The endpoint returns `204 No Content`, but the runbook should also verify the denied follow-up request rather than treating the status alone as containment proof.

Private-key response is different because the key can mint installation tokens. GitHub's [private-key documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) says app private keys do not expire automatically and must be removed manually. It permits multiple keys so a team can create and deploy a replacement before deleting the old key.

Account owners hold a separate containment option. GitHub's [installed-app guidance](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps#blocking-access) says an owner can suspend an installation to block access temporarily or uninstall it to block the app from that account. A runbook should name who owns that decision before an incident because app developers and account owners may be different teams.

Do not compress these actions into “rotate the token.” That phrase hides the affected credential, the authority needed to act, and the evidence required to close the incident. GitHub's own [security guidance for apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app#make-a-plan-for-handling-security-breaches) separates a private-key compromise from an access-token compromise for the same reason.

## What evidence closes the migration?

The migration needs a small acceptance record, not a screenshot of one successful API call. Keep the record free of token values and private material.

| Record field | Required evidence |
| --- | --- |
| Scope | App, test installation, interfaces checked, and environments excluded |
| Compatibility | New-format issuance plus end-to-end read-only use |
| Boundaries | Storage size, proxy/header handling, library behavior, and log redaction |
| Authorization | Intended repository and permission access plus one expected denial |
| Retirement | Temporary header removed before November 30 |
| Response | Named actions for token exposure, key exposure, and installation containment |
| Recovery | Owner, rollback condition, and proof required before service resumes |

Keep dependency trust separate as well. A credential can reach the intended repository while the code using it remains unsafe. [GitHub Actions lockfiles make code resolution reviewable](/notes/github-actions-lockfile-trust-decision), but they do not grant trust. Likewise, [webhook source ranges admit network traffic](/notes/github-webhook-ip-range-authentication), but they do not authenticate a payload. Each control should retain the claim it can actually prove.

The completed record should answer one simple question: can another operator identify the failed layer and take the documented action without seeing the secret? If the answer is no, the integration may be compatible with the new format but the operating design is incomplete.

## Where does this guidance stop?

This guide does not claim that decoding a token is always technically impossible. It says local decoding is outside the integration contract GitHub tells customers to use. Treating the token as opaque keeps the application dependent on documented behavior instead of inferred internals.

The guide also does not claim that one revocation drill proves every compromise is contained. A real incident may require log review, repository changes, permission reduction, installation suspension, secret replacement, or other actions based on observed access. The three-layer model starts triage; current evidence determines the full scope.

GitHub's May transition notice says the new format applies to GitHub Enterprise Cloud and data-residency environments, while GitHub Enterprise Server is not affected by that rollout. Verify the current product documentation before applying the November 30 date to a different GitHub environment.

The durable lesson is to resist letting a format name redesign the wrong runbook. Prove that every interface carries and hides the longer token. Then prove that the team can revoke a token, replace a private key, or stop an installation as three distinct events. Stateless issuance changes the migration test. It does not remove the need for precise credential response.

*Primary GitHub sources reviewed November 7, 2026, at approximately 9:01 a.m. America/Chicago. GitHub can change token formats, dates, API behavior, and product scope. Recheck the current changelog and documentation before migration or incident response.*
