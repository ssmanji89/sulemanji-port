# Command Center Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the live `www.sulemanji.com` Jekyll portfolio into a proof-gated operator/engineering command center while preserving GitHub Pages compatibility and public-safety boundaries.

**Architecture:** Keep the current Jekyll site and add a curated data layer in `_data/systems.yml` so homepage, Work Map, and Projects reuse the same public-safe system records. Use focused Liquid includes for system cards and lane rows, then add one command-center stylesheet imported from `assets/css/style.scss`. Add a Python validation script to enforce route presence, curated-data rules, and basic redaction checks before publishing.

**Tech Stack:** Jekyll, Liquid, YAML data files, SCSS/CSS, small Python validation script, GitHub Pages.

---

## File Structure

- Create `_data/systems.yml`: allowlisted public-safe systems only; no full workspace inventory.
- Create `_includes/system-card.html`: reusable compact card for homepage and projects.
- Create `_includes/system-lane.html`: reusable work-map lane panel.
- Create `work-map.md`: route for grouped command-center lanes.
- Create `notes.md`: curated notes route replacing Blog in primary nav.
- Create `assets/css/components/command-center.css`: command-center panels, lanes, proof strip, responsive behavior.
- Create `scripts/validate_command_center.py`: static validation for curated data, routes, source safety, and required content.
- Modify `_config.yml`: update site description.
- Modify `_layouts/default.html`: update primary nav and keep existing footer/contact links.
- Modify `assets/css/style.scss`: import command-center stylesheet.
- Modify `index.md`: command-center homepage.
- Modify `about.md`: broader identity and public-safe biography.
- Modify `projects.md`: curated systems/projects view from `_data/systems.yml`.
- Modify `blog.md`: keep route accessible and point to `/notes`.

Do not touch the existing unstaged `blog_automation/__pycache__` deletions.

---

### Task 1: Add Command-Center Validation Harness

**Files:**
- Create: `scripts/validate_command_center.py`

- [ ] **Step 1: Write the failing validation script**

Create `scripts/validate_command_center.py`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "_data/systems.yml",
    "_includes/system-card.html",
    "_includes/system-lane.html",
    "work-map.md",
    "notes.md",
    "assets/css/components/command-center.css",
]

REQUIRED_NAV_LABELS = ["Home", "Work Map", "Projects", "Notes", "About"]
FORBIDDEN_NAV_LABELS = ["Experience", "Skills", "Blog"]

REQUIRED_HOME_PHRASES = [
    "Proof-Gated AI Operations for MSP Systems",
    "Featured Systems",
    "Proof Stream",
    "Operating Principles",
]

ALLOWED_VISIBILITY = {
    "public_repo",
    "public_summary_only",
    "private_internal_do_not_link",
}

BANNED_SOURCE_PATTERNS = [
    r"\b\d{7}\b",  # ticket-like IDs
    r"@[A-Za-z0-9.-]+\.(?:local|lan|internal)\b",
    r"\b[A-Za-z0-9._%+-]+@(?!gmail\.com\b|viyu\.net\b|github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    r"gh[opsu]_[A-Za-z0-9_]{20,}",
    r"sk-[A-Za-z0-9]{20,}",
]

