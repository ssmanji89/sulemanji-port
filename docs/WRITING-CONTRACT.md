# Writing contract v2

Owner: root `AGENTS.md`. Scope: the Writing index and new `notes/*.md` articles.
Program: issue #21. `docs/PUBLIC-CLAIMS-POLICY.md` remains controlling. This
contract is structural and editorial guidance; it is not publication permission
and it does not replace independent source/content/privacy review.

## Content and audience

Writing publishes professional analysis, technical guides, research notes,
product-category guides, field notes, and experiments under one identity.
Technology and service engineering remain core subjects. Current research and
defensible interests in software, finance, science, history, home automation,
gardening, biology, and related fields can also qualify. Each Publication must
have one identifiable reader, one useful question, and a non-trivial point of
view. Distinguish sourced fact, interpretation, opinion, and proposed experiments.
Do not manufacture personal experience to make a draft engaging.

Editorial value comes first. A Publication must remain useful without a
commercial link. A strong Publication can use `commercial_intent: none`; weak
commercial fit is not a reason to suppress it or insert an unrelated offer.

Writing is not a replacement for case studies or the chronicle. Existing case and
evidence gates stay open until their own acceptance evidence exists. Organizational
delivery remains through Viyu with Suleman retained in the conversation;
professional opportunities and collaboration may reach Suleman directly. Do not
imply an independent consultancy, fee arrangement, availability guarantee, or
delivery commitment.

## Files and metadata

Use flat `notes/<slug>.md` files. New or edited files use `writing_schema: 2` and
`layout: writing-article`; their permalink is `/notes/<slug>` with the same
lowercase kebab-case slug. The layout owns the article H1, so article bodies begin
at H2. Article bodies cannot contain an H1 that Kramdown recognizes, regardless
of Markdown nesting or container structure. The source gate also rejects ATX H1
forms with zero to three leading spaces. The layout inherits the shared `default`
shell.

Existing schema-v1 articles remain valid only while their complete source-file
SHA-256 matches `_data/writing.yml`. Any source change requires migration to
schema v2. The digest map is a compatibility boundary, not an authoring option.

Required fields for schema-v2 Publications:

- `writing_schema: 2`
- `layout: writing-article`
- plain-text `title` and `description`
- `permalink: /notes/<slug>`
- boolean `published`
- `publication_family`
- `commercial_intent`
- boolean `disclosure_required`
- `time_horizon`
- `reader`
- one to four unique `topics`

`published_on` is required for intended-public articles. `updated_on` is optional.
`social_image` and boolean `noindex` are optional. No other front-matter fields
are accepted in schema v2. Descriptive values are
plain text without HTML tags or Liquid directives. Executable Liquid, raw HTML,
and Kramdown inline/block attribute-list syntax (`{: ...}`) are forbidden in new
article bodies; use ordinary Markdown syntax instead. Literal Liquid examples must
be escaped rather than left as template syntax.

Rendered article-body links may use same-site root-relative paths, same-page
fragments, `https://` URLs without embedded credentials, or `mailto:` URLs.
Root-relative paths must use forward slashes only. The release gate evaluates
ASCII control characters in the raw rendered href before trimming, normalization,
parsing, or scheme classification. Protocol-relative URLs, backslashes, ASCII
control characters, and all other schemes are rejected by the Writing release gate.

`published` is a real YAML boolean. It controls intended build visibility only; it
does not attest editorial review or authorize merge. A public Git branch is public
history even when a page has `published: false`.

`published_on` and `updated_on` are quoted ISO `YYYY-MM-DD` strings. Never
substitute generation, research, commit, or review time for publication time.
Future-dated articles remain excluded from Writing, feed, and sitemap discovery
until their publication date. The build marks any rendered future route as
`noindex,follow`. An article with `noindex: true` remains excluded and receives the
same rendered robots metadata. Updates cannot precede publication. Updates for an
active article cannot exceed the validation date. Unpublished drafts have null or
absent publication dates. The source gate defaults to the current America/Chicago
date; `--as-of` freezes a validation date.

Allowed labels live in `_data/writing.yml`. Expanding the vocabulary is a reviewed
data change, not a reason to introduce archives or filtering UI.

Allowed `publication_family` values are `professional-analysis`,
`technical-guide`, `research-note`, `product-category-guide`, `field-note`, and
`experiment`. Allowed `commercial_intent` values are `none`, `affiliate`,
`referral`, `sponsorship`, `paid-recommendation`, `own-product`, and `mixed`.

