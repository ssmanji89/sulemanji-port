# Work With Me Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portfolio-native `Work With Me` surface that publishes the AI Workflow Clinic and adjacent lightweight help modes on `www.sulemanji.com`.

**Architecture:** Keep the implementation static and Jekyll-native. Add one Markdown page using the existing `default` layout and hero front matter, integrate it through `_data/navigation.yml` and `index.md`, and add a Python stdlib verifier that checks page content, navigation, homepage entry points, CTA safety boundaries, forbidden language, and generated output.

**Tech Stack:** Jekyll, Markdown, YAML front matter, existing CSS/card/button components, Python stdlib verification, `bundle exec jekyll build`.

## Global Constraints

- Work in `/Users/sulemanmanji/tmp/sulemanji-viyu-positioning-sdd`.
- Published remote is `https://github.com/ssmanji89/sulemanji-port.git`.
- `CNAME` must remain `www.sulemanji.com`.
- Add a new public page at `/work-with-me`.
- Add a top-level navigation item named `Work With Me`, placed after `Projects` and before `Beyond Work`.
- Add a homepage CTA path to `/work-with-me`.
- Make `AI Workflow Clinic` the lead offer on the new page.
- Present two adjacent lightweight help modes: `Automation / Ops Systems Review` and `Build Path / Technical Triage`.
- Keep the page portfolio-native, first-person, practical, and understated.
- Use email as the only first-contact mechanism: `mailto:ssmanji89@gmail.com?subject=Work%20With%20Me`.
- Include explicit safety and boundary language.
- Do not add pricing tables.
- Do not add Stripe checkout or payment links.
- Do not add Google Calendar, Calendly, Google Forms, intake forms, or a custom booking backend in this phase.
- Do not create a separate agency brand, Brakes & Bytes brand, or productized service brand.
- Do not mention mechanic quote audits or vehicle-repair invoice review.
- Do not expand the broader biography/profile content in this phase.
- Do not redesign the site layout or add new CSS unless existing components cannot express the page.
- Do not imply one session guarantees production deployment.
- Do not ask visitors to send secrets, production credentials, employer/client access, regulated records, or private third-party data.
- Final verification must include `python3 scripts/verify_work_with_me.py` and `bundle exec jekyll build`.

---

## File Structure

- Create `scripts/verify_work_with_me.py`
  - Stdlib verifier for `CNAME`, `work-with-me.md`, navigation order, homepage links, offer names, CTA, safety language, forbidden public language, and generated `_site/work-with-me.html`.
- Create `work-with-me.md`
  - New public Jekyll page at `/work-with-me`.
  - Uses existing `default` layout, hero front matter, card grids, and CTA buttons.
- Modify `_data/navigation.yml`
  - Adds `Work With Me` after `Projects` and before `Beyond Work`.
- Modify `index.md`
  - Adds `Work With Me` to hero CTAs.
  - Adds first card under `## Where to go next` linking to `/work-with-me`.

---

### Task 1: Add Work With Me Verifier

**Files:**
- Create: `scripts/verify_work_with_me.py`

**Interfaces:**
- Consumes: repository files as plain text.
- Produces: command `python3 scripts/verify_work_with_me.py`
  - Exit `0`: Work With Me surface satisfies the spec.
  - Exit `1`: prints named failures.

- [ ] **Step 1: Create verifier**

Create `scripts/verify_work_with_me.py`:

```python
#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
CNAME = ROOT / "CNAME"
PAGE = ROOT / "work-with-me.md"
INDEX = ROOT / "index.md"
NAV = ROOT / "_data" / "navigation.yml"
SITE_PAGE = ROOT / "_site" / "work-with-me.html"

PUBLIC_SOURCE_FILES = [
    PAGE,
    INDEX,
    NAV,
    ROOT / "_config.yml",
]

FORBIDDEN_PUBLIC_PATTERNS = [
    (r"\bstripe\b", "Stripe"),
    (r"\bpricing\b", "pricing"),
    (r"pricing tables?", "pricing tables"),
    (r"\bcalendly\b", "Calendly"),
    (r"google forms?", "Google Forms"),
    (r"booking forms?", "booking forms"),
    (r"mechanic quote", "mechanic quote"),
    (r"vehicle[- ]repair", "vehicle repair"),
    (r"invoice review", "vehicle-repair invoice review"),
    (r"brakes\s*&\s*bytes", "Brakes & Bytes"),
]


def read(path):
    return path.read_text(encoding="utf-8")


def require(condition, message, failures):
    if not condition:
        failures.append(message)


def contains_forbidden(text, pattern):
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def check_forbidden(path, failures):
    if not path.exists():
        return
    text = read(path)
    for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
        if contains_forbidden(text, pattern):
            failures.append(f"{path.name} must not mention {label}")


def main():
    failures = []

    require(CNAME.exists(), "CNAME file is missing", failures)
    if CNAME.exists():
        require(read(CNAME).strip() == "www.sulemanji.com", "CNAME must remain www.sulemanji.com", failures)

    require(PAGE.exists(), "work-with-me.md is missing", failures)
    require(INDEX.exists(), "index.md is missing", failures)
    require(NAV.exists(), "_data/navigation.yml is missing", failures)

    if PAGE.exists():
        page = read(PAGE)
        lowered = page.lower()
        require("layout: default" in page, "work-with-me.md must use the default layout", failures)
        require("title: Work With Me" in page, "work-with-me.md must set title: Work With Me", failures)
        require("permalink: /work-with-me" in page, "work-with-me.md must publish at /work-with-me", failures)
        require("hero_eyebrow: Work With Me" in page, "work-with-me.md must set hero_eyebrow", failures)
        require("AI Workflow Clinic" in page, "work-with-me.md must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in page, "work-with-me.md must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in page, "work-with-me.md must include Build Path / Technical Triage", failures)
        require("mailto:ssmanji89@gmail.com?subject=Work%20With%20Me" in page, "work-with-me.md must include the Work With Me email CTA", failures)
        require("Bring me a messy problem" in page, "work-with-me.md must include the primary CTA label", failures)
        require("secrets" in lowered, "work-with-me.md must warn against sending secrets", failures)
        require("private third-party data" in lowered, "work-with-me.md must warn against private third-party data", failures)
        require("production credential" in lowered, "work-with-me.md must say no production credential custody is needed", failures)
        require("not regulated legal, medical, financial, or compliance advice" in lowered, "work-with-me.md must include regulated-advice boundary language", failures)
        require("does not guarantee production deployment" in lowered, "work-with-me.md must avoid promising production deployment", failures)
        require("sanitized examples" in lowered, "work-with-me.md must prefer sanitized examples", failures)

    if NAV.exists():
        nav = read(NAV)
        nav_pattern = re.compile(
            r"- title: Projects\s+url: /projects\s+- title: Work With Me\s+url: /work-with-me\s+- title: Beyond Work\s+url: /beyond",
            re.MULTILINE,
        )
        require(nav_pattern.search(nav) is not None, "navigation must place Work With Me after Projects and before Beyond Work", failures)

    if INDEX.exists():
        index = read(INDEX)
        require("url: /work-with-me" in index or 'href="/work-with-me"' in index, "index.md must link to /work-with-me", failures)
        require("Work With Me" in index, "index.md must include Work With Me", failures)
        require("messy" in index.lower(), "index.md Work With Me entry must use messy-problem language", failures)

    for path in PUBLIC_SOURCE_FILES:
        check_forbidden(path, failures)

    if SITE_PAGE.exists():
        site_text = read(SITE_PAGE)
        require("AI Workflow Clinic" in site_text, "_site/work-with-me.html must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in site_text, "_site/work-with-me.html must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in site_text, "_site/work-with-me.html must include Build Path / Technical Triage", failures)
        require("mailto:ssmanji89@gmail.com?subject=Work%20With%20Me" in site_text, "_site/work-with-me.html must include the email CTA", failures)
        for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
            if contains_forbidden(site_text, pattern):
                failures.append(f"_site/work-with-me.html must not mention {label}")

    if failures:
        print("Work With Me verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Work With Me verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Make verifier executable**

Run:

```bash
chmod +x scripts/verify_work_with_me.py
```

- [ ] **Step 3: Confirm verifier fails before implementation**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected: FAIL with at least:

```text
Work With Me verification failed:
- work-with-me.md is missing
- navigation must place Work With Me after Projects and before Beyond Work
- index.md must link to /work-with-me
```

- [ ] **Step 4: Commit verifier**

Run:

```bash
git add scripts/verify_work_with_me.py
git commit -m "test: add Work With Me verifier"
```

---

### Task 2: Add Work With Me Page

**Files:**
- Create: `work-with-me.md`

**Interfaces:**
- Consumes: existing `default` layout and hero front matter support from `_layouts/default.html`.
- Produces: `/work-with-me` page with the approved offer names, CTA, scope, deliverables, and boundaries.

- [ ] **Step 1: Create page**

Create `work-with-me.md`:

```markdown
---
layout: default
title: Work With Me
description: Practical working sessions for people trying to automate messy workflows, rescue stuck AI-assisted projects, or turn rough automation ideas into safer next steps.
permalink: /work-with-me
hero_eyebrow: Work With Me
hero_title: Practical help for messy automation work.
hero_lede: "Bring me a workflow, repo, AI-assisted process, operations problem, or rough automation idea that feels hard to untangle. We will turn it into a clearer map, safer next step, or build path."
hero_ctas:
  - label: Bring me a messy problem
    url: mailto:ssmanji89@gmail.com?subject=Work%20With%20Me
    style: btn-primary
  - label: See the work
    url: /projects
    style: btn-outline
