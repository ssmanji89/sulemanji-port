---
writing_schema: 2
layout: writing-article
title: "Use a mobile driver's license for recovery, not routine login"
description: "Adopt mobile driver's licenses for identity proofing and recovery with issuer validation, minimal disclosure, freshness checks, and fallback."
permalink: /notes/mobile-drivers-license-recovery-not-routine-login
published: true
published_on: "2026-11-24"
publication_family: technical-guide
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - identity
  - service-operations
---

A mobile driver's license should enter an online identity journey at its hardest moments: enrollment, account recovery, and other low-frequency events where identity evidence matters. It should not become the default credential for every sign-in. That boundary captures the security value of issuer-signed data without turning a sensitive identity document into a routine authentication dependency.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this guide with agent-assisted research and checked its factual core against the public NIST and AAMVA sources linked below. It does not describe a Viyu implementation, customer environment, internal workflow, product, architecture, vendor choice, control, acceptance standard, or roadmap.

NIST now makes the boundary unusually clear: mobile driver's licenses can serve as strong digital identity evidence, but NIST does not recommend them for routine authentication. An architect should use the mDL to answer “who is this applicant, with what issuer-backed evidence?” and use a separate authenticator to answer “may this returning account holder sign in now?”

## What changed in NIST's November guidance?

