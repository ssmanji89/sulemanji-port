# Sulemanji.com Life-Profile Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SaaS "command-center" site with a balanced personal life-profile (professional + personal) for Suleman Manji, with first-class light/dark themes.

**Architecture:** Jekyll static site (GitHub Pages, `jekyll-theme-minimal` gem + fully-custom `_layouts/default.html` and component CSS). A single `data-theme` attribute on `<html>` drives theming via CSS custom properties; an inline `<head>` script prevents flash-of-wrong-theme; one clean toggle script replaces all existing dark-mode hacks. Content lives in top-level `.md` pages.

**Tech Stack:** Jekyll, Liquid, kramdown Markdown, SCSS/CSS custom properties, vanilla JS. Build: `bundle exec jekyll build`. Deploy: push `main` → `.github/workflows/jekyll.yml` → `gh-pages`.

**Spec:** `docs/superpowers/specs/2026-06-29-sulemanji-life-profile-design.md`

**Working branch:** `life-profile` (already checked out, from `0b7217c`). Safety tags `saas-archive/origin-main`, `saas-archive/local-main` exist.

**Verification note:** This is a content/design site with no unit-test suite. "Tests" here are: (a) `bundle exec jekyll build` succeeds with no errors, (b) targeted `grep` assertions on built output, (c) visual check of `bundle exec jekyll serve` in both themes. Commit after every task.

---

## File Structure

**Foundation:**
- `_config.yml` — site metadata, nav data, build excludes (rework)
- `_data/navigation.yml` — single source of truth for nav links (create)
- `_layouts/default.html` — header/nav/footer, theme toggle, remove hack scripts (rework)
- `_includes/head-custom.html` — no-FOUC inline script, clean meta, schema (rework)
- `_includes/footer-custom.html` — strip removal hacks (rework)
- `assets/css/components/theme.css` — CSS custom properties: light + dark palettes (create)
- `assets/js/theme-toggle.js` — single clean toggle (create)
- Delete: `assets/js/dark-mode-cleanup.js`, `assets/js/toggle-finder.js`

**Content pages:**
- `index.md` (home), `about.md`, `beyond.md` (new), `experience.md`, `projects.md`, `philosophy.md`, `resume.md`, `technical-skills.md`

**Removed cruft:** `_posts/*`, `blog.md`, `HOUSTON_EVENTS_*`, `business-process-*.md`, `transformation-*.md`, `bpa-opportunities.md`, `claude-prompts.md`, `npm-packages.md`, `accessibility-report.html`, `portfolio-grid-demo.html`, `test_*.md`, `personal-assessment.md`

---

## Phase A — Foundation

### Task 1: Rework `_config.yml`

**Files:**
- Modify: `_config.yml`

- [ ] **Step 1: Replace `_config.yml` contents**

```yaml
title: Suleman Manji
email: ssmanji89@gmail.com
description: Engineer and builder in Houston — MSP automation, AI agent tooling, and the occasional math problem.

theme: jekyll-theme-minimal
plugins:
  - jekyll-seo-tag
  - jekyll-feed

logo: /images/sulemanji-profile.png
show_downloads: false

domain: www.sulemanji.com
url: https://www.sulemanji.com
baseurl: ""

github_username: ssmanji89
linkedin_username: suleman-manji-1a46852a0

markdown: kramdown
sass:
  style: compressed

defaults:
  - scope:
      path: ""
    values:
      layout: "default"

exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor/
  - docs/
  - README.md
  - LICENSE
  - blog_automation/
  - "*.py"
  - requirements.txt
```

- [ ] **Step 2: Verify YAML parses**

Run: `ruby -ryaml -e "YAML.load_file('_config.yml'); puts 'OK'"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add _config.yml
git commit -m "chore: rework site config for life-profile, exclude docs/ and scripts"
```

---

### Task 2: Remove cruft files

**Files:**
- Delete: see command below

- [ ] **Step 1: Remove blog, marketing, test, and stale files**