hero_signals:
  - AI Workflow Clinic
  - Automation review
  - Build-path triage
  - Agent guardrails
  - Practical next steps
---

## Ways to work together

<div class="card-grid" markdown="0">
  <div class="card">
    <span class="card-icon"><i class="fas fa-route"></i></span>
    <h3>AI Workflow Clinic</h3>
    <p>Hands-on working sessions for people trying to automate messy work. Bring a stuck AI-assisted process, half-built automation, scattered repo, prompt/rules setup, or unclear "AI should help here" problem.</p>
  </div>
  <div class="card">
    <span class="card-icon"><i class="fas fa-clipboard-check"></i></span>
    <h3>Automation / Ops Systems Review</h3>
    <p>For recurring work spread across tickets, documents, spreadsheets, email, forms, Google Workspace, workflow tools, or internal systems. We identify what should be automated, what should stay human, and what evidence or handoffs are missing.</p>
  </div>
  <div class="card">
    <span class="card-icon"><i class="fas fa-code-branch"></i></span>
    <h3>Build Path / Technical Triage</h3>
    <p>For rough ideas, broken prototypes, AI-built apps, stalled repos, or "should this be automated?" decisions. The goal is a realistic build path, risk list, next-step checklist, or decision not to automate yet.</p>
  </div>
</div>

## What we can work through

This is a practical working surface for individuals, founders, solo operators, builders, creators, and small business owners who are trying to make real work less manual.

Good fits include:

- messy workflow triage
- stuck AI-assisted process cleanup
- half-built automation
- repo or AI-built app rescue
- prompt, rules, and instruction cleanup
- Claude, Codex, Cursor, and similar agentic working patterns
- Google Workspace automation
- n8n, Zapier, Make, or similar workflow mapping
- agent boundaries and human-in-the-loop guardrails
- lightweight implementation planning

Tool names are examples, not the point. The point is making the work clearer, safer, and more repeatable.

## What you leave with

Depending on what you bring, we can leave with:

- a clearer workflow map
- a practical action plan
- a safer agent or AI-assisted process boundary
- a repo, prompt, or instruction cleanup path
- a first automation slice worth building
- a risk list and next-step checklist
- a clear reason not to automate something yet

If the problem is small enough, we may fix or prototype part of it during the session. If it is larger, the win is removing ambiguity and deciding what should happen next.

## Boundaries

Do not send secrets, API keys, passwords, tokens, production credentials, regulated records, or private third-party data.

A first working session does not require custody of production systems or employer/client access. Sanitized examples are preferred. This is not regulated legal, medical, financial, or compliance advice.

One session may produce a plan, map, prototype direction, cleanup path, or next-step checklist. It does not guarantee production deployment.

## How to start

Email me a short note with:

1. what you are trying to automate or untangle
2. what you have tried so far
3. where it currently gets messy or stuck
4. what a useful outcome would look like

<div class="cta-buttons">
  <a href="mailto:ssmanji89@gmail.com?subject=Work%20With%20Me" class="btn btn-primary">Bring me a messy problem</a>
  <a href="/projects" class="btn btn-outline">See the work</a>
</div>
```

- [ ] **Step 2: Run verifier and confirm integration-only failures remain**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected: FAIL only for navigation and homepage integration:

```text
Work With Me verification failed:
- navigation must place Work With Me after Projects and before Beyond Work
- index.md must link to /work-with-me
- index.md must include Work With Me
- index.md Work With Me entry must use messy-problem language
```

- [ ] **Step 3: Commit page**

Run:

```bash
git add work-with-me.md
git commit -m "feat: add Work With Me services page"
```

---

### Task 3: Integrate Work With Me Into Navigation And Homepage

**Files:**
- Modify: `_data/navigation.yml`
- Modify: `index.md`

**Interfaces:**
- Consumes: `/work-with-me` page from Task 2.
- Produces: primary navigation and homepage entry points to the Work With Me surface.

- [ ] **Step 1: Update navigation**

Replace the full contents of `_data/navigation.yml` with:

```yaml
- title: Home
  url: /
- title: About
  url: /about
- title: Story
  url: /story
- title: Experience
  url: /experience
