# AI Tooling Productization Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local, non-public control plane inside the `www.sulemanji.com` repo for AI tooling productization decisions, candidate scoring, and GitHub Pages + Stripe packaging.

**Architecture:** Store control-plane artifacts under `_control-plane/` so Jekyll ignores them by convention, and explicitly add `_control-plane/` to `_config.yml` excludes. Keep public site content separate from candidate analysis until a product page is approved.

**Tech Stack:** Jekyll/GitHub Pages, Markdown, YAML, Stripe Payment Links/Checkout, local git evidence.

---

### Task 1: Add Local Control-Plane Folder

**Files:**
- Create: `_control-plane/README.md`
- Modify: `_config.yml`

- [x] **Step 1: Create `_control-plane/README.md`**

Create a local index explaining purpose, artifacts, decision rules, and status labels.

- [x] **Step 2: Exclude `_control-plane/` from Jekyll**

Add `_control-plane/` to the existing `exclude:` list in `_config.yml`.

- [x] **Step 3: Verify Jekyll config still parses**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected:

```text
PASS: command center validation
```

### Task 2: Add Productization Audit

**Files:**
- Create: `_control-plane/ai-tooling-productization-audit.md`

- [x] **Step 1: Add the audit document**

Capture the corrected product map with evidence, scorecard, packaging model, and next actions.

- [x] **Step 2: Review for public-safety leaks**

Run:

```bash
rg -n "\b[0-9]{7}\b|@[A-Za-z0-9.-]+\.(local|lan|internal)\b|gh[opsu]_|sk-" _control-plane
```

Expected: no output.

### Task 3: Add Structured Candidate Register

**Files:**
- Create: `_control-plane/product-candidates.yml`

- [x] **Step 1: Add candidate YAML**

Capture candidate IDs, product titles, source repos, deliverables, exclusions, scores, status, and price bands.

- [x] **Step 2: Validate YAML syntax**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import yaml
path = Path("_control-plane/product-candidates.yml")
data = yaml.safe_load(path.read_text())
assert isinstance(data, dict)
assert isinstance(data["candidates"], list)
assert all("id" in item and "scores" in item for item in data["candidates"])
print(f"PASS: {len(data['candidates'])} candidates")
PY
```

Expected:

```text
PASS: 9 candidates
```

### Task 4: Add Operating Model

**Files:**
- Create: `_control-plane/operating-model.md`

- [x] **Step 1: Add operating model**

Define inputs, excluded inputs, weekly review loop, scoring, publishing workflow, copy rules, and fulfillment model.

- [x] **Step 2: Check for accidental public route exposure**

Run:

```bash
tmp=$(mktemp -d)
rsync -a --exclude .git --exclude vendor/bundle --exclude _site ./ "$tmp/site/"
docker run --rm -e BUNDLE_FORCE_RUBY_PLATFORM=true \
  -v "$tmp/site":/site -w /site ruby:3.2 sh -lc '
    gem install bundler -v 2.5.23 >/dev/null &&
    bundle _2.5.23_ config set path vendor/bundle >/dev/null &&
    bundle _2.5.23_ install >/dev/null &&
    bundle _2.5.23_ exec jekyll build >/tmp/jekyll.log &&
    test ! -e _site/_control-plane/README.html &&
    test ! -e _site/control-plane/README.html &&
    test ! -e _site/docs/superpowers/plans/2026-05-23-ai-tooling-productization-control-plane.html &&
    echo "PASS: temp build keeps control plane private"
  '