## Commercial relationships and disclosure

`_data/commercial-links.yml` owns public detection patterns and minimum disclosure
copy. It contains no private account registry. The private publisher verifies the
expected program account identifier separately.

The validation matrix is:

| Intent | `disclosure_required` | Required visible evidence |
| --- | --- | --- |
| `none` | `false` | No detected commercial link or declared material relationship. |
| `affiliate` or `referral` | `true` | A matching registered link and the applicable disclosure. |
| `sponsorship` | `true` | The named sponsor and the material payment or support. |
| `paid-recommendation` | `true` | The named payer and the paid recommendation. |
| `own-product` | `true` | Ownership language and a matching owned offer. |
| `mixed` | `true` | At least two relationship types and every applicable disclosure. |

Place each disclosure before the first related link or promotion. A footer-only
statement does not satisfy an article disclosure. Amazon links require the exact
statement “As an Amazon Associate I earn from qualifying purchases.” The durable
`/affiliate-disclosure` page repeats this statement and explains other commercial
relationships.

Unknown commercial patterns, mismatched intent, missing disclosure, and account
identifier mutation fail publication. Do not cloak Amazon links, state durable
prices, or imply seller, manufacturer, or program endorsement.

Known commercial short links, including `amzn.to`, fail until the publisher
expands and verifies their final destination. General contact routes such as
`/work-with-me` are not owned products. Register a specific offer route before
using `own-product` intent.

## Structured data

Schema-v2 Publication pages emit visible-content JSON-LD. Professional analysis
and technical guides use `Article`; the other Publication families use
`BlogPosting`. The node binds the visible title, description, canonical URL,
dates, and shared Person author identity.

Do not emit `Review` unless the visible page performs a real disclosed review.
Do not emit `Product` on a Publication page. Never emit ratings, prices,
availability, or hands-on claims without current visible evidence.

## Index and legacy content

Eligible schema-v1 compatibility articles and schema-v2 intended-public notes
enter the same dated index. Order them by
publication date descending and permalink ascending within the same date. Feature
the first exactly once and list the rest without duplicates. `updated_on` does not
move an older article to the top.

`_data/writing.yml` contains an explicit `legacy_paths` list for the pre-contract
note. Legacy content remains under **Earlier writing** without an invented date,
schema, or review badge. Listing legacy content does not reapprove it. Never add a
new file to `legacy_paths` merely to bypass schema validation. Reclassifying or
editing legacy content requires its own evidence/content review.

Malformed or unregistered new metadata must fail the source gate rather than
silently disappearing from the index. All intended-public article routes are
checked after a clean production build.

## Review and evidence

Private research, claim ledgers, customer context, mappings, credentials, and raw
operational evidence stay outside public Git history. Public factual cores use
public primary/authoritative sources unless a separately approved evidence path
allows otherwise.

A `source_reviewed` boolean is deliberately not part of this schema. Independent
review evidence is bound to the exact article head and relevant dependencies.
There is no self-issued CLEAN. Material content, source, policy, base, or dependency
changes invalidate applicable clearance. Review/fix is capped at three rounds
under the project LOOP rules.

A successful structural or HTML check does not prove argument quality,
attribution, privacy, technical advice, or reader comprehension. Those remain
review duties. Commercial review must also check claims, editorial independence,
program identity, disclosure placement, and every material relationship.

Private research, candidate queues, opportunity scores, program terms, financial
goals, revenue reports, and approval receipts stay outside public Git history.
Memory can identify a topic; it does not become public proof. Public pages never
link to private ledgers.

## Local validation

Before review, run:

```bash
bundle exec ruby scripts/verify_writing.rb --source-only
JEKYLL_ENV=production bundle exec jekyll build
bundle exec ruby scripts/verify_writing.rb
python3 scripts/verify_public_safety.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/verify_work_with_me.py
python3 scripts/verify_portfolio_review.py
python3 scripts/verify_priority_discovery_plan.py
bundle exec ruby scripts/tests/test_writing.rb
```

Build from a clean destination without `--unpublished`, `--drafts`, `--future`, or
incremental-build flags. Synthetic tests use temporary directories outside the
source tree. Do not put fixtures in production `notes/`, weaken existing checks,
or install/repair unrelated `blog_automation` dependencies as part of this slice.

These are release checks, not an unbypassable security mechanism. A later
publisher must still require independent current-head clearance and verify the
actual public article plus `/writing` after merge.
