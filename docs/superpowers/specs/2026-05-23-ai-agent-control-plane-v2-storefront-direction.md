# AI Agent Control Plane v2.0 Storefront Direction

Date: 2026-05-23
Repo: `/Users/sully/Documents/GitHub/sulemanji`
Worktree: `/Users/sully/Documents/GitHub/sulemanji/.worktrees/main-publish`
Status: promoted direction and release record

## Goal

Capture the public-safe v2.0 storefront direction for AI Agent Control Plane Option 1, the commercialization upgrade, and record the promotion criteria used before the live page claimed v2.0.

## Constraints

- Drafting was initially limited to `_control-plane/v2-drafts/**` and `docs/superpowers/specs/**`.
- Live promotion required coordinated updates to `products/*.md`, public metadata, fulfillment mapping, validators, and private product release artifacts.
- Keep all copy public-safe: no secrets, no customer data, no unsupported release claims, and no private implementation history.

## Evidence Base

The direction in this spec is grounded in:

- The prior live public page, which advertised version `1.2.0`.
- The current public metadata contract for AI Agent Control Plane.
- The product-page research note in `_control-plane/research/product-page-research.md`.
- The referenced private issue describing Option 1 as a commercialization upgrade and defining the release gate.

## Current Live Pattern

The existing page is strong in four ways:

- It names a specific buyer and operational pain.
- It is explicit about what is included.
- It is clear about what is not included.
- It keeps delivery and support boundaries narrow and understandable.

The main v2 weakness on the current live page is the `#inside` section. It reads as a mostly raw file inventory, which undersells the approved commercialization scope and does not make the operating layers legible enough for a public buyer.

## Recommended Direction

The public-safe v2 draft should preserve the live page's operational tone and boundary discipline, but change the contents narrative from "here are the files" to "here are the capability groups a buyer is purchasing."

Recommended structure:

1. Keep the hero focused on coordinated agent work plus human approval and commercialization readiness.
2. Keep the buyer fit narrow: technical solo builders and small technical teams already working in GitHub.
3. Rebuild `#inside` around six capability groups:
   - Control Plane Core
   - Human Gates
   - Hermes/Telegram Operating Layer
   - Commercialization Layer
   - Knowledge/Evidence Layer
   - CLI
4. Keep a proof-oriented preview that shows fields, readiness stages, or approval gates rather than abstract promises.
5. Keep the boundaries section blunt and specific.
6. Keep checkout and delivery language tied to the real fulfillment path, with no instant-download or v2-specific delivery claim unless validated.

## Publish Gate

The storefront draft could be promoted only after all of the following became true:

- A private v2.0 buyer artifact exists.
- The fulfillment mapping resolves this product to that artifact.
- The artifact actually contains the capabilities described by the public page.
- Public validators pass.
- Private readiness validation passes.
- The page language remains manual if no automated fulfillment drill has passed.

## Files Created

- `_control-plane/v2-drafts/ai-agent-control-plane-v2-storefront-draft.md`
- `_control-plane/v2-drafts/ai-agent-control-plane-v2-release-checklist.md`

These began as preparation artifacts and now serve as the promotion record for the live v2.0 page.

## What Must Be True Before Publishing Live

The live change was treated as a release operation, not just a copy refresh. If the versioned artifact, fulfillment resolution, or validation evidence regresses, the correct action is to stop promotion work and restore a version claim that matches the validated artifact.