```

Expected:

```text
PASS: temp build keeps control plane private
```

### Task 5: Final Verification

**Files:**
- Read: `_control-plane/README.md`
- Read: `_control-plane/ai-tooling-productization-audit.md`
- Read: `_control-plane/product-candidates.yml`
- Read: `_control-plane/operating-model.md`

- [x] **Step 1: Run site validator**

```bash
python3 scripts/validate_command_center.py
```

Expected:

```text
PASS: command center validation
```

- [x] **Step 2: Inspect git diff**

```bash
git diff -- _config.yml _control-plane docs/superpowers/plans/2026-05-23-ai-tooling-productization-control-plane.md
```

Expected: only local control-plane additions and `_config.yml` exclusion.

- [x] **Step 3: Commit after user review**

Do not commit automatically. Ask the user to review the local control-plane artifacts first.

### Task 6: Operationalize First Product Candidate

**Files:**
- Create: `_control-plane/access-inventory.md`
- Create: `_control-plane/products/mcp-operator-field-manual/README.md`
- Create: `_control-plane/products/mcp-operator-field-manual/package-outline.md`
- Create: `_control-plane/products/mcp-operator-field-manual/fulfillment-checklist.md`
- Create: `_control-plane/products/mcp-operator-field-manual/access.md`
- Modify: `_control-plane/product-candidates.yml`
- Modify: `_control-plane/README.md`

- [x] **Step 1: Inventory env access without exposing secrets**

Record key-name presence only for site, Hermes, Stripe, Cloudflare, and GitHub access surfaces.

- [x] **Step 2: Create local package source for `mcp-operator-field-manual`**

Add package source, outline, access boundary, and fulfillment checklist under `_control-plane/products/`.

- [x] **Step 3: Link package source from product register**

Add an `operationalization` block to the `mcp-operator-field-manual` candidate.

- [x] **Step 4: Re-run validator, YAML parse, and source-safety scan**

Expected:

```text
PASS: command center validation
PASS: 9 candidates
```

- [x] **Step 5: Re-run temp Jekyll build**

Confirm `_control-plane/` and this plan remain out of `_site/`.

### Task 7: Add First Package Materials

**Files:**
- Create: `_control-plane/products/mcp-operator-field-manual/templates/mcp-client-config.md`
- Create: `_control-plane/products/mcp-operator-field-manual/templates/tool-schema-review.md`
- Create: `_control-plane/products/mcp-operator-field-manual/templates/auth-boundary-checklist.md`
- Create: `_control-plane/products/mcp-operator-field-manual/templates/debug-runbook.md`
- Create: `_control-plane/products/mcp-operator-field-manual/templates/operator-readme.md`
- Create: `_control-plane/products/mcp-operator-field-manual/examples/stdio-server-clean-room.md`
- Create: `_control-plane/products/mcp-operator-field-manual/examples/http-server-clean-room.md`
- Create: `_control-plane/products/mcp-operator-field-manual/policies/support-refund-policy.md`
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/README.md`
- Modify: `_control-plane/products/mcp-operator-field-manual/package-outline.md`
- Modify: `_control-plane/products/mcp-operator-field-manual/fulfillment-checklist.md`

- [x] **Step 1: Add clean-room templates**

Add reusable worksheets for MCP client config, tool schema review, auth boundary review, debug workflow, and operator README handoff.

- [x] **Step 2: Add clean-room examples**

Add generic stdio and HTTPS examples that do not copy private implementations.

- [x] **Step 3: Add launch policy and version manifest**

Add support/refund policy draft and `v0.1.0` manifest.

- [x] **Step 4: Validate manifest, source safety, YAML, and Jekyll privacy**

Expected: package manifest paths exist, no source-safety matches, YAML parses, and temp build keeps `_control-plane/` private.

### Task 8: Prepare Buyer-Facing v0.1.0 Package

