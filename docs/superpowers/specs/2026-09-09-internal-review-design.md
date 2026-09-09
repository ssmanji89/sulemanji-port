# Cohesive portfolio — internal review design

Status: owner authorized implementation for internal review on 2026-09-09. This supersedes the earlier proposal-only state and three-concept selection prerequisite for this review branch. The current approved direction is the editorial engineering portfolio recommended in issue #17. Production deployment remains outside this request.

## Intent

The site presents Suleman Manji as an experienced Sr. Services Engineer at Viyu Network Solutions. His judgment and personality earn interest; the visitor's scenario determines the appropriate conversation and delivery organization. Professional opportunities for Suleman are not restricted to hobby help. Preserve the personal life-profile and employer identity.

## Concrete visual direction

Use a warm, quiet paper background (#f7f6f2), dark slate ink (#202e35), muted slate secondary text (#52616a), teal links (#245f61), white surfaces and subtle separators. Dark mode uses #17232a, #eef2ee, #b6c3c8 and a lighter teal accent. Serif display type (Georgia or an equivalent installed system serif), system sans body, monospace only for short metadata. No remote font dependency. Body 18px desktop/16px mobile, generous line-height; maximum main width 1160px, prose about 68ch. Headline 40–64px desktop/32–40px mobile; card titles 22–28px. No forced viewport-height hero, metrics billboard, fluorescent marquee or oversized uppercase headings.

The homepage has a personal introduction, visible Viyu role, existing real portrait at modest size, professional scope, selected work, one concrete method example, selected personal interests/writing, and a conversation link. It does not duplicate the whole Projects page or career timeline. Primary links: Explore my work and Start a conversation; Resume is still in navigation. The portrait is images/sulemanji-profile.png; do not fabricate personal imagery. New graphics are optional, not required to fill space.

One layout owns header, footer, theme and metadata. Main navigation retains all existing routes. All pages including contact subpages, resume, About, Beyond Work and existing notes receive the same readable components. Keep current content meaning, source dates and maturity labels. Improve existing case opening summaries and scannability without inventing results.

## Professional evidence boundary

Owner reports repeated M365 migration work and RFMS customer work. Public source already supports the broader migration role, but primary completion records and personal attribution for new cases have not been supplied. Build truthful practice notes for M365 and RFMS at the planned routes, explicitly labeled as practice notes rather than completed customer case studies. Use questions, dependencies and scope boundaries as useful guidance, not invented project outcomes. Do not publish the unverified engagement count, customer names, identifying metrics, partnership or endorsement. The issue #13/#14 outcome case study gates remain open. Existing source-backed case studies remain the delivered-work evidence.

## Contact contract

Root /work-with-me is a concise scenario page, using issue #16's exact proposed contact copy and already-public address. Organizational project links keep Suleman central and state Viyu delivery. Professional collaborations/opportunities go directly to him. Personal workshop intake moves to /work-with-me/personal. Preserve the old root #work-with-me-intake fragment as a link to the relocated form. Personal context is a hidden value=personal; remove professional and ai_business_operations choices from the visible personal form. Backend legacy enums remain unchanged. Preserve payload names, form/client IDs, CAPTCHA, honeypot, status region, validation, quote/thanks/terms URLs and the disabled checkout flag. No live submission or outbound communication.

## Identity and reach

Actual Sr. Services Engineer title is identical in visible and machine-readable identity. One Person identifier, accurate worksFor Viyu, published profile URLs. ProfilePage applies only to the actual profile page, mainEntity references Person; ordinary pages retain ordinary WebPage/Article types. Page-specific title/description/canonical/social previews are generated in one shared path. Do not claim search or conversion results. Use the existing portrait as the truthful social-image fallback; custom social artwork is deferred until needed, not an implementation blocker.

## Acceptance

No text, headings or long count values overflow at 320, 390, 768, 1024 and 1440px. At desktop and mobile the initial screen identifies Suleman, his role and a clear next action. Keyboard navigation includes visible skip link/focus; mobile navigation closes on Escape and returns focus, does not trap hidden links, and remains available without JavaScript. Theme persists across routes; reduced motion reveals all content. Long code/tables may scroll within their own container. No external link or form is activated during review.

Run real Jekyll build, existing safety/positioning/intake/priority checks, meaningful route/metadata verification and focused personal-form serialization check. Capture and inspect the rendered build. Browser limitations or unavailable private evidence must be recorded honestly. Internal review contains implementation, verification evidence and a draft PR or reviewable branch, not a production deployment.

## Decisions for this review

Ruling: implement the recommended editorial direction now for internal review — owner explicitly requested comprehensive implementation — a different visual preference would require a reversible presentation revision.
Ruling: use an isolated sibling worktree — avoids editing the fresh main checkout or committing worktree setup noise — the cost is a separate local path to manage.
Ruling: publish M365/RFMS practice notes, not unsupported outcome case studies — evidence remains insufficient for new customer claims — the cost is less outcome proof until primary records are supplied.
Ruling: use the already-public contact address and portrait — no approved replacement channel or artwork exists — contact routing and imagery may be revised after internal review.

## Dependencies and ownership

Root AGENTS.md owns all changed paths. Its policy pointer remains; document the new shared component and metadata ownership. Historical issue snapshots are context, not current execution state. This design overrides their conflicting proposed-only state and layout instructions. No GitHub Actions edits/runs, main push, merge, production deployment, CRM, worker schema or payment changes.