```bash
cd /Users/sully/Documents/GitHub/sulemanji
git rm -r _posts
git rm blog.md HOUSTON_EVENTS_README.md HOUSTON_EVENTS_SOURCES.md \
  business-process-automation.md business-process-transformation.md \
  transformation-impact.md transformation-projects.md bpa-opportunities.md \
  claude-prompts.md npm-packages.md accessibility-report.html \
  portfolio-grid-demo.html test_blog_post.md test_event_post.md \
  personal-assessment.md
```

- [ ] **Step 2: Verify removals (no orphaned references remain in nav/layout)**

Run: `grep -rn "personal-assessment\|/blog\|business-process\|transformation-" _layouts _includes _data *.md 2>/dev/null | grep -v docs/`
Expected: no output (any hits must be fixed in the tasks that touch those files).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove blog spam, marketing pages, test files, and clinical assessment"
```

---

### Task 3: Theme system (light/dark, first-class, no FOUC)

**Files:**
- Create: `_data/navigation.yml`
- Create: `assets/css/components/theme.css`
- Create: `assets/js/theme-toggle.js`
- Modify: `_includes/head-custom.html`
- Modify: `_layouts/default.html`
- Modify: `_includes/footer-custom.html`
- Delete: `assets/js/dark-mode-cleanup.js`, `assets/js/toggle-finder.js`

- [ ] **Step 1: Create `_data/navigation.yml`**

```yaml
- title: Home
  url: /
- title: About
  url: /about
- title: Experience
  url: /experience
- title: Projects
  url: /projects
- title: Beyond Work
  url: /beyond
- title: Philosophy
  url: /philosophy
- title: Resume
  url: /resume
```

- [ ] **Step 2: Create `assets/css/components/theme.css`** (palettes via custom properties)

```css
/* Theme tokens — light is default, dark via [data-theme="dark"] on <html> */
:root {
  --bg: #ffffff;
  --bg-alt: #f6f8fa;
  --surface: #ffffff;
  --border: #d0d7de;
  --text: #1f2328;
  --text-muted: #57606a;
  --link: #0969da;
  --link-hover: #0a4ea3;
  --accent: #0969da;
  --code-bg: #f6f8fa;
  --shadow: 0 1px 3px rgba(27,31,36,0.12);
}
html[data-theme="dark"] {
  --bg: #0d1117;
  --bg-alt: #161b22;
  --surface: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #9da7b3;
  --link: #58a6ff;
  --link-hover: #79c0ff;
  --accent: #58a6ff;
  --code-bg: #161b22;
  --shadow: 0 1px 3px rgba(1,4,9,0.6);
}
html, body { background-color: var(--bg); color: var(--text); }
body { transition: background-color 0.2s ease, color 0.2s ease; }
a { color: var(--link); }
a:hover { color: var(--link-hover); }
section, header, footer { color: var(--text); }
code, pre { background-color: var(--code-bg); }

/* Header theme toggle button */
.theme-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
.theme-toggle .icon-dark { display: none; }
html[data-theme="dark"] .theme-toggle .icon-light { display: none; }
html[data-theme="dark"] .theme-toggle .icon-dark { display: inline; }
```

- [ ] **Step 3: Replace `_includes/head-custom.html`** (remove `!important` hacks + body.dark-mode JS; add no-FOUC script + clean theme.css link + clean schema)

```html
<!-- No-FOUC theme: set data-theme before first paint -->
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>

<link rel="stylesheet" href="/assets/css/components/theme.css">

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />

