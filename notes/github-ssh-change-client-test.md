---
writing_schema: 2
layout: writing-article
title: GitHub's SSH change is a client test, not a key count
description: Test each real GitHub SSH caller before brownouts instead of rotating every RSA key based on its file label.
permalink: /notes/github-ssh-change-client-test
published: true
published_on: "2026-10-27"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: msp-engineer
topics:
  - infrastructure
  - service-operations
---

GitHub's coming SSH removals do not make every RSA key obsolete. They make some client negotiations fail. An MSP engineer should therefore test each real GitHub SSH caller with its actual client, library, configuration, key, and network path before the first brownout. A spreadsheet of public-key labels cannot prove that connection will work.

I work as a Sr. Services Engineer at Viyu Network Solutions. This guide uses agent-assisted research and cites the public GitHub, IETF, and OpenSSH sources used for verification. It does not describe Viyu systems, products, customers, controls, or operating practices.

The practical question is: **how can an MSP engineer find the GitHub SSH connections that will fail without replacing RSA keys that already work with SHA-2?** My answer is to make the caller the unit of review. Inventory every human and automated path, establish which algorithms it can negotiate, exercise the same path, and preserve the result as evidence.

## What changes on November 4?

GitHub plans a brownout on November 4, 2026 for two removals: the RSA-with-SHA-1 signature type named `ssh-rsa`, and the `diffie-hellman-group-exchange-sha256` key-exchange method. A second brownout is scheduled for December 9. GitHub plans final removal on January 13, 2027.

The naming creates an easy mistake. An RSA public key can appear in the `ssh-rsa` public-key format while the client signs with `rsa-sha2-256` or `rsa-sha2-512`. [RFC 8332](https://www.rfc-editor.org/info/rfc8332/) defines those SHA-2 signature algorithms and keeps the existing `ssh-rsa` public-key format. The RFC states that existing RSA keys can use the newer algorithms without re-encoding or changing their fingerprints.

GitHub makes the same distinction in its [SSH change notice](https://github.blog/changelog/2026-09-22-security-improvements-for-ssh/). Existing RSA keys do not require replacement only because their public-key line begins with `ssh-rsa`. The client or SSH library must support RSA with SHA-2 and negotiate it instead of the SHA-1 signature type.

A separate rule already applies to new uploads. Since October 14, GitHub requires newly uploaded RSA keys to contain at least 3,072 bits. That upload rule does not convert every existing RSA key into a connection failure. Treat key size, signature negotiation, and key exchange as three separate checks.

## Why does a key inventory miss the likely failures?

The public key describes key material. The connection result also depends on the calling software, its version, configuration, libraries, agent, and the algorithms offered by the service. Two jobs can use copies of the same RSA key and reach different outcomes because one uses a current OpenSSH client while the other uses an old embedded library.

OpenSSH provides a useful precedent. Its [8.8 release notes](https://www.openssh.org/releasenotes.html#8.8) disabled RSA signatures that use SHA-1 by default. The notes also explain that an RSA key can still sign with `rsa-sha2-256` or `rsa-sha2-512`; only the RSA-with-SHA-1 scheme was disabled. OpenSSH has supported the SHA-2 alternatives since version 7.2 and prefers them when both sides support them.

GitHub lists minimum versions that robustly support RSA with SHA-2 under default configurations. Its examples include OpenSSH 7.2p1, TeamCity 2021.2.3, Go SSH 0.16.0, libssh2 1.11.0, PuTTY 0.82, and version 0.1.66 of the JSch fork linked from the notice. These versions are useful triage evidence, not universal acceptance evidence. A product can bundle a different library, override defaults, use another key, or take another route in production.

The hidden inventory is therefore not “RSA keys.” It is every caller that performs Git operations through SSH:

- developer workstations and administrator shells;
- CI runners, build agents, and release jobs;
- scheduled scripts, deployment jobs, and configuration systems;
- applications that embed JSch, libssh2, Go SSH, or another SSH implementation;
- containers and appliances with pinned client packages or images.

Start with remote URLs and execution paths. GitHub says HTTPS remotes are outside this specific change. That fact can narrow the review, but it should come from the configuration used by the job, not from the protocol an engineer remembers using.

## How should you test each caller?

Test the real execution identity in the real runtime. A successful connection from an administrator's laptop says nothing about a build agent that uses a different image, library, configuration, and deploy key. Likewise, a package version in an inventory does not prove which binary or policy the job loaded.

Create one acceptance record per distinct caller. Keep it short enough to repeat:

| Field | Evidence to capture | Decision it supports |
| --- | --- | --- |
| Caller | Job, runtime, owner, and purpose | Whether the path still matters |
| Route | Actual Git remote and destination class | Whether this GitHub SSH change applies |
| Implementation | Client or library name, version, and effective configuration | Whether supported negotiation is plausible |
| Identity | Key type, fingerprint, source, and intended account or deploy-key use | Whether the test used the intended credential |
| Negotiation | Observed signature and key-exchange methods when the client exposes them | Whether a removed method remains in use |
| Result | Authentication and a representative read or write operation | Whether the required workflow succeeds |
| Follow-up | Owner, correction, retest date, and rollback path | Whether a failure becomes managed work |

For a human OpenSSH connection, GitHub documents `ssh -T git@github.com` as its authentication test. GitHub notes that a successful authentication test still exits with status 1 because it does not provide shell access, so automation must inspect the message and identity rather than treating that exit code alone as failure. Verify GitHub's host-key fingerprint before accepting a new host key.

Use verbose client output in a controlled test when it exposes the negotiated algorithms. Remove secrets before storing logs. Then run the representative Git operation the caller needs, such as a fetch against a non-sensitive test repository. Authentication success and workflow success answer different questions.

Run the test from the scheduled job's image or runtime, under its normal identity and configuration. Do not copy its private key to a workstation for convenience. That changes the caller and expands credential exposure. If production testing has unacceptable consequences, reproduce the same client, library, configuration, and key type in a controlled route, then state that the result is a proxy rather than production proof.

## What should you change after a failed test?

Change the smallest layer that removes the unsupported negotiation. A failure does not automatically require a new key.

1. **Confirm the failing method.** Separate authentication failure from host-key verification, network access, authorization, and repository permissions.
2. **Upgrade the client or embedded library.** Prefer a supported version that negotiates RSA with SHA-2 and a current key-exchange method by default.
3. **Retest the same caller.** Use the same job path, identity, remote, and representative operation.
4. **Rotate the key when the key is the problem.** Examples include a new RSA key below GitHub's upload minimum, an unsupported key type, unknown provenance, excess sharing, or a planned move to Ed25519.
5. **Record an exception with an expiry.** If an upgrade cannot finish before a brownout, name the owner, exposure, temporary control, and retirement date.

Avoid restoring `ssh-rsa` with a broad compatibility switch as the default fix. That can make a test pass by re-enabling the SHA-1 signature that GitHub is removing. It also hides which caller still needs correction. A temporary exception should be narrow, time-bounded, and followed by a test that proves the supported path.

Do not convert every SSH remote to HTTPS only to escape this deadline. HTTPS can be a valid design choice, but it changes credential handling and automation behavior. Make that as a separate access decision with its own test and rollback plan.

The evidence should follow the artifact that actually runs. My guide to [package and artifact identity](/notes/package-version-artifact-identity) explains why a version label alone is not enough. The handoff should also survive the person or agent that performed the review; [work should outlast the agent session](/notes/work-outlasts-agent-session).

## Where does this test stop?

A successful GitHub SSH test proves a bounded compatibility claim. It does not prove that the key has proper scope, that its storage is safe, that repository permissions are correct, or that the calling workload is trustworthy. Review those concerns separately.

The GitHub schedule also covers more than user authentication. The same brownouts remove `diffie-hellman-group-exchange-sha256`, and GitHub Enterprise Server receives the removals in version 3.25. Teams that operate GitHub Enterprise Server must bind their review to their actual server version and upgrade plan. GitHub also says users of the unauthenticated Git protocol on GitHub Enterprise Server can be affected.

The new `mlkem768x25519-sha256` post-quantum key exchange does not create a universal migration requirement. GitHub says compatible clients can prefer it, while older clients can fall back to another supported key-exchange method. Treat its use as a separate cryptographic-policy question, not as proof that RSA authentication will survive the removals.

The November brownout is valuable because it turns a future compatibility claim into an observable result. Use it as a deadline for caller-level evidence: which runtime connected, which methods it negotiated, which operation succeeded, and who owns the exceptions. That record predicts January better than a count of files named `id_rsa`.

*Primary sources reviewed October 27, 2026. GitHub can change dates, affected products, and compatibility guidance. Recheck the current notice before each brownout and before final removal.*
