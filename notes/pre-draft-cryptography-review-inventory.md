---
writing_schema: 2
layout: writing-article
title: A pre-draft cryptography review is an inventory deadline
description: Use NIST's SP 800-108 review to inventory KDF dependencies, test compatibility, and submit evidence before the standard changes.
permalink: /notes/pre-draft-cryptography-review-inventory
published: true
published_on: "2026-11-06"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - identity
---

NIST’s pre-draft review of SP 800-108 is an inventory deadline, not an instruction to replace cryptography. An architect should use the comment period to identify affected key-derivation functions, preserve their exact construction and interoperability constraints, and send NIST concrete compatibility evidence before a draft design hardens.

I work as a Sr. Services Engineer at Viyu Network Solutions. This analysis uses agent-assisted research and the public NIST sources cited below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **what should an architecture team do while NIST is deciding how to revise SP 800-108?** My answer is to build a bounded key-derivation inventory and a transition evidence record. Do not change an implementation because a pre-draft notice exists. Do not wait for a final standard to discover which products, protocols, validation claims, and partners depend on the current constructions.

## What did NIST open for review?

NIST opened a [pre-draft call for comments on SP 800-108 Revision 2](https://csrc.nist.gov/pubs/sp/800/108/r2/iprd) on November 4, 2026. Comments are due December 18, 2026. The notice asks about security properties, construction changes, CMAC guidance, Double-Pipeline Iteration Mode, and compatibility or transition issues.

The notice describes two technical concerns. It cites distinguishability results for some permitted CMAC and HMAC feedback-mode choices. It also asks whether key-control security should be a general requirement or an application-dependent property. NIST is considering changes; it has not published a Revision 2 construction or a transition schedule.

[SP 800-108 Revision 1 remains the final publication](https://csrc.nist.gov/pubs/sp/800/108/r1/upd1/final), with updates through February 2, 2024. It specifies key-based derivation using HMAC, CMAC, or KMAC. For fixed-length pseudorandom-function outputs, it defines Counter, Feedback, and Double-Pipeline Iteration modes.

That status boundary controls the first decision. A pre-draft request identifies questions under review. It does not itself deprecate a construction, invalidate a module certificate, or authorize an untested cryptographic change.

## Which systems belong in the inventory?

Start with applicability, because “KDF” covers more than SP 800-108. This review concerns key-based derivation from a secret key using the constructions in SP 800-108. It is not a general notice about password hashing, every protocol-specific KDF, or every use of HKDF.

Search product documentation, cryptographic designs, source dependencies, module security policies, validation records, and interoperability specifications for an explicit SP 800-108 or KBKDF dependency. Treat a keyword hit as discovery evidence, not proof that a running system uses an affected construction.

For each confirmed use, record:

1. **Construction:** The SP 800-108 revision, pseudorandom function, iteration mode, counter use, initialization-vector rule, and output length.
2. **Input control:** The source and format of the label, context, length field, initialization vector, and any other selectable input.
3. **Protected use:** The purpose of each derived key and the security property the application expects from the derivation.
4. **Dependency chain:** The library, cryptographic module, application, protocol, hardware boundary, partner, and provider that must remain compatible.
5. **Evidence state:** The design reference, exact product or artifact version, validation status, test vector, interoperability result, owner, and observation date.

Do not copy secret keys, key-derivation keys, or sensitive production values into the inventory. The record should identify the construction and decision boundary without becoming a second store of cryptographic material.

## Why does configuration detail matter now?

The review questions turn on details that a generic “uses SP 800-108” field hides. NIST asks whether feedback-mode initialization vectors should be fixed, derived from context, combined with a mandatory counter, or constrained another way. It separately asks how input control should affect key-control requirements.

An inventory that omits the initialization-vector rule, counter choice, and input authority cannot answer those questions. A software bill of materials can name a cryptographic library while missing the application parameters that select a construction. A validation certificate can identify an approved capability while missing which option a product actually invokes.

NIST's [Cryptographic Algorithm Validation Program page for key-based KDFs](https://csrc.nist.gov/Projects/cryptographic-algorithm-validation-program/key-derivation) illustrates the option surface. It lists separate test vectors for Counter, Feedback, and Double-Pipeline modes, including feedback cases with and without a counter and with different initialization-vector conditions. NIST also states that test vectors do not replace CAVP validation.

The same separation should appear in the architecture record. Capability, validation, configuration, and observed interoperability are four different claims. Evidence for one claim does not silently prove the others.

## How should a team test without redesigning the KDF?

Test the current dependency boundary before proposing a replacement. The goal during a pre-draft period is to learn which constraints a later change must preserve, not to invent a private cryptographic construction.

Use a controlled test environment and answer five questions:

1. Can the implementation reproduce the applicable NIST test vectors for its claimed construction?
2. Do both sides derive the same keying material from the same non-secret test inputs?
3. Which parameter changes break interoperability, and which component owns each parameter?
4. Does an update, provider boundary, hardware module, or validation requirement prevent a local construction change?
5. Which negative tests detect a missing counter, changed initialization-vector rule, altered context encoding, or wrong output length?

Passing these tests does not resolve the cryptanalytic questions in NIST's notice. It establishes current behavior and transition constraints. Failing a test is evidence about the implementation or test setup; it is not proof that every use of the construction is insecure.

Keep production changes outside this discovery step. If an implementation already violates its documented design or applicable requirement, handle that as a separate present-tense defect. Do not label an undocumented redesign as remediation for a standard that NIST has not drafted.

## What evidence is useful to NIST?

NIST explicitly asks for implementation, interoperability, validation, deployment, usability, and transition considerations. A useful comment should therefore describe a reproducible constraint instead of voting for a preferred construction in the abstract.

A strong submission can state:

- the construction and option under discussion;
- the public specification or product boundary that depends on it;
- the compatibility result observed with non-secret test data;
- the validation or certification dependency;
- the consequence of removing or changing the option;
- a proposed requirement, transition method, or clarification;
- the evidence and limits behind the proposal.

Separate public evidence from confidential deployment detail. A team can submit a standards-relevant compatibility fact without naming a customer, revealing a topology, or publishing secret material. When the constraint cannot be disclosed safely, ask the appropriate legal, standards, or vendor representative to submit it through an approved channel.

The deadline matters because NIST is requesting compatibility evidence before it publishes a draft. NIST's [cryptographic standards development process](https://csrc.nist.gov/Projects/crypto-standards-development-process) describes public review as part of developing and vetting cryptographic guidance. In my view, waiting until a final transition notice turns early design evidence into late migration risk.

## What should happen after the comment period?

Keep the inventory alive, but do not treat every publication state as the same event. Track the pre-draft request, any initial public draft, comment resolution, final publication, validation-program changes, provider plans, and product releases separately.

Each state supports a different action:

| State | Defensible action |
| --- | --- |
| Pre-draft questions | Inventory dependencies, test current compatibility, and submit evidence. |
| Public draft | Compare proposed requirements with the inventory and test candidate vendor implementations. |
| Final publication | Approve a transition decision against the final text and applicable requirements. |
| Validated product support | Verify the exact module, version, configuration, and certificate scope. |
| Deployed change | Confirm the running construction and complete interoperability and recovery checks. |

This state model prevents two common errors. The first is premature migration based on a research signal. The second is delayed discovery that starts only after a final requirement arrives. Architecture work belongs between those errors.

My [post-quantum migration guide](/notes/post-quantum-migration-dependency-map) uses the same dependency-map discipline for a larger transition. My note on [artifact identity](/notes/package-version-artifact-identity) explains why an accepted version must remain bound to exact bytes and provenance. SP 800-108 review work needs both ideas: map the parties and protocols that constrain change, then bind every test and approval to the exact implementation evaluated.

## What should an architect do this week?

Open one bounded inventory task. Search for explicit SP 800-108 and KBKDF references. Confirm each hit against design, configuration, validation, and test evidence. Record unknowns instead of filling them with assumptions.

Then choose one dependency with an external interoperability or validation boundary. Reproduce its current behavior with non-secret test data. Ask its owner or provider how the November 2026 review could affect support. If the result exposes a general transition issue, prepare a public-safe comment before December 18.

The useful response to a pre-draft cryptography review is neither panic nor delay. It is an evidence record that shows where the standard applies, which choices the implementation makes, who can change them, and what must remain interoperable. That record gives researchers better input now and gives the architecture team a shorter, safer decision path later.

*Primary NIST sources reviewed November 5, 2026. The Revision 2 text, transition guidance, validation requirements, and product support can change. Recheck the linked NIST pages before submitting comments or approving implementation changes.*
