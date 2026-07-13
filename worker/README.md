# Work With Me Worker Runbook

This Worker powers the portfolio-native AI Workflow Services intake, Priority
Discovery deposit, Gmail discovery workflow, reviewed blueprint approval, private
quote, paid scheduling, and retention jobs.

## Required Secrets

Set secrets from `worker/` with `wrangler secret put NAME`. Do not place values
in `.env.example`, shell history, docs, commits, or issue comments.

- `TURNSTILE_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_CLINIC_LABEL`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REFRESH_TOKEN`
- `OPENAI_API_KEY`
- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`

`GOOGLE_CALENDAR_ID`, `SITE_ORIGIN`, `TERMS_VERSION`,
`PRIORITY_DEPOSIT_CENTS`, `MANDATORY_REVIEW_CASE_LIMIT`, `AGENT_MODEL`,
`GMAIL_SENDER`, and `ADMIN_EMAIL` are non-secret Worker vars in
`wrangler.jsonc`.

## Deployment Commands

Run all checks before changing DNS, API routing, or Stripe mode:

```bash
npm run check
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
cd ..
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
```

The current public API base is the Worker `workers.dev` URL configured in
`_config.yml`. Switch that value to `https://api.sulemanji.com` only after DNS
is delegated or proxied to Cloudflare and the hostname reaches this Worker. Keep
CORS restricted to `https://www.sulemanji.com`.

## Current Remote State

As of 2026-07-13:

- Remote D1 migrations `0001` through `0006` have been applied.
- The remote Worker script is deployed in setup mode. Cron triggers are present,
  but scheduled jobs no-op until `SERVICE_MODE=live` and required bindings are
  configured.
- Remote readiness reports `mode: setup`, `ready: false`, and only missing
  binding names.
- `GMAIL_SENDER` and `ADMIN_EMAIL` are configured as non-secret Worker vars.
- `TURNSTILE_SECRET` is configured from the existing Cloudflare Turnstile
  widget.
- These required bindings still need live configuration:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GMAIL_CLIENT_ID`,
  `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_CLINIC_LABEL`,
  `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
  `GOOGLE_CALENDAR_REFRESH_TOKEN`, `OPENAI_API_KEY`, `ACCESS_TEAM_DOMAIN`, and
  `ACCESS_AUD`.
- Existing Bitwarden inventory did not contain unambiguous Stripe, Gmail,
  Google Calendar, or Cloudflare Access credentials for this service. It also
  contained multiple OpenAI key-shaped candidates, so `OPENAI_API_KEY` was not
  set without disambiguation.
- `api.sulemanji.com` is not currently resolvable. Public DNS for
  `sulemanji.com` is still on GoDaddy nameservers, and this Cloudflare account
  does not expose a `sulemanji.com` zone to the deployment token.
- Stripe webhook delivery, Gmail/Calendar OAuth, and Cloudflare Access admin
  protection still need live configuration and UAT.

Do not set `SERVICE_MODE=live` until the required secrets are set; otherwise
scheduled Gmail polling, retention, and digest jobs will run against an
incomplete runtime.

## Launch Gates

Keep live Stripe disabled until:

- Texas terms/tax review is recorded.
- Worker tests, Jekyll build, and public-content verifiers pass.
- Gmail and Google Calendar OAuth scopes are reviewed.
- Retention redaction and Gmail deletion are verified in test mode.
- A refund drill succeeds for invalid deposit and unavailable-slot cases.
- Cloudflare Access protects admin review actions for the approved admin email.

Keep launch-review mode active: checkpoints and blueprints require personal
review until ten paid cases complete review with zero unsafe auto-sends.

## Test-Mode UAT Evidence

Record only synthetic case IDs, Stripe test event IDs, Gmail thread IDs, and
Calendar event IDs. Do not record message bodies, customer data, secrets, or
tokens.

- Date:
- Intake case:
- Stripe deposit event:
- Gmail discovery thread:
- Held blueprint/admin approval:
- Private quote:
- Slot hold:
- Stripe balance event:
- Calendar event:
- Duplicate webhook replay:
- Retention dry run:
