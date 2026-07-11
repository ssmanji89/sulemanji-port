# Viyu Positioning Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Bodhi/commissions public references and reframe Viyu work around achievements, process, review gates, and service-delivery automation rather than internal technologies.

**Architecture:** Add a stdlib verifier that scans public pages for required and forbidden positioning. Then update only public Markdown/HTML content files: `projects.md`, `experience.md`, `resume.md`, `story.md`, `about.md`, and `index.md`. Keep Jekyll layout and CSS unchanged.

**Tech Stack:** Jekyll Markdown/HTML, Python stdlib verifier, `bundle exec jekyll build`.

## Global Constraints

- Work in `/Users/sulemanmanji/Documents/GitHub/sulemanji`.
- Keep `CNAME` as `www.sulemanji.com`.
- Remove public references to `bodhi`, `bodhi-teams`, `Commissions console`, commission dashboard/console work, and earned/paid/owed commission workflows.
- Do not describe Viyu work through private technology inventory, internal system names, private platform counts, topology, API adapters, per-customer isolation, containers, or private repo architecture.
- Use this role language: `Sr. Services Engineer`, acting as a solutions architect and automation engineer.
- Surface Viyu work as service-delivery automation, professional-services scoping, SOW/project-discovery tooling, PBR/QBR/reporting support, invoice-review support, evidence packets, review gates, and governed AI-assisted workflows.
- Do not add CSS or change Jekyll layouts.
- Final verification must include `python3 scripts/verify_viyu_positioning.py` and `bundle exec jekyll build`.

---

## File Structure

- Create `scripts/verify_viyu_positioning.py`
  - Scans public pages for forbidden terms and required safe positioning.
- Modify `projects.md`
  - Replaces private project-name cards with process-oriented Viyu service-delivery automation cards.
- Modify `experience.md`
  - Corrects Viyu title, rewrites current-role highlights, and replaces technology-heavy tags with process tags.
- Modify `resume.md`
  - Corrects Viyu title and rewrites recent-experience bullets.
- Modify `story.md`
  - Rewrites the "Now" section with safer process language.
- Modify `about.md`
  - Corrects front matter and broad identity language.
- Modify `index.md`
  - Corrects homepage lede/current-work framing and the first "What I do" card.

---

### Task 1: Add Viyu Positioning Verifier

**Files:**
- Create: `scripts/verify_viyu_positioning.py`

**Interfaces:**
- Produces command: `python3 scripts/verify_viyu_positioning.py`
- Exit `0`: public copy satisfies the positioning constraints.
- Exit `1`: prints named failures.

- [ ] **Step 1: Create verifier**

Create `scripts/verify_viyu_positioning.py`:

```python
#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = [
    ROOT / "index.md",
    ROOT / "about.md",
    ROOT / "projects.md",
    ROOT / "experience.md",
    ROOT / "resume.md",
    ROOT / "story.md",
]

FORBIDDEN = [
    "bodhi",
    "commissions console",
    "commission console",
    "commission dashboard",
    "commission operations",
    "earned/paid/owed",
    "eight-platform",
    "eight typescript clis",
    "per-customer isolation",
    "docker container",
    "typed adapter",
    "viyu-agents apis",
    "viyu-agents",
]

FORBIDDEN_PATTERNS = [
    re.compile(r"\bcommissions?\b", re.IGNORECASE),
]

REQUIRED_BY_FILE = {
    "projects.md": [
        "Service delivery automation at Viyu",
        "Review-ready operations artifacts",
        "Governed AI-assisted workflows",
        "SOW",
        "PBR/QBR",
        "invoice-review",
        "review gates",
    ],
    "experience.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
        "Service Delivery Automation",
        "Operational Review Artifacts",
        "Governed AI-Assisted Workflows",
    ],
    "resume.md": [
        "Sr. Services Engineer; acting as Solutions Architect & Automation Engineer",
        "SOW",
        "PBR/QBR",
        "invoice-review",
    ],
    "story.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
        "SOW",
        "PBR/QBR",
        "invoice-review",
    ],
    "about.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
    ],
    "index.md": [
        "help architect Microsoft 365 migration work",
        "service-delivery automation",
    ],
}


def read(path):
    return path.read_text(encoding="utf-8")


def main():
    failures = []

    cname = ROOT / "CNAME"
    if not cname.exists() or read(cname).strip() != "www.sulemanji.com":
        failures.append("CNAME must remain www.sulemanji.com")

    for path in PUBLIC_FILES:
        if not path.exists():
            failures.append(f"{path.name} is missing")
            continue
        text = read(path)
        lowered = text.lower()
        for forbidden in FORBIDDEN:
            if forbidden in lowered:
                failures.append(f"{path.name} contains forbidden public term: {forbidden}")
        for forbidden_pattern in FORBIDDEN_PATTERNS:
            if forbidden_pattern.search(text):
                failures.append(
                    f"{path.name} contains forbidden public pattern: {forbidden_pattern.pattern}"
                )

        for required in REQUIRED_BY_FILE.get(path.name, []):
            if required not in text:
                failures.append(f"{path.name} missing required phrase: {required}")

    if failures:
        print("Viyu positioning verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Viyu positioning verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Make verifier executable**

Run:

```bash
chmod +x scripts/verify_viyu_positioning.py
```

- [ ] **Step 3: Confirm verifier fails before edits**

Run:

```bash
python3 scripts/verify_viyu_positioning.py
```

Expected: FAIL with existing forbidden/required phrase failures.

---

### Task 2: Rewrite Projects Viyu Section

**Files:**
- Modify: `projects.md`

**Interfaces:**
- Consumes: existing page layout and card classes.
- Produces: public-safe Viyu process/achievement section with no Bodhi, commissions, or `viyu-agents` references.

- [ ] **Step 1: Replace the first projects section**

In `projects.md`, replace from `## MSP automation platforms` through the closing `</div>` immediately before `## HaloPSA &amp; service-desk AI` with:

```markdown
## Service delivery automation

The deepest work I do is turning recurring service operations into systems that are easier to scope, review, and trust.

<div class="card-grid" markdown="0">
  <div class="proj">
    <h3>Service delivery automation at Viyu <span class="proj-meta">· private · production</span></h3>
    <p>Internal tooling for professional-services and managed-services workflows: SOW intake and generation, project discovery runbooks, PBR/QBR report preparation, invoice-review support, operational evidence packets, and review gates around client-impacting actions. The important pattern is not any single platform. It is making messy service work easier to scope, verify, review, and hand off.</p>
  </div>
  <div class="proj">
    <h3>Review-ready operations artifacts <span class="proj-meta">· private</span></h3>
    <p>Systems that turn scattered tickets, notes, agreements, usage data, and operational evidence into reviewable artifacts: scope records, business-review packets, audit findings, client-safe clarifications, open questions, assumptions, risks, and next-action lists.</p>
  </div>
  <div class="proj">
    <h3>Governed AI-assisted workflows <span class="proj-meta">· private</span></h3>
    <p>AI-assisted workflow patterns with human review, evidence trails, preview-before-write gates, and explicit boundaries. I care less about autonomous demos than about systems that can show what they used, what they changed, what they skipped, and where a person needs to approve the next step.</p>
  </div>
</div>
```

- [ ] **Step 2: Run verifier**

Run:

```bash
python3 scripts/verify_viyu_positioning.py
```

Expected: projects-related forbidden failures are gone; other files may still fail.

---

### Task 3: Rewrite Current Viyu Role Copy

**Files:**
- Modify: `experience.md`
- Modify: `resume.md`
- Modify: `story.md`
- Modify: `about.md`
- Modify: `index.md`

**Interfaces:**
- Produces consistent current-role language across the public site.

- [ ] **Step 1: Update `experience.md` current role**

In the Viyu timeline item:

- Change `<h3 class="timeline-title">Solutions Architect & Automation Engineer</h3>` to:

```html
<h3 class="timeline-title">Sr. Services Engineer</h3>
```

- Replace the Viyu `timeline-description` paragraph with:

```html
Currently acting as a solutions architect and automation engineer across Microsoft 365 migration work, professional-services scoping, service-delivery automation, operational reporting, and governed AI-assisted internal workflows.
```

- Replace the four Viyu `timeline-highlight` blocks with these four blocks:

```html
<div class="timeline-highlight">
    <i class="fas fa-check-circle"></i>
    <div><strong>Migration & Operations Support:</strong> Helped turn large Microsoft 365 migration work into safer, more verifiable processes with clearer tracking, evidence, and execution checkpoints across users, SharePoint, OneDrive, mailboxes, and devices.</div>
</div>
<div class="timeline-highlight">
    <i class="fas fa-check-circle"></i>
    <div><strong>Service Delivery Automation:</strong> Built internal tooling that makes recurring service work more repeatable: intake, documentation, SOW support, project-discovery handoffs, reporting, and review gates.</div>
</div>
<div class="timeline-highlight">
    <i class="fas fa-check-circle"></i>
    <div><strong>Operational Review Artifacts:</strong> Developed workflows that turn tickets, notes, agreements, usage data, and operational evidence into review-ready packets for account, project, invoice-review, PBR/QBR, and service-delivery conversations.</div>
</div>
<div class="timeline-highlight">
    <i class="fas fa-check-circle"></i>
    <div><strong>Governed AI-Assisted Workflows:</strong> Designed AI-assisted operations patterns around scoped actions, human review, evidence trails, and preview-before-write gates instead of uncontrolled automation.</div>
</div>
```

- Replace the Viyu `timeline-technologies` spans with these safer process tags:

```html
<span class="timeline-tech"><i class="fab fa-microsoft"></i> Microsoft 365 migration</span>
<span class="timeline-tech"><i class="fas fa-diagram-project"></i> Service delivery automation</span>
<span class="timeline-tech"><i class="fas fa-file-signature"></i> SOW / PBR support</span>
<span class="timeline-tech"><i class="fas fa-clipboard-check"></i> Review gates</span>
<span class="timeline-tech"><i class="fas fa-chart-line"></i> Operational reporting</span>
<span class="timeline-tech"><i class="fas fa-user-check"></i> Governed AI workflows</span>
```

