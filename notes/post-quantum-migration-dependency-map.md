---
writing_schema: 2
layout: writing-article
title: Post-quantum migration is a dependency map, not an algorithm swap
description: Turn NIST's post-quantum timeline into an owned dependency map, a risk order, and testable migration evidence.
permalink: /notes/post-quantum-migration-dependency-map
published: true
published_on: "2026-10-29"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: it-leader
topics:
  - infrastructure
  - identity
  - service-operations
---

NIST's final post-quantum transition roadmap puts dates around a problem that many organizations still describe as an algorithm upgrade. That framing is too small. An IT leader cannot schedule this transition from a list of RSA and elliptic-curve certificates. The useful starting point is a dependency map that connects each cryptographic use to the data or decision it protects, the product chain that implements it, the parties that can change it, and the evidence required to accept the change.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research, then checked it against the public NIST and U.S. Office of Management and Budget sources cited below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what should an IT leader demand before calling a post-quantum migration plan actionable?** My answer is an owned record of dependencies and decisions. The record must distinguish key establishment from digital signatures, rank uses by data lifetime and consequence, expose provider and hardware constraints, and define the evidence that will prove a replacement works.

## What did NIST's final roadmap change?

NIST published the final [IR 8547, *Transition to Post-Quantum Cryptography Standards*](https://csrc.nist.gov/pubs/ir/8547/final), on October 27, 2026. It identifies quantum-vulnerable public-key algorithms, points to the post-quantum standards intended to replace them, and describes a transition schedule. Under NIST standards and guidelines, quantum-vulnerable public-key cryptography is scheduled for deprecation after 2030 and disallowance after 2035.

Those general dates are not the complete schedule. The report says U.S. federal high-value assets, high-impact systems, and other prioritized sensitive systems face earlier dates: post-quantum key establishment by December 31, 2030, and post-quantum digital signatures by December 31, 2031. [OMB Memorandum M-26-15](https://www.whitehouse.gov/wp-content/uploads/2026/06/m-26-15-execution-of-the-migration-to-post-quantum-cryptography.pdf) gives the federal direction behind those dates and phases federal work from discovery through full migration.

Private organizations should not present those federal dates as if they were automatically their own legal deadlines. The roadmap still matters outside federal systems because it makes the direction of NIST's standards clear and because products, protocols, providers, and supply chains cross organizational boundaries. NIST describes the report as a resource for technology providers and organizations developing quantum-readiness roadmaps, while acknowledging that the details vary by organization.

The finalized standards already exist for the main functions. [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) specifies ML-KEM for key establishment. [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) specifies ML-DSA for digital signatures. [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) specifies SLH-DSA as another digital-signature standard. NIST says organizations can begin implementing these standards now. That does not mean every product, protocol, hardware component, or trust chain is ready for a direct replacement today.

## Why is an algorithm inventory not enough?

An algorithm name identifies a cryptographic primitive. It does not identify the service that depends on it, the data lifetime that sets urgency, or the party that can make the change. The same RSA label can appear in certificate-based authentication, code signing, document signatures, key transport, embedded firmware, or a provider-managed service. Those uses do not share one migration path.

NIST IR 8547 separates key establishment from digital signatures because the risk and transition mechanics differ. Encrypted traffic can face a "harvest now, decrypt later" threat: an adversary can retain ciphertext now and attempt decryption after a capable quantum computer exists. Digital signatures are not exposed to that same stored-ciphertext threat, but their transition can require coordination across signers, verifiers, trust stores, devices, software distribution systems, and public-key infrastructure.

The implementation chain also matters. NIST names protocols, cryptographic libraries, hardware modules, public-key infrastructure, applications, and services as parts of the transition. A software setting cannot add support that a protocol has not specified. A library update cannot replace fixed hardware. A new certificate cannot help when a verifier cannot process its signature. A provider statement cannot prove that an organization's dependent workflow remains interoperable.

This is why a certificate count can be useful discovery evidence but cannot be the migration plan. It sees one kind of object. The decision spans cryptographic use, application behavior, trust relationships, hardware lifetime, provider readiness, and operational acceptance.

## What should the dependency map contain?

The dependency map should be organized around a protected use, not around a scanner finding. Each row should support a decision about priority, ownership, change path, and proof.

| Field | Question it must answer | Why it changes the plan |
| --- | --- | --- |
| Protected use | Is this key establishment, authentication, code signing, document signing, or another function? | Different functions face different threats and transition paths. |
| Data or decision | What information, identity decision, software release, or device trust does it protect? | Consequence and required confidentiality lifetime set priority. |
| Dependency chain | Which protocol, application, library, certificate service, hardware component, and provider participate? | The slowest or least changeable dependency can control the schedule. |
| Change authority | Which internal owner, software vendor, cloud provider, certificate authority, or partner can change each layer? | A discovered use without a change owner is not schedulable work. |
| Readiness evidence | Which supported release, standard, validation, interoperability result, and performance test support the candidate path? | Marketing language and algorithm support do not prove end-to-end readiness. |
| Transition state | Is the use discovered, assessed, planned, tested, deployed, accepted, excepted, or retired? | A single percent-complete figure hides unlike states and unresolved risk. |

Do not store private keys, secret material, or sensitive configuration in this record. The map describes dependencies and ownership. It does not become a new repository of the assets it is meant to protect.

The map also needs time. Record when a use was observed, which product or service version supplied the evidence, when the provider statement was checked, and when the next decision expires. Post-quantum readiness is changing across standards and products. An undated "supported" field will become ambiguous before a multi-year migration ends.

NIST's [Migration to Post-Quantum Cryptography project](https://www.nccoe.nist.gov/applied-cryptography/migration-to-pqc) divides its work into cryptographic discovery and interoperability. That split is useful. Discovery answers where and how cryptography protects important data and systems. Interoperability work tests whether new implementations can operate together and exposes compatibility problems in a controlled environment. A sound dependency map must connect those two questions rather than treat discovery as completion.

## How should an IT leader set the order?

Priority should combine confidentiality lifetime, consequence, replacement lead time, and dependency uncertainty. A public-facing certificate that expires soon may be easy to see and easy to replace. A less visible use inside long-lived hardware, software signing, identity infrastructure, or a provider service can require years of coordination.

I would use this order:

1. **Protect long-lived sensitive data first.** Find key-establishment uses protecting data that must remain confidential well into the future. The harvest-now risk makes their time horizon different from short-lived data.
2. **Find hard replacement boundaries.** Identify devices, firmware, hardware modules, trust anchors, and applications whose cryptography cannot change through a routine update. Their procurement or retirement lead time can exceed the software work.
3. **Map shared trust dependencies.** Trace identity, certificate, code-signing, and partner trust paths where both sides must accept the new algorithm or credential form.
4. **Obtain provider commitments as evidence.** Ask for the product release, supported standard, validation state, configuration boundary, fallback behavior, and customer action. "Quantum-ready" alone is not an acceptance record.
5. **Use lower-risk systems to prove the method.** Test discovery, change control, interoperability, performance, rollback, and evidence capture before the highest-consequence migration.

This order is analysis, not a substitute for a sector rule or a formal risk assessment. A regulated system can have a controlling requirement that changes the sequence. An actively vulnerable implementation can also require action before a post-quantum work item with a longer horizon.

OMB's federal plan shows why ownership belongs beside technology. It requires defined governance, risk-based prioritization, supply-chain consideration, provider responsibility, and a dynamic migration plan. An organization outside that mandate can still use the same management lesson: a cryptographic transition fails when every dependency is visible but no one owns the decision.

## What can automation prove?

Automation can find and maintain evidence at a scale that manual review cannot sustain. It can inspect certificates, protocol handshakes, software dependencies, binaries, configuration, and other observable artifacts. OMB directs federal agencies to use automation where appropriate for a continuously updated view of cryptographic posture.

Automation cannot infer every business fact needed for priority. A scanner does not know how long a dataset must remain confidential unless that requirement exists somewhere it can use. It does not decide whether a provider promise transfers risk. It does not know who can approve a device replacement. It cannot turn a successful handshake into proof that a complete business workflow, recovery path, and partner connection remain acceptable.

Use automated findings as observations with scope and time. Link each finding to the protected use, owner, dependency chain, and decision record. Preserve unknowns as unknowns. A large discovery count can measure collection activity while saying little about migration readiness.

The same evidence discipline applies to software updates. My note on [artifact identity](/notes/package-version-artifact-identity) explains why a version label does not identify the tested bytes. My guide to [security patch acceptance](/notes/ai-security-patch-acceptance) separates installation from a testable outcome. Post-quantum changes need both ideas: identify the exact product or artifact, then test the behavior and trust path that the change is supposed to preserve.

## What should the first acceptance record prove?

The first pilot should make one narrow claim: a named pair of systems completed a defined cryptographic function with a specified post-quantum or approved hybrid method, under stated conditions, without losing required security or service behavior.

Record at least:

- the protected use and accountable owner;
- the two endpoints and every material intermediary;
- the exact product, firmware, library, certificate, protocol, and configuration versions;
- the algorithm or hybrid construction actually negotiated or verified;
- the security, interoperability, performance, failure, and recovery checks;
- the observation date, unresolved limits, approval, and next checkpoint.

Test negative paths too. Confirm what happens when one side lacks support, a certificate chain contains an unsupported signature, a message exceeds an old size assumption, negotiation falls back, or rollback restores a quantum-vulnerable path. NIST notes that post-quantum algorithms can have different key, signature, ciphertext, interface, and performance characteristics. A happy-path connection does not cover those boundaries.

Hybrid methods need the same caution. NIST permits hybrid approaches in some contexts and describes their value as a hedge when at least one component remains secure. It also warns that hybrids add implementation complexity, cost, and another later transition. Treat "hybrid" as a specific construction with a tested security and interoperability claim, not as a general synonym for safer.

## When does this framework not apply?

This framework does not replace current incident response or ordinary cryptographic hygiene. A known weak configuration, exposed key, broken certificate chain, unsupported product, or exploitable implementation needs its own present-tense response. A future quantum threat does not make today's defects wait.

It also does not say that every symmetric algorithm must be replaced. NIST IR 8547 says approved symmetric cryptography with sufficient classical security is less vulnerable to known quantum attacks and does not require the same general transition as quantum-vulnerable public-key cryptography. Classify the cryptographic function before assigning it a post-quantum migration task.

The federal timeline is not a universal procurement mandate. Organizations need their own legal, contractual, sector, data-retention, and risk analysis. The value of the NIST roadmap is that it ends the argument over whether the transition needs planning. It does not complete that planning for a particular organization.

## What should happen next?

Start with one business service whose data lifetime, owner, and external dependencies are known. Map its key establishment, authentication, signing, libraries, hardware, public-key infrastructure, and providers. Mark every unknown. Ask each change authority for dated evidence. Then select one bounded pilot and write its acceptance claim before changing anything.

The resulting map will show whether the next action is a configuration test, software release, provider question, contract change, hardware refresh, exception, or retirement. That is more useful than a raw list of algorithms because it converts cryptographic discovery into owned work.

NIST's dates create urgency, but dates do not create readiness. A dependency map does. It connects the standard to the system, the system to an owner, the owner to a change path, and the change path to evidence.

*Primary NIST and OMB sources reviewed October 29, 2026. Standards, federal requirements, validation status, and product support can change. Recheck the linked primary sources and applicable sector requirements before approving a migration plan.*
