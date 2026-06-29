# www.sulemanji.com — Life-Profile Rebuild — Design Spec

**Date:** 2026-06-29
**Repo:** `ssmanji89/sulemanji-port` (Jekyll → GitHub Pages, CNAME `www.sulemanji.com`)
**Working branch:** `life-profile` (clean snapshot from `0b7217c`, 2026-02-12)
**Status:** Awaiting user approval before implementation.

---

## 1. Problem & Goal

The live site was converted by prior agent sessions into a **SaaS / "command-center" product page** ("Proof-Gated AI Operations for MSP Systems", `_control-plane/`, an "AI Agent Control Plane" storefront with Stripe). The repo was also left **broken mid-merge** (conflict markers in every content file; local `main` diverged 99↔122 from origin). Both history lines had gone SaaS.

**Goal:** Replace it with a **genuinely balanced personal life-profile** for Suleman Manji — professional *and* personal — that is honest, understated, accurate, and supports first-class light & dark themes.

**Non-goals:** No product/SaaS framing. No storefront, pricing, or "command center". No blog. No invented biography.

---

## 2. Decisions (locked with user)

| Topic | Decision |
|---|---|
| Scope | Professional/career + personal/bio + projects. **No blog.** |
| Tone | Genuinely balanced life-profile (equal weight to person and engineer). |
| Themes | Light **and** dark, both first-class; persisted toggle + respects `prefers-color-scheme`; no flash-of-wrong-theme. |
| Git strategy | Rebuild on `life-profile` branch from `0b7217c`; **force-push to replace `main`** when approved (old SaaS HEADs tagged `saas-archive/*` as safety net). |
| Cleanup | Worktrees removed (done); SaaS branches on origin left intact for now. |
| Content sourcing | Personal material mined from local stores; portfolio rebuilt from real repos; professional facts extracted from existing files. |
| Partner / family | **Vague mention only** — e.g. "based in Houston with my partner." No name, no identifying details. |
| Heritage / faith | **Omitted entirely** (no self-identification in any source; DNA data ambiguous & sensitive). |
| Origin story | **Git-derived "maker origin"** — `botStuff` (Jan 2021, a Robinhood trading bot) → ML/crypto bots (2022) → MSP/cloud automation (2023) → AI/MCP agents (2025–26). Woven alongside the 2011 career start (UH/ERGOS). Real, verifiable, not invented. |
| Viyu start date | **July 7, 2025.** |

---

## 3. Information Architecture

Navigation (single clean nav, light/dark toggle in header):

- **Home `/`** — balanced hero + short dual intro + routes into the site.
- **About `/about`** — career arc + personal texture, woven together. Starts at UH/ERGOS.
- **Experience `/experience`** — career timeline.
- **Projects `/projects`** — rebuilt, three honest groups (see §5).
- **Beyond Work `/beyond`** — the personal half: markets & probability, mathematics, genealogy, building for fun, Houston.
- **Philosophy `/philosophy`** — how he thinks about technology (reworked).
- **Resume `/resume`** (+ PDF) and **Contact** (email, GitHub, LinkedIn).

---

## 4. Voice

First-person, understated, precise. Metrics carry the weight; no hype, no buzzword stacking, no self-promotion. Matches existing copy and the personal-assessment profile (reserved, analytical, hands-on, evidence-driven). When a technology is named, a concrete use case is attached.

---

## 5. Per-Page Content Plan

### Home `/`
- Hero: name + one-line identity ("Engineer & builder in Houston — MSP automation, AI agent tooling, and the occasional math problem.").
- 2–3 sentence intro blending professional (M365/MSP automation, MCP/agent tooling) and personal (curiosity-driven builder, Houston).
- Route cards/links to About, Projects, Beyond Work, Experience.

### About `/about`
- **Maker origin (git-verified):** public building started with `botStuff` (Jan 12, 2021) — a Robinhood trading bot in Python — then ML/crypto trading bots (2022), then the same automation instinct turned professional (HaloPSA/PowerShell/cloud tooling, 2023), then AI/MCP agents (2025–26). The `botStuff` handle became a personal lab brand across 18+ repos.
- **Career arc:** the parallel professional track — UH (BBA, MIS, C.T. Bauer, 2009–2013), first role at ERGOS (Dec 2011), through to Viyu (July 2025).
- Framing: hobby and profession are the *same impulse* (build automation) aimed at different targets. Reserved, systems-minded, builds rather than advises.
- Light personal close: Houston-based, builds things for fun, **partner mention vague only**.
- Reuse cleaned bio prose from `about.md` (drop SaaS framing; soften "10–15 hrs/week").

### Experience `/experience`
- Timeline: ERGOS (2011–2017, NOC automation → Sr. Automation Architect) → Sugar Land Petroleum (2017–2020) → Fulcrum Technology Solutions (2021–2023, CyberArk/Azure security) → StackAdvisors (2023, Azure/.NET) → ZG Companies (2023–2025, M365 governance) → **Viyu Network Solutions (July 2025–present)**.
- Keep sourced metrics; **soften self-estimates**; drop self-assessed %-bars.

