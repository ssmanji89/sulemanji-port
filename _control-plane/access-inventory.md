# Access Inventory

Generated: 2026-05-23

This inventory records access surfaces needed to operationalize AI tooling products from the local `www.sulemanji.com` control plane. It records key presence only. Do not paste secret values into this file.

## Site Worktree

Path: `/Users/sully/Documents/GitHub/sulemanji/.worktrees/command-center-portfolio`

Relevant env file:

- `.env.example`

Keys present:

- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN`
- `OPENAI_API_KEY`

Missing for product sales automation:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `STRIPE_PAYMENT_LINK`
- `CLOUDFLARE_API_TOKEN`

Current interpretation: the public site repo has examples for AI/content automation and GitHub automation, but not Stripe or Cloudflare product plumbing.

## Hermes Runtime Surfaces

Relevant env files checked:

- `/Users/sully/.hermes-agent-docker/.env`
- `/Users/sully/.hermes-agent-docker/home/.env`
- `/Users/sully/.hermes-docker/.env`
- `/Users/sully/.hermes-docker/home/.env`

Keys present by surface:

- `/Users/sully/.hermes-agent-docker/.env`
  - `HERMES_HOST_TOOL_BRIDGE_TOKEN`
  - `HERMES_HOST_TOOL_BRIDGE_URL`
  - `HERMES_MEM0_BACKEND`
  - `OPENAI_API_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
- `/Users/sully/.hermes-agent-docker/home/.env`
  - `CLOUDFLARE_API_TOKEN`
- `/Users/sully/.hermes-docker/.env`
  - `ANTHROPIC_API_KEY`
  - `GITHUB_TOKEN`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `VIYU_TEAMS_WEBHOOK_URL`

Current interpretation: Stripe access appears available in Hermes env surfaces, and Cloudflare access appears available in the Hermes home env. The product control plane should not copy these values into the public site repo. Use them from Hermes or an operator shell during Stripe setup.

Non-secret mode check:

- `/Users/sully/.hermes-agent-docker/.env` has a live-mode Stripe secret key.
- `/Users/sully/.hermes-docker/.env` has a live-mode Stripe secret key.

Operational implication: creating Stripe objects from this control plane mutates a live Stripe account and requires explicit operator approval.

## Operational Boundary

- GitHub Pages can host public landing pages, public-safe docs, and product previews.
- Stripe should own checkout, payment links, receipts, and paid access state.
- Hermes can later handle webhook validation and fulfillment, but the initial launch can use manual fulfillment.
- `_control-plane/` remains local and excluded from Jekyll output.

## Next Access Actions

1. Create Stripe product and price for `mcp-operator-field-manual`.
2. Store only the Stripe product id, price id, and payment link in the control plane.
3. Keep Stripe secret and webhook secrets in Hermes env only.
4. Add a public landing page only after source package, refund policy, and fulfillment checklist are ready.
5. If Cloudflare Pages is used later, add project id and deploy hook metadata without recording token values.
