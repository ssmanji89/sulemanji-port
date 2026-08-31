# UX Review — scenario walkthrough

updated 2026-08-30 program/ux-experience

## The friction ledger (spec — evidence from live walkthrough 2026-08-30)

| ID | Scenario | Friction | Persona hit |
|---|---|---|---|
| F1 | Land on home | Metaphor headline, no name-role-location line, no resume path above fold; nav labels cryptic (RANGE); lead stat is 2015-era (15K workstations) implying stale career | R, H |
| F2 | Click Work With Me (nav CTA) | Full agency funnel — "Bring me a messy problem" button, service chips ("AI Workflow Clinic"), quote/priority/terms subpages — reads freelancer-storefront against a personal profile; owner previously reverted exactly this drift | R, H, C |
| F3 | Click Story from nav | First two paragraphs are father's death and a post-9/11 assault — heavy disclosure with no opt-in framing for professional visitors | R, H |
| F4 | Try to learn "what does he do" | Bio is told 4 times (About, Story, Experience, Resume) with no page having one clear job; every page is long-form dense | H |
| F5 | Look for proof | Projects is a wall of mostly-`private` cards; public/linkable work and (incoming) case studies are not surfaced first; "few hundred repositories, most private" reads unverifiable | H, P |
| F6 | Any long page | No scan layer — no TL;DR, no section jump links; reading is the only mode | all |
| F7 | Home vs inner nav | Two different nav vocabularies (WORK/CAREER/RANGE vs Projects/Experience/Beyond Work) | all — being fixed by program/ui-unification; verify only |

## Baseline — 2026-08-30, before this branch's changes

10-second test per page (desktop screenshot, first screen only): *who is he, what does he do, where do I click next?*

| Page | Who | What | Next | Notes |
|---|---|---|---|---|
| Home (`/`) | No — a metaphor headline ("I turn messy operations into systems people can trust") with no name/role/location line | No — same | Partial — "Explore the work" / "Read the career", no resume CTA above the fold | Stat sidebar leads with 15K workstations (2015-era) before any current number (F1) |
| About (`/about`) | Yes, in the first line | Yes, one paragraph | No — no signposts visible in the first screen, long-form prose continues | Duplicates Story/Experience content (F4) |
| Story (`/story`) | Weak — "brakes to bytes" metaphor first | No | No | No opt-in preface before heavy personal content begins in the next screen (F3) |
| Experience (`/experience`) | Yes | Yes, one line | No | Dense timeline immediately, no scan layer (F6) |
| Projects (`/projects`) | No | Weak — hero lede says "a few hundred repositories, most of them private" before any proof | No | First screen is hero + honesty note, zero clickable proof artifacts visible (F5) |
| Resume (`/resume`) | Yes | Yes | N/A (destination page) | Reads as intended |
| Contact / Work With Me (`/work-with-me`) | No | No — reads as a freelance/agency intake funnel ("Bring me a messy problem", service chips) | Weak — intake form only | Full agency funnel against a personal profile (F2) |

Baseline verdict: mostly **no** across F1–F6, as expected. F7 is out of scope here (owned by `program/ui-unification`, already merged into this branch's base).

## Harness note

The harness's local static server (`scripts/ux_snapshot.sh`) needed a fix: Jekyll publishes extensionless permalinks (`about.html`, `projects.html`, ...) that a plain `python3 -m http.server` does not resolve for a request to `/about` — every inner page 404'd or (for `/work-with-me`, which collides with the `work-with-me/` subpages directory) showed a directory listing. Fixed by adding a small `.html`-fallback handler in the script; see its inline comment.

## Re-test — 2026-08-30, after Tasks 2–6

| ID | Friction | Fix applied | Status |
|---|---|---|---|
| F1 | No name/role/location, no resume path above fold, stale lead stat | Role line + `View resume`/`Selected work` CTAs directly under the headline (both fully visible in the first 900px desktop screen — verified in `index-desktop.png`); audience-paths row (Hiring?/Engineer?/long version); stat sidebar reordered to lead with Aug-2026 platform counts (141/307/240), legacy scale stats relabeled with era (`2015 era`, `2021–23 era`) | **CLOSED** (desktop) |
| F2 | Full agency funnel reading as freelancer storefront | Rewritten as two labeled lanes — "Bring it to me" (home/hobby-scale, keeps the existing intake/quote/priority/terms machinery) and "Bring it to Viyu" (referral, one paragraph + link) — first link on the page is now `View resume`; nav label changed `Work With Me` → `Contact` (URL unchanged) | **CLOSED** |
| F3 | Heavy disclosure (father's death, assault) with no opt-in | Italic opt-in preface inserted before "Houston" pointing professional visitors to About/Experience; story content itself untouched | **CLOSED** |
| F4 | Bio told 4x, no page with one clear job | About rewritten to a 205-word one-screen summary (thesis + pattern paragraph + 3-sentence "right now" + 3 signposts); Story demoted from primary nav (still reachable via About/home) | **CLOSED** |
| F5 | Projects a wall of mostly-private cards, no proof-first ordering | Restructured into Proof (case studies + public/linkable work) → Production systems (single consolidated, honesty-noted, trimmed-card section) → Experiments; first screen on `/projects` shows the hero plus 3 clickable proof cards | **CLOSED** |
| F6 | No scan layer on long pages | `.tldr` In-brief blocks added to experience.md, beyond.md, case-studies/agentic-msp-delivery.md, notes/agent-safety-from-incidents.md; jump-links row (one per employer) added to experience.md | **CLOSED** |
| F7 | Two nav vocabularies (home vs inner pages) | Verify-only per plan. Confirmed: `index.html` renders the same shared `{% include nav.html %}` as every inner page (program/ui-unification's fix); all 7 harness screenshots show identical nav labels (Home/About/Experience/Projects/Contact/Beyond Work/Resume) on every page | **CLOSED** (verified, not this branch's work) |

**OWNER-TASTE / deferred:** the hero headline's mobile (375px) type clips at the viewport's right edge (`index-mobile.png`) — pre-existing in the `@media (max-width:680px) { .hero h1 { font-size: clamp(3.1rem,16vw,5.2rem); } }` rule inherited from `program/ui-unification`, unrelated to this branch's diff (confirmed identical clipping pattern across every harness run in this session, before and after all content edits). Task 2's acceptance check is desktop-only (`index-desktop.png`), so it is not gating this plan's closure, but it's a real mobile rendering issue worth a follow-up.