<!-- jQuery (retained: some component CSS/JS relies on it) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<link rel="icon" type="image/x-icon" href="/images/favicon.ico">
<meta name="theme-color" content="#0d1117" id="theme-color-meta">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "name": "{{ site.title }}",
  "description": "{{ site.description }}",
  "url": "{{ site.url }}{{ page.url }}",
  "author": {
    "@type": "Person",
    "name": "Suleman Manji",
    "jobTitle": "Solutions Architect & Automation Engineer",
    "url": "{{ site.url }}",
    "sameAs": [
      "https://github.com/ssmanji89",
      "https://www.linkedin.com/in/{{ site.linkedin_username }}"
    ]
  }
}
</script>
```

- [ ] **Step 4: Create `assets/js/theme-toggle.js`**

```javascript
(function () {
  function current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d1117' : '#0969da');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
  });
  // Follow OS changes only when the user hasn't chosen explicitly
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    try { if (localStorage.getItem('theme')) return; } catch (err) {}
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
})();
```

- [ ] **Step 5: Rework `_layouts/default.html`** — replace the `<nav>` block, footer theme switch, and delete the trailing MutationObserver script. New header nav (data-driven + toggle):

Replace the `<nav class="main-nav">...</nav>` block (lines ~36-45) with:

```html
        <nav class="main-nav" aria-label="Primary">
          <ul>
            {% for item in site.data.navigation %}
              <li><a href="{{ item.url }}"{% if page.url == item.url %} aria-current="page"{% endif %}>{{ item.title }}</a></li>
            {% endfor %}
          </ul>
          <button class="theme-toggle" type="button" aria-label="Toggle light and dark theme">
            <i class="fas fa-moon icon-light" aria-hidden="true"></i><i class="fas fa-sun icon-dark" aria-hidden="true"></i>
          </button>
        </nav>
```

Replace the footer `<div class="footer-info">...theme-switch-wrapper...</div>` block (the entire `theme-switch-wrapper` markup) with an empty `<div class="footer-info"></div>` (toggle now lives in the header). In the footer GitHub stats, change `75+ Public Repositories` → `Public + private work across many repos` and `130+ MCP Tools Built` → `100+ MCP/CLI tools (approx.)`.

Delete the entire trailing `<script>` block containing the `MutationObserver` (lines ~107-150). Add the toggle script before `</body>`:

```html
    <script src="{{ "/assets/js/theme-toggle.js" | relative_url }}"></script>
```

- [ ] **Step 6: Strip hacks from `_includes/footer-custom.html`** — replace entire file with:

```html
<!-- Custom JavaScript -->
<script src="/assets/js/main.js"></script>
```

- [ ] **Step 7: Delete obsolete dark-mode JS**

```bash
git rm assets/js/dark-mode-cleanup.js assets/js/toggle-finder.js
```

- [ ] **Step 8: Verify no references to deleted JS or old toggle remain**

Run: `grep -rn "dark-mode-cleanup\|toggle-finder\|MutationObserver\|removeSpecificToggle\|theme-switch-wrapper\|body.dark-mode\|forced-light" _layouts _includes assets/js 2>/dev/null`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: clean light/dark theme system with data-theme, no-FOUC, single toggle"
```

---

## Phase B — Content Pages

> Voice for all pages: first-person, understated, precise. No hype. Metrics sourced or softened. No client names. No partner PII. No heritage/faith. Abstract Viyu clients.

### Task 4: Home (`index.md`)

**Files:**
- Modify: `index.md`

- [ ] **Step 1: Replace `index.md` contents**

```markdown
---
layout: default
title: Suleman Manji
description: Engineer and builder in Houston — MSP automation, AI agent tooling, and the occasional math problem.
---

# Suleman Manji

Engineer and builder in Houston. I build automation — the kind that turns messy IT operations into something safe to run, and the kind I write on weekends for markets, math, and curiosity.

By day I architect Microsoft 365 migrations and AI-agent tooling for managed-service operations. The rest of the time I'm usually building a bot for something.

<div class="cta-buttons">
    <a href="/about" class="btn btn-primary">About Me</a>
    <a href="/projects" class="btn">Projects</a>
    <a href="/beyond" class="btn btn-outline">Beyond Work</a>
    <a href="https://github.com/ssmanji89" class="btn btn-outline" target="_blank" rel="noopener">GitHub</a>
</div>

## What I do

### <i class="fas fa-robot"></i> AI & agent tooling
MCP servers and Claude Code tooling that connect enterprise platforms to AI — roughly 100+ tools across Microsoft 365, ITGlue, ConnectWise, and HaloPSA, plus autonomous agents for operational workflows.

### <i class="fas fa-exchange-alt"></i> Enterprise migration & automation
Full-lifecycle Microsoft 365 migrations at scale (one project: 6,543 GB, 641 users, 23 locations) and the PowerShell / Python / Power Automate plumbing that keeps operations running.

### <i class="fas fa-flask"></i> Building for its own sake
It started in 2021 with a Python trading bot. Since then: algorithmic markets, lottery probability, a DNA-analysis pipeline, and a research platform aimed at an unsolved number-theory problem.

## Where to go next

- **[About](/about)** — how I got here, from a trading bot to migration architecture.
- **[Projects](/projects)** — the work, public and abstracted.
- **[Beyond Work](/beyond)** — markets, math, and the things I build for fun.
- **[Experience](/experience)** — the professional timeline.
```