### Projects `/projects`  *(rebuilt — no stale `projects.md`)*
- **Enterprise MSP automation:** the Viyu platform — described by scope (multi-platform MSP operations engine: M365, ITGlue, ConnectWise Manage/Automate, ScreenConnect, vCloud, Sophos, Cavelo, Meraki; CLI ecosystem + autonomous agents). **No client names.** "130+ tools" framed as approximate.
- **AI / MCP infrastructure (public):** [halopsa-workflows-mcp](https://github.com/ssmanji89/halopsa-workflows-mcp), [postgres-mcp-tools](https://github.com/ssmanji89/postgres-mcp-tools), [msgraph-secure_score-mcp](https://github.com/ssmanji89/msgraph-secure_score-mcp).
- **Personal / experimental:** Beal Conjecture research platform (math), `smanji-ancestry` (privacy-first DNA tooling — described as a *tool*, no genetic results published), algorithmic-trading research ([finBots](https://github.com/ssmanji89/finBots) / rhAgentic).
- Caveat noted honestly: most work is private/client, so the public profile under-represents output.

### Beyond Work `/beyond`  *(new)*
- Markets & probability (quant/algorithmic trading experiments).
- Mathematics (Beal Conjecture — a genuine number-theory side project).
- Genealogy / DNA tooling (the *building* interest; no personal genetic data).
- Building for fun (LEGO Don Quixote build, weekend projects).
- Houston (exploring the city). Vague partner mention permitted here.

### Philosophy `/philosophy`
- Rework existing content; keep the four principles (human-centered, security-first, proactive, continuous optimization). Strip marketing tone.

### Resume `/resume` + Contact
- Concise resume + PDF link. Contact: email `ssmanji89@gmail.com`, GitHub `ssmanji89`, LinkedIn `suleman-manji-1a46852a0`.

---

## 6. Theme System (light & dark, first-class)

- **Source of truth:** a `data-theme` attribute on `<html>` (`light` / `dark`).
- **Resolution order:** saved `localStorage` choice → else `prefers-color-scheme` → default.
- **No FOUC:** a tiny inline `<head>` script sets `data-theme` before first paint (before CSS/body render).
- **Toggle:** a header control that flips and persists the choice; accessible (button, aria-label, keyboard).
- **CSS:** consolidate color values into CSS custom properties with light & dark sets keyed off `[data-theme]`. Rework the existing `assets/css/components/darkmode.css` and remove the ad-hoc `dark-mode-cleanup.js` / `toggle-finder.js` hacks in favor of one clean toggle script.
- Both palettes must meet WCAG AA contrast.

---

## 7. File Map

**Keep & rework:** `_config.yml`, `_layouts/default.html`, `_layouts/post.html`, `_includes/head-custom.html`, `_includes/footer-custom.html`, `index.md`, `about.md`, `experience.md`, `philosophy.md`, `resume.md`, `technical-skills.md`, `professional-evolution.md`, `404.html`, `assets/`, `images/`.

**Rebuild:** `projects.md` (from §5, not the stale 42 KB file).

**Create:** `beyond.md` (Beyond Work); a clean theme toggle script; `docs/` excluded from build.

**Remove:** all `_posts/*` (25 auto-blog articles) + `blog.md`; `HOUSTON_EVENTS_README.md`, `HOUSTON_EVENTS_SOURCES.md`; `business-process-automation.md`, `business-process-transformation.md`, `transformation-impact.md`, `transformation-projects.md`, `bpa-opportunities.md`; `claude-prompts.md`; `npm-packages.md`; `accessibility-report.html`; `portfolio-grid-demo.html`; `test_blog_post.md`, `test_event_post.md`; `personal-assessment.md` (clinical psychometric profile — not for public publishing; retained in git history only).

**Never publish (privacy):** partner's name/contact, anything from `CristinasHouseHunting`, DNA/ancestry data, heritage/faith claims, client names.

---

## 8. Accuracy Guardrails

- Abstract all client identifiers in project/experience copy.
- "130+ tools" → "100+" / "roughly 130" framing, presented as approximate.
- "10–15 hrs/week saved" → soften to qualitative ("meaningful weekly time savings") unless substantiated.
- Remove self-assessed percentage proficiency bars.
- Drop AWS from skills unless project evidence exists.
- Viyu start = July 2025 (resolves the file conflict).

---

## 9. Git / Publish Plan

1. Build everything on `life-profile` (no push yet).
2. Local Jekyll preview (`bundle exec jekyll serve`) to verify both themes + all pages render.
3. On user approval: tag is already in place (`saas-archive/local-main`, `saas-archive/origin-main`).
4. Fast-forward/replace `main` with `life-profile` and **force-push `origin/main`**.
5. The `jekyll.yml` Action rebuilds and deploys to `gh-pages` automatically.
6. Verify live at `https://www.sulemanji.com`.

Rollback: `git reset --hard saas-archive/origin-main` + force-push restores the old SaaS site.

---

## 10. Success Criteria

- No SaaS/command-center/storefront language anywhere; no Stripe/product artifacts.
- Home reads as a balanced person-and-engineer profile; all 7 nav destinations work.
- Light & dark both first-class, persisted, no FOUC, AA contrast.
- Every professional claim is sourced or softened per §8; no client names.
- No partner PII, no heritage/faith claims, no genetic data.
- Site builds clean (`jekyll build` no errors) and deploys to `www.sulemanji.com`.
