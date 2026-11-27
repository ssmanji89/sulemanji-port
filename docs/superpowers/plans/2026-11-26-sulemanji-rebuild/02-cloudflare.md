# Cloudflare delivery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax.

**Goal:** Serve the rebuilt Jekyll site on Cloudflare with verified routes, isolated staging, and controlled deployment.

**Architecture:** A new site Worker serves the existing clean build through Workers Static Assets. The qualified build pipeline publishes exact artifacts. The editorial Worker remains separate.

**Tech Stack:** Jekyll, TypeScript, Wrangler, Vitest, Workers Static Assets, and GitHub Actions.

**Spec:** [Complete design](../../specs/2026-11-26-sulemanji-rebuild-design.md).

## Global constraints

- Work from freshly fetched main in a dedicated release worktree.
- Preserve dirty work, current articles, source history, and active owners.
- Keep private research, source records, drafts, and operational receipts outside public Git history.
- Preserve the publication dates and URLs of eligible articles.
- Keep inference outside the visitor request path.
- Use one active production publisher.
- Do not revive Stripe, old workshop access checks, or obsolete service obligations.
- Keep the last verified public site available when background work fails.

The current worker/ remains separate.
Use new site and editorial resource names under cloudflare/.
Use distinct staging and production configurations.
Do not assume a Worker Preview isolates Workflow bindings or scheduled execution.

## Review focus

| Condition | Expected result | Test owner |
|---|---|---|
| Canonical Writing and note routes have different suffix conventions. | Preserve exact public identity through explicit tested routing. | T05 |
| An unknown article is requested. | Return a real 404. | T05 |
| New HTML encounters an old cached asset request. | Preserve the required immutable asset version. | T05/T13 |
| A preview or forked PR executes code. | Expose no production secrets or resource bindings. | T06 |
| A queued deployment is older than main. | Avoid replacing newer production with a stale source artifact. | T06 |

### Task T05: Static hosting and route parity

**Files**

- Create: cloudflare/package.json, cloudflare/package-lock.json, cloudflare/tsconfig.json, cloudflare/vitest.config.ts.
- Create: cloudflare/wrangler.site.jsonc, cloudflare/wrangler.site-staging.jsonc.
- Create: cloudflare/src/site/index.ts, cloudflare/src/site/routes.ts.
- Create: cloudflare/config/site-routes.json, cloudflare/test/site-routes.test.ts.
- Create: scripts/build_site_manifest.py, scripts/tests/test_site_manifest.py.
- Modify: _config.yml and build exclusions for the new operational directory.

**Interfaces**

- Consumes: clean _site output, current canonical source, and reviewed legacy-route dispositions.
- Produces: serveSite(request: Request, env: SiteEnv): Promise<Response>.
- Produces: resolveRoute(pathname: string, rules: RouteRule[]): RouteDecision.
- SiteEnv contains only ASSETS and public release metadata.
- RouteDecision is asset, redirect with target/status, or gone with a public destination.
- Produces: build metadata containing source_commit, asset_digest, and built_at.

- [ ] **Step 1: Write route and manifest tests.**

~~~typescript
it("keeps the Writing canonical and rejects a missing article", async () => {
  expect(resolveRoute("/writing/", rules)).toEqual({
    kind: "redirect", target: "/writing", status: 301
  });
  const response = await serveSite(
    new Request("https://www.sulemanji.com/notes/does-not-exist"),
    missingAssetEnv
  );
  expect(response.status).toBe(404);
});
~~~

Define rules and missingAssetEnv as explicit test fixtures for the declared interface.
Add valid note, work case, query preservation, unsafe redirect, retired admission, MIME, HEAD, and cache-header cases.
Test a manifest against a preserved article baseline and a changed immutable asset.
Assert the manifest contains no secret, private path, or operational record.

- [ ] **Step 2: Run the tests before the handler exists.**

Run: npm --prefix cloudflare test -- site-routes.test.ts
Expected: FAIL for absent hosting behavior.
Run: python3 -m unittest scripts.tests.test_site_manifest -v
Expected: FAIL for the absent manifest contract.

- [ ] **Step 3: Implement static serving and route normalization.**

Retain Wrangler because the repository already uses it.
Pin a compatible current version and test its actual config schema.
The inspected legacy pin is 4.110.0; it is evidence, not an instruction to preserve an incompatible version.
Do not adopt branch Previews unless their current minimum and binding behavior are qualified.
Use separately named staging for the background system regardless.