- [ ] **Step 2: Commit**

```bash
git add index.md
git commit -m "feat: balanced life-profile home page"
```

---

### Task 5: About (`about.md`)

**Files:**
- Modify: `about.md`

- [ ] **Step 1: Replace `about.md` front matter and body** (remove `published: false`, remove command-center markup). Use this content:

```markdown
---
layout: default
title: About | Suleman Manji
description: Suleman Manji — engineer and builder in Houston. From a 2021 trading bot to enterprise migration architecture and AI agent tooling.
permalink: /about
---

# About

I'm an engineer and builder based in Houston. My work splits into two halves that are really the same instinct: automate the thing.

## The maker origin

My public building life started on January 12, 2021, with a repository called `botStuff` — a Python bot that traded stocks through Robinhood. That handle stuck. It became a personal lab brand across dozens of projects: trading bots, a crypto high-frequency experiment, machine-learning side quests, lottery-probability tools, dashboards. The through-line is consistent — I like pointing automation at a problem and seeing what holds.

Over 2022–2023 that same instinct turned professional. The trading scripts became PowerShell automation, HaloPSA and Microsoft Graph integrations, cloud and security tooling. By 2025–2026 it had become AI-agent and MCP work. Hobby and profession converged.

## The professional track

The career started earlier and ran in parallel. I studied Management Information Systems at the University of Houston (C.T. Bauer College of Business) and joined ERGOS Technology Partners in 2011 while still a student, working in NOC automation. From there: multi-site infrastructure, enterprise security and Azure architecture, Microsoft 365 governance, and — since July 2025 — Solutions Architect & Automation Engineer at Viyu Network Solutions, leading M365 migrations and building AI-powered MSP toolchains.

A few numbers from along the way: a 6,543 GB tenant-to-tenant migration across 641 users; roughly 100+ MCP/CLI tools spanning M365, ITGlue, ConnectWise, and HaloPSA; 70+ automation workflows; and a Microsoft 365 Secure Score raised to 88.8%.

## How I work

I'm reserved by default and let the work speak — I'd rather show a working system than pitch one. I think in systems, prefer to build rather than advise, and I'm happiest contributing depth to a team rather than running one. I lead with what works and why, not with what's trendy.

Outside work I'm in Houston with my partner, usually building something — see [Beyond Work](/beyond).

<div class="cta-buttons">
    <a href="/experience" class="btn">Experience</a>
    <a href="/projects" class="btn btn-outline">Projects</a>
    <a href="/resume" class="btn btn-outline">Resume</a>
</div>
```

- [ ] **Step 2: Verify no leftover conflict markers or `published: false`**

Run: `grep -n "<<<<<<<\|published: false\|command-" about.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add about.md
git commit -m "feat: rewrite About with maker-origin + career arc"
```

---

### Task 6: Beyond Work (`beyond.md`) — NEW

**Files:**
- Create: `beyond.md`

- [ ] **Step 1: Create `beyond.md`**