NIST released a second public draft of its mobile driver's-license practice guide on November 19, 2026. The update separates general deployment guidance in SP 1800-42 from a financial-institution use case in SP 1800-42A. It also adds or expands material on same-device presentations, credential revocation, privacy, and the standards landscape. Comments are due December 20, so the document is current guidance under review, not a frozen implementation recipe. ([NIST's update](https://www.nist.gov/news-events/news/2026/11/updated-guidelines-accelerating-adoption-mobile-drivers-licenses-mdl))

The general guide matters beyond banking because it treats an mDL as one component in a larger identity system. The verifier performs the technical checks on the credential; the relying party uses that result in a business decision; an identity-management system may create an account, issue an authenticator, or recover access. Combining those roles behind one user interface does not erase their different evidence duties. ([NIST SP 1800-42 public draft](https://www.nccoe.nist.gov/sites/default/files/2026-11/nist-sp-1800-42-2pd.pdf))

NIST's reference work demonstrates three useful moments: presenting an mDL during online identity verification, presenting one to reestablish trust during a high-risk event, and issuing a phishing-resistant authenticator such as a passkey after identity has been established. The demonstration shows a possible sequence, not proof that one architecture fits every risk or regulatory setting. ([NIST project overview](https://www.nist.gov/news-events/news/2026/11/nist-project-aims-accelerate-mobile-drivers-license-adoption))

## Why isn't an mDL just a picture of an ID?

An mDL is a structured, issuer-signed bundle of attributes presented from a wallet. The verifier can check the issuer's signature and the integrity of the disclosed data, while device binding and holder activation help establish that the presentation comes from the enrolled device under the holder's control. A screenshot or photographed card provides none of that protocol evidence. ([NIST subscriber-controlled wallet guidance](https://pages.nist.gov/800-63-4-Implementation-Resources/scw/index.html), [NIST identity-proofing guidance](https://pages.nist.gov/800-63-4/sp800-63a/proofing/))

Cryptographic verification still answers only bounded questions. A valid signature can show that an accepted issuer signed particular attributes and that they were not altered. It does not decide whether the service requested too much data, whether the credential is fresh enough for this transaction, whether the presenter is authorized to take the requested action, or whether the relying party should open an account.

AAMVA's implementation guidance separates those responsibilities. It describes the verifier's need to trust the issuing authority's certificate, the holder's control over which requested fields to release, and the verifier's responsibility in an attended transaction to match the presenter to the portrait when that matching model is used. It also says the wallet should show what data was requested and whether the verifier intends to retain it. ([AAMVA mDL Implementation Guidelines](https://www.aamva.org/getmedia/bb4fee66-592d-4d39-813a-8fdfd910268a/MobileDLGuidelines1-5.pdf))

The distinction resembles a broader identity rule: evidence about an actor does not itself authorize a business action. [An AI agent identity is not an authorization decision](/notes/ai-agent-identity-authorization), and a driver's-license presentation is not an account, payment, benefit, or access decision. Each later decision needs its own scope, policy, and evidence.

## Why use it for recovery rather than routine login?

Use the mDL to establish or reestablish identity, then bind a separate authenticator for ordinary access. NIST's wallet guidance says mDLs are better suited to identity evidence, account recovery, and other low-frequency events than routine authentication. That separation reduces repeated disclosure of identity attributes and keeps daily sign-in from depending on a presentation ecosystem whose browser and protocol layers are still maturing. ([NIST subscriber-controlled wallet guidance](https://pages.nist.gov/800-63-4-Implementation-Resources/scw/index.html), [NIST SP 1800-42 public draft](https://www.nccoe.nist.gov/sites/default/files/2026-11/nist-sp-1800-42-2pd.pdf))

The recovery boundary should not become a shortcut around account security. A service still needs to decide what a successful identity presentation is allowed to recover, which existing factors or risk signals remain necessary, how it handles a stolen device, and how it alerts the account holder. The mDL can strengthen identity evidence without proving that every requested account mutation is safe.

This is the same separation required when a convincing call appears to establish an executive's presence: [presence is not payment authorization](/notes/executive-call-payment-authorization). In both cases, stronger identity evidence improves one part of the decision. It does not remove transaction-specific approval, fraud controls, or recovery safeguards.

Routine use also creates an avoidable concentration of data. If every login asks for a legal name, portrait, address, or date of birth, the service has converted selective disclosure into repeated collection. The better design asks for the smallest claim needed at the rare point where it is needed, then authenticates the resulting account without replaying the identity document.

## What must the verifier prove?

A verifier should produce five separate answers rather than one green “verified” flag.

1. **Issuer trust:** Which issuing authority signed the credential, which trust list or certificate chain established that authority, and when was that trust material last updated? Signature validation without a governed trust anchor is incomplete.
2. **Presentation integrity:** Did the wallet create a fresh, transaction-bound presentation through a supported protocol, and did holder activation occur close enough to release? Device possession alone is not the same as holder control.
3. **Credential status:** Was the credential within its technical validity period, how recently was it known to be valid, and what revocation information was available? NIST treats revocation, validity, and freshness as related but distinct signals.
4. **Data purpose:** Which attributes did the relying party request, why was each one necessary, what did the holder approve, and what will be retained? Selective disclosure only improves privacy when the verifier asks selectively and stores selectively.
5. **Business consequence:** What may the relying party do with this result? Identity proofing, account recovery, age confirmation, and high-risk transaction review are different decisions even when they consume the same credential format.

Status handling deserves special attention. NIST notes that an offline credential can remain presentable after an issuer has revoked it if the wallet has not synchronized. It therefore distinguishes the issuer's act of revocation from a verifier's validity check and from the age of the last known-good status. A service should set a freshness requirement from transaction risk rather than treating signature success as current status. ([NIST SP 1800-42 public draft](https://www.nccoe.nist.gov/sites/default/files/2026-11/nist-sp-1800-42-2pd.pdf))

The status design also has a privacy failure mode. NIST warns that contacting the issuer for every presentation could let the issuer observe where a holder uses the credential. Cached trust material and privacy-preserving status lists can reduce that linkage, but they introduce update schedules and stale-data decisions that the relying party must make visible. “Online check” is not automatically the most private or the most current design.

The result should remain an evidence record, not a universal trust score. Keep the credential facts, protocol facts, status facts, holder-verification facts, requested attributes, and business decision separate enough to explain and correct later.

## How should an organization pilot mDL verification?

Start with one low-frequency use case whose current evidence path is weak or burdensome, not with every login. Account enrollment or a tightly bounded recovery step is easier to reason about than replacing the primary authenticator across an entire service.

Build the pilot around a small test matrix:

- A valid credential from each supported issuer and wallet path.
- An expired, revoked, stale, or otherwise unacceptable credential state.
- A stolen-device or failed holder-activation path.
- A request that asks for unnecessary attributes and must be reduced or rejected.
- A user who lacks a supported wallet and needs a documented fallback without losing access.

Test same-device and cross-device presentations separately. A browser handoff on the same phone and a QR-mediated presentation from a phone to a desktop have different invocation, session-binding, interruption, and support behaviors. NIST's draft also notes that major platforms currently use more than one presentation protocol and that some browser-layer work remains in draft form. A successful lab flow does not establish cross-wallet interoperability. ([NIST SP 1800-42 public draft](https://www.nccoe.nist.gov/sites/default/files/2026-11/nist-sp-1800-42-2pd.pdf))

Record what the pilot actually proves: named wallet and issuer combinations, protocol and browser versions, trust-list age, status behavior, requested attributes, retention outcome, fallback result, and test date. Do not convert “worked once” into “supports mDL,” and do not convert NIST's example architecture into a compliance claim. SP 1800-42A explicitly says its regulatory mapping does not guarantee acceptance or compliance. ([NIST SP 1800-42A public draft](https://www.nccoe.nist.gov/sites/default/files/2026-11/nist-sp-1800-42a-2pd.pdf))

The practical adoption decision is therefore narrow: use mDL where issuer-backed identity evidence materially improves a rare, high-consequence step; collect only the attributes that step needs; verify trust, presentation, status, and holder control separately; preserve a non-wallet fallback; then issue or retain a distinct authenticator for routine access. That design gains the mDL's evidence value without making a driver's license the key to every ordinary session.

*Public NIST and AAMVA sources reviewed November 24, 2026, at approximately 11:15 p.m. America/Chicago. SP 1800-42 and SP 1800-42A were public drafts, and the wallet, browser, protocol, issuer, and status ecosystems can change. Recheck the linked primary sources and applicable legal requirements before a production decision.*
