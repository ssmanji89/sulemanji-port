# Redesign reference material

This directory provides selected copy, seven diagrams, and a frozen Home design.
The implementation adapts these inputs into the existing Jekyll site.
The `docs/` tree remains excluded from production output.

## Source and scope

The source is the final private preview at revision `159ce931d6aaa43b3fcd5dddcaad1c7fe6bb7eb3`.
Its production snapshot is `e12229f07dfabb9287a944200955f451bc83fc9c`.
The handoff inspects newer production revision `5ab5122b61a16ed0bb72067b8a346c67f3091bfa`.
Fetch current production source before implementation.

The preview establishes a concrete design direction. It does not establish final owner visual approval or production readiness.
It also does not establish the absence of existing paid or scheduled obligations.

| File | Use |
|---|---|
| [content.json](content.json) | Six cases, About copy, and the direct Viyu contact destination |
| [retained.json](retained.json) | Corrected career copy, retained practice notes, and preview-only privacy and redirect input |
| [home-reference.html](home-reference.html) | Self-contained Home design with embedded fonts and portrait |
| [diagram-manifest.json](diagram-manifest.json) | Diagram purpose, scope, captions, accessibility guidance, sources, and hashes |
| [source-provenance.json](source-provenance.json) | Source revisions, transformations, file sizes, and hashes |
| [Noto-Sans-OFL.txt](Noto-Sans-OFL.txt) | Upstream license for the fonts embedded in the frozen Home |

`retained.json` exactly matches the corrected preview data.
`content.json` uses that preview data with two historical case links changed to fixed public source revisions.
This prevents the new case pages from using evidence links that redirect back to themselves.
The frozen Home removes scripts and active menu controls. Its internal links open the private preview.
Its Writing cards illustrate the design at that snapshot. They do not define the current article collection.
No runtime builder or complete preview application is included.
The Noto Sans license comes from the [Google Fonts source](https://github.com/google/fonts/blob/main/ofl/notosans/OFL.txt).

## Implementation order

1. Read [the design](../../specs/2026-11-25-portfolio-redesign-design.md).
2. Read [the kickoff contract](../../specs/2026-11-25-portfolio-redesign.codex-kickoff.md).
3. Read [the implementation plan](../../plans/2026-11-25-portfolio-redesign/README.md).
4. Adapt the copy and design through the existing layouts, includes, and stylesheet owners.
5. Reconcile the retained privacy text with the actual production architecture and remaining servicing paths.
6. Apply the plan's obligation checks before redirecting quote, thanks, or terms routes.
7. Use the current Writing discovery catalog for every eligible article.

The reference data's blanket legacy-offer redirects belong to the preview.
The production plan preserves necessary existing-obligation servicing until a verified disposition permits retirement.
The preview's absence of forms and analytics does not establish the production privacy facts.

Do not copy preview indexing settings, stale article data, or a separate presentation system into production.
Do not use the old résumé PDFs as replacements for the corrected career copy.

## Diagram map

| File | Placement | Evidence scope |
|---|---|---|
| [system-map.svg](diagrams/system-map.svg) | Home | Conceptual portfolio map |
| [market-system.svg](diagrams/market-system.svg) | Market systems | Conceptual synthesis |
| [integration-boundary.svg](diagrams/integration-boundary.svg) | Integrations | Conceptual integration model |
| [knowledge-cycle.svg](diagrams/knowledge-cycle.svg) | Knowledge tools | Conceptual method |
| [operations-loop.svg](diagrams/operations-loop.svg) | Service operations | General operating method |
| [decision-horizons.svg](diagrams/decision-horizons.svg) | ff-cli | Abstraction of inspected decision and snapshot modules |
| [verification-paths.svg](diagrams/verification-paths.svg) | Mathematical verification | Abstraction of the public verification bundle |

The diagram design method adapts [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design).
The diagrams retain accessible titles, descriptions, and prefixed identifiers.
Keep captions and scope labels adjacent to the diagrams.
The professional diagram does not describe private Viyu architecture.

## Disclosure review

The reference includes public project links and approved general professional framing.
Private personal projects retain high-level descriptions and explicit state labels. They have no private source links.
The copy distinguishes research, prototypes, published packages, and working methods.
It preserves upstream attribution and makes no trading-performance or measured-business-outcome claim.

The reference contains no client records, private Viyu memory, internal infrastructure identifiers, credentials, or raw research exports.
The existing public-safety forbidden-pattern scan passes for these files.
That scan does not replace the independent disclosure review required before implementation publication.
