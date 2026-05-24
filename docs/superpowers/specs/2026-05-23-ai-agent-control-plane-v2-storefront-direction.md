# AI Agent Control Plane v2.0 Storefront Direction

Date: 2026-05-23
Repo: `/Users/sully/Documents/GitHub/sulemanji`
Worktree: `/Users/sully/Documents/GitHub/sulemanji/.worktrees/main-publish`
Status: draft direction only

## Goal

Prepare a public-safe v2.0 storefront direction for AI Agent Control Plane Option 1, the commercialization upgrade, without changing the live page to claim v2.0 before release evidence exists.

## Constraints

- Only edit `_control-plane/v2-drafts/**` and `docs/superpowers/specs/**`.
- Do not modify live `products/*.md`, public metadata, fulfillment mappings, scripts, or private product sources.
- Keep all copy public-safe: no secrets, no customer data, no unsupported release claims, and no private implementation history.

## Evidence Base

The direction in this spec is grounded in:

- The current live public page, which still advertises version `1.2.0`.
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

The storefront draft must remain non-live until all of the following are true:

- A private v2.0 buyer artifact exists.
- The fulfillment mapping resolves this product to that artifact.
- The artifact actually contains the capabilities described by the public page.
- Public validators pass.
- Private readiness validation passes.
- A fulfillment drill proves that checkout and delivery language match reality.

## Files Created

- `_control-plane/v2-drafts/ai-agent-control-plane-v2-storefront-draft.md`
- `_control-plane/v2-drafts/ai-agent-control-plane-v2-release-checklist.md`

These are preparation artifacts only. They are intended to make the eventual live-page update low-risk once release evidence exists.

## What Must Be True Before Publishing Live

The future live change should be treated as a release operation, not just a copy refresh. If the versioned artifact, fulfillment resolution, or validation evidence is missing, the correct action is to leave the live page on v1.2.0 and keep refining the draft privately.
