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

The current public API base is `https://api.sulemanji.com`, configured in
`_config.yml` and attached to the Worker as a Cloudflare custom domain. Keep
CORS restricted to `https://www.sulemanji.com`.

## Current Remote State

As of 2026-07-13:

- Remote D1 migrations `0001` through `0007` have been applied.
- The remote Worker script is deployed in live mode. Cron triggers are present,
  and scheduled jobs run only while readiness remains true.
- Remote readiness reports `mode: live`, `ready: true`, and no missing binding
  names.
- `GMAIL_SENDER` and `ADMIN_EMAIL` are configured as non-secret Worker vars.
- `TURNSTILE_SECRET` is configured from the existing Cloudflare Turnstile
  widget.
- `AGENT_RUNNER_TOKEN` is configured as a Worker secret and mirrored in macOS
  Keychain under service `sulemanji.work-with-me.agent-runner-token`, account
  `agent-runner`.
- Google OAuth, the Gmail launch label, and the Gmail history seed are
  configured as Worker secrets from the local Google Workspace OAuth grant for
  `ssmanji89@gmail.com`.
- Cloudflare Access is enabled for the Worker admin path, and
  `ACCESS_TEAM_DOMAIN` plus `ACCESS_AUD` are configured as Worker secrets.
- Stripe live API and webhook signing secrets are configured as Worker secrets.
- Existing Bitwarden inventory does not contain unambiguous live API/OAuth
  material for the remaining bindings. Stripe-looking entries are dashboard
  login-shaped rather than `sk_*` / `whsec_*` API material. The `ssmanji89 GMail
  API` item is not an OAuth credential bundle with client ID, client secret, and
  refresh token. No Google Calendar OAuth or Cloudflare Access audience item was
  found by metadata search. Local-queue mode avoids needing to pick an OpenAI
  key for launch agent execution.
- `api.sulemanji.com` is attached to the Worker as a custom domain after the
  `sulemanji.com` nameservers were moved to Cloudflare.
- Stripe webhook delivery is configured for
  `https://api.sulemanji.com/v1/webhooks/stripe`; live UAT evidence should still
  be recorded before broad advertising.

If readiness ever reports missing bindings, immediately set `SERVICE_MODE=setup`
before investigating so scheduled Gmail polling, retention, and digest jobs do
not run against an incomplete runtime.

## Local Codex Agent Runner

The Worker can enqueue discovery decisions for a local runner instead of
calling OpenAI directly. This is the current launch direction because this Mac
already has Codex logged in with ChatGPT OAuth.

Run one queued job:

```bash
cd worker
AGENT_RUNNER_TOKEN="$(security find-generic-password -w -a agent-runner -s sulemanji.work-with-me.agent-runner-token)"
AI_WORKFLOW_API_BASE="https://api.sulemanji.com" \
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

## Google OAuth Launch Setup

Gmail and Calendar use one user-authorized OAuth grant for
`ssmanji89@gmail.com`. The Google project currently has both Gmail API and
Google Calendar API enabled. Create a Google Auth Platform OAuth client as a
**Desktop app** in project `codexm1mbp`, download the JSON client file, and keep
that file outside the repository.

The Worker needs these Google scopes:

- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.freebusy`

`gmail.modify` supports reading, labeling, drafting, and sending case messages
without granting permanent-delete access. The retention job trashes old Gmail
threads after D1 redaction is confirmed and then removes the thread mapping from
D1.

If a local Google Workspace OAuth credential file already exists for the same
account and scopes, the helper can validate and install it directly:

```bash
cd worker
npm run setup:google-oauth -- \
  --credentials-file ~/.config/gws/credentials.json \
  --sender ssmanji89@gmail.com \
  --label "AI Workflow Services" \
  --install-worker-secrets
```

Otherwise, after downloading the OAuth client JSON, run:

```bash
cd worker
npm run setup:google-oauth -- \
  --client-file ~/Downloads/client_secret_*.json \
  --sender ssmanji89@gmail.com \
  --label "AI Workflow Services" \
  --install-worker-secrets
```

With `--client-file`, the helper opens the Google consent flow and captures the
local callback. With either credential source, it validates Gmail profile
access, creates or reuses the launch label, validates Calendar free/busy access,
captures the Gmail history seed, and installs these Worker secrets without
printing their values:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_CLINIC_LABEL`
- `GMAIL_HISTORY_START_ID`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REFRESH_TOKEN`

If the browser is stopped at Google sign-in, complete sign-in locally first. If
Bitwarden or macOS Keychain is needed, unlock it locally; do not paste OAuth
client secrets, refresh tokens, or passwords into shell history or commit them.

## Stripe Launch Setup

Stripe needs one live server-side API key and one webhook signing secret for the
Worker. The webhook endpoint must send `checkout.session.completed` to:

```text
https://api.sulemanji.com/v1/webhooks/stripe
```

The Stripe CLI can authenticate with browser approval, but CLI-generated
restricted keys expire after 90 days and may not have permission to create live
webhook endpoints. Prefer a durable Dashboard-created live restricted key with
the minimum permissions needed for Checkout Sessions, refunds, and webhook
endpoint setup, plus the webhook endpoint signing secret.

After the live key and webhook secret are available in macOS Keychain, install
them into the Worker:

```bash
cd worker
npm run setup:stripe -- --install-worker-secrets
```

By default the helper reads:

- `sulemanji.stripe.worker-secret-key` /
  `stripe-live-secret-key`
- `sulemanji.stripe.worker-webhook-secret` /
  `stripe-live-webhook-secret`

If Keychain is unlocked and you have a live key that can create webhook
endpoints, the helper can create the exact endpoint, store both secrets in
Keychain, and install Worker secrets:

```bash
cd worker
STRIPE_SECRET_KEY="$(security find-generic-password -w -a stripe-live-secret-key -s sulemanji.stripe.worker-secret-key)" \
npm run setup:stripe -- \
  --create-webhook \
  --store-keychain \
  --install-worker-secrets
```

If the webhook endpoint already exists, Stripe does not return its signing
secret from list/read calls. Reveal the endpoint's signing secret in the Stripe
Dashboard, store it in Keychain, then rerun `npm run setup:stripe -- \
--install-worker-secrets`.

The helper validates the Stripe account, installs only
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and prints no secret values.

## Cloudflare Access Launch Setup

Admin review routes require a Cloudflare Access application that issues
`cf-access-jwt-assertion` tokens for the Worker admin path. The Worker verifies:

- `ACCESS_TEAM_DOMAIN`: the Zero Trust team domain, for example
  `sulemanji.cloudflareaccess.com`
- `ACCESS_AUD`: the Application Audience (AUD) tag for the Access application
- `ADMIN_EMAIL`: already configured as `ssmanji89@gmail.com`

Cloudflare Access is configured for the Worker admin path:

```text
Host: api.sulemanji.com
Path: /v1/admin*
Policy: Allow only ssmanji89@gmail.com
```

Unauthenticated requests to `/v1/admin` should redirect to the Cloudflare Access
login flow before the Worker renders the review UI. `ACCESS_TEAM_DOMAIN` and
`ACCESS_AUD` are stored as Worker secrets because readiness treats all required
operator-only launch bindings uniformly, even though the values are not
customer secrets.

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
