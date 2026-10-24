# Publications Public Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `/writing` from schema-v1 technology articles into a backward-compatible Publications surface with commercial metadata, disclosure enforcement, and article JSON-LD.

**Architecture:** Keep flat `notes/<slug>.md` routes and the existing Jekyll layout. Freeze current schema-v1 files by digest, add schema v2 for new or edited Publications, and validate commercial links through a public pattern registry. Render disclosures and structured data from visible article data without exposing private opportunity records.

**Tech Stack:** Jekyll 3.9, Liquid, Ruby, Kramdown, Psych, Nokogiri, Minitest.

**Spec:** `docs/superpowers/specs/2026-10-24-publications-revenue-discovery-design.md`

## Global Constraints

- Keep one public Writing surface at `/writing` with flat `notes/<slug>.md` routes.
- Preserve schema-v1 pages only while their recorded source digests remain unchanged.
- Require schema v2 for every new or edited Publication.
- Keep private opportunity scores, program terms, financial goals, and account records outside public Git history.
- Require a visible disclosure before the first commercial link or promotion.
- Use the exact Amazon statement: “As an Amazon Associate I earn from qualifying purchases.”
- Do not emit prices, ratings, availability, or hands-on claims through structured data.
- Preserve all current source, rendered, safety, positioning, and portfolio gates.

## Review Focus

- A modified schema-v1 article must fail until it migrates to schema v2; Task 1 pins the digest mismatch.
- An encoded or alternate-host Amazon link must not bypass commercial detection; Task 2 tests parsed host and query rules.
- A valid disclosure after the first commercial link must fail; Task 3 checks rendered document order.
- `mixed` intent must satisfy every detected or declared relationship; Task 2 tests missing component disclosures.
- JSON-LD must match visible title, description, dates, canonical URL, and author; Task 3 tests the rendered graph.

---

## File structure

- `_data/writing.yml`: schema versions, frozen schema-v1 digests, Publication families, and display labels.
- `_data/commercial-links.yml`: public commercial-link detection rules and required disclosure copy.
- `scripts/verify_writing.rb`: source catalog, schema-v2 validation, link classification, disclosure checks, and rendered verification.
- `scripts/tests/test_writing.rb`: source and rendered contract tests.
- `_includes/writing-meta.html`: schema-v1 type fallback and schema-v2 family metadata.
- `_includes/writing-jsonld.html`: visible Publication JSON-LD only.
- `_layouts/writing-article.html`: metadata, JSON-LD, and article body composition.
- `writing.md`: combined schema-v1 and schema-v2 index.
- `affiliate-disclosure.md`: durable public disclosure page.
- `_includes/site-footer.html`: persistent disclosure-page link.
- `docs/WRITING-CONTRACT.md`: schema-v2 authoring and disclosure contract.

### Task 1: Add frozen schema-v1 compatibility and schema-v2 Publication metadata

**Files:**
- Modify: `_data/writing.yml`
- Modify: `scripts/verify_writing.rb:14-213`
- Modify: `scripts/tests/test_writing.rb:7-220`

**Interfaces:**
- Consumes: existing `WritingContract.catalog(source, as_of:)` and schema-v1 fixtures.
- Produces: `WritingContract.article_schema(front, relative, registry) -> Integer` and catalog records with normalized `publication_family`, `commercial_intent`, and `disclosure_required` values.

- [ ] **Step 1: Write schema-version tests**

Add `test_unchanged_schema_v1_uses_compatibility_defaults`, `test_changed_schema_v1_digest_requires_schema_v2`, and `test_schema_v2_requires_publication_fields`. Assert that v1 normalizes to `professional-analysis`, `none`, and `false`; a one-byte v1 body change fails; and v2 rejects every missing or unknown controlled value.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `bundle exec ruby scripts/tests/test_writing.rb --name '/schema_v1|schema_v2/'`

Expected: FAIL because schema version 2 and frozen v1 digests do not exist.

- [ ] **Step 3: Add registry version 2 and frozen v1 digests**

Set `_data/writing.yml` to `schema_version: 2`. Add `schema_v1_sha256` entries for every current nonlegacy schema-v1 note. Add `publication_families` keys `professional-analysis`, `technical-guide`, `research-note`, `product-category-guide`, `field-note`, and `experiment`. Add `commercial_intents` keys `none`, `affiliate`, `referral`, `sponsorship`, `paid-recommendation`, `own-product`, and `mixed`.

