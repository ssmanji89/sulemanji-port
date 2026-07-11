# Work With Me Services Design Spec

## Summary

Add a portfolio-native **Work With Me** surface to `www.sulemanji.com`.
The goal is to make it obvious how a visitor can bring Suleman a practical
automation, AI workflow, repo, or operations problem without turning the site
into an agency brochure or SaaS landing page.

This supersedes the narrower unpublished AI Workflow Clinic plan as the Phase 1
boundary. **AI Workflow Clinic** remains the lead offer, but it should live
inside a broader work-with-me page that also explains adjacent ways people can
ask for help.

## Evidence Reviewed

- Published repo/worktree:
  `/Users/sulemanmanji/tmp/sulemanji-viyu-positioning-sdd`
- Published remote: `https://github.com/ssmanji89/sulemanji-port.git`
- Published head at design time: `55a4f33`
- Current public navigation:
  `Home`, `About`, `Story`, `Experience`, `Projects`, `Beyond Work`,
  `Resume`
- Current public pages:
  `index.md`, `about.md`, `story.md`, `experience.md`, `projects.md`,
  `beyond.md`, `resume.md`
- Unpublished prior planning artifacts on the old
  `ai-workflow-clinic-planning` branch:
  - `docs/superpowers/specs/2026-07-11-ai-workflow-clinic-design.md`
  - `docs/superpowers/plans/2026-07-11-ai-workflow-clinic.md`

## Root Cause

The prior AI Workflow Clinic work was planned but never published. The planning
commit remained on the older `ai-workflow-clinic-planning` branch and was not
included in the clean branch that was pushed to `main`.

The published site also has an information-architecture gap: it explains who
Suleman is and what he has built, but it does not clearly answer how a visitor
can work with him. There is no offer page, no services page, no homepage
customer-facing CTA, and no navigation entry for practical working sessions.

## Goals

- Add a new public page at `/work-with-me`.
- Add a top-level navigation item named `Work With Me`, placed after
  `Projects` and before `Beyond Work`.
- Add a homepage CTA path to `/work-with-me`.
- Make **AI Workflow Clinic** the lead offer on the new page.
- Present two adjacent lightweight help modes:
  - `Automation / Ops Systems Review`
  - `Build Path / Technical Triage`
- Keep the page portfolio-native, first-person, practical, and understated.
- Use email as the only first-contact mechanism:
  `mailto:ssmanji89@gmail.com?subject=Work%20With%20Me`
- Include explicit safety and boundary language.
- Avoid adding pricing, Stripe, booking flows, forms, or a backend.

## Non-Goals

- Do not add pricing tables.
- Do not add Stripe checkout or payment links.
- Do not add Google Calendar, Calendly, Google Forms, intake forms, or a custom
  booking backend in this phase.
- Do not create a separate agency brand, Brakes & Bytes brand, or productized
  service brand.
- Do not mention mechanic quote audits or vehicle-repair invoice review.
- Do not expand the broader biography/profile content in this phase.
- Do not redesign the site layout or add new CSS unless existing components
  cannot express the page.
- Do not imply one session guarantees production deployment.
- Do not ask visitors to send secrets, production credentials, employer/client
  access, regulated records, or private third-party data.

## Approved Approach

Use a single **Work With Me** page as the customer-facing surface.

The page should read as an extension of the existing portfolio: "Here are the
practical ways to bring me a messy problem." It should not read like a generic
consulting services page. The offer language should emphasize working sessions,
triage, workflow mapping, scoped next steps, and safer automation boundaries.

Rejected alternatives:

- AI Workflow Clinic page only: fixes the missing page, but is too narrow and
  does not explain the adjacent customer-facing work.
- Homepage CTA only: too easy to miss and lacks room for fit/boundary language.
- Full services/business funnel: too heavy for this phase and risks making the
  portfolio feel sales-led.

## Page Model

### Page

Create:

`work-with-me.md`

Published URL:

`/work-with-me`

Use the existing `default` layout, hero front matter, card grids, and CTA button
styles.

### Navigation

Add:

```yaml
- title: Work With Me
  url: /work-with-me
```

Place it after:

```yaml
- title: Projects
  url: /projects
```