PUBLIC_SAFE_DISPLAY_NAMES = {
    "MSP Operations Control Plane",
    "Financial-Agent Paper Runtime",
    "Agent Memory and Runtime Infrastructure",
    "Operator Dashboard Systems",
    "MCP/API Toolchain",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def check_required_files() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    if missing:
        fail(f"missing required files: {', '.join(missing)}")


def check_nav() -> None:
    layout = read("_layouts/default.html")
    for label in REQUIRED_NAV_LABELS:
        if f">{label}<" not in layout:
            fail(f"missing primary nav label: {label}")
    for label in FORBIDDEN_NAV_LABELS:
        if f">{label}<" in layout:
            fail(f"old primary nav label still present: {label}")


def check_homepage() -> None:
    home = read("index.md")
    for phrase in REQUIRED_HOME_PHRASES:
        if phrase not in home:
            fail(f"homepage missing required phrase: {phrase}")


def check_systems_data() -> None:
    data_path = ROOT / "_data/systems.yml"
    systems = yaml.safe_load(data_path.read_text(encoding="utf-8"))
    if not isinstance(systems, list):
        fail("_data/systems.yml must be a list")
    if len(systems) < 5:
        fail("_data/systems.yml must contain at least five systems")

    display_names = {item.get("display_name") for item in systems if isinstance(item, dict)}
    missing_display_names = PUBLIC_SAFE_DISPLAY_NAMES - display_names
    if missing_display_names:
        fail(f"missing public-safe systems: {', '.join(sorted(missing_display_names))}")

    required_keys = {
        "id",
        "display_name",
        "category",
        "status",
        "summary",
        "problem",
        "system",
        "proof",
        "stack",
        "links",
        "visibility",
    }
    for item in systems:
        if not isinstance(item, dict):
            fail("each system entry must be a map")
        missing = required_keys - set(item)
        if missing:
            fail(f"{item.get('id', '<unknown>')} missing keys: {', '.join(sorted(missing))}")
        if item["visibility"] not in ALLOWED_VISIBILITY:
            fail(f"{item['id']} has invalid visibility: {item['visibility']}")
        if item["visibility"] == "private_internal_do_not_link" and item.get("links"):
            fail(f"{item['id']} is private/internal but has public links")


def check_source_safety() -> None:
    checked_paths = [
        "_data/systems.yml",
        "index.md",
        "about.md",
        "projects.md",
        "work-map.md",
        "notes.md",
    ]
    for path in checked_paths:
        text = read(path)
        for pattern in BANNED_SOURCE_PATTERNS:
            if re.search(pattern, text):
                fail(f"{path} matched banned pattern: {pattern}")


def main() -> None:
    check_required_files()
    check_nav()
    check_homepage()
    check_systems_data()
    check_source_safety()
    print("PASS: command center validation")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run validator to verify it fails**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: FAIL with missing required files including `_data/systems.yml`.

- [ ] **Step 3: Commit validator**

```bash
git add scripts/validate_command_center.py
git commit -m "test: add command center validation harness"
```

---

### Task 2: Add Curated Systems Data and Liquid Includes

**Files:**
- Create: `_data/systems.yml`
- Create: `_includes/system-card.html`
- Create: `_includes/system-lane.html`

- [ ] **Step 1: Add allowlisted systems data**

Create `_data/systems.yml`:

```yaml
- id: msp-operations-control-plane
  display_name: MSP Operations Control Plane
  category: MSP Operations
  status: Active
  summary: Proof-gated workflows for service operations, billing readiness, PSA/RMM actions, and deployment handoffs.
  problem: MSP work crosses tickets, documentation, billing, deployment state, and human approval gates.
  system: Operator workflows that turn messy service context into reviewed actions, readiness checks, and durable handoff artifacts.
  proof: Dry-run output, readiness snapshots, redacted runtime checks, GitHub issue gates, and validation artifacts.
  stack:
    - TypeScript
    - Python
    - GitHub Projects
    - ConnectWise
    - Microsoft Graph
  links: []
  visibility: private_internal_do_not_link

- id: financial-agent-paper-runtime
  display_name: Financial-Agent Paper Runtime
  category: Financial Agent Systems
  status: Research / Paper Trading
  summary: Research infrastructure for paper-trading decisions, risk gates, reconciliation, forecasting, and runtime evidence.
  problem: Financial-agent systems need explicit safety boundaries, reproducible runs, and evidence before any operator trusts the output.
  system: Paper-runtime components for decision policy, ledger checks, broker status reads, forecast scoring, and delivery gates.
  proof: Test suite results, paper-run logs, reconciliation checks, and configuration gates.
  stack:
    - Python
    - TypeScript
    - Alpaca Paper
    - Forecasting
    - Risk Gates
  links:
    - label: TradingAgents-FinBots
      url: https://github.com/ssmanji89/TradingAgents-FinBots
  visibility: public_summary_only

- id: agent-memory-runtime
  display_name: Agent Memory and Runtime Infrastructure
  category: Agent Runtime
  status: Active
  summary: Local agent runtime, memory, recall, and skill infrastructure for durable operator context.
  problem: Agent work loses value when context, decisions, tool state, and evidence disappear between sessions.
  system: Memory-backed runtime loops with Qdrant/mem0, skills, checkpoints, model health checks, and operator-facing delivery channels.
  proof: Local validation artifacts, memory status checks, runtime smoke tests, and redacted recall evidence.
  stack:
    - Python
    - Qdrant
    - mem0
    - Docker
    - MCP
  links:
    - label: hermes-mem0
      url: https://github.com/Viyu-Network-Solutions/hermes-mem0
  visibility: public_summary_only

- id: operator-dashboard-systems
  display_name: Operator Dashboard Systems
  category: Operator Interfaces
  status: Active
  summary: Dashboard surfaces for technician workflow, account context, QA checks, dispatch signals, and operational review.
  problem: Operators need compact surfaces that expose current work, context, risk, and next actions without jumping across systems.
  system: Dashboard panels, QA route checks, dispatch scoring, capacity signals, and integration views for service operations.
  proof: UAT checklists, route audits, health checks, and redacted service validation.
  stack:
    - TypeScript
    - React
    - NestJS
    - ConnectWise
    - ITGlue
  links: []
  visibility: private_internal_do_not_link

- id: mcp-api-toolchain
  display_name: MCP/API Toolchain
  category: MCP and API Tooling
  status: Active
  summary: MCP servers and API adapters that let AI assistants work with operational platforms through controlled tool boundaries.
  problem: AI assistants need structured, auditable access to real APIs instead of copied context and one-off scripts.
  system: MCP/API tooling for Microsoft 365, HaloPSA, n8n, documentation, and workflow automation.
  proof: Package builds, tool smoke tests, API contract checks, and read/write safety gates.
  stack:
    - TypeScript
    - Node.js
    - MCP
    - Microsoft Graph
    - HaloPSA
  links:
    - label: n8n-mcp-tools
      url: https://github.com/ssmanji89/n8n-mcp-tools
    - label: halopsa-workflows-mcp
      url: https://github.com/ssmanji89/halopsa-workflows-mcp
  visibility: public_repo
```

- [ ] **Step 2: Add reusable system card include**

Create `_includes/system-card.html`:

```liquid
{% assign system = include.system %}
<article class="system-card" data-category="{{ system.category | slugify }}">
  <div class="system-card__meta">
    <span class="system-card__category">{{ system.category }}</span>
    <span class="system-card__status">{{ system.status }}</span>
  </div>
  <h3 class="system-card__title">{{ system.display_name }}</h3>
  <p class="system-card__summary">{{ system.summary }}</p>
  <dl class="system-card__proof">
    <dt>Problem</dt>
    <dd>{{ system.problem }}</dd>
    <dt>System</dt>
    <dd>{{ system.system }}</dd>
    <dt>Proof</dt>
    <dd>{{ system.proof }}</dd>
  </dl>
  <div class="system-card__stack" aria-label="Technology stack">
    {% for item in system.stack %}
      <span>{{ item }}</span>
    {% endfor %}
  </div>
  {% if system.links and system.links.size > 0 %}
    <div class="system-card__links">
      {% for link in system.links %}
        <a href="{{ link.url }}" target="_blank" rel="noopener">{{ link.label }}</a>
      {% endfor %}
    </div>
  {% endif %}
</article>
```

- [ ] **Step 3: Add reusable lane include**

Create `_includes/system-lane.html`:

```liquid
{% assign system = include.system %}
<section class="system-lane" id="{{ system.id }}">
  <div class="system-lane__header">
    <span class="system-lane__category">{{ system.category }}</span>
    <h2>{{ system.display_name }}</h2>
  </div>
  <div class="system-lane__grid">
    <div>
      <h3>Problem Surface</h3>
      <p>{{ system.problem }}</p>
    </div>
    <div>
      <h3>System Built</h3>
      <p>{{ system.system }}</p>
    </div>
    <div>
      <h3>Proof Discipline</h3>
      <p>{{ system.proof }}</p>
    </div>
    <div>
      <h3>Operator Leverage</h3>
      <p>{{ system.summary }}</p>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run validator to confirm next expected failure**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: FAIL with missing route files or missing nav labels.

- [ ] **Step 5: Commit systems data and includes**

```bash
git add _data/systems.yml _includes/system-card.html _includes/system-lane.html
git commit -m "feat: add curated command center systems data"
```

---

### Task 3: Update Navigation and Route Skeletons

**Files:**
- Modify: `_layouts/default.html`
- Modify: `_config.yml`
- Create: `work-map.md`
- Create: `notes.md`
- Modify: `blog.md`

- [ ] **Step 1: Update `_config.yml` description**

Change the description to:

```yaml
description: Proof-gated AI operations, MSP systems engineering, agent runtime infrastructure, and public-safe technical work by Suleman Manji.
```

- [ ] **Step 2: Update primary navigation in `_layouts/default.html`**

Replace the current nav list:

```html
<li><a href="/">Home</a></li>
<li><a href="/about">About</a></li>
<li><a href="/experience">Experience</a></li>
<li><a href="/projects">Projects</a></li>
<li><a href="/technical-skills">Skills</a></li>
<li><a href="/blog">Blog</a></li>
```

with:

```html
<li><a href="/">Home</a></li>
<li><a href="/work-map">Work Map</a></li>
<li><a href="/projects">Projects</a></li>
<li><a href="/notes">Notes</a></li>
<li><a href="/about">About</a></li>
```

- [ ] **Step 3: Add Work Map skeleton**

Create `work-map.md`:

```markdown
---
layout: default
title: Work Map | Suleman Manji
description: Public-safe map of proof-gated MSP operations, agent runtime, financial-agent research, operator dashboards, and MCP/API tooling.
permalink: /work-map
---

<div class="command-header">
  <p class="command-eyebrow">Work Map</p>
  <h1>Systems lanes, proof paths, and operator leverage.</h1>
  <p class="command-lede">This map groups the public-safe parts of my current work into systems lanes. It avoids client detail and focuses on problem surfaces, systems built, proof discipline, and operator leverage.</p>
</div>

{% for system in site.data.systems %}
  {% include system-lane.html system=system %}
{% endfor %}
```

- [ ] **Step 4: Add Notes skeleton**

Create `notes.md`:

```markdown
---
layout: default
title: Notes | Suleman Manji
description: Curated technical notes on operational engineering, MCP and agent tooling, Microsoft 365, financial-agent research, and proof patterns.
permalink: /notes
---

<div class="command-header">
  <p class="command-eyebrow">Notes</p>
  <h1>Selected technical notes.</h1>
  <p class="command-lede">A curated surface for writing that matches the current work: operational engineering, MCP and agent tooling, Microsoft 365, financial-agent research, and proof-driven delivery.</p>
</div>

<div class="notes-panel">
  <h2>Current focus</h2>
  <ul>
    <li>Operational engineering patterns for MSP systems.</li>
    <li>MCP and agent tooling notes from public-safe work.</li>
    <li>Microsoft 365 and Graph diagnostics patterns.</li>
    <li>Financial-agent paper runtime and risk-gate research.</li>
    <li>Proof and governance patterns for agent-assisted delivery.</li>
  </ul>
</div>

<div class="notes-panel">
  <h2>Archive</h2>
  <p>Older posts remain available through the legacy blog archive while this page is curated.</p>
  <a href="/blog" class="btn btn-outline">Open legacy blog archive</a>
</div>
```

- [ ] **Step 5: Replace `blog.md` with compatibility pointer**

Replace the body content in `blog.md` after front matter with:

```markdown
<div class="command-header">
  <p class="command-eyebrow">Legacy Archive</p>
  <h1>Blog archive</h1>
  <p class="command-lede">This route remains available for older posts. The primary curated writing surface is now Notes.</p>
  <a href="/notes" class="btn btn-primary">Open Notes</a>
</div>

<div class="blog-articles animate-on-scroll">
  {% for post in site.posts %}
  <article class="blog-article" data-categories="{{ post.categories | join: ',' }}">
    <div class="article-content">
      <div class="article-meta">
        <span class="article-date"><i class="far fa-calendar-alt"></i> {{ post.date | date: "%B %d, %Y" }}</span>
      </div>
      <h2 class="article-title"><a href="{{ post.url }}">{{ post.title }}</a></h2>
      <div class="article-excerpt">{{ post.content | strip_html | truncatewords: 32 }}</div>
      <a href="{{ post.url }}" class="read-more">Read Article <i class="fas fa-arrow-right"></i></a>
    </div>
  </article>
  {% endfor %}
</div>
```

- [ ] **Step 6: Run validator**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: FAIL with homepage missing `Proof-Gated AI Operations for MSP Systems` or related required phrases.

- [ ] **Step 7: Commit navigation and routes**

```bash
git add _config.yml _layouts/default.html work-map.md notes.md blog.md
git commit -m "feat: add command center navigation and routes"
```

---

### Task 4: Rebuild Homepage as Command Center

**Files:**
- Modify: `index.md`

- [ ] **Step 1: Replace homepage front matter and content**

Replace `index.md` with:

```markdown
---
layout: default
title: Suleman Manji | Proof-Gated AI Operations for MSP Systems
description: Proof-gated AI operations, MSP systems engineering, agent runtime infrastructure, and public-safe technical work by Suleman Manji.
---

<div class="command-hero">
  <p class="command-eyebrow">Operator / Engineering Portfolio</p>
  <h1>Proof-Gated AI Operations for MSP Systems</h1>
  <p class="command-lede">I build command planes, agent runtimes, and memory-backed automation loops that turn MSP work into safer, verifiable operator workflows.</p>
  <div class="command-actions">
    <a href="/work-map" class="btn btn-primary">View Work Map</a>
    <a href="/projects" class="btn btn-outline">Featured Systems</a>
    <a href="mailto:ssmanji89@gmail.com" class="btn btn-outline">Contact</a>
  </div>
  <div class="signal-row" aria-label="Current work signals">
    <span>Viyu services engineering</span>
    <span>MSP operations</span>
    <span>Microsoft 365</span>
    <span>MCP</span>
    <span>Qdrant / mem0</span>
    <span>Paper trading research</span>
  </div>
</div>

<section class="command-section">
  <div class="section-kicker">Featured Systems</div>
  <h2>Concrete systems first.</h2>
  <div class="systems-grid systems-grid--featured">
    {% for system in site.data.systems limit:3 %}
      {% include system-card.html system=system %}
    {% endfor %}
  </div>
</section>

<section class="command-section">
  <div class="section-kicker">Active Lanes</div>
  <h2>Problem surface → system built → proof discipline → operator leverage.</h2>
  <div class="lane-summary-grid">
    {% for system in site.data.systems %}
      <a class="lane-summary" href="/work-map#{{ system.id }}">
        <span>{{ system.category }}</span>
        <strong>{{ system.display_name }}</strong>
        <small>{{ system.proof }}</small>
      </a>
    {% endfor %}
  </div>
</section>

<section class="command-section proof-stream">
  <div class="section-kicker">Proof Stream</div>
  <h2>Evidence before claims.</h2>
  <div class="proof-grid">
    <div><strong>Dry-run output</strong><span>Preview changes before writes.</span></div>
    <div><strong>Readiness snapshots</strong><span>Capture current state before handoff.</span></div>
    <div><strong>Runtime checks</strong><span>Verify live boundaries and deployment state.</span></div>
    <div><strong>Issue gates</strong><span>Keep work tied to reviewable control-plane records.</span></div>
  </div>
</section>

<section class="command-section audience-routes">
  <div class="section-kicker">Audience Routes</div>
  <h2>Different readers need different proof.</h2>
  <div class="audience-grid">
    <div><strong>MSP and service leaders</strong><span>Operational leverage, safer automation, and reviewable proof.</span></div>
    <div><strong>Engineering peers</strong><span>Architecture, runtime boundaries, and tooling decisions.</span></div>
    <div><strong>Hiring managers</strong><span>Scope, stack, ownership, and delivery evidence.</span></div>
    <div><strong>Agent/tooling collaborators</strong><span>MCP, memory, runtime, and workflow patterns.</span></div>
  </div>
</section>

<section class="command-section principles-panel">
  <div class="section-kicker">Operating Principles</div>
  <h2>How I work.</h2>
  <ul>
    <li>Live evidence before claims.</li>
    <li>Safety gates before writes.</li>
    <li>Durable handoffs over chat-only status.</li>
    <li>Public-safe abstraction of client work.</li>
    <li>Automation with accountability.</li>
  </ul>
</section>
```

- [ ] **Step 2: Run validator**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: PASS or FAIL only for source-safety issues introduced by the exact content.

- [ ] **Step 3: Commit homepage**

```bash
git add index.md
git commit -m "feat: rebuild homepage as command center"
```

---

### Task 5: Reframe About and Projects Around Public-Safe Systems

**Files:**
- Modify: `about.md`
- Modify: `projects.md`

- [ ] **Step 1: Replace `about.md` content with proof-gated biography**

Keep the existing front matter keys, but update `title` and `description`, then replace the body with:

```markdown
<div class="command-header">
  <p class="command-eyebrow">About</p>
  <h1>Suleman Manji</h1>
  <p class="command-lede">Sr. Services Engineer at Viyu Network Solutions, working across MSP systems engineering, agentic operations, Microsoft 365, MCP/API tooling, and proof-gated automation.</p>
</div>

<section class="command-section">
  <h2>Current operating frame</h2>
  <p>My formal role is services engineering. The broader work is building operator systems: command planes, agent runtimes, memory-backed workflows, and safety gates that help technical teams move from scattered context to verifiable action.</p>
  <p>I care about the boundary between automation and operational reality: what state was checked, what action is safe, what proof exists, what needs human approval, and what can be resumed cleanly later.</p>
</section>

<section class="command-section">
  <h2>Working lanes</h2>
  <div class="lane-summary-grid">
    {% for system in site.data.systems %}
      <a class="lane-summary" href="/work-map#{{ system.id }}">
        <span>{{ system.category }}</span>
        <strong>{{ system.display_name }}</strong>
        <small>{{ system.summary }}</small>
      </a>
    {% endfor %}
  </div>
</section>

<section class="command-section principles-panel">
  <h2>Safety and publication boundaries</h2>
  <p>Public writing here abstracts employer and client-adjacent work. It avoids client names, ticket IDs, internal hosts, private repository names, and operational screenshots. Financial-agent material is research and engineering infrastructure only; it is not investment advice or a solicitation.</p>
</section>

<section class="command-section">
  <h2>Contact</h2>
  <p>Useful conversations include operational automation, MSP systems, Microsoft 365 diagnostics, agentic workflows, MCP/API tooling, and proof-oriented engineering.</p>
  <div class="command-actions">
    <a href="mailto:ssmanji89@gmail.com" class="btn btn-primary">Email</a>
    <a href="https://github.com/ssmanji89" class="btn btn-outline" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.linkedin.com/in/{{ site.linkedin_username }}" class="btn btn-outline" target="_blank" rel="noopener">LinkedIn</a>
  </div>
</section>
```

- [ ] **Step 2: Replace `projects.md` body with curated systems view**

Keep front matter, update `title` and `description`, then replace the body with:

```markdown
<div class="command-header">
  <p class="command-eyebrow">Projects</p>
  <h1>Curated systems, not a raw repo dump.</h1>
  <p class="command-lede">This page highlights public-safe systems that represent the current work. Some systems are linked to public repositories; internal or employer-adjacent systems are summarized without private names or implementation detail.</p>
</div>

<div class="project-filters">
  <button class="filter-btn active" data-filter="all">All Systems</button>
  <button class="filter-btn" data-filter="msp-operations">MSP Operations</button>
  <button class="filter-btn" data-filter="financial-agent-systems">Financial Agents</button>
  <button class="filter-btn" data-filter="agent-runtime">Agent Runtime</button>
  <button class="filter-btn" data-filter="operator-interfaces">Dashboards</button>
  <button class="filter-btn" data-filter="mcp-and-api-tooling">MCP/API</button>
</div>

<div class="systems-grid animate-on-scroll">
  {% for system in site.data.systems %}
    {% include system-card.html system=system %}
  {% endfor %}
</div>

<section class="command-section principles-panel">
  <h2>Publication boundary</h2>
  <p>Private and employer-adjacent systems are intentionally abstracted. Links are included only for public repositories or public-safe references.</p>
</section>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.system-card');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const value = button.getAttribute('data-filter');

      cards.forEach(card => {
        if (value === 'all' || card.getAttribute('data-category') === value) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
});
</script>
```

- [ ] **Step 3: Run validator**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: PASS or source-safety failure with exact offending file.

- [ ] **Step 4: Commit about/projects reframing**

```bash
git add about.md projects.md
git commit -m "feat: reframe about and projects around systems"
```

---

### Task 6: Add Command-Center Styling

**Files:**
- Create: `assets/css/components/command-center.css`
- Modify: `assets/css/style.scss`

- [ ] **Step 1: Add command-center CSS**

Create `assets/css/components/command-center.css`:

```css
.command-hero,
.command-header,
.command-section {
  margin-bottom: var(--spacing-2xl);
}

.command-hero,
.command-header {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  background: var(--color-card-bg);
  box-shadow: 0 2px 8px var(--color-card-shadow);
  padding: clamp(1.25rem, 4vw, 2rem);
}

.command-eyebrow,
.section-kicker {
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  margin-bottom: var(--spacing-sm);
  text-transform: uppercase;
}

.command-hero h1,
.command-header h1 {
  border-bottom: 0;
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.05;
  margin: 0 0 var(--spacing-md);
  padding-bottom: 0;
}

.command-lede {
  color: var(--color-muted);
  font-size: clamp(1rem, 2.5vw, 1.18rem);
  max-width: 76ch;
}

.command-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.signal-row,
.system-card__stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.signal-row {
  margin-top: var(--spacing-lg);
}

.signal-row span,
.system-card__stack span,
.system-card__category,
.system-card__status,
.system-lane__category {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-full);
  color: var(--color-muted);
  display: inline-flex;
  font-size: 0.8rem;
  line-height: 1;
  padding: 0.45rem 0.65rem;
}

