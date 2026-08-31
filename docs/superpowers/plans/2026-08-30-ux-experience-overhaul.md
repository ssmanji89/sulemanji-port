# UX Experience Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **PREREQUISITE: branch `program/ui-unification` must be merged (or this branch cut from it) — this plan layers IA/UX on the unified visual system.** Branch: `program/ux-experience`. All content rules in `~/Documents/GitHub/portfolio-audit/2026-08-30/AGENT-CLAIMS-POLICY.md` bind every task.

**Goal:** Fix the scenario-level failures that make visitors leave: give each visitor type a 10-second path, collapse the four-times-told bio, soften the consulting funnel back to a personal-site contact, gate the heavy personal disclosures behind an opt-in, and make Projects proof-first.

**Architecture:** Persona-scenario driven. Four personas — R (recruiter, 10 seconds), H (hiring manager, 3 minutes), P (peer engineer, wants code/demos), C (curious/potential collaborator). Each task closes named friction items from the ledger below. Acceptance = the existing verifier gates (updated red→green where behavior changes) plus a repeatable 10-second screenshot test.

**Tech Stack:** Jekyll pages + `_data/navigation.yml` + `scripts/verify_*.py` gates + headless-Chrome screenshot harness.

---

## The friction ledger (spec — evidence from live walkthrough 2026-08-30)

| ID | Scenario | Friction | Persona hit |
|---|---|---|---|
| F1 | Land on home | Metaphor headline, no name-role-location line, no resume path above fold; nav labels cryptic (RANGE); lead stat is 2015-era (15K workstations) implying stale career | R, H |
| F2 | Click Work With Me (nav CTA) | Full agency funnel — "Bring me a messy problem" button, service chips ("AI Workflow Clinic"), quote/priority/terms subpages — reads freelancer-storefront against a personal profile; owner previously reverted exactly this drift | R, H, C |
| F3 | Click Story from nav | First two paragraphs are father's death and a post-9/11 assault — heavy disclosure with no opt-in framing for professional visitors | R, H |
| F4 | Try to learn "what does he do" | Bio is told 4 times (About, Story, Experience, Resume) with no page having one clear job; every page is long-form dense | H |
| F5 | Look for proof | Projects is a wall of mostly-`private` cards; public/linkable work and (incoming) case studies are not surfaced first; "few hundred repositories, most private" reads unverifiable | H, P |
| F6 | Any long page | No scan layer — no TL;DR, no section jump links; reading is the only mode | all |
| F7 | Home vs inner nav | Two different nav vocabularies (WORK/CAREER/RANGE vs Projects/Experience/Beyond Work) | all — **being fixed by program/ui-unification; verify only** |

---

### Task 1: 10-second acceptance harness

**Files:**
- Create: `scripts/ux_snapshot.sh`

- [ ] **Step 1: Write the harness**

```bash
#!/usr/bin/env bash
# Screenshots the top of every page at desktop+mobile for the 10-second test.
set -euo pipefail
cd "$(dirname "$0")/.."
bundle exec jekyll build
( cd _site && python3 -m http.server 4111 & echo $! > /tmp/ux_srv.pid )
sleep 2
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v chromium || command -v google-chrome)"
mkdir -p docs/ux-shots
for p in "index:/" "projects:/projects" "about:/about" "resume:/resume" "experience:/experience" "contact:/work-with-me" "story:/story"; do
  name="${p%%:*}"; path="${p#*:}"
  "$CHROME" --headless --disable-gpu --window-size=1280,900 --screenshot="docs/ux-shots/${name}-desktop.png" "http://localhost:4111${path}" 2>/dev/null
  "$CHROME" --headless --disable-gpu --window-size=375,812 --screenshot="docs/ux-shots/${name}-mobile.png" "http://localhost:4111${path}" 2>/dev/null
done
kill "$(cat /tmp/ux_srv.pid)"; ls -la docs/ux-shots/
```

- [ ] **Step 2: Run it, LOOK at every image, and record the baseline** — for each desktop shot answer in `docs/UX-REVIEW-scenarios.md` (create it; copy the friction ledger from this plan as its header): "within this first screen: who is he, what does he do, where do I click next?" Baseline = mostly "no".

- [ ] **Step 3: Commit**

```bash
git checkout -b program/ux-experience
git add scripts/ux_snapshot.sh docs/UX-REVIEW-scenarios.md docs/ux-shots
git commit -m "test: add 10-second UX snapshot harness and scenario baseline"
```

### Task 2: Home wayfinding (closes F1)

**Files:**
- Modify: `index.html` (hero block + stats sidebar)

