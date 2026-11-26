# Source ledger and architecture decisions

Date: 2026-11-26, America/Chicago.
Purpose: Public-safe evidence for the complete site redevelopment and autonomous maintenance handoff.

## Evidence status

**Observed** means the audit reads source, configuration, or a public receipt. **Inferred** means an explanation follows from observations. **Unknown** means execution must gather evidence. A source test or deployment receipt does not independently establish the public experience.

The audited `main` head is `634948ca25602ac6ad908126a58a252dec27b1ac`, following Writing PR #100. The executor must reconcile fresh `main`, repository instructions, open changes, and actual runtime before implementation.

- [Audited commit](https://github.com/ssmanji89/sulemanji-port/commit/634948ca25602ac6ad908126a58a252dec27b1ac)
- [Current branch](https://api.github.com/repos/ssmanji89/sulemanji-port/branches/main)
- [Successful build at the audited head](https://github.com/ssmanji89/sulemanji-port/actions/runs/45848028147)

## Current site and publisher evidence

| Status | Finding | Implication |
|---|---|---|
| Observed | The Jekyll workflow builds and deploys `main` to GitHub Pages. PRs validate without production deployment. | Retain the qualified build and shared layouts while changing hosting. |
| Observed | Writing policy permits broad interests, but reader/topic registries cover a narrower range. | Correct the schema mismatch with real non-MSP examples. |
| Observed | Article relationships repeatedly select a service case and business continuation. | Support relevant projects, explanations, experiments, correspondence, and business routes. |
| Observed | Work cases use escaped paragraphs and a special-case demo. | Add reviewed formats for tools, stories, experiments, diagrams, and demonstrations. |
| Observed | Career and interest material survives, but main routes expose few useful connections. | Rebuild information architecture using actual content. |
| Inferred | Narrow schema, relationship defaults, and uniform rendering contribute to the reported robotic experience. | Test these mechanisms separately from visual preference. |
| Unknown | The active generator prompts and installed publisher state are outside the inspected source tree. | Inspect the actual runtime before claiming a complete generation diagnosis. |

Source owners:

- [Delivery workflow](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/.github/workflows/jekyll.yml)
- [Writing contract](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/docs/WRITING-CONTRACT.md)
- [Writing registry](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/_data/writing.yml)
- [Article relationships](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/_data/article-context.yml)
- [Work-case layout](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/_layouts/work-case.html)

### Publisher continuity

[Issue #21](https://github.com/ssmanji89/sulemanji-port/issues/21) contains the publishing operating history. [WR-PUBLISH-001](https://github.com/ssmanji89/sulemanji-port/issues/21#issuecomment-5628098011) authorizes guarded automatic publication after independent review. It preserves exact article identity and public Writing-index verification. Routine posting and merge work must not return to the owner.

The [October 22 receipt](https://github.com/ssmanji89/sulemanji-port/issues/21#issuecomment-6356113515) describes an external scheduled operator, atomic ownership, interrupted-work recovery, and exact-head review. Its current installation and state remain unverified here.

The checked-in [older orchestrator](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/blog_automation/orchestrator.py) references missing modules. It is not evidence of the current daily runtime. The existing [Worker configuration](https://github.com/ssmanji89/sulemanji-port/blob/634948ca25602ac6ad908126a58a252dec27b1ac/worker/wrangler.jsonc) belongs to the retired workshop service. Give the new site and editorial workers separate names and bindings.

## Architecture decisions

Retain Jekyll and shared layouts. Deploy the verified `_site` output through the site Worker configured under `cloudflare/` using Workers Static Assets. Use a separate editorial Worker with Cron, Workflows, and D1. Public requests do not call a model or retrieve private memory.

The background system selects a meaningful change, obtains scoped context, creates a candidate, validates it, publishes through one qualified path, and verifies the public result. A justified no-change result counts as successful maintenance. The last verified static build remains available during a source, memory, model, or maintenance failure.

The knowledge source remains Viyu-memory. Only a scoped publication view enters the pipeline. Retrieval access does not grant permission to publish personal or client information. Public output cites public evidence; private provenance stays in the operational record.

Do not add R2, Queues, KV, Vectorize, or an admin UI without a demonstrated requirement. Budget and cadence values belong to the design, not this research note.

### Official Cloudflare evidence

| Source | Decision or constraint |
|---|---|
| [Static Assets](https://developers.cloudflare.com/workers/static-assets/) | Existing generated HTML can remain static. Asset-first serving keeps inference outside requests. |
| [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) | Cloudflare recommends Static Assets for new sites. |
| [Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/) | Ruby and Python are supported. Pin runtimes and dependencies. |
| [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/) | Steps retry. External writes need idempotency and ambiguous-result reconciliation. |
| [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | Schedules use UTC; propagation can take 15 minutes. Reconcile missed work. |
| [Invocation limits](https://developers.cloudflare.com/workflows/reference/limits/) | Cron and queue consumers have bounded duration. Use durable steps for longer operations. |
| [D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/) | Transactional batches support coherent state changes. |
| [Previews](https://developers.cloudflare.com/workers/previews/) | Preview bindings do not automatically isolate Workflows, cron, or consumers. Use explicit staging resources. |
| [Worker Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) | Protect operational endpoints across every exposed hostname. |
| [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) | Verify the active zone and reconcile any existing CNAME before cutover. |
| [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) | Preserve canonical URLs, including `/writing`, through route tests. |
| [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) | Worker rollback does not restore bound database state. |
| [Spending limits](https://developers.cloudflare.com/workers/platform/spend-management/) | Account-wide limits exclude other products and can affect unrelated Workers. |

Documentation is retrieved on 2026-11-26. Account plan, entitlements, zone, DNS, and installed credentials remain unknown. Documentation connector authentication does not block planning.

The new knowledge transport uses [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) for canonical payload digests.
Its HMAC covers the exact transmitted envelope bytes.
The producer and consumer share canonicalization fixtures.

## Requested methods and their scope

| Reference | Application |
|---|---|
| [RPI](https://github.com/alanw707/rpi-skills) | Preserve traceability from current-state research through requirements, implementation, and verification. Avoid a competing plan hierarchy. |
| [Diagram Design](https://github.com/cathrynlavery/diagram-design) | Create subject-specific explanatory visuals using the site's reviewed visual tokens. Decorative category loops do not satisfy this purpose. |
| [Archify](https://github.com/tt-a1i/archify) | Validate architecture or workflow explainers against actual components and relationships when useful. |
| [REA](https://github.com/morluto/rea) | Use shipped-artifact or runtime investigation when source cannot establish behavior. Ordinary source analysis needs no reverse-engineering toolchain. |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Reuse established structure and implement the smallest complete solution. Preserve accessibility, validation, and recovery. |
| [Humanizer](https://github.com/blader/humanizer) | Remove formulaic prose while preserving supported facts, attribution, uncertainty, and the author's meaning. |

These are methodological references, not evidence that their tools ran. Read current instructions and record versions before invoking their executables.

## Release evidence required

Preserve GitHub Pages as the rollback destination until the Cloudflare site is live-qualified. Record the deployment revision, public route checks, and rollback procedure. Replace the publisher through one controlled cutover. Verify the old schedule stops and the new owner processes a production run. Completion includes the public site and operating maintenance loop; an open PR is insufficient.
