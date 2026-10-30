# Public article discovery implementation plan

**Spec:** `docs/superpowers/specs/2026-10-28-article-discovery-design.md`

## Global constraints

- Preserve current `origin/main`, all 22 dated articles, the legacy note, and unrelated work.
- Use TDD for behavior changes.
- Keep GitHub Pages as the origin and Cloudflare as the edge.
- Do not infer merge, deployment, or Cloudflare release authority.

## Task 1: Establish the policy and documentation boundary

**Files:** design, plan, crawler policy, crawler runbook.

Document the shared crawler policy, 32 preserved restrictions, allowed search and retrieval
clients, source-versus-edge boundary, Cloudflare rollback, and honest live verification.

**Expected:** the public-safety verifier passes and documentation stays outside `_site`.

## Task 2: Generate one validated discovery catalog

**Files:** Writing plugin, Writing page, feed placeholder, sitemap, robots, discovery verifier,
and Python tests.

Write failing tests for catalog agreement, ordering, base URLs, the legacy feed exception,
draft/future/noindex exclusion, crawler policy, unique canonical URLs, and private artifacts.
Implement the generator and verifier. Run focused and full suites.

**Expected:** all public inventory comes from `WritingContract.catalog` and discovery checks pass.

## Task 3: Add article presentation and commercial-link enforcement

**Files:** article layout/includes, context mapping, social-card generator and assets,
Writing verifier, Ruby tests, requirements.

Write failing tests for visible author identity, Article or BlogPosting schema, social metadata,
image dimensions, escaped alt text, explicit context allowlisting, repeated paid links, and
preserved link tokens. Implement minimal shared presentation. Run focused and full suites.

**Expected:** every public article meets one presentation contract without source-body changes.

## Task 4: Enforce release and live monitoring behavior

**Files:** Pages workflow, live smoke script, smoke tests, crawler runbook.

Write failing tests for honest user agents, robots interpretation, redirects, discovery output,
and managed-policy conflicts. Make pull requests validate without deployment. Keep all production
events in one concurrency group. Integrate the smoke command with the existing publisher when its
owner and runtime are accessible.

**Expected:** all fresh local checks pass, the remote branch and PR match the tested head, CI ends
in a terminal state, and monitoring status is explicit.

## Review focus

- Newer articles appear automatically without frozen counts.
- The undated legacy note stays undated and absent from the feed.
- A repeated paid URL receives required rel tokens at every occurrence.
- The astronomy article uses its existing attributed image and no business pitch.
- `--baseurl /preview` applies exactly once.
- Cloudflare readback preserves training and security restrictions.
