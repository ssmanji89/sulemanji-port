# Maintenance activation proposal

Status: site preview approved. The public site Worker and paused maintenance resources are deployed. The production editorial endpoint now uses a Cloudflare Custom Domain and public DNS resolves it. Editorial publication remains paused; no model credentials, model spend, or publisher cutover has been activated.

## Cloudflare resources

| Environment | Worker | D1 | Workflow | Schedule | Exposure |
|---|---|---|---|---|---|
| Staging | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | `sulemanji-editorial-staging` | Disabled; manual staging only | Workers Dev; isolated staging D1 |
| Production | `sulemanji-editorial` | `sulemanji-editorial-production` | `sulemanji-editorial-production` | Hourly UTC trigger, Chicago local slot filter; D1 control remains paused | `editorial.sulemanji.com` Custom Domain (deployed) |

Both environments have separate D1 and Workflow resources. Migrations 0001–0003 are applied remotely, and both control rows read back `paused=1, owner_epoch=1`. Production has its hourly Cron. Staging Cron was removed after Cloudflare enforced the Free-plan limit of five Cron triggers per account; no existing trigger was changed. Cloudflare's [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/) list five triggers on Free and 1,000 on Paid; the [Paid plan starts at $5/month](https://developers.cloudflare.com/workers/platform/pricing/). No plan upgrade was made. The maintenance Worker has no visitor inference path. The site is the separate `sulemanji-site` static-assets Worker, active at 100% on `www.sulemanji.com/*`.

Wrangler OAuth is authorized for the Cloudflare account; the connected Cloudflare app still returns `UNAUTHORIZED`. The unrelated `sulemanji-work-with-me` D1 was not reused. The first Worker Route lacked its required proxied DNS record. The production hostname is now configured as a Custom Domain; public resolvers 1.1.1.1 and 8.8.8.8 return Cloudflare addresses, TLS verifies, and a synthetic request with an invalid signature receives HTTP 401. The local system resolver still failed during the check, so producer-side reachability must be verified from Viyu. Resource identifiers are intentionally omitted from public documentation.

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

The product preview was approved as presented. The public homepage is served through the active Cloudflare site Worker. The editorial Worker, D1 databases, Workflows, and production Cron now exist; both D1 controls remain paused. The editorial hostname is a Cloudflare Custom Domain with public DNS and TLS; an unsigned synthetic POST to `/internal/knowledge` returned HTTP 401 AUTH on 2026-11-27. That proves endpoint reachability only. The Viyu producer's network path, authenticated knowledge delivery, model provider/model, model spend envelope, one-writer cutover, and two natural eligible schedule runs remain unresolved. No model-spending or Workers Paid upgrade authorization is inferred from this proposal.

## Post-merge release state (2026-11-27)

At the previous live readback, main was `f37bb7c07ed8dcbbdde86f391d085ba36fe2443a`. The static site and editorial Workers were serving at 100%, canonical routes passed, both editorial D1s had migrations 0001–0005, and production control was paused at owner epoch 1. The newer exact-main deployment is recorded below.

The main branch build passed, but its Cloudflare deploy job stopped at preflight because GitHub Actions had no `CLOUDFLARE_API_TOKEN`; the static site was manually deployed from that successful immutable main artifact using the existing Wrangler OAuth session. Set the token only in the `cloudflare-production` GitHub environment. Cloudflare's minimum for an existing Worker deploy is Workers Editor on `sulemanji-site`; changing its route also requires Workers Routes Write on zone `sulemanji.com` ([Cloudflare role reference](https://developers.cloudflare.com/workers/authorization/workers/)). The repository still has no such secret.

The previous Writing publisher remains the only publication authority. Its daily LaunchAgent's latest observed Nov 26 run was blocked by a Docker CLI timeout; two later scout runs also timed out on the missing pinned Ruby image and stalled desktop credential helper. The exact pinned image is now cached anonymously and the read-only source gate passes. No publisher run was triggered and no article was published during this repair. Verify the next natural Writing run and in-flight work before any cutover.

Full editorial activation remains paused until signed sanitized Viyu delivery and producer reachability, strict policy binding, approved provider/model and spend envelope, functioning review/publisher/public-readback adapters, and one-writer cutover are qualified. The proposed $0.75 per-candidate cap and model pricing remain proposals. Cloudflare Free accounts allow five Cron triggers and Paid allows 1,000; Paid starts at $5/month ([limits](https://developers.cloudflare.com/workers/platform/limits/), [pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Staging Cron and model spend remain unapproved. No natural eligible editorial run has occurred.

## Credential inventory readback (2026-11-27)

The site Worker is present at 100%; deployment CI is blocked by the missing Actions credential. A name-only scan found no Cloudflare API token variable in `~/.viyu-agents/.env`, the `viyu-agents` repository env file, `.zshrc`, `.zprofile`, `.zshenv`, nearby `.config`/`.local/share`, or the current shell. GitHub `cloudflare-production` also has no `CLOUDFLARE_API_TOKEN` secret. The existing local Wrangler OAuth session is separate and was not copied to GitHub. The owner must add a scoped API token directly to that GitHub environment.

## Importer source follow-up (2026-11-27)

The site importer contract fix merged to public main as `691608a89e307b69f6ece6cba6f4679728eb9992`; the corresponding private producer URL-validation fix merged to `mem0-mcp` main as `0ed4de6cfb7e5583b73c02edcbbc707c776f069c`. Both exact pull-request heads passed CI and independent review. At the time of this note the source changes had not yet been deployed; they did not establish an authenticated producer connection.

## Exact-main deployment readback (2026-11-27)

Main `79b6bcc0077755c360f21f7e73c9b3f60a439092` passed the hosted build and release gates. The Cloudflare deploy job failed before writing because `CLOUDFLARE_API_TOKEN` was empty. The immutable artifact from that run verified against the exact main commit and was deployed with the existing local Wrangler OAuth session. Public `/release.json` reports source `79b6bcc`, digest `sha256:2adeeae2cf7204fe0f4d7cfe24ca00752ae384f3350de7fa7e620fbd38956fda`, 229 assets, and 55 articles; canonical Home, Writing, project, article, retired intake, and unknown-article routes read back as expected.

The importer fix is now deployed to production and staging editorial Workers. Production retains its hourly Cron; staging has no Cron. Both D1 controls remain paused at epoch 1, both secret lists are empty, and both databases have zero schedule claims, candidates, receipts, public knowledge, and usage reservations. Unsigned knowledge POSTs return 401 AUTH. No signed producer delivery, model call, publication, or natural eligible run is claimed. Full activation still requires the authorized producer path, approved provider/model and budget, complete review/publisher/public-readback runtime, and one-writer cutover.

## Latest site Worker release readback (2026-11-27)

After PR #114, exact main `d6a3eda0974fb0113a98cd91c8cbb9f46568d888` passed its hosted release gate in run `45944969769`. The production deploy job still received an empty `CLOUDFLARE_API_TOKEN`; the verified immutable artifact was therefore deployed through the existing local Wrangler OAuth session. Cloudflare readback showed `sulemanji-site` active at 100%. Public `/release.json` matches exact source `d6a3eda` and digest `sha256:2adeeae2cf7204fe0f4d7cfe24ca00752ae384f3350de7fa7e620fbd38956fda` (229 assets; 55 articles). Home, Writing, project, preserved article, retired intake, and missing article route readbacks passed; apex redirects to `www`. The local OAuth session was not copied to GitHub. Editorial D1 remains paused and no natural eligible run is claimed.
