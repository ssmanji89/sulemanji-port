# Maintenance activation proposal

Status: site preview approved. The public site Worker and paused maintenance resources are deployed. Editorial publication remains paused; no model credentials, model spend, DNS record, or publisher cutover has been activated.

## Cloudflare resources

| Environment | Worker | D1 | Workflow | Schedule | Exposure |
|---|---|---|---|---|---|
| Staging | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | Disabled; manual staging only | Workers Dev; isolated staging D1 |
| Production | `sulemanji-editorial` | `sulemanji-editorial-production` | `sulemanji-editorial-production` | Hourly UTC trigger, Chicago local slot filter; D1 control remains paused | `editorial.sulemanji.com/*` Worker Route |

Both environments have separate D1 and Workflow resources. Migrations 0001–0003 are applied remotely, and both control rows read back `paused=1, owner_epoch=1`. Production has its hourly Cron. Staging Cron was removed after Cloudflare enforced the Free-plan limit of five Cron triggers per account; no existing trigger was changed. Current Cloudflare docs list five triggers on Free and 250 on Paid, with Paid starting at $5/month. No plan upgrade was made. The maintenance Worker has no visitor inference path. The site is the separate `sulemanji-site` static-assets Worker, active at 100% on `www.sulemanji.com/*`.

Wrangler OAuth is authorized for the Cloudflare account; the connected Cloudflare app still returns `UNAUTHORIZED`. The unrelated `sulemanji-work-with-me` D1 was not reused. Public DNS for `editorial.sulemanji.com` currently fails to resolve; the Worker Route is configured, but no DNS record was created. The production knowledge endpoint is therefore not reachable by the private producer yet. Resource identifiers are intentionally omitted from public documentation.

## Model and cost estimate

Proposed API route: OpenAI Chat Completions with JSON Schema structured output, no tools, no web search, and no request-time visitor inference. Use separate author and reviewer model IDs to reduce shared-model review bias:

- Author: `gpt-6.1-terra`, currently listed at $1 / million input tokens and $5 / million output tokens.
- Reviewer: `gpt-6.1-sol`, currently listed at $2 / million input tokens and $10 / million output tokens.
- Both support Structured Outputs. Current model documents describe Terra for writing and Sol for everyday workloads. Recheck availability, endpoint behavior, and price at activation.
- At the code's 48,000-character input limit (about 16,000 tokens using its conservative 3 characters/token estimate) plus 4,000 output tokens, estimated maximum call cost is $0.036 for Terra and $0.072 for Sol. Three author and three reviewer calls would reserve up to $0.324 per candidate at these rates.
- The existing proposed caps are $0.75/candidate, $2/day, and $30/month. These are ceilings, not spending authorization. A sustainable worst-case limit of three fully reviewed candidates/day would cost at most $0.972/day and $29.16 across 30 days at the listed rates. Existing deterministic `NO_CHANGE` runs consume no model budget.
- The existing config proposes up to four Chicago-local slots (08:00, 13:00, 19:00, 22:00). Keep the hourly UTC Cron and durable local-slot dedupe. D1 budget reservations enforce the actual daily/monthly ceilings; review call caps are three rounds and six calls/candidate.

The API platform does not train on API data by default. Standard abuse-monitoring retention can include prompts and responses for up to 30 days; use only public-source material and the exact Viyu derivative explicitly authorized for public-use claims. Do not send raw memories, private lineage, credentials, client content, or new private disclosures. Check the provider data controls and the account's retention configuration before sending any non-public author context.

Cloudflare's published Workers Paid starting price is $5/month; the current account is on Free and already uses all five Cron triggers. A plan upgrade would be needed to enable both staging and production Cron schedules. No upgrade has been made. Other overages depend on the account plan and measured usage. At the proposed schedule and low-volume D1 workload the modeled increment is expected to remain within the proposed $10/month envelope; actual marginal cost is unverified. Static asset requests and storage do not add a charge under the current documented Workers Static Assets terms. Check the actual bill and analytics before production writer activation.

## One-writer cutover

1. Read the installed publisher, schedule, in-flight state, article queue, locks, and current authority immediately before cutover. Read-only inspection found the daily and scout LaunchAgents loaded and a clean separate publication worktree (`writing/676b9558`). Retain the existing writer as sole publisher until complete cutover readback is available.
2. Pause the existing schedule and verify its state. Wait for or reconcile the active article, draft, pending review, or publication effect. Preserve its article identity and durable state.
3. Deploy the static site and paused editorial Worker. Run the exact source SHA, route, article, Writing, feed, sitemap, privacy, and retirement checks. Do not enable a second publisher during this step.
4. Record the previous writer's terminal lease/epoch and prove it cannot write. Create a new D1 owner epoch, verify the sanitized Viyu knowledge delivery receipt, provider/model/pricing configuration, budget policy, Workflow class, and GitHub publication authority.
5. Resume only the single new scheduled writer. Leave ordinary owner publication authority intact; do not transfer an in-flight article without matching its existing identity and review history.
6. Observe two natural eligible Chicago-local slots. A justified durable `NO_CHANGE` receipt counts. Manual workflow triggers and test fixtures do not count.

## DNS, certificate, and recovery

- The intended site route is the existing Cloudflare Worker Route `www.sulemanji.com/*`. Do not change DNS or nameservers as part of this route cutover. Confirm the existing proxied DNS record and exact route/zone IDs from the account first.
- Public DNS observed on 2026-11-26 was proxied through Cloudflare. The public certificate was valid through 2027-02-06 at that observation. These are historical observations; recheck certificate hostname, issuer, expiry, proxied record state, and current routing immediately before release.
- Keep the current Pages origin available until route readback succeeds. Roll back a Worker version using the exact previous version ID. To revert traffic, remove only the exact recorded Worker Route and verify Pages serves the canonical host. Restore a DNS record only if the actual pre-change record was changed; use its saved exact prior values.
- Code/assets rollback does not revert content commits or editorial D1 state. Recover those separately from their source commit and D1 backup/readback receipts; keep the publisher paused during reconciliation.

## Current decision boundary

The product preview was approved as presented. The public homepage is served through the active Cloudflare site Worker. The editorial Worker, D1 databases, Workflows, and production Cron now exist; both D1 controls remain paused. The editorial hostname does not resolve publicly because its DNS record is absent. Model provider/model, model spend envelopes, DNS record, authorized knowledge delivery/renewal, one-writer cutover, and two natural eligible schedule runs remain unresolved. No model-spending or Workers Paid upgrade authorization is inferred from this proposal.