- [ ] **Step 1: Role line + CTAs.** Directly under the hero headline (keep the headline — it is the brand voice; the fix is grounding it), add: a plain line `Suleman Manji — Sr. Services Engineer at a managed IT services provider, Houston. I build the agentic-LLM systems the service work runs through.` and two buttons styled per the unified system: `View resume → /resume` (primary) and `Selected work → /projects` (secondary).

- [ ] **Step 2: Audience paths block.** After the hero (before the first content section) add a 3-item row: `Hiring? → /resume` · `Engineer? → /case-studies/agentic-msp-delivery` · `The long version → /about`. One line each, mono small-caps labels.

- [ ] **Step 3: Stat recency.** Reorder the stats sidebar so current-era numbers lead (141 CLI commands · 307 skills · 240 tests — pull exact phrasings from AGENT-CLAIMS-POLICY §3 whitelist), and re-label the legacy scale stats with their era explicitly (`15K workstations · 2015 era`). Do not delete them — label them.

- [ ] **Step 4: Verify + commit**

Run: `./scripts/ux_snapshot.sh` — re-answer the 10-second test for `index-desktop.png`: all three answers must now be "yes". Then `python3 scripts/verify_viyu_positioning.py && python3 scripts/verify_public_safety.py` — both pass.

```bash
git add index.html docs/ux-shots
git commit -m "feat: home wayfinding — role line, resume CTA, audience paths, stat recency labels"
```

### Task 3: Soften Work With Me to a personal contact page (closes F2)

**Files:**
- Modify: `work-with-me.md` (copy only — page and subpages REMAIN, verifier requires them)
- Modify: `_data/navigation.yml` (display title only)
- Modify: `scripts/verify_work_with_me.py` (expectations that change, red→green)