```markdown
---
layout: default
title: Beyond Work | Suleman Manji
description: The personal half — markets, mathematics, genealogy, and the things Suleman Manji builds for fun.
permalink: /beyond
---

# Beyond Work

The same build-it instinct, pointed at things I'm just curious about.

## Markets & probability

Where it all started. In 2021 I wrote a Robinhood trading bot in Python; it turned into a long-running interest in algorithmic markets — strategy frameworks, a high-frequency crypto experiment, paper-trading-to-live harnesses, and signal tooling. I'm drawn to problems that sit at the intersection of probability, patterns, and payoff. (That curiosity also produced a lottery-analysis project — with a clear-eyed disclaimer that draws are random.)

## Mathematics

I built an AI-augmented research platform aimed at the Beal Conjecture — an unsolved number-theory problem with a standing $1,000,000 prize. It combines a parallel computational counterexample search with formal proof work in Lean 4. It's ambitious and probably quixotic, which is part of why I like it.

## Genealogy & DNA tooling

I built a privacy-first DNA-analysis pipeline that parses raw exports from consumer testing services and generates a local report — everything runs on-device, nothing uploaded. It's a tool, not a verdict; I find the engineering of personal genomics more interesting than any single result.

## Building for fun

A LEGO Don Quixote render, automation experiments, dashboards for things that didn't need dashboards. I build things because building is the hobby — the subject is almost incidental.

## Houston

Home base. I'm a Houston local and like exploring what the city's got going on.

<div class="cta-buttons">
    <a href="/projects" class="btn">See the projects</a>
    <a href="/about" class="btn btn-outline">About me</a>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add beyond.md
git commit -m "feat: add Beyond Work personal page"
```

---

### Task 7: Experience (`experience.md`)

**Files:**
- Modify: `experience.md`

- [ ] **Step 1: Clean the existing file** — remove any conflict markers and command-center markup; keep the timeline. Apply these accuracy edits:
  - Viyu start date → **July 2025** everywhere (remove "March 2025").
  - Replace any "130+" tool counts with "100+ (approx.)".
  - Soften "10-15 hours/week saved" → "meaningful weekly time savings".
  - Remove any self-assessed percentage proficiency bars/markup.
  - Remove AWS from any skills list unless a specific project is cited.
  - Abstract any client names tied to Viyu work (use "an MSP / a real-estate portfolio / a Fortune 500 client" style phrasing already present).

- [ ] **Step 2: Verify**

Run: `grep -n "March 2025\|130+\|10-15 hours\|<<<<<<<" experience.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add experience.md
git commit -m "feat: clean Experience timeline; fix Viyu date and soften unverifiable claims"
```

---

### Task 8: Projects (`projects.md`) — rebuilt

**Files:**
- Modify: `projects.md` (replace the stale 42 KB content)

- [ ] **Step 1: Replace `projects.md` with three honest groups**

