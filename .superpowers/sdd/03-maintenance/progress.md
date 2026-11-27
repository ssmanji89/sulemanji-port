# SDD ledger — plan: /Users/sully/Documents/Codex/2026-11-26/redevelop-sulemanji-com-end-to-end/implementation/docs/superpowers/plans/2026-11-26-sulemanji-rebuild/03-maintenance.md

BASE: dcd0a39e0f9d4b055145558005e98d16a7083220
Reviewed pipeline commit: 6919407909b8f6dcd0475ea49b72a96c3c0acdff
Rebase target fetched after PR #108: a938fa89137f2350e03c37dc435c3390076a43ee

## Scope

Wire the deterministic public-signal discovery and relevance path into durable Workflows. Record a durable NO_CHANGE result when no useful candidate qualifies; persist a typed HELD receipt and candidate when a change qualifies but model/review/publisher adapters are absent. Do not call T09 or T10 complete, configure secrets/spend, or activate/deploy production.

## Evidence

- The deployed production Worker hostname exists and returned HTTP 401 AUTH to an unsigned synthetic `/internal/knowledge` POST on 2026-11-27; endpoint reachability is verified, private producer delivery is not.
- The reviewed workflow lacked source coverage, minimum-interval enforcement, and owner-epoch fences on workflow writes.
- Existing modules include bounded `collectSignals`, `chooseAction`, `getPublicKnowledge`, scheduler policy, candidate and receipt D1 tables, and source registry configuration.
- Source registry is `cloudflare/config/public-sources.json`. Site catalog is the public `https://www.sulemanji.com/content-index.json`.
- No authorized model/provider or GitHub credentials are configured in the Worker. Candidate processing remains held.

## Rulings

- Ruling: keep the owner-supplied example editorial policy invalid for runtime admission and require a concrete, strict `EDITORIAL_POLICY_JSON` binding — the checked-in file is expressly proposed and its model pricing revision is unset; using it would turn a non-authorized proposal into operating cadence/budget policy — cost if wrong: a configured Worker would remain paused until a distinct approved policy binding is supplied.
- Ruling: implement only deterministic discovery, selection, and persistence in this slice; candidates remain held until real provider adapters are configured — no model spend, GitHub authority, deployment readback provider, or private producer receipt exists — cost if wrong: useful candidates wait for explicit provider qualification rather than autonomous publication.

## Progress

- PIPE-01 reproduction: with five enabled public sources and `max_fetches_per_scan=1`, the workflow fetched one source and emitted `NO_CHANGE`. Fix: cover enabled sources using due fetches plus durable source snapshots; any due source omitted by the per-scan cap persists `HELD_SOURCE_COVERAGE_INCOMPLETE`, never `NO_CHANGE`.
- PIPE-02 reproduction: configured `min_interval_seconds=21600` did not affect the workflow; every slot fetched all feeds. Fix: migration 0004 adds `editorial_source_state`; successful fetches persist timestamp and signal snapshot, fresh snapshots are reused until that source interval elapses, and expired cached signals are omitted.
- PIPE-03 reproduction: the run read `paused/owner_epoch` only at start, then wrote candidates/receipts without rechecking. Fix: source-state, candidate, and receipt inserts are conditional `INSERT ... SELECT` writes against current D1 `paused=0` and the original `owner_epoch`. Stale candidates and terminal receipts are rejected; replayed receipts from another epoch return held.
- Focused workflow regression suite: 10 passed. The first run after adding PIPE-01/02/03 regressions failed exactly those four cases (coverage, interval, stale NO_CHANGE, stale candidate), then passed after implementation.
- Rebased onto `origin/main` at `a938fa89137f2350e03c37dc435c3390076a43ee`; the main branch's Writing fixture recovery and gate evidence remain intact in both execution-history documents.
- Focused workflow suite after rebase: 10/10 passed. Full `npm --prefix cloudflare run check` after rebase: TypeScript passed; 64 tests passed / 4 skipped; built-site verification passed with 229 assets and 55 preserved articles; both static Worker dry-runs passed. The first run stopped because the fresh worktree lacked `_site`; after `bundle exec jekyll build --destination _site`, the complete rerun passed.
- Local Wrangler applied migrations 0001–0004 to an isolated local staging D1. Local SQL probes confirmed active-epoch conditional receipt, candidate, and source-state writes succeed, while stale-epoch/paused receipt and candidate writes are rejected. Editorial production and staging Worker dry-runs both passed. `git diff --check` and `python3 scripts/verify_public_safety.py` both passed.
- No deployment, remote migration, D1 change, unpause, provider credential, model spend, or publishing authority was used. T09/T10 remain partial and unchanged in scope. Staging and production remain paused; the new source-state migration has not been applied remotely.
- Current Cloudflare live-status correction: public `editorial.sulemanji.com` DNS/TLS is reachable; unsigned synthetic `/internal/knowledge` POST returned HTTP 401 AUTH (2026-11-27). This is rejection evidence only; private producer integration and authorized delivery are unproven.
- Remaining production seams: a real authorized producer payload and authenticated delivery; approved strict policy binding; provider/model and pricing/budget adapter; review adapter; GitHub publisher and scoped credentials; deployment/version verification and public HTML/feed/sitemap readback; owner-approved runtime configuration and at least two natural eligible runs. Source code can implement adapter contracts and deterministic test coverage without secrets/spend, but live-provider proof requires authorized runtime credentials/configuration and, for model execution, explicit spend approval.
