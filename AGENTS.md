# Agent instructions for this repo

Any agent writing public content in this repo (site pages, resume, PDFs, case studies,
field notes, READMEs, PR descriptions, social copy) MUST read
`docs/PUBLIC-CLAIMS-POLICY.md` and pass `scripts/verify_public_safety.py` before
committing content.

## Shared presentation ownership

`_layouts/default.html` owns the document, unique `main` landmark, skip link,
front-matter hero (`hero_title`, `hero_lede`, `hero_ctas`, and signals), and script
loading. `_includes/site-header.html`, `_includes/nav.html`, and
`_includes/site-footer.html` own the shared navigation and shell. The homepage
uses this layout; do not add a second standalone document or stylesheet system.
`page.body_class` is optional; `page.wide_content` widens `.page` for editorial
grids. Existing pages retain the readable `.page` and hero contracts.

`assets/css/components/theme.css` owns palette/type tokens;
`assets/css/style.scss` owns shared components and homepage presentation.
`_includes/head-custom.html` and Jekyll SEO in the layout own shared metadata;
page front matter supplies page-specific identity. `_config.yml` owns the Person
values and truthful default social image; `_includes/person-schema.html` emits the
single stable Person identity and a ProfilePage only when `profile_page: true`.
Leave SEO author defaults unset: jekyll-seo-tag 2.8 cannot attach the shared Person
ID to its author object. Its page schema and the explicit Person remain separate.
Keep metadata changes in that shared path. Navigation remains available without JavaScript; only enable the
mobile disclosure after its handlers are attached.

## Public build boundary

`_config.yml` must exclude agent instructions, operational logs, repository scripts,
worker source, documentation, and dependency trees from the generated public site.
`scripts/verify_portfolio_review.py` enforces this boundary against `_site`.