- [ ] **Step 4: Implement schema normalization**

Add `WritingContract.article_schema(front, relative, registry) -> Integer`. Accept schema 1 only when the full source-file SHA-256 equals its registry digest. Require schema 2 otherwise. For schema 2, replace `article_type` with required `publication_family`, and require `commercial_intent` plus boolean `disclosure_required`. Keep `time_horizon`, `reader`, `topics`, date, Markdown, and route rules unchanged.

- [ ] **Step 5: Run the complete source-contract tests**

Run: `bundle exec ruby scripts/tests/test_writing.rb`

Expected: PASS with all schema-v1 compatibility and schema-v2 validation tests.

- [ ] **Step 6: Commit the schema boundary**

```bash
git add _data/writing.yml scripts/verify_writing.rb scripts/tests/test_writing.rb
git commit -m "feat: add publications schema v2"
```

### Task 2: Detect commercial relationships and enforce the source validation matrix

**Files:**
- Create: `_data/commercial-links.yml`
- Modify: `scripts/verify_writing.rb`
- Modify: `scripts/tests/test_writing.rb`

**Interfaces:**
- Consumes: normalized schema-v2 article data from Task 1.
- Produces: `WritingContract.commercial_registry(source) -> Hash`, `WritingContract.classify_commercial_href(href, registry) -> Hash|nil`, and `WritingContract.validate_commercial_source(article, body, registry) -> Array<Hash>`.

- [ ] **Step 1: Write commercial-matrix tests**

Add table-driven tests for `none`, `affiliate`, `referral`, `sponsorship`, `paid-recommendation`, `own-product`, and `mixed`. Assert failure for a detected Amazon tag with `none`, `disclosure_required: false` on any commercial intent, an unknown detected program, missing relationship copy, and `mixed` with only one relationship type.

- [ ] **Step 2: Write link-classification tests**

Test `https://www.amazon.com/dp/B0H4X4X468?tag=sullymanji-20`, an encoded `tag` value, uppercase host input, a non-Amazon `tag` query, and a normal Amazon link without an Associate tag. Only a configured host plus its required query pattern can classify as Amazon affiliate traffic.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `bundle exec ruby scripts/tests/test_writing.rb --name '/commercial|affiliate|sponsorship|recommendation/'`

Expected: FAIL because the registry and classifier are absent.

- [ ] **Step 4: Add the public commercial-link registry**

Create version 1 registry entries with program ID, allowed HTTPS hosts, required path or query patterns, intent, and disclosure rule. Add Amazon detection for `amazon.com` subdomains carrying a nonempty `tag` query. Store no approved account identifiers in this file.

- [ ] **Step 5: Implement source validation**

Parse Markdown links through Kramdown nodes and classify their destinations with `URI`. Enforce the design validation matrix. Require the exact Amazon statement when an Amazon affiliate link exists. Require named payer or sponsor copy for declared paid relationships. Require an ownership statement for `own-product`. Return classified link records for rendered-order verification.

- [ ] **Step 6: Run the complete contract tests**

Run: `bundle exec ruby scripts/tests/test_writing.rb`

Expected: PASS, including unsafe-link and commercial-link cases.

- [ ] **Step 7: Commit commercial validation**

```bash
git add _data/commercial-links.yml scripts/verify_writing.rb scripts/tests/test_writing.rb
git commit -m "feat: validate publication disclosures"
```

### Task 3: Render Publication metadata, disclosures, and JSON-LD

**Files:**
- Create: `_includes/writing-jsonld.html`
- Create: `affiliate-disclosure.md`
- Modify: `_layouts/writing-article.html`
- Modify: `_includes/writing-meta.html`
- Modify: `_includes/site-footer.html`
- Modify: `writing.md`
- Modify: `scripts/verify_writing.rb:237-397`
- Modify: `scripts/tests/test_writing.rb`

**Interfaces:**
- Consumes: normalized schema-v1 and schema-v2 page fields from Task 1 and classified commercial links from Task 2.
- Produces: schema-v2 cards with `data-publication-family`, an article JSON-LD node, `/affiliate-disclosure`, and rendered disclosure-order enforcement.

