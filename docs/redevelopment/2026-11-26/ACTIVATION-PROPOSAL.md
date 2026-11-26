# Maintenance activation proposal

Status: prepared for a later owner decision. No account resources, model credentials, spend, schedules, DNS, or publication authority have been activated.

## Cloudflare resources

| Environment | Worker | D1 | Workflow | Schedule | Exposure |
|---|---|---|---|---|---|
| Staging | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | Hourly UTC trigger, Chicago local slot filter | Workers Dev; no production bindings |
| Production | `sulemanji-editorial` | `sulemanji-editorial-production` | `sulemanji-editorial-production` | Hourly UTC trigger, Chicago local slot filter | `editorial.sulemanji.com/*` Worker Route |

Both D1 IDs are deliberately unset. Each migration creates the owner control in paused state. The maintenance Worker has no visitor inference path. The website is a separate static-assets Worker; its production route remains `www.sulemanji.com/*`.

Cloudflare account name/ID, plan, zone ID, D1 IDs, Workflow instance state, exact API permissions, production route ID, staging hostname, and current deployed versions require a fresh authorized account read. The connected app currently returns `UNAUTHORIZED` and asks to reconnect. No resource has been created or modified.

## Model and cost estimate

Proposed API route: OpenAI Chat Completions with JSON Schema structured output, no tools, no web search, and no request-time visitor inference. Use separate author and reviewer model IDs to reduce shared-model review bias:

- Author: `gpt-6.1-terra`, currently listed at $1 / million input tokens and $5 / million output tokens.
- Reviewer: `gpt-6.1-sol`, currently listed at $2 / million input tokens and $10 / million output tokens.
- Both support Structured Outputs. Current model documents describe Terra for writing and Sol for everyday workloads. Recheck availability, endpoint behavior, and price at activation.
- At the code's 48,000-character input limit (about 16,000 tokens using its conservative 3 characters/token estimate) plus 4,000 output tokens, estimated maximum call cost is $0.036 for Terra and $0.072 for Sol. Three author and three reviewer calls would reserve up to $0.324 per candidate at these rates.
- The existing proposed caps are $0.75/candidate, $2/day, and $30/month. These are ceilings, not spending authorization. A sustainable worst-case limit of three fully reviewed candidates/day would cost at most $0.972/day and $29.16 across 30 days at the listed rates. Existing deterministic `NO_CHANGE` runs consume no model budget.
- The existing config proposes up to four Chicago-local slots (08:00, 13:00, 19:00, 22:00). Keep the hourly UTC Cron and durable local-slot dedupe. D1 budget reservations enforce the actual daily/monthly ceilings; review call caps are three rounds and six calls/candidate.

The API platform does not train on API data by default. Standard abuse-monitoring retention can include prompts and responses for up to 30 days; use only public-source material and the exact Viyu derivative explicitly authorized for public-use claims. Do not send raw memories, private lineage, credentials, client content, or new private disclosures. Check the provider data controls and the account's retention configuration before sending any non-public author context.

Cloudflare's published Workers Paid price is $5/month with included requests, CPU, Workflow steps/state, and D1 quotas. Overages depend on the account plan and measured traffic. At the proposed schedule and low-volume D1 workload the modeled increment is expected to remain within the proposed $10/month envelope; the actual marginal cost is unverified until account plan and usage are read. Static asset requests and storage do not add a charge under the current documented Workers Static Assets terms. Check the actual bill and analytics after staging and before production.

## One-writer cutover

1. Read the installed publisher, schedule, in-flight state, article queue, locks, and current authority immediately before cutover. Current evidence identifies the local `sulemanji-writing` publisher and a separate publication worktree; retain them as sole writer until this readback is complete.
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

The product preview was approved as presented. Model provider/model, spend envelopes, schedule activation, account resource creation, and production cutover remain unresolved. No model or Cloudflare spending authorization is inferred from this proposal.
