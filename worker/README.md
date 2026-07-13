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
- `AGENT_RUNNER_TOKEN`
- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`

`GOOGLE_CALENDAR_ID`, `SITE_ORIGIN`, `TERMS_VERSION`,
`PRIORITY_DEPOSIT_CENTS`, `MANDATORY_REVIEW_CASE_LIMIT`, `AGENT_MODEL`,
`GMAIL_SENDER`, and `ADMIN_EMAIL` are non-secret Worker vars in
`wrangler.jsonc`. `GMAIL_HISTORY_START_ID` is also non-secret, but it should be
set only after the Gmail launch label is created and the starting mailbox
history id is known.

`GMAIL_HISTORY_START_ID` seeds the first Gmail polling cursor. After the first
successful poll, D1 stores the latest cursor in `automation_state`; until then,
readiness must keep live mode off so cron cannot fail on an uninitialized Gmail
history cursor.

`AGENT_EXECUTION_MODE=local_queue` delegates discovery decisions to a local
Codex runner authenticated with the machine's ChatGPT OAuth session. In this
mode, `OPENAI_API_KEY` is not required for Worker readiness, but
`AGENT_RUNNER_TOKEN` must be configured so Hermes or another local runner can
claim and complete queued jobs without a human Cloudflare Access assertion. If
the mode is changed back to `openai`, set `OPENAI_API_KEY` as a Worker secret
first.

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

- Remote D1 migrations `0001` through `0007` have been applied.
- The remote Worker script is deployed in setup mode. Cron triggers are present,
  but scheduled jobs no-op until `SERVICE_MODE=live` and required bindings are
  configured.
- Remote readiness reports `mode: setup`, `ready: false`, and only missing
  binding names.
- `GMAIL_SENDER` and `ADMIN_EMAIL` are configured as non-secret Worker vars.
- `TURNSTILE_SECRET` is configured from the existing Cloudflare Turnstile
  widget.
- `AGENT_RUNNER_TOKEN` is configured as a Worker secret and mirrored in macOS
  Keychain under service `sulemanji.work-with-me.agent-runner-token`, account
  `agent-runner`.
- These required bindings still need live configuration:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GMAIL_CLIENT_ID`,
  `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_CLINIC_LABEL`,
  `GMAIL_HISTORY_START_ID`, `GOOGLE_CALENDAR_CLIENT_ID`,
  `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`,
  `ACCESS_TEAM_DOMAIN`, and `ACCESS_AUD`.
- Existing Bitwarden inventory does not contain unambiguous live API/OAuth
  material for the remaining bindings. Stripe-looking entries are dashboard
  login-shaped rather than `sk_*` / `whsec_*` API material. The `ssmanji89 GMail
  API` item is not an OAuth credential bundle with client ID, client secret, and
  refresh token. No Google Calendar OAuth or Cloudflare Access audience item was
  found by metadata search. Local-queue mode avoids needing to pick an OpenAI
  key for launch agent execution.
- The currently available Cloudflare API token can deploy Workers and set Worker
  secrets, but it cannot read Zero Trust Access applications or organizations;
  Access API reads returned a permission error. Configure `ACCESS_TEAM_DOMAIN`
  and `ACCESS_AUD` after an Access application is created or a Cloudflare token
  with Zero Trust Access read scope is available.
- `api.sulemanji.com` is not currently resolvable. Public DNS for
  `sulemanji.com` is still on GoDaddy nameservers, and this Cloudflare account
  does not expose a `sulemanji.com` zone to the deployment token.
- Stripe webhook delivery, Gmail/Calendar OAuth, and Cloudflare Access admin
  protection still need live configuration and UAT.

Do not set `SERVICE_MODE=live` until the required secrets are set; otherwise
scheduled Gmail polling, retention, and digest jobs will run against an
incomplete runtime.

## Local Codex Agent Runner

The Worker can enqueue discovery decisions for a local runner instead of
calling OpenAI directly. This is the current launch direction because this Mac
already has Codex logged in with ChatGPT OAuth.

Run one queued job:

```bash
cd worker
AGENT_RUNNER_TOKEN="$(security find-generic-password -w -a agent-runner -s sulemanji.work-with-me.agent-runner-token)"
AI_WORKFLOW_API_BASE="https://sulemanji-work-with-me.ssmanji89.workers.dev" \
AGENT_RUNNER_TOKEN="$AGENT_RUNNER_TOKEN" \
npm run agent:run-local
unset AGENT_RUNNER_TOKEN
```

The runner:

- claims one pending `/v1/admin/agent/jobs/next` job;
- invokes `codex exec --ephemeral` with the local ChatGPT OAuth session;
- constrains output with `schemas/agent-decision.schema.json`; and
- submits the decision to `/v1/admin/agent/jobs/:id/complete`, which wakes the
  matching Cloudflare Workflow.

Do not store Access assertions, cookies, Codex tokens, customer message bodies,
runner tokens, or generated prompts in the repository. For recurring use, have
Hermes or launchd provide the API base and runner token from local secure state.
Cloudflare Access remains required for human admin review actions.

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
