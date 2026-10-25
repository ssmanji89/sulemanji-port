---
writing_schema: 2
layout: writing-article
title: A package version is not an artifact identity
description: Verify software by digest, source, build provenance, and behavior instead of trusting a package name and version alone.
permalink: /notes/package-version-artifact-identity
published: true
published_on: "2026-10-25"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: durable
reader: architect
topics:
  - infrastructure
  - service-operations
---

A package version is a useful locator, not a complete artifact identity. An architect should bind each accepted release to a digest, verify provenance against expected source and build identities, and test behavior separately from authenticity. Each check answers a different question, and none proves that the others passed.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research, then checked it against the public sources cited below. It does not describe Viyu systems, products, customers, controls, or operating practices.

The practical question is: **what should a team verify before it accepts a package or container from a trusted project?** My answer is an artifact acceptance record with four claims: these are the intended bytes, an expected identity published them, an expected build produced them from an expected source, and the result behaves within the team's risk limits.

## What did the LiteLLM incident make visible?

On October 21, 2026, the LiteLLM release pipeline published a compromised `litellm==1.107.0` package to PyPI and compromised images to its container registries. LiteLLM's [canonical root-cause analysis](https://litellm.vercel.app/blog/security-incident-oct-21-2026-attack-chain) says the attacker changed a release workflow to build from a lookalike fork. The normal pipeline then signed and published the resulting artifacts under the expected project and version.

The release looked ordinary at the coordinates many systems use: project name, registry, version, and official container tags. Those coordinates still resolved to malicious bytes. Microsoft later reported that the affected Python wheels installed startup files that could run when Python started, even when an application did not import LiteLLM. Its [technical analysis](https://www.microsoft.com/en-us/security/blog/2026/10/23/inside-the-litellm-1-107-0-supply-chain-compromise-credential-theft-through-python-startup-hooks/) shows why inspection cannot stop at the package's advertised function.

This is not an argument against pinning. A fixed version prevents an unrelated future release or a changed floating tag from entering automatically. It is an argument for stating the limit precisely: a version identifies a release in a registry namespace. It does not by itself prove which source produced the files, which build path ran, or whether the files are safe.

## Separate the four claims

An acceptance decision becomes easier to audit when it stops using “verified” as one broad status. Use four claims with separate evidence.

| Claim | Evidence | What it does not prove |
| --- | --- | --- |
| Artifact | Cryptographic digest for the downloaded package or image | The bytes are safe or came from the expected source |
| Publisher | Valid signature or registry publish attestation from an expected identity | The authorized identity or release process was uncompromised |
| Build | Verified provenance that names the expected source, commit, workflow, builder, and parameters | The source and dependencies are free of malicious behavior |
| Behavior | Review, scanning, tests, sandbox results, and runtime observations matched to the same digest | Who built or published the artifact |

The artifact claim comes first because later evidence must refer to exact bytes. Record a package hash or an image digest after retrieval. A mutable tag such as `latest` is a pointer, not an identity. A version label is more stable, but the acceptance record should still identify the bytes that were actually tested and deployed.

The publisher claim verifies an expected signing or publishing identity. Sigstore's [verification guidance](https://docs.sigstore.dev/cosign/verifying/verify/) requires a verifier to check the artifact, signature, certificate identity, and identity issuer together. That can show that a specific identity signed specific bytes. It cannot show that the identity made a sound decision or remained outside an attacker's control.

The build claim asks where and how the artifact was produced. The SLSA specification says provenance verification should confirm the artifact digest, signature, trusted builder identity, build type, and external parameters. Its [artifact verification guidance](https://slsa.dev/spec/v1.2/verifying-artifacts) also requires the consumer to define roots of trust and expected values. Provenance that is present but never compared with a policy is evidence left unread.

The behavior claim asks whether the accepted bytes are suitable to run. GitHub's [artifact attestation documentation](https://docs.github.com/en/enterprise-cloud@latest/actions/concepts/security/artifact-attestations) explicitly warns that an attestation is not a guarantee that an artifact is secure. npm makes the same distinction in its [provenance documentation](https://docs.npmjs.com/generating-provenance-statements/): provenance links a package to source and build instructions so a consumer can decide whether to trust it.

## Why can a valid signature still accompany a bad release?

A signature proves a relationship among bytes, a signing event, and an identity under a stated trust model. If an attacker controls an authorized publisher or changes the input to an authorized build, the release can be malicious and correctly signed.

The LiteLLM root-cause analysis provides a public example. The attacker obtained privileged access, redirected the release workflow to different source, passed the production gate with another compromised identity, and let the pipeline sign and publish the malicious release. Signature verification would establish that the official process signed those bytes. It would not establish that the process used the intended source.

This is why the policy must contain expected values before verification runs. “The attestation is valid” is weaker than “the attestation binds this digest to this repository, this source revision, this workflow identity, and these allowed parameters.” A valid statement outside those expectations should fail acceptance.

The same logic applies to a software bill of materials. An SBOM can identify declared components, while provenance can describe how an artifact was built. Neither replaces testing the artifact's behavior. NIST's [Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final) treats release-integrity information, provenance, code review, and testing as related practices, not interchangeable proofs.

## Use a small artifact acceptance record

The record can remain short if every field has one purpose.

1. **Coordinate:** Record the registry, package or image name, version or tag, retrieval time, and source of the request.
2. **Artifact:** Record the digest of the exact downloaded bytes. Use this digest for scanning, testing, approval, and deployment.
3. **Publisher:** Verify the signature or publish attestation against an expected identity and issuer. Record missing or failed verification as a separate status.
4. **Build:** Verify provenance against an allowlist for the source repository, revision pattern, workflow, builder, and relevant parameters.
5. **Behavior:** Review the change, scan the artifact, run focused tests, and observe it in a restricted environment when the consequence warrants it.

An organization does not need every possible control for every dependency. It does need a stated acceptance rule that matches consequence. A low-impact development tool can use a lighter review than a package that runs during interpreter startup or receives cloud credentials. The decision should change because exposure changes, not because a badge looks reassuring.

Store the accepted digest and evidence beside the dependency decision. Then verify that the deployed package or image has that same digest. My guide to [AI security patch acceptance](/notes/ai-security-patch-acceptance) uses the same separation between a reviewed change, a built artifact, and observed running state.

## What should happen during a live compromise?

Stop treating the package coordinate as the source of truth. Freeze automatic updates, preserve the resolved artifact identities, and compare them with the publisher's current incident notice. Do not assume that removing a package, repointing a tag, or publishing a clean version proves earlier hosts remained unaffected.

For the LiteLLM event, use the project's [incident notice](https://docs.litellm.ai/blog/security-incident-oct-21-2026) for affected artifacts and response guidance. The notice changed as the investigation progressed and now points readers to the later root-cause analysis as the canonical account. That history is a useful reminder to time-stamp the evidence behind an incident decision.

If a team ran a confirmed malicious artifact, package replacement is only one part of response. The team must assess the execution path, possible credential access, persistence, and downstream systems using current vendor guidance. My article on [emergency patching decisions](/notes/emergency-patching-service-decision) explains the separate choice among patching, isolation, and stopping a service when the evidence remains incomplete.

The durable rule is simple: trust exact artifacts through explicit claims. A digest identifies bytes. A signature identifies a signing relationship. Provenance describes a build. Tests and runtime evidence address behavior. A package becomes acceptable only when the claims required for its risk all refer to the same artifact.

*Primary sources reviewed October 25, 2026. Incident findings and package guidance can change. Recheck the publisher's current notice and verify the exact artifact before acting.*