- [ ] **Step 1: Write rendering tests**

Add `test_schema_v2_article_renders_once_in_writing_index`, `test_commercial_disclosure_must_precede_first_link`, `test_affiliate_disclosure_page_contains_exact_amazon_statement`, and `test_publication_jsonld_matches_visible_content`. Include a Markdown image fixture to retain renderer support.

- [ ] **Step 2: Run the rendering tests and confirm failure**

Run: `bundle exec ruby scripts/tests/test_writing.rb --name '/schema_v2_article|disclosure_page|disclosure_must|publication_jsonld/'`

Expected: FAIL because the layout, page, and JSON-LD include are absent.

- [ ] **Step 3: Update the shared renderer**

Make `writing.md` include published schema 1 and schema 2 notes in the same date and permalink order. Make `writing-meta.html` render `data-publication-family` for v2 and retain `data-article-type` for v1. Do not add category archives or a second index.

- [ ] **Step 4: Add visible JSON-LD**

Create one `Article` node for `professional-analysis` and `technical-guide`; create one `BlogPosting` node for the other families. Bind headline, description, canonical URL, visible dates, and the existing Person `@id`. Do not emit `Review`, `Product`, ratings, prices, availability, or claims not present on the page.

- [ ] **Step 5: Add the disclosure page and navigation**

Create `/affiliate-disclosure` with the exact Amazon statement and general affiliate, referral, sponsorship, paid-recommendation, and own-product explanations. Add one footer link. Keep inline article disclosure mandatory.

- [ ] **Step 6: Enforce rendered disclosure order**

In `WritingContract.verify`, compare DOM positions inside `[data-writing-body]`. Require every applicable disclosure paragraph before the first related link or promotion. Verify the rendered commercial links equal the source classifications and contain no unexpected account identifier mutation.

- [ ] **Step 7: Run a clean build and rendered tests**

Run: `rm -rf _site && JEKYLL_ENV=production bundle exec jekyll build && bundle exec ruby scripts/verify_writing.rb && bundle exec ruby scripts/tests/test_writing.rb`

Expected: all commands exit 0; `/writing`, every article, and `/affiliate-disclosure` pass rendered verification.

- [ ] **Step 8: Commit rendering and disclosure**

```bash
git add _includes/writing-jsonld.html affiliate-disclosure.md _layouts/writing-article.html _includes/writing-meta.html _includes/site-footer.html writing.md scripts/verify_writing.rb scripts/tests/test_writing.rb
git commit -m "feat: render publication commercial metadata"
```

### Task 4: Publish the schema-v2 contract and run the full public gate

**Files:**
- Modify: `docs/WRITING-CONTRACT.md`
- Test: all existing repository verification scripts.

**Interfaces:**
- Consumes: Tasks 1 through 3.
- Produces: the stable schema-v2 authoring contract required by the private publisher plan.

- [ ] **Step 1: Update the Writing contract**

Document Publication families, schema-v1 digest compatibility, schema-v2 fields, the validation matrix, disclosure placement, commercial-link registry ownership, JSON-LD rules, and the public/private boundary. State that a strong Publication can have `commercial_intent: none`.

- [ ] **Step 2: Run the source and build gates**

Run: `bundle exec ruby scripts/verify_writing.rb --source-only && rm -rf _site && JEKYLL_ENV=production bundle exec jekyll build && bundle exec ruby scripts/verify_writing.rb`

Expected: all commands exit 0.

- [ ] **Step 3: Run the complete regression gate**

Run: `python3 scripts/verify_public_safety.py && python3 scripts/verify_viyu_positioning.py && python3 scripts/verify_work_with_me.py && python3 scripts/verify_portfolio_review.py && python3 scripts/verify_priority_discovery_plan.py && bundle exec ruby scripts/tests/test_writing.rb`

Expected: all commands exit 0.

- [ ] **Step 4: Commit the contract**

```bash
git add docs/WRITING-CONTRACT.md
git commit -m "docs: define publications schema contract"
```

- [ ] **Step 5: Verify the branch diff**

Run: `git diff --check origin/main...HEAD && git status --short`

Expected: no diff errors; only `.serena/` may remain untracked and must not enter a commit.