```markdown
---
layout: default
title: Projects | Suleman Manji
description: Selected work by Suleman Manji — enterprise MSP automation, AI/MCP infrastructure, and personal experiments.
permalink: /projects
---

# Projects

Most of my output is private or client-facing, so this is a representative slice, not a full inventory.

## Enterprise MSP automation

**MSP operations platform** *(private / client work)*
A multi-platform operations engine for managed services — bridging Microsoft 365, ITGlue, ConnectWise Manage and Automate, ScreenConnect, VMware vCloud, Sophos Central, Meraki, and Cavelo. It ships a family of purpose-built CLIs and a set of autonomous agents for employee lifecycle, incident response, license optimization, and ticket enrichment. Roughly 100+ callable tools across the ecosystem (approximate — counted from CLI command surfaces, not a single manifest).

**Enterprise Microsoft 365 migrations**
Full-lifecycle tenant-to-tenant migrations — one project moved 6,543 GB across 641 users and 23 locations (122 SharePoint sites, 305 OneDrive accounts, 273 mailboxes), with Exchange Hybrid, Azure AD Connect, and Intune/Autopilot orchestration.

## AI & MCP infrastructure (public)

**[halopsa-workflows-mcp](https://github.com/ssmanji89/halopsa-workflows-mcp)**
A TypeScript/Node MCP server for the HaloPSA Workflows API — exposes workflow automation to Claude and other MCP clients, with auth and token caching. Published to npm.

**[postgres-mcp-tools](https://github.com/ssmanji89/postgres-mcp-tools)**
A PostgreSQL + pgvector memory system for AI applications, with MCP integration for semantic search and persistent cross-session memory. Docker-composed; supports OpenAI/Anthropic/mock embeddings.

**[msgraph-secure_score-mcp](https://github.com/ssmanji89/msgraph-secure_score-mcp)**
An MCP server surfacing Microsoft 365 Secure Score data via Microsoft Graph into AI assistants.

## Personal & experimental

**Beal Conjecture research platform** *(private)*
An AI-augmented attack on an unsolved number-theory problem — parallel computational counterexample search plus formal proof development in Lean 4.

**DNA-analysis pipeline** *(private)*
Privacy-first genomics tooling — parses raw consumer-DNA exports and generates a fully on-device report. A tool for exploring personal genomics without uploading anything.

**Algorithmic trading** *(mix of public/private)*
A long-running line of work that began with [finBots](https://github.com/ssmanji89/finBots) (2021) — Robinhood/market integrations, strategy frameworks, and paper-to-live execution harnesses.

<div class="cta-buttons">
    <a href="https://github.com/ssmanji89" class="btn" target="_blank" rel="noopener">All GitHub repos</a>
    <a href="/beyond" class="btn btn-outline">Beyond Work</a>
</div>
```

- [ ] **Step 2: Verify public links resolve**

Run: `for r in halopsa-workflows-mcp postgres-mcp-tools msgraph-secure_score-mcp finBots; do gh repo view ssmanji89/$r --json name --jq .name 2>/dev/null || echo "MISSING: $r"; done`
Expected: each name prints; no MISSING lines. (If one is missing, remove that link.)

- [ ] **Step 3: Commit**

```bash
git add projects.md
git commit -m "feat: rebuild Projects from real repos in three honest groups"
```

---

### Task 9: Philosophy (`philosophy.md`)

**Files:**
- Modify: `philosophy.md`

- [ ] **Step 1: Clean the file** — remove any conflict markers; keep the four principles (human-centered technology, security-first design, proactive innovation, continuous optimization) and methodology, but strip marketing/consulting tone and any "transformation services" framing. Keep the impact metrics block but apply Task 7's accuracy edits (no "130+", soften estimates). Ensure front matter `permalink: /philosophy` and `layout: default`.

- [ ] **Step 2: Verify**

Run: `grep -n "<<<<<<<\|130+\|command-" philosophy.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add philosophy.md
git commit -m "feat: clean Philosophy page, strip consulting/marketing tone"
```

---

### Task 10: Resume, Skills, Contact

**Files:**
- Modify: `resume.md`, `technical-skills.md`

- [ ] **Step 1: Clean `resume.md`** — remove conflict markers; ensure `permalink: /resume`; add a Contact block at the bottom:

```markdown
## Contact

- Email: [ssmanji89@gmail.com](mailto:ssmanji89@gmail.com)
- GitHub: [github.com/ssmanji89](https://github.com/ssmanji89)
- LinkedIn: [suleman-manji](https://www.linkedin.com/in/suleman-manji-1a46852a0)
```

Apply Task 7 accuracy edits (July 2025, soften estimates, no %-bars, drop AWS unless evidenced).

- [ ] **Step 2: Clean `technical-skills.md`** — remove conflict markers and any self-assessed percentage proficiency bars (keep grouped skill lists as plain lists). Ensure `permalink: /technical-skills`. Drop AWS unless evidenced.

- [ ] **Step 3: Verify**

Run: `grep -rn "<<<<<<<\|width: [0-9]*%\|March 2025" resume.md technical-skills.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add resume.md technical-skills.md
git commit -m "feat: clean Resume + Skills, add contact, remove self-assessed bars"
```

---

## Phase C — Verify & Publish

### Task 11: Build, serve, and full verification

**Files:** none (verification only)

