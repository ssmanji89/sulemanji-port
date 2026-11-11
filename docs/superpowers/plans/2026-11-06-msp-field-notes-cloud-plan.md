# MSP Field Notes — Superpowers implementation plan

Status: owner-approved design, implementation not yet deployed.

## Task 0 — Reconcile existing work
- Read root AGENTS.md, docs/WRITING-CONTRACT.md, docs/PUBLIC-CLAIMS-POLICY.md, issue #21, current open publication PRs and private runner status.
- Preserve all active worktrees. Diagnose Nov 6 uncommitted-article conflict non-destructively.
- Search for existing video/media adapters, workflows, branches and infrastructure; document overlap and owners.
- Done: evidence-backed inventory and no duplicate workflow introduced.

## Task 1 — DigitalOcean preflight
- Inventory all account resources, networking, volumes, snapshots, keys, projects, firewalls, budgets and costs; Droplet list alone is insufficient.
- Define least-privilege workload credentials, operator Tailnet access, secrets storage, persistent artifacts, backup/restore and resource limits.
- Choose region/size from verified available options and estimated CPU render workload; establish monthly spending cap.
- Done: reviewable infrastructure manifest and cost envelope. No blind provisioning.

## Task 2 — Cloud runtime
- Provision one isolated CPU-first host with reproducible container configuration, health checks and log retention.
- Separate control plane from render workers logically; queue jobs with stable idempotency keys, lease/retry, checkpoint persistence and cancellation.
- Test restart, backup restore, artifact integrity, service isolation and operator authentication.
- Done: authenticated remote execution and recovery proof.

## Task 3 — OpenMontage integration
- Pin upstream commit and read AGENT_GUIDE.md, PROJECT_CONTEXT.md, pipeline_defs manifests, director skills and provider registry.
- Run real provider capability preflight on target host. Compare Remotion vs HyperFrames if both available, and obtain production-choice approval as upstream requires.
- Implement thin brief-to-pipeline adapter, not a replacement orchestrator. Record chosen provider, variant, price and decision changes.
- Use local Piper TTS initially; silent clip excludes spoken track. Avoid voice cloning and avatar generation.
- Done: dry-run production manifest and repeatable tool selection.

## Task 4 — Evidence and editorial gates
- Build per-story manifest: original sources, source dates, claim types, permissions, redaction, script hash, output lineage and rights.
- Public Viyu-related claims must be independently public-safe; private memory never passes directly into public output.
- Preserve exact-head independent review and existing guarded publication rules; distinguish proposed vs deployed vs verified.
- Done: fixture tests reject confidential and unsupported claims.

## Task 5 — First video pair
- Reuse published Intune policy-verification article as source, verify freshness and technical accuracy.
- Produce 16:9 narrated explainer and 9:16 silent caption-led clip through documented OpenMontage pipelines.
- Validate ffprobe metadata, sampled frames, subtitles, loudness, licensing, readability, render hashes and actual production costs.
- Interrupt and resume once; ensure no duplicate paid calls.
- Done: two playable, reviewed artifacts with complete evidence receipts.

## Task 6 — Publish and verify
- Extend existing Sulemanji media surfaces and private guarded publisher; preserve unrelated site content.
- Start with local export and site integration. Add YouTube/LinkedIn authenticated publishers only after supported API, scopes and policies are verified.
- Do not equate local export, queued upload or merged PR with published status.
- Done: independently accessible public media URLs, linked site article, verified metadata and upload receipts.

## Task 7 — Autonomous operation and measurement
- Reuse existing discovery radars and private publisher cadence; select candidates by editorial value rather than quota.
- Define allowed unattended creative profiles and budgets without bypassing OpenMontage's required approvals.
- Record useful engagement, qualified Viyu referrals, cost per published item, correctness corrections and job reliability.
- Done: multiple independently verified runs, no draft pile, cost bounds and safe recovery.

## Delivery rules
- Small isolated PRs, source-specific tests, no auto-merge of design docs.
- One completed vertical slice before dashboards, extra providers or broad social automation.
- No production/client changes without the specific execution requirements and approvals appropriate to those resources.