.systems-grid,
.lane-summary-grid,
.proof-grid,
.audience-grid {
  display: grid;
  gap: var(--spacing-lg);
}

.systems-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.systems-grid--featured {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.system-card,
.lane-summary,
.system-lane,
.proof-grid > div,
.audience-grid > div,
.notes-panel,
.principles-panel {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px var(--color-card-shadow);
}

.system-card {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
}

.system-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.system-card__title {
  margin-top: 0;
}

.system-card__summary,
.lane-summary small {
  color: var(--color-muted);
}

.system-card__proof {
  margin: var(--spacing-md) 0;
}

.system-card__proof dt {
  color: var(--color-foreground);
  font-weight: 700;
}

.system-card__proof dd {
  color: var(--color-muted);
  margin: 0 0 var(--spacing-sm);
}

.system-card__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: auto;
  padding-top: var(--spacing-md);
}

.lane-summary {
  color: inherit;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  text-decoration: none;
}

.lane-summary:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.lane-summary span {
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.system-lane {
  padding: var(--spacing-xl);
}

.system-lane__grid {
  display: grid;
  gap: var(--spacing-lg);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.proof-grid,
.audience-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.proof-grid > div,
.audience-grid > div,
.notes-panel,
.principles-panel {
  padding: var(--spacing-lg);
}

.proof-grid strong,
.audience-grid strong {
  display: block;
  margin-bottom: var(--spacing-xs);
}

.proof-grid span,
.audience-grid span {
  color: var(--color-muted);
}

.principles-panel ul {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .command-actions .btn {
    width: 100%;
  }

  .system-card,
  .system-lane,
  .proof-grid > div,
  .audience-grid > div {
    padding: var(--spacing-md);
  }
}
```

- [ ] **Step 2: Import stylesheet**

Add this import to the end of `assets/css/style.scss`:

```scss
@import "components/command-center";
```

- [ ] **Step 3: Run validator**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected: PASS.

- [ ] **Step 4: Commit styling**

```bash
git add assets/css/components/command-center.css assets/css/style.scss
git commit -m "style: add command center portfolio panels"
```

---

### Task 7: Build, Render, Safety Scan, and Publish Readiness

**Files:**
- No required source edits unless verification finds a concrete issue.

- [ ] **Step 1: Run command-center validator**

Run:

```bash
python3 scripts/validate_command_center.py
```

Expected:

```text
PASS: command center validation
```

- [ ] **Step 2: Run Jekyll build**

Run:

```bash
bundle exec jekyll build
```

Expected: build succeeds and writes `_site`.

If local Ruby or Bundler blocks the build, run:

```bash
ruby -v
bundle -v
```

Expected fallback: document the blocker in the final handoff and use GitHub Pages workflow verification after push instead of claiming a local build passed.

- [ ] **Step 3: Run source and built artifact safety scan**

Run:

```bash
rg -n "([0-9]{7}|gh[opsu]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|\\.local\\b|\\.lan\\b|\\.internal\\b)" index.md about.md projects.md work-map.md notes.md _data _includes _site 2>/dev/null || true
```

Expected: no output.

- [ ] **Step 4: Serve locally if build succeeds**

Run:

```bash
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

Expected: local server starts at `http://127.0.0.1:4000/`.

- [ ] **Step 5: Verify key routes over HTTP**

In another terminal, run:

```bash
for path in / /work-map /projects /notes /about /blog; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:4000${path}")
  printf "%s %s\n" "$code" "$path"
done
```

Expected:

```text
200 /
200 /work-map
200 /projects
200 /notes
200 /about
200 /blog
```

- [ ] **Step 6: Commit verification fixes if needed**

If any verification step finds issues, make the smallest fix, then run:

```bash
python3 scripts/validate_command_center.py
bundle exec jekyll build
```

Expected: validator and build pass.

Commit:

```bash
git status --short
git add scripts/validate_command_center.py _data/systems.yml _includes/system-card.html _includes/system-lane.html index.md about.md projects.md work-map.md notes.md blog.md _layouts/default.html _config.yml assets/css/style.scss assets/css/components/command-center.css
git commit -m "fix: pass command center portfolio verification"
```

---

## Self-Review Notes

Spec coverage:

- Positioning and homepage command-center direction: Tasks 4 and 6.
- Phase-1 nav scope and route boundaries: Task 3.
- Curated allowlist data model: Task 2.
- Work Map and Projects reuse of curated data: Tasks 3 and 5.
- Notes migration: Task 3.
- Employer, financial, and redaction safeguards: Tasks 1, 2, 5, and 7.
- Validation and publish readiness: Tasks 1 and 7.

Completion scan:

- This plan uses concrete paths and commands in implementation steps.
- Deferred case studies and generated indexing are excluded from phase 1 by design.

Type consistency:

- `system-card.html` and `system-lane.html` use the same keys defined in `_data/systems.yml`.
- The validator checks the same required keys and visibility values used by the includes and pages.