- [ ] **Step 1: Install dependencies**

Run: `bundle install`
Expected: completes; `bundle exec jekyll --version` prints a version.
(If `bundle install` fails on `github-pages`, run `bundle update github-pages` then retry.)

- [ ] **Step 2: Build the site**

Run: `bundle exec jekyll build 2>&1 | tail -20`
Expected: ends with "done in N seconds", no "Error:" / "Liquid Warning" about missing includes.

- [ ] **Step 3: Assert no SaaS/cruft language survived in built output**

Run: `grep -rli "command center\|control plane\|proof-gated\|control-plane\|storefront\|stripe\|product candidate" _site 2>/dev/null`
Expected: no output.

- [ ] **Step 4: Assert all nav pages built**

Run: `for p in index about experience projects beyond philosophy resume technical-skills; do test -f _site/$p.html -o -f _site/$p/index.html && echo "OK $p" || echo "MISSING $p"; done`
Expected: all `OK`, no `MISSING`.

- [ ] **Step 5: Assert theme system present in built output**

Run: `grep -l "data-theme" _site/index.html && grep -rl "theme-toggle" _site/index.html && test -f _site/assets/css/components/theme.css && echo "THEME OK"`
Expected: prints `_site/index.html` twice and `THEME OK`.

- [ ] **Step 6: Visual check (serve locally)**

Run: `bundle exec jekyll serve --livereload` and open `http://localhost:4000`.
Manually confirm: (a) home reads as balanced life-profile; (b) nav links all work; (c) theme toggle flips light↔dark and **persists across reload**; (d) no flash-of-wrong-theme on load in either mode; (e) text is readable (AA contrast) in both themes; (f) no stray/duplicate dark-mode toggles anywhere.

- [ ] **Step 7: Commit any fixes found during verification**

```bash
git add -A && git commit -m "fix: address build/verification issues"
```

---

### Task 12: Publish (GATED — only on explicit user go-ahead)

**Files:** none (git operations)

- [ ] **Step 1: Confirm the user has approved the live preview and the push.**

STOP here and get explicit confirmation. Do not push without it.

- [ ] **Step 2: Re-tag rollback point (belt-and-suspenders) and update main**

```bash
cd /Users/sully/Documents/GitHub/sulemanji
git tag -f saas-archive/origin-main origin/main
git switch main
git reset --hard life-profile
```

- [ ] **Step 3: Force-push main**

```bash
git push --force-with-lease origin main
```

- [ ] **Step 4: Watch the deploy**

Run: `gh run watch $(gh run list --workflow=jekyll.yml --limit 1 --json databaseId --jq '.[0].databaseId') 2>&1 | tail -20`
Expected: the Jekyll Deploy workflow succeeds.

- [ ] **Step 5: Verify live site**

Run: `curl -s https://www.sulemanji.com | grep -i "data-theme\|Beyond Work" | head` (allow a few minutes for Pages cache)
Expected: shows the new content. Also load the site in a browser and confirm both themes.

- [ ] **Step 6: Rollback procedure (only if needed)**

```bash
git reset --hard saas-archive/origin-main && git push --force-with-lease origin main
```

---

## Self-Review Notes

- **Spec coverage:** IA (Task 1 nav, Task 3 nav data), all 7 pages (Tasks 4–10), theme system (Task 3), cleanup (Task 2), accuracy guardrails (Tasks 4–10 inline + Task 7 canonical edits), privacy (no partner/heritage/genetic data anywhere in content tasks), git/publish (Task 12), success criteria (Task 11 assertions). Covered.
- **Placeholders:** Content tasks carry final copy; adaptation tasks (7, 9, 10) give explicit edit rules + grep verification rather than reproducing large existing files verbatim — acceptable since those files are being cleaned, not authored from scratch.
- **Consistency:** `data-theme` attribute, `theme-toggle` class, `/assets/js/theme-toggle.js`, `/assets/css/components/theme.css`, and `localStorage 'theme'` key are used consistently across head script, CSS, toggle JS, and layout.