Configure the asset directory to the clean Jekyll output.
Use asset serving by default and Worker-first routing only where a tested rule requires it.
Disable SPA fallback.
Test actual asset HTML handling against /writing and note permalinks.
Preserve explicit existing redirects and meaningful fragments.
Generate public release metadata and immutable asset names.
Use no memory, model, or repository write binding in SiteEnv.

- [ ] **Step 4: Verify the actual Worker runtime.**

Run: npm --prefix cloudflare run check
Expected: type checks and site-route tests PASS.
Run: python3 -m unittest scripts.tests.test_site_manifest -v
Expected: PASS.
Run: JEKYLL_ENV=production bundle exec jekyll build
Expected: PASS.
Run: npm --prefix cloudflare run test:site-built
Expected: the built-site route contract passes through the Worker runtime.
Create that script using the same Vitest test entry and a temporary built-site fixture.
Do not describe mocked ASSETS tests as deployed routing evidence.

- [ ] **Step 5: Commit independently testable hosting.**

Commit message: feat: serve verified Jekyll assets through Cloudflare.

### Task T06: Build and deployment transport

**Files**

- Modify: .github/workflows/jekyll.yml.
- Create: scripts/check_site_release.sh, scripts/deploy_site.sh.
- Create: scripts/tests/test_cloudflare_release.py.
- Modify: scripts/tests/test_release_workflow.py, scripts/verify_portfolio_review.py.
- Create: docs/redevelopment/2026-11-26/DEPLOYMENT.md.

**Interfaces**

- Consumes: T05 configurations and build manifest.
- Produces: scripts/check_site_release.sh, which fails on any required check.
- Produces: scripts/deploy_site.sh --environment staging|production --source-commit SHA --artifact PATH.
- Produces: a private deployment receipt with source SHA, artifact digest, Worker version, target host, and observed result.
- Deployment selection uses an explicit SITE_DEPLOY_TARGET value: pages during migration, cloudflare after the accepted cutover.

- [ ] **Step 1: Write release policy tests.**

Create test_pr_has_no_production_deploy, test_fork_has_no_deploy_secret, test_stale_artifact_rejected, test_wrong_digest_rejected, and test_docs_excluded_from_public_build.
Assert an arbitrary PR cannot enter the production deployment job.
Assert current-head and digest mismatch stop deployment.
Assert cloudflare/, operational docs, fixtures, private state, and agent instructions stay outside _site.
Assert the current legacy Worker checks remain until a deliberate separate disposition changes their coverage.

- [ ] **Step 2: Run the release tests.**

Run: python3 -m unittest scripts.tests.test_cloudflare_release scripts.tests.test_release_workflow -v
Expected: new Cloudflare release behavior FAILS before implementation.

- [ ] **Step 3: Implement one qualified build and explicit deployment jobs.**

The release-check script runs:

~~~sh
npm ci --prefix worker
npm run check --prefix worker
bundle exec ruby scripts/verify_writing.rb --source-only
bundle exec ruby scripts/verify_content_catalog.rb
python3 scripts/generate_article_images.py --write-missing
python3 scripts/generate_article_images.py --check
bundle exec jekyll clean
JEKYLL_ENV=production bundle exec jekyll build
bundle exec ruby scripts/verify_writing.rb
python3 scripts/verify_discovery.py
bundle exec ruby -I scripts/tests -e 'Dir["scripts/tests/test_*.rb"].sort.each { |path| require_relative path }'
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/verify_public_safety.py
python3 scripts/verify_portfolio_review.py
python3 scripts/verify_priority_discovery_plan.py
~~~

Use current supported equivalents when admission finds a changed command, and record the ruling.
Build once per candidate and retain its exact artifact identity.
Run no production-secret deployment from untrusted pull-request code.
Use a trusted explicit staging job or local qualified staging deploy for previews.
Keep current Pages delivery available until the accepted migration switches the deployment target.
Before promotion, compare the artifact source SHA with the intended current main.
Use serialized production deployment.
Do not overwrite a newer main or newer production release.

- [ ] **Step 4: Verify the complete release path in staging.**

Run: bash scripts/check_site_release.sh
Expected: every required source and rendered check PASS.
Run: npm --prefix cloudflare run check
Expected: PASS.
Run: python3 -m unittest scripts.tests.test_cloudflare_release scripts.tests.test_release_workflow -v
Expected: PASS.
Deploy only to the authorized isolated staging target.
Verify the returned source revision and the canonical path matrix.
Record current account and resource identifiers privately.

- [ ] **Step 5: Commit the deployment transport.**

Commit message: feat: add qualified Cloudflare delivery and migration controls.
Record the exact activation and rollback commands in DEPLOYMENT.md without credential values.
