# AI Agent Control Plane v2.0 Release Checklist

Status: draft
Date: 2026-05-23
Purpose: publish gate for promoting the non-live v2 storefront draft into live public files

## 1. Artifact Truth

- [ ] The intended buyer artifact for v2.0 exists.
- [ ] The artifact has a versioned manifest.
- [ ] Checksums or equivalent release-integrity evidence exist.
- [ ] The package contents support the public v2.0 claims, including commercialization material beyond the CLI.

## 2. Fulfillment Mapping

- [ ] The fulfillment mapping resolves AI Agent Control Plane to the v2.0 artifact.
- [ ] The active delivery path is known: manual, automated, or hybrid.
- [ ] The storefront language matches the actual delivery path.
- [ ] A fulfillment drill has been completed against the current release candidate.

## 3. Public Copy Safety

- [ ] The live page does not expose private implementation history.
- [ ] The live page does not expose private repository structure, secrets, or customer data.
- [ ] Hermes is described as a supervised operating layer, not as an autonomous buyer-facing actor.
- [ ] Stripe, Telegram, GitHub, and other platforms are described accurately and non-affiliatively.
- [ ] Any version, pricing, or delivery claim matches validated release state.

## 4. Required Live Page Changes

- [ ] Replace the current v1-oriented `#inside` raw inventory emphasis with capability-grouped v2 copy.
- [ ] Keep a proof-oriented preview section that shows how release and review gates work.
- [ ] Keep the boundaries section explicit.
- [ ] Keep checkout and delivery language narrow and operationally true.

## 5. Validation

- [ ] Public validators pass on the exact proposed live files.
- [ ] Private readiness validation passes for the candidate release.
- [ ] A human reviewer confirms the public page says no more than the artifact and delivery path support.

## 6. Publish Decision

Only publish live when every item above is true. If any item is false, keep the live page on its current released version and continue using the draft files as preparation material only.
