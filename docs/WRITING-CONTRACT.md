# Writing contract v1

Owner: root `AGENTS.md`. Scope: the Writing index and new `notes/*.md` articles.
Program: issue #21. `docs/PUBLIC-CLAIMS-POLICY.md` remains controlling. This
contract is structural and editorial guidance; it is not publication permission
and it does not replace independent source/content/privacy review.

## Content and audience

Writing explains technology decisions inside operating businesses. Microsoft 365,
acquisition integration, identity, business applications, infrastructure, service
operations, and AI-assisted delivery form the initial editorial pool. Each article
must have one identifiable reader, one useful question, and a non-trivial point of
view. Distinguish sourced fact, interpretation, opinion, and proposed experiments.
Do not manufacture personal experience to make a draft engaging.

Writing is not a replacement for case studies or the chronicle. Existing case and
evidence gates stay open until their own acceptance evidence exists. Organizational
delivery remains through Viyu with Suleman retained in the conversation;
professional opportunities and collaboration may reach Suleman directly. Do not
imply an independent consultancy, fee arrangement, availability guarantee, or
delivery commitment.

## Files and metadata

Use flat `notes/<slug>.md` files. New files use `writing_schema: 1` and
`layout: writing-article`; their permalink is `/notes/<slug>` with the same
lowercase kebab-case slug. The layout owns the article H1, so article bodies begin
at H2. ATX H1s, indented ATX H1s, and Setext H1s are all forbidden in article
bodies. The layout inherits the shared `default` shell.

Required fields for schema-v1 articles:

- `writing_schema: 1`
- `layout: writing-article`
- plain-text `title` and `description`
- `permalink: /notes/<slug>`
- boolean `published`
- `article_type`
- `time_horizon`
- `reader`
- one to four unique `topics`

`published_on` is required for intended-public articles. `updated_on` is optional.
No other front-matter fields are accepted in schema v1. Descriptive values are
plain text without HTML tags or Liquid directives. Executable Liquid, raw HTML,
and Kramdown inline/block attribute-list syntax (`{: ...}`) are forbidden in new
article bodies; use ordinary Markdown syntax instead. Literal Liquid examples must
be escaped rather than left as template syntax.

Rendered article-body links may use same-site root-relative paths, same-page
fragments, `https://` URLs without embedded credentials, or `mailto:` URLs.
Root-relative paths must use forward slashes only. Protocol-relative URLs,
backslashes, ASCII control characters, and all other schemes are rejected by the
Writing release gate.

`published` is a real YAML boolean. It controls intended build visibility only; it
does not attest editorial review or authorize merge. A public Git branch is public
history even when a page has `published: false`.

`published_on` and `updated_on` are quoted ISO `YYYY-MM-DD` strings. Never
substitute generation, research, commit, or review time for publication time.
Intended-public articles cannot be future-dated. Updates cannot precede publication
or exceed the validation date. Unpublished drafts have null or absent publication
dates. The source gate defaults to the current America/Chicago date; `--as-of`
freezes a validation date.

Allowed labels live in `_data/writing.yml`. Expanding the vocabulary is a reviewed
data change, not a reason to introduce archives or filtering UI.

## Index and legacy content

Only eligible schema-v1 intended-public notes enter the dated index. Order them by
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
review duties. The WR-P1 foundation creates no new real article.

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
