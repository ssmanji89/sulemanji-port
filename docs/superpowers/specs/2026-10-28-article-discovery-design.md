# Public article discovery design

Date: 2026-10-28 (America/Chicago)
Status: Reconstructed implementation input on 2026-10-30 because the reviewed patch was unavailable.

## Goal

Make every public Writing article discoverable, attributable, and safe to share.
Keep GitHub Pages as the origin behind Cloudflare.

## Contracts

1. `_data/crawler-policy.yml` defines allowed search and retrieval clients.
   It also preserves the 32 restricted client tokens observed before the change.
2. `_plugins/writing_discovery.rb` consumes `WritingContract.catalog`.
   The Writing page, Atom feed, and sitemap use the validated public catalog.
3. Every public article has one visible author link and one Article or BlogPosting node.
   Each dated article has one deterministic 1200 by 630 social image.
4. Registered commercial links keep their exact href and receive `sponsored nofollow`.
   Existing disclosure placement rules remain authoritative.
5. `_data/article-context.yml` is an explicit allowlist for professional context.
   Unlisted articles receive no business section.
6. The release workflow validates pull requests and deploys only eligible `main` runs.
   All production runs use the same Pages concurrency group.

## Boundaries

- Keep article source bodies and frozen schema-v1 hashes unchanged.
- Keep the undated legacy note in Writing and the sitemap, but not the Atom feed.
- Exclude drafts, future items, private paths, and noindex pages.
- Use recorded publication dates. Do not use build time as article metadata.
- Keep source deployment, Cloudflare policy, live access, indexing, and citations separate.
- Preserve Cloudflare AI training restrictions and unrelated security controls.

## Verification

Run source, production build, rendered, discovery, safety, site, Ruby, Python, Worker,
base URL, image-dimension, and live smoke checks. Obtain an independent branch review.

