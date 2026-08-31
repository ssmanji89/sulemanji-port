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

## Re-test — filled in by Task 7