- [ ] **Step 2: Update `resume.md` Viyu role**

Replace:

```markdown
**Solutions Architect & Automation Engineer**
```

with:

```markdown
**Sr. Services Engineer; acting as Solutions Architect & Automation Engineer**
```

Replace the Viyu bullet list with:

```markdown
- Helped support large Microsoft 365 migration work across users, SharePoint, OneDrive, mailboxes, devices, and operational checkpoints
- Built internal tooling for professional-services scoping, SOW support, project discovery, documentation handoffs, and review gates
- Developed PBR/QBR, invoice-review, operational reporting, and evidence-packet workflows for service-delivery conversations
- Designed governed AI-assisted workflow patterns with human review, scoped actions, and preview-before-write controls
- Published halopsa-workflows-mcp on npm; featured in MCP registries
```

- [ ] **Step 3: Update `story.md` Now section**

Replace the paragraph immediately after `## Now` with:

```markdown
Since July 2025 I've been a Sr. Services Engineer at Viyu Network Solutions, acting as a solutions architect and automation engineer. The work sits where my career usually lands: Microsoft 365 migration work, professional-services scoping, SOW and project-discovery tooling, PBR/QBR and invoice-review support, operational evidence, approval gates, and AI-assisted workflows that need to be useful without becoming reckless.

The important pattern is not a specific internal system. It is taking work that depends on memory, chat threads, tickets, spreadsheets, and heroic follow-up, then turning it into something structured enough to scope, review, verify, and hand off.
```

- [ ] **Step 4: Update `about.md` front matter and opening**

Replace the `description` front matter with:

```yaml
description: Suleman Manji — a Houston-based Sr. Services Engineer who often acts as a solutions architect and automation engineer across service platforms, infrastructure, and AI-assisted workflow tooling.
```

Replace the first paragraph under `# About` with:

```markdown
I work as a Sr. Services Engineer in Houston, often acting as a solutions architect and automation engineer. For about fifteen years I've worked the seam between IT operations and the systems that make them less manual — managed services, Microsoft 365 at enterprise scale, security and identity, and lately the AI-assisted workflow tooling that ties messy service work together.
```

- [ ] **Step 5: Update `index.md` homepage framing**

Replace the `description` front matter with:

```yaml
description: Engineer and builder in Houston — service-delivery automation, AI-assisted workflow tooling, and the occasional math problem.
```

Replace `hero_lede` with:

```yaml
hero_lede: "By day I help architect Microsoft 365 migration work, service-delivery automation, and AI-assisted operational workflows. The rest of the time, I'm usually building a bot for something."
```

Replace the first `## What I do` card title and paragraph with:

```html
<h3>Service-delivery automation</h3>
<p>The deepest work: turning recurring service operations into scoped, reviewable workflows for SOW support, project discovery, PBR/QBR preparation, invoice-review, operational evidence, and human approval gates. Production systems, not demos.</p>
```

Replace the `/projects` card paragraph under `## Where to go next` with:

```html
<p>The real range: service-delivery automation, finance agents, MCP infrastructure, and the odd experiments.</p>
```

- [ ] **Step 6: Run verifier**

Run:

```bash
python3 scripts/verify_viyu_positioning.py
```

Expected:

```text
Viyu positioning verification passed.
```

---

### Task 4: Build And Final Verification

**Files:**
- Verify: public Markdown pages
- Verify: `_site/` generated output

**Interfaces:**
- Produces: passing verifier and Jekyll build.

- [ ] **Step 1: Run public-copy verifier**

Run:

```bash
python3 scripts/verify_viyu_positioning.py
```

Expected:

```text
Viyu positioning verification passed.
```

- [ ] **Step 2: Build Jekyll**

Run:

```bash
bundle exec jekyll build
```

Expected: command exits `0`.

- [ ] **Step 3: Scan built public pages for forbidden terms**

Run:

```bash
if rg -i "bodhi|\\bcommissions?\\b|commissions console|commission console|commission dashboard|commission operations|earned/paid/owed|eight-platform|eight TypeScript CLIs|per-customer isolation|Docker container|typed adapter|viyu-agents APIs|viyu-agents|MSP automation|AI agent tooling" _site/index.html _site/about.html _site/projects.html _site/experience.html _site/resume.html _site/story.html; then
  echo "Forbidden public positioning found"
  exit 1
else
  echo "Forbidden public positioning absent"
fi
```

Expected:

```text
Forbidden public positioning absent
```

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add scripts/verify_viyu_positioning.py projects.md experience.md resume.md story.md about.md index.md
git commit -m "feat: calibrate Viyu portfolio positioning"
```

---

## Plan Self-Review

- Spec coverage: verifier, Bodhi/commissions removal, Viyu role correction, projects reframing, story/about/index/resume/experience consistency, and Jekyll build are covered.
- Placeholder scan: plan contains no incomplete-marker language or unspecified implementation step.
- Scope check: one public-site content calibration; no layout/CSS changes and no private repo changes.