and before:

```yaml
- title: Beyond Work
  url: /beyond
```

### Homepage

Update `index.md` so the offer appears as a natural portfolio next step:

- Add `Work With Me` as a hero CTA.
- Add a first card under `## Where to go next` linking to `/work-with-me`.
- Keep the homepage primarily a portfolio, not a sales page.

## Offer Content

### Lead Offer: AI Workflow Clinic

Positioning:

Hands-on working sessions for people trying to automate messy work.

Good examples:

- messy workflow triage
- stuck AI-assisted process
- half-built automation
- repo or AI-built app rescue
- prompt/rules/process cleanup
- Claude, Codex, Cursor, and similar agentic working patterns
- Google Workspace automation
- n8n, Zapier, Make, or similar workflow mapping
- agent boundaries and human-in-the-loop guardrails

Tool names may appear as examples, but the offer should not be defined by a
single tool.

### Adjacent Offer: Automation / Ops Systems Review

Positioning:

For individuals, founders, solo operators, builders, creators, and small
business owners whose recurring work is scattered across tickets, documents,
spreadsheets, email, forms, Google Workspace, workflow tools, or internal
systems.

The outcome is a clearer operating map: what to automate, what to leave human,
what evidence or handoffs are missing, and what the first practical automation
slice should be.

### Adjacent Offer: Build Path / Technical Triage

Positioning:

For people with a rough idea, broken prototype, AI-built app, stalled repo, or
unclear "should this be automated?" problem.

The outcome is a realistic build path, risk list, next-step checklist, or
decision not to automate yet.

## Boundary Language

The page must clearly say:

- Do not send secrets.
- Do not send API keys, passwords, tokens, production credentials, or private
  third-party data.
- A first working session does not require custody of production systems.
- This is not regulated legal, medical, financial, or compliance advice.
- One session may produce a plan, map, prototype direction, cleanup path, or
  next-step checklist; it does not guarantee production deployment.
- Sanitized examples are preferred.

## Design Mechanics

### Architecture

This is a static Jekyll content change. It should add one new public Markdown
page, one navigation entry, one homepage entry point, and one verifier script.
No backend, forms, checkout, pricing engine, or new layout system is needed.

### Components

- `work-with-me.md`: new public offer page.
- `_data/navigation.yml`: navigation entry.
- `index.md`: homepage hero CTA and "Where to go next" card.
- `scripts/verify_work_with_me.py`: stdlib verifier for content and routing.

### Data Flow

The flow is static:

1. Markdown/front matter defines the page and CTAs.
2. Jekyll renders the page and navigation.
3. Visitors click email links to start contact.

No visitor data is collected by the site in this phase.

### Error Handling

The verifier should fail closed. It should exit non-zero if the page, nav,
homepage link, email CTA, offer names, boundary language, or forbidden-language
checks fail.

### Testing

Verification is content/build testing:

- Run `python3 scripts/verify_work_with_me.py`.
- Run `bundle exec jekyll build`.
- Confirm `_site/work-with-me.html` exists after build.
- Scan source and generated output for forbidden terms:
  `Stripe`, `pricing`, `Calendly`, `Google Form`, `mechanic quote`,
  `vehicle repair`, and `Brakes & Bytes`.

## Verification Requirements

Implementation is complete only when:

- `work-with-me.md` exists and builds to `/work-with-me`.
- `_data/navigation.yml` includes `Work With Me` after `Projects` and before
  `Beyond Work`.
- `index.md` links to `/work-with-me` from the hero CTA or homepage card.
- `work-with-me.md` includes `AI Workflow Clinic`.
- `work-with-me.md` includes `Automation / Ops Systems Review`.
- `work-with-me.md` includes `Build Path / Technical Triage`.
- The page includes `mailto:ssmanji89@gmail.com?subject=Work%20With%20Me`.
- The page warns against sending secrets.
- The page warns against private third-party data.
- The page says no production credential custody is needed in a first working
  session.
- The page does not mention Stripe, pricing tables, booking forms, mechanic
  quote audits, vehicle-repair invoice review, or Brakes & Bytes branding.
- `bundle exec jekyll build` succeeds.
