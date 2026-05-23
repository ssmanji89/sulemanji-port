# AI Tooling Productization Control Plane

This folder is the local control plane for turning existing AI tooling work into public-safe, Stripe-sellable documentation and deliverable packs for `www.sulemanji.com`.

It is intentionally stored under `_control-plane/` and excluded in `_config.yml` so it does not become a public route during Jekyll builds.

## Current Artifacts

- `ai-tooling-productization-audit.md` - scored audit of productizable AI tooling patterns from local projects.
- `product-candidates.yml` - structured candidate register for future automation, site copy, and Stripe product setup.
- `operating-model.md` - how to keep the control plane current without leaking employer/client-specific details.
- `access-inventory.md` - sanitized access inventory for GitHub Pages, Stripe, Cloudflare, and Hermes boundaries.
- `launch/` - local launch checklists and promotion gates.
- `fulfillment/` - manual fulfillment logs and templates. Do not record payment card data or secrets.
- `public-page-drafts/` - unpublished page drafts that can later move into public Jekyll routes.
- `products/` - local product package sources and fulfillment checklists.
- `scripts/` - local automation helpers. Scripts must default to dry-run for external systems.

## Decision Rules

- Generalize patterns, do not sell employer/client-specific implementations.
- Prefer documentation, templates, checklists, clean-room examples, and setup guides over repackaging third-party code.
- Use GitHub Pages for public marketing and documentation.
- Use Stripe Payment Links or Checkout for sales.
- Keep fulfillment automation behind Stripe/Hermes; never put secrets in GitHub Pages.
- Score candidates by evidence, maturity, buyer clarity, cleanup effort, and IP risk before publishing.

## Product Status Labels

- `research` - promising, but needs more local evidence or market validation.
- `draftable` - enough evidence to write sales copy and a paid deliverable outline.
- `build-next` - first package candidate once site/store plumbing is ready.
- `hold` - good pattern, but blocked by license, employer overlap, or unclear ownership.