- [ ] **Step 1 (red): Change the nav display title** from `Work With Me` to `Contact` in `navigation.yml` (URL stays `/work-with-me`; the verifier's nav-order regex matches `- title: Work With Me\s+url: /work-with-me` — run `python3 scripts/verify_work_with_me.py` and confirm it now FAILS on the nav-order assertion).

- [ ] **Step 2 (green): Update the verifier's nav regex** to `- title: Contact\s+url: /work-with-me` (keep the Projects→(this)→Beyond Work order assertion intact). Re-run — nav assertion passes.

- [ ] **Step 3: Rewrite the copy to the OWNER-STATED concept (corrected 2026-08-30).** The page's real purpose: Suleman is a full-time engineer at Viyu Network Solutions; personally he takes on **home-level / hobby-scale** problems, and anything **business-grade routes to Viyu**. On `work-with-me.md`: hero becomes `Got something messy?` with lede: `I'm a full-time engineer at Viyu Network Solutions, and I like it that way. On my own time I take on a small number of home-level and hobby-scale problems — a workflow that annoys you, a script that half-works, an automation idea you can't untangle. If it's business-grade — managed IT, cloud hosting, security, Microsoft 365 at company scale — that's exactly what my team at Viyu does all day, and I'd rather introduce you to them than moonlight at it.` Keep the "messy" wording (verifier requires it). Restructure the body into TWO clearly-labeled lanes: **"Bring it to me"** (hobby/home-scale — keep the intake link and the existing quote/priority/terms machinery behind this lane only) and **"Bring it to Viyu"** (professional scope — one short paragraph + a link to https://www.viyu.net with `I'll make the introduction myself — mention this page.`). Demote the service-chip row to plain prose inside lane one; the FIRST link on the page stays `View resume` for hiring traffic. Do not delete the quote/priority/terms subpages (verifier-required). Run `python3 scripts/verify_work_with_me.py` after — its forbidden-pattern list includes "agency branding"; the Viyu lane is a referral to his employer, which is permitted, but re-read the copy against every forbidden pattern before committing.

- [ ] **Step 4: Verify + commit**

Run: `bundle exec jekyll build && python3 scripts/verify_work_with_me.py && python3 scripts/verify_public_safety.py`
Expected: all pass (build first so `_site` checks resolve).

```bash
git add work-with-me.md _data/navigation.yml scripts/verify_work_with_me.py
git commit -m "content: reframe work-with-me as personal contact page; nav label Contact"
```

### Task 4: One-job-per-page bio (closes F3, F4)

**Files:**
- Modify: `about.md`, `story.md`, `_data/navigation.yml`, `index.html` (if Story link present in its nav)

- [ ] **Step 1: About = the one-screen professional summary.** Rewrite `about.md` to ≤ 350 words: who/role (thesis sentence from ui-unification stays), the recurring career pattern (one paragraph), current work in three plain sentences, then three signposts: `The full timeline → /experience`, `Selected work → /projects`, `The long, personal version → /story`. Cut everything now duplicated by Experience/Story.

- [ ] **Step 2: Gate Story with an opt-in preface.** At the top of `story.md`, before "Houston", insert: `*This is the long, personal version — childhood, the brake shop, the hard parts, twenty years of it. If you're here professionally, [About](/about) and [Experience](/experience) are the short path. If you want the whole story, read on.*` Change NOTHING else in story.md — no reordering, no cuts, no new disclosures (the published beats were owner-approved; altering them is out of scope).

- [ ] **Step 3: Demote Story from primary nav** — remove its `navigation.yml` entry (it stays reachable via About's signpost and the home "long version" path). Update the verifier ONLY if it asserts Story in nav (check first: `grep -n -i story scripts/verify_*.py` — if no hits, no verifier change).

- [ ] **Step 4: Verify + commit**

Run: `bundle exec jekyll build && python3 scripts/verify_work_with_me.py && python3 scripts/verify_viyu_positioning.py && python3 scripts/verify_public_safety.py && ./scripts/ux_snapshot.sh`
Expected: all gates pass (about.md must keep its positioning strings — check `verify_viyu_positioning.py`'s about.md list survives the rewrite); `about-desktop.png` now answers the 3-minute question in one screen.

```bash
git add about.md story.md _data/navigation.yml docs/ux-shots
git commit -m "content: one-job-per-page bio — about as summary, story gated and demoted"
```

### Task 5: Proof-first Projects (closes F5)

**Files:**
- Modify: `projects.md`

- [ ] **Step 1: Restructure into three tiers in this order:** (1) **Proof** — case-study cards first (`/case-studies/agentic-msp-delivery`, `/notes/agent-safety`, ff-cli page when merged), then the verified-public cards (npm-versioned MCP servers, teams-3cx-app, finBots-as-research, aidiscordbot); (2) **Production systems, described honestly** — merge ALL `· private` cards into ONE section with a 2-line intro (the existing honesty note) and each card trimmed to ≤3 lines; (3) **Experiments** — unchanged but last. Delete nothing factual; move and trim only. Keep the verified counts sentence exactly as it stands (claims-policy phrasing).

- [ ] **Step 2: Verify + commit**

Run: `python3 scripts/verify_public_safety.py && ./scripts/ux_snapshot.sh` — `projects-desktop.png` first screen must show ≥2 clickable proof artifacts.

```bash
git add projects.md docs/ux-shots
git commit -m "content: proof-first projects — case studies and public work lead, private work consolidated"
```

### Task 6: Scan layer on long pages (closes F6)

**Files:**
- Modify: `experience.md`, `beyond.md`, `case-studies/agentic-msp-delivery.md`, `notes/agent-safety-from-incidents.md`

- [ ] **Step 1:** Add a 2–3 line `**In brief:**` block (styled `.tldr` per the unified system; add the class to the shared stylesheet if ui-unification didn't) at the top of each listed page summarizing it honestly, plus jump links on `experience.md` (one per employer era).

- [ ] **Step 2: Verify + commit**

Run: `bundle exec jekyll build && python3 scripts/verify_public_safety.py`

```bash
git add experience.md beyond.md case-studies/agentic-msp-delivery.md notes/agent-safety-from-incidents.md assets/css/style.scss
git commit -m "feat: scan layer — in-brief blocks and section jumps on long pages"
```

### Task 7: Final walkthrough re-test

- [ ] **Step 1:** `./scripts/ux_snapshot.sh`, then re-answer every ledger row F1–F7 in `docs/UX-REVIEW-scenarios.md` with before/after status. Every row must be CLOSED or explicitly `OWNER-TASTE` (deferred with reason).
- [ ] **Step 2:** Full gate run: all four `scripts/verify_*.py` pass after `bundle exec jekyll build`.
- [ ] **Step 3:** Commit and stop — do NOT push; the review-and-merge agent handles PR + publish.

```bash
git add docs/UX-REVIEW-scenarios.md docs/ux-shots
git commit -m "docs: UX scenario re-test — friction ledger closure status"
```

## Self-review (performed at write time)

- Ledger coverage: F1→T2, F2→T3, F3+F4→T4, F5→T5, F6→T6, F7→verified in T7 (owned by ui-unification). No orphan friction rows.
- Placeholder scan: every step names files, gives copy or exact structural rules, and has a runnable acceptance check; harness script is complete.
- Consistency: harness path `scripts/ux_snapshot.sh` identical across T1/T2/T4/T5/T7; branch `program/ux-experience` consistent; verifier names match the real files; nav-label change and its verifier update travel together in T3.
- Constraint audit: story.md content is edit-restricted to the preface (owner-approved disclosures untouched); work-with-me subpages preserved (verifier contract); claims-policy phrasings reused verbatim wherever numbers appear.
