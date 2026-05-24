# AI Tooling Productization Control Plane

This folder is the public-safe metadata control plane for turning existing AI tooling work into Stripe-sellable documentation and deliverable packs for `www.sulemanji.com`.

It is intentionally stored under `_control-plane/` and excluded in `_config.yml` so it does not become a public route during Jekyll builds. Because this repository is public, this directory must not contain buyer ZIPs, package source, fulfillment logs, Stripe result payloads, unpublished product drafts, or private implementation details.

## Current Artifacts

- `ai-tooling-productization-audit.md` - scored audit of productizable AI tooling patterns from local projects.
- `product-candidates.yml` - public-safe candidate register for site copy and Stripe/public metadata.
- `operating-model.md` - how to keep the control plane current without leaking organization/client-specific details.
- `access-inventory.md` - sanitized access inventory for GitHub Pages, Stripe, Cloudflare, and Hermes boundaries.
- `public-product-metadata/` - explicit public metadata contracts for live products.
- `scripts/` - public-safe rendering helpers. Scripts must not create buyer artifacts in this repository.

Private product artifacts now live in `ssmanji89/sulemanji-ip-products`.

## Decision Rules

- Generalize patterns, do not sell organization/client-specific implementations.
- Prefer documentation, templates, checklists, clean-room examples, and setup guides over repackaging third-party code.
- Use GitHub Pages for public marketing and documentation.
- Use Stripe Payment Links or Checkout for sales.
- Keep fulfillment automation behind Stripe/Hermes; never put secrets in GitHub Pages.
- Score candidates by evidence, maturity, buyer clarity, cleanup effort, and IP risk before publishing.

## Product Status Labels

- `research` - promising, but needs more local evidence or market validation.
- `draftable` - enough evidence to write sales copy and a paid deliverable outline.
- `build-next` - first package candidate once site/store plumbing is ready.
- `hold` - good pattern, but blocked by license, organization overlap, or unclear ownership.