- title: Projects
  url: /projects
- title: Work With Me
  url: /work-with-me
- title: Beyond Work
  url: /beyond
- title: Resume
  url: /resume
```

- [ ] **Step 2: Update homepage hero CTAs**

In `index.md`, replace the `hero_ctas` block with:

```yaml
hero_ctas:
  - label: About me
    url: /about
    style: btn-primary
  - label: Work With Me
    url: /work-with-me
    style: btn-outline
  - label: Projects
    url: /projects
    style: btn-outline
  - label: GitHub
    url: https://github.com/ssmanji89
    style: btn-outline
    external: true
```

- [ ] **Step 3: Update homepage "Where to go next" cards**

In `index.md`, replace the full `## Where to go next` section with:

```markdown
## Where to go next

<div class="card-grid" markdown="0">
  <a class="card" href="/work-with-me">
    <h3>Work With Me -></h3>
    <p>Bring me a messy workflow, stuck AI-assisted process, or rough automation idea and we will turn it into a practical next step.</p>
  </a>
  <a class="card" href="/story">
    <h3>Story -></h3>
    <p>The long version - brake shop to NOC to AI agents, and the why underneath it.</p>
  </a>
  <a class="card" href="/projects">
    <h3>Projects -></h3>
    <p>The real range: service-delivery automation, finance agents, MCP infrastructure, and the odd experiments.</p>
  </a>
  <a class="card" href="/experience">
    <h3>Experience -></h3>
    <p>Fifteen years, in detail - ERGOS, energy, security consulting, real estate, Viyu.</p>
  </a>
  <a class="card" href="/beyond">
    <h3>Beyond Work -></h3>
    <p>Markets, mathematics, genealogy, dream engineering, and the things I build for fun.</p>
  </a>
</div>
```

- [ ] **Step 4: Run verifier**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected:

```text
Work With Me verification passed.
```

- [ ] **Step 5: Commit integration**

Run:

```bash
git add _data/navigation.yml index.md
git commit -m "feat: surface Work With Me on portfolio"
```

---

### Task 4: Build And Final Verification

**Files:**
- Verify: `scripts/verify_work_with_me.py`
- Verify: `work-with-me.md`
- Verify: `_data/navigation.yml`
- Verify: `index.md`
- Verify: `_site/work-with-me.html`

**Interfaces:**
- Consumes: implementation from Tasks 1-3.
- Produces: a passing static-site build ready for normal GitHub Pages deployment.

- [ ] **Step 1: Run Work With Me verifier**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected:

```text
Work With Me verification passed.
```

- [ ] **Step 2: Build Jekyll**

Run:

```bash
bundle exec jekyll build
```

Expected: command exits `0` and `_site/work-with-me.html` exists.

- [ ] **Step 3: Confirm generated Work With Me page exists**

Run:

```bash
test -f _site/work-with-me.html && echo "_site/work-with-me.html exists"
```

Expected:

```text
_site/work-with-me.html exists
```

- [ ] **Step 4: Scan public source and generated output for forbidden terms**

Run:

```bash
if rg -i "stripe|pricing|pricing tables?|calendly|google forms?|booking forms?|mechanic quote|vehicle[- ]repair|invoice review|brakes\\s*&\\s*bytes" work-with-me.md index.md _data/navigation.yml _site/index.html _site/work-with-me.html; then
  echo "Forbidden Work With Me language found"
  exit 1
else
  echo "Forbidden Work With Me language absent"
fi
```

Expected:

```text
Forbidden Work With Me language absent
```

- [ ] **Step 5: Confirm CNAME**

Run:

```bash
printf 'CNAME=' && tr -d '\n' < CNAME && printf '\n'
```

Expected:

```text
CNAME=www.sulemanji.com
```

- [ ] **Step 6: Commit final verification changes only if needed**

If Steps 1-5 pass and no source changes were needed, do not create an empty commit.

If a verification gap required a source fix, run:

```bash
git add scripts/verify_work_with_me.py work-with-me.md _data/navigation.yml index.md
git commit -m "fix: complete Work With Me verification"
```

---

## Plan Self-Review

- Spec coverage: page creation, navigation placement, homepage CTA, three offer names, email CTA, boundary language, forbidden language, CNAME, verifier, generated page, and Jekyll build are covered.
- Placeholder scan: plan contains no incomplete-marker language or unspecified implementation step.
- Type/interface consistency: verifier command, file names, URL `/work-with-me`, email CTA, offer names, and generated output path are consistent across tasks.
- Scope check: one static public services page plus nav/homepage integration and verifier; no backend, CSS, pricing, booking, broader biography refresh, or unrelated refactor.
