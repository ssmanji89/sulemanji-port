# Control Plane Operating Model

## Purpose

This control plane keeps productization work grounded in local evidence while preserving clean boundaries between personal AI tooling products and organization/client-specific work.

## Inputs

- Git history from local AI tooling repos.
- Public-safe repo READMEs and docs.
- Local memory summaries where they describe reusable patterns.
- Manual notes from current product strategy discussions.
- Market research on monetized AI tooling deliverables.

## Excluded Inputs

- Client names and ticket IDs.
- ConnectWise/CWA/CWM operational artifacts.
- Organization-owned templates, pricing, or internal process text.
- Credentials, tokens, private endpoints, private runtime paths.
- Third-party code that cannot be redistributed in a paid package.

## Weekly Review Loop

1. Pull recent local repo activity with git.
2. Add new productizable patterns to `product-candidates.yml`.
3. Re-score candidates if maturity, clarity, or IP safety changed.
4. Move one candidate into `build-next`.
5. Draft or revise the public landing page only after the local package outline is clear.
6. Create or update the Stripe product/payment link.
7. Record fulfillment instructions.
8. Run Jekyll validation before publishing any public page.

## Candidate Scoring

Use 1-5 scores:

- `evidence`: local repo/history proves the pattern is real.
- `buyer_clarity`: buyer can understand what they get in one sentence.
- `maturity`: deliverable can be produced without inventing a new system.
- `cleanup_effort`: higher score means less cleanup needed.
- `ip_safety`: higher score means lower legal/organization/license risk.

Promotion rule:

- `build-next` candidates should have total score at least 19 and `ip_safety` at least 4.
- Candidates with `ip_safety` below 3 stay local until sanitized.

## Publishing Workflow

1. Create package source outside public Jekyll routes.
2. Create a public landing page with public-safe summary only.
3. Add Stripe payment link.
4. Create a fulfillment checklist.
5. Run `python3 scripts/validate_command_center.py`.
6. Build Jekyll locally.
7. Publish only after the page passes source-safety checks.

## Public Copy Rules

- Use category-level descriptions.
- Say "field-tested patterns" only when the source pattern is local and real.
- Do not imply official affiliation with prior organization, OpenAI, Anthropic, Stripe, Cloudflare, GitHub, or third-party projects.
- Do not sell MSP execution services.
- Do not promise legal, financial, medical, or security compliance outcomes.
- Include "templates and documentation, not legal advice" where governance or policy docs are discussed.

## Fulfillment Model

Initial model:

- Stripe Payment Link.
- Manual email delivery or private download.
- Versioned zip file.
- Changelog.
- Refund/support policy.

Later model:

- Stripe webhook to Hermes.
- Hermes validates purchase metadata.
- Hermes sends product access and onboarding email.
- Hermes writes a local fulfillment checkpoint.