**Files:**
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package/README.md`
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package/templates/*.md`
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package/examples/*.md`
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package/policies/*.md`
- Create: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package-manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/fulfillment-checklist.md`

- [x] **Step 1: Separate buyer package from internal control-plane files**

Copy only buyer-safe templates, examples, and policy material into `releases/v0.1.0/package/`.

- [x] **Step 2: Add buyer package manifest**

Record included buyer-facing files and explicitly exclude internal access, fulfillment, and outline files.

- [x] **Step 3: Validate package manifest and build local ZIP artifact**

Expected: package manifest files exist, ZIP is created, and ZIP does not include internal control-plane files.

### Task 9: Add Dry-Run Stripe Setup Path

**Files:**
- Create: `_control-plane/scripts/create_stripe_payment_link.py`
- Create: `_control-plane/products/mcp-operator-field-manual/stripe/setup-runbook.md`
- Modify: `_control-plane/README.md`
- Modify: `_control-plane/product-candidates.yml`

- [x] **Step 1: Add dry-run-first Stripe setup script**

Create a dependency-free Python helper that prints a plan by default and only creates Stripe product, price, and payment link when `--execute` is passed.

- [x] **Step 2: Add Stripe setup runbook**

Document dry-run, live creation command, post-creation control-plane updates, and manual fulfillment.

- [x] **Step 3: Validate dry-run and source safety**

Expected: dry-run prints no secrets, YAML parses, script compiles, and source-safety scan returns no matches.

### Task 10: Draft Public Landing Page Privately

**Files:**
- Create: `_control-plane/public-page-drafts/mcp-operator-field-manual.md`
- Create: `_control-plane/launch/mcp-operator-field-manual-launch-checklist.md`
- Modify: `_control-plane/README.md`
- Modify: `_control-plane/product-candidates.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package-manifest.yml`

- [x] **Step 1: Add private landing page draft**

Create the future GitHub Pages product page under `_control-plane/public-page-drafts/` with a pending Stripe payment link placeholder.

- [x] **Step 2: Add launch checklist**

Record gates for live Stripe creation, public page promotion, Jekyll validation, and manual fulfillment rehearsal.

- [x] **Step 3: Validate private status and source safety**

Expected: YAML parses, source-safety scan returns no matches, and temp Jekyll build keeps the page draft private.

### Task 11: Add Promotion and Fulfillment Controls

**Files:**
- Create: `_control-plane/scripts/promote_product_page.py`
- Create: `_control-plane/products/mcp-operator-field-manual/public/promotion-runbook.md`
- Create: `_control-plane/fulfillment/manual-fulfillment-log-template.yml`
- Modify: `_control-plane/access-inventory.md`
- Modify: `_control-plane/README.md`
- Modify: `_control-plane/product-candidates.yml`
- Modify: `_control-plane/launch/mcp-operator-field-manual-launch-checklist.md`

- [x] **Step 1: Add public page promotion script**

Create a helper that replaces the Stripe placeholder and copies the private page draft to the public route only after a payment link is available.

- [x] **Step 2: Add manual fulfillment log template**

Create a local template for recording fulfillment without payment card data or secrets.

- [x] **Step 3: Record live-mode Stripe boundary**

Document that available Stripe secret keys are live-mode keys and require explicit approval before object creation.

- [x] **Step 4: Validate promotion dry-run, script compile, YAML, source safety, and Jekyll privacy**

Expected: scripts compile, promotion dry-run works with a fake URL, YAML parses, source-safety scan returns no matches, and the private draft remains unpublished.

- [x] **Step 5: Verify promoted page build in a temp copy**

Use a fake Stripe URL in a temporary copy to confirm the promotion script creates a Jekyll-valid public route and replaces the pending Stripe placeholder.

### Task 12: Create Live Stripe Components

**Files:**
- Create: `_control-plane/products/mcp-operator-field-manual/stripe/stripe-result.json`
- Modify: `_control-plane/product-candidates.yml`
- Modify: `_control-plane/public-page-drafts/mcp-operator-field-manual.md`
- Modify: `_control-plane/products/mcp-operator-field-manual/access.md`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package-manifest.yml`
- Modify: `_control-plane/launch/mcp-operator-field-manual-launch-checklist.md`

- [x] **Step 1: Create live Stripe product, price, and payment link**

Run the approved Stripe setup command using the Hermes env file and write only non-secret result fields.

- [x] **Step 2: Record Stripe identifiers**

Store the live product id, price id, payment link id, and payment link URL in the local control plane.

- [x] **Step 3: Validate Stripe result, YAML, source safety, and promotion path**

Expected: result is livemode, YAML parses, source-safety scan returns no secret values, private page has the real payment link, and promotion dry-run works.

### Task 13: Promote Product Page Locally

**Files:**
- Create: `products/mcp-operator-field-manual.md`
- Modify: `_control-plane/product-candidates.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/manifest.yml`
- Modify: `_control-plane/products/mcp-operator-field-manual/releases/v0.1.0/package-manifest.yml`
- Modify: `_control-plane/launch/mcp-operator-field-manual-launch-checklist.md`

- [x] **Step 1: Promote page from private draft to local public route**

Run the promotion script with the live Stripe result file.

- [x] **Step 2: Record local-promoted status**

Update the product register, release manifests, and launch checklist.

- [x] **Step 3: Validate public page build and private control-plane exclusion**

Expected: Jekyll builds `/products/mcp-operator-field-manual`, the page contains the live Stripe URL, and `_control-plane/` remains excluded.

### Task 14: Post Remaining Product Shelf

**Files:**
- Create: `products/index.md`
- Create: `products/*.md`
- Create: `_control-plane/products/*`
- Create: `_control-plane/fulfillment/*-manual-fulfillment-log-template.yml`
- Create: `_control-plane/launch/all-products-launch-checklist.md`
- Modify: `_control-plane/product-candidates.yml`

- [x] **Step 1: Create live Stripe components for remaining candidates**

Create live Stripe products, prices, and payment links for the remaining eight candidates.

- [x] **Step 2: Generate starter packages and public pages**

Generate v0.1.0 buyer ZIP artifacts, package manifests, public pages, and a `/products` index.

- [x] **Step 3: Validate product shelf**

Expected: all nine candidates have live Stripe links, public pages, ZIP artifacts, fulfillment templates, source-safety scan passes, and production-shaped Jekyll build keeps `_control-plane/` private.
