# SDD ledger — plan: /Users/sully/Documents/Codex/2026-11-26/redevelop-sulemanji-com-end-to-end/implementation/docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

BASE: dcd0a39e0f9d4b055145558005e98d16a7083220

## Scope

Wire the deterministic public-signal discovery and relevance path into durable Workflows. Record a durable NO_CHANGE result when no useful candidate qualifies; persist a typed HELD receipt and candidate when a change qualifies but model/review/publisher adapters are absent. Do not call T09 or T10 complete, configure secrets/spend, or activate/deploy production.

## Evidence

- The deployed production Worker hostname exists and returned HTTP 401 AUTH to an unsigned synthetic `/internal/knowledge` POST on 2026-11-27; endpoint reachability is verified, private producer delivery is not.
- Existing workflow core always recorded `HELD_PIPELINE_UNCONFIGURED` before discovery.
- Existing modules include bounded `collectSignals`, `chooseAction`, `getPublicKnowledge`, scheduler policy, candidate and receipt D1 tables, but workflow composition is missing.
- Source registry is `cloudflare/config/public-sources.json`. Site catalog is the public `https://www.sulemanji.com/content-index.json`.
- No authorized model/provider or GitHub credentials are configured in the Worker. Candidate processing remains held.

## Rulings

- Ruling: keep the owner-supplied example editorial policy invalid for runtime admission and require a concrete, strict `EDITORIAL_POLICY_JSON` binding — the checked-in file is expressly proposed and its model pricing revision is unset; using it would turn a non-authorized proposal into operating cadence/budget policy — cost if wrong: a configured Worker would remain paused until a distinct approved policy binding is supplied.
- Ruling: implement only deterministic discovery, selection, and persistence in this slice; candidates remain held until real provider adapters are configured — no model spend, GitHub authority, deployment readback provider, or private producer receipt exists — cost if wrong: useful candidates wait for explicit provider qualification rather than autonomous publication.

## Progress

- Source slice complete; broader T09/T10 remain partial. `workflow-core.ts` now composes the bounded signal registry, relevance selection, catalog/authorized-knowledge/history reads, and durable outcomes. `NO_CHANGE` is persisted only after complete successful reads with no candidate. Source failures persist held receipts. Actionable candidates persist as held candidates with `HELD_PROVIDER_UNCONFIGURED` because real model/review/publisher/readback adapters are absent.
- The strict runtime policy parser rejects the checked-in proposed sample and missing policy; Cron dispatch admits no slot without an approved concrete binding. Production and staging remain paused; no secret, model request/spend, publish authority, deployment, or resource activation was performed.
- Focused `workflow.test.ts`: 6 passed. Full `npm --prefix cloudflare run check`: TypeScript passed; 60 tests passed / 4 skipped; built-site check passed with 229 assets and 55 preserved articles; both site Worker dry-runs passed. Editorial production and staging Wrangler dry-runs passed. Final `git diff --check` and `python3 scripts/verify_public_safety.py` both passed.
- Current Cloudflare live-status correction: public `editorial.sulemanji.com` DNS/TLS is reachable; unsigned synthetic `/internal/knowledge` POST returned HTTP 401 AUTH (2026-11-27). This is rejection evidence only; private producer integration and authorized delivery are unproven.
- Remaining production seams: a real authorized producer payload and authenticated delivery; approved strict policy binding; provider/model and pricing/budget adapter; review adapter; GitHub publisher and scoped credentials; deployment/version verification and public HTML/feed/sitemap readback; owner-approved runtime configuration and at least two natural eligible runs. Source code can implement adapter contracts and deterministic test coverage without secrets/spend, but live-provider proof requires authorized runtime credentials/configuration and, for model execution, explicit spend approval.
