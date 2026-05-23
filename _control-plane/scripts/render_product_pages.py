#!/usr/bin/env python3
"""Render richer public product pages from the local product register."""

from __future__ import annotations

import json
import textwrap
import zipfile
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[2]


PRODUCT_COPY = {
    "mcp-operator-field-manual": {
        "pain": "Your MCP server works in one client, disappears in another, and nobody can tell whether the problem is config, transport, auth, schema shape, or tool behavior.",
        "outcome": "Walk an MCP integration from config review through tool-schema review, auth-boundary review, and a repeatable debug runbook.",
        "first_session": "In the first sitting, use the client config worksheet and tool schema review to decide whether an MCP server is safe to enable for local, team, or production-like use.",
        "preview": [
            "Review command, args, URL, working directory, required env keys, and timeout behavior.",
            "Mark which tools read, write, send messages, run commands, or need confirmation.",
            "Debug in order: config load, server startup, tool discovery, auth, then tool behavior.",
        ],
        "best_for": [
            "Builders wiring MCP servers into desktop or hosted agent clients.",
            "Operators who need handoff notes before another person enables a tool.",
            "Consultants who want a lightweight MCP review checklist before touching client systems.",
        ],
        "not_for": [
            "Someone looking for a complete MCP framework or SDK course.",
            "Someone expecting custom implementation or live debugging support.",
        ],
    },
    "agent-memory-infrastructure-pack": {
        "pain": "Your agent keeps forgetting useful context, retrieving the wrong memory, or writing too much unreviewed state into a vector store.",
        "outcome": "Define a memory boundary, decide what gets written, audit recall quality, and document a local Qdrant/mem0-style setup without exposing private memories.",
        "first_session": "Map one agent workflow into write scopes, read scopes, recall tests, and a troubleshooting pass.",
        "preview": [
            "Separate durable facts from transient chat context.",
            "Define who or what is allowed to write memory.",
            "Audit recall with a small set of expected and forbidden retrievals.",
        ],
        "best_for": [
            "Agent builders adding local memory to practical workflows.",
            "Operators who need recall without dumping private state into prompts.",
            "Teams that need a worksheet before choosing memory defaults.",
        ],
        "not_for": [
            "A hosted memory SaaS.",
            "A preconfigured private vector database.",
        ],
    },
    "agent-anti-loop-context-compression-kit": {
        "pain": "The agent is burning tokens, retrying the same move, or swallowing huge logs without finding the next useful action.",
        "outcome": "Spot loop patterns, compress command output, and route a bounded second-opinion review before the run drifts.",
        "first_session": "Classify one stuck run, write a compact evidence summary, and decide whether to continue, branch, or stop.",
        "preview": [
            "Name the loop pattern: repeated command, vague retry, stale assumption, or output overload.",
            "Extract the first real error and the current blocking condition.",
            "Use a review prompt that asks for the next smallest useful action.",
        ],
        "best_for": [
            "People running coding or operations agents for long tasks.",
            "Operators who want a stop condition before context gets expensive.",
            "Builders who use local summarizers or critic passes.",
        ],
        "not_for": [
            "A magic prompt that prevents all agent failures.",
            "A replacement for tests, logs, or human review.",
        ],
    },
    "agent-evaluation-prompt-regression-pack": {
        "pain": "A prompt or agent workflow looked good yesterday, then a model, dependency, or context change quietly changed behavior.",
        "outcome": "Freeze prompts, define eval fixtures, record run artifacts, score outputs, and catch regressions before changing production-like workflows.",
        "first_session": "Create a minimal eval fixture for one workflow and record the expected output shape, scoring rubric, and cost/cache notes.",
        "preview": [
            "Pin the prompt version and input fixture.",
            "Record model, tool, cache, cost, and output artifact metadata.",
            "Score behavior using pass/fail gates plus operator notes.",
        ],
        "best_for": [
            "Agent builders who edit prompts frequently.",
            "Teams that need lightweight regression checks before reruns.",
            "Operators proving that a workflow still behaves after a model change.",
        ],
        "not_for": [
            "Financial, trading, legal, medical, or compliance advice.",
            "A full hosted eval platform.",
        ],
    },
    "ai-deliverable-pipeline-kit": {
        "pain": "AI-generated deliverables are scattered across chat, hand-edited after generation, and hard to regenerate or audit.",
        "outcome": "Define a manifest, renderer contract, validation checklist, and generated-output boundary for repeatable AI deliverables.",
        "first_session": "Turn one deliverable idea into a manifest, expected output contract, and validation checklist.",
        "preview": [
            "Separate source data from generated artifacts.",
            "Define the renderer inputs and output path.",
            "Validate generated output instead of hand-patching it.",
        ],
        "best_for": [
            "Builders producing repeated docs, packets, briefs, or worksheets.",
            "Operators who want regeneration over manual patching.",
            "Consultants building deliverable pipelines without exposing client templates.",
        ],
        "not_for": [
            "Customer-specific SOWs or private pricing templates.",
            "A finished renderer application.",
        ],
    },
    "local-first-meeting-intelligence-blueprint": {
        "pain": "Meeting notes, transcripts, action items, and follow-ups are split across tools, with unclear approval before anything gets routed onward.",
        "outcome": "Sketch a local-first meeting capture and intelligence pipeline with extraction schema, semantic search boundary, and approval-gated routing.",
        "first_session": "Draft the capture boundary, extraction fields, storage/search plan, and approval gate for one meeting workflow.",
        "preview": [
            "Decide what is captured locally and what is never stored.",
            "Define action item, decision, risk, and follow-up fields.",
            "Add an approval gate before sending summaries elsewhere.",
        ],
        "best_for": [
            "Builders designing meeting intelligence systems.",
            "Operators who need local review before routing summaries.",
            "Teams thinking through privacy boundaries before automation.",
        ],
        "not_for": [
            "A transcription app.",
            "A promise of legal or compliance sufficiency.",
        ],
    },
    "ai-work-control-plane-playbook": {
        "pain": "AI work is happening in chat, but status, blockers, evidence, and handoffs are not durable enough for real operations.",
        "outcome": "Use an execution ledger, proof taxonomy, blocker vocabulary, handoff template, and memory checkpoint recipe for proof-led AI work.",
        "first_session": "Create a control-plane record for one active AI workstream and define the evidence needed before claiming progress.",
        "preview": [
            "Separate claim, evidence, blocker, next action, and handoff.",
            "Record proof before marking work complete.",
            "Add a memory checkpoint only after the fact is durable and public-safe.",
        ],
        "best_for": [
            "Operators coordinating long-running AI-assisted work.",
            "Teams that need durable status outside chat.",
            "Builders who want proof gates before automation writes.",
        ],
        "not_for": [
            "A private GitHub Project configuration.",
            "Service desk or customer-ticket process material.",
        ],
    },
    "browser-native-agent-workspace-guide": {
        "pain": "Agent workspaces often hide too much state: tools, browser automation, context budget, rollback, and admin actions are hard to inspect.",
        "outcome": "Design a browser-native agent workspace with visible runtime boundaries, skill discovery, prompt-budget controls, automation safety, and rollback concepts.",
        "first_session": "Map one agent workspace screen into tool surfaces, browser actions, permissions, context budget, and rollback affordances.",
        "preview": [
            "Name what is visible to the operator before an action runs.",
            "Separate browsing, tool execution, memory, and admin controls.",
            "Define rollback or review states for risky actions.",
        ],
        "best_for": [
            "Founders designing agent workspaces.",
            "Builders adding browser automation to an operator UI.",
            "Teams reviewing safety affordances before implementation.",
        ],
        "not_for": [
            "A finished browser automation framework.",
            "A UI kit with production components.",
        ],
    },
    "agent-skill-system-builder-pack": {
        "pain": "Your agent instructions are growing into a pile of prompts, but there is no trigger model, folder shape, validation checklist, or packaging boundary.",
        "outcome": "Design skill folders, trigger rules, progressive disclosure, validation checks, and store copy for reusable agent skills.",
        "first_session": "Turn one reusable workflow into a skill outline with trigger language, files, validation steps, and public-safe packaging notes.",
        "preview": [
            "Write when the skill should trigger and when it should not.",
            "Define the minimum files needed for a reusable workflow.",
            "Validate the skill with a small example before packaging.",
        ],
        "best_for": [
            "Agent builders turning repeated workflows into skills.",
            "Operators who need reusable local instructions without exposing internals.",
            "Creators packaging agent tooling as a downloadable product.",
        ],
        "not_for": [
            "A proprietary skill marketplace.",
            "A bundle of private or employer-specific skills.",
        ],
    },
}

PRODUCT_PRICES = {
    "mcp-operator-field-manual": "$49",
    "agent-memory-infrastructure-pack": "$79",
    "agent-anti-loop-context-compression-kit": "$49",
    "agent-evaluation-prompt-regression-pack": "$99",
    "ai-deliverable-pipeline-kit": "$129",
    "local-first-meeting-intelligence-blueprint": "$49",
    "ai-work-control-plane-playbook": "$79",
    "browser-native-agent-workspace-guide": "$49",
    "agent-skill-system-builder-pack": "$49",
}


def exact_files(op: dict) -> list[str]:
    artifact = ROOT / op["package_artifact"]
    with zipfile.ZipFile(artifact) as z:
        return sorted(name for name in z.namelist() if not name.endswith("/"))


def render_page(candidate: dict) -> str:
    product_id = candidate["id"]
    copy = PRODUCT_COPY[product_id]
    op = candidate["operationalization"]
    files = exact_files(op)
    price = PRODUCT_PRICES[product_id]
    file_items = "\n".join(f"    <li><code>{name}</code></li>" for name in files)
    deliverables = "\n".join(f"    <li>{item.capitalize()}.</li>" for item in candidate.get("deliverables", []))
    preview = "\n".join(f"    <div><strong>Preview</strong><span>{item}</span></div>" for item in copy["preview"])
    best_for = "\n".join(f"    <li>{item}</li>" for item in copy["best_for"])
    not_for = "\n".join(f"    <li>{item}</li>" for item in copy["not_for"] + [f"Not included: {item}." for item in candidate.get("exclude", [])[:3]])
    return textwrap.dedent(f"""\
    ---
    layout: default
    title: {candidate['title']} | Suleman Manji
    description: {copy['outcome']}
    permalink: /products/{product_id}
    ---

    <div class="command-header">
      <p class="command-eyebrow">AI Tooling Product / Instant Download / {price}</p>
      <h1>{candidate['title']}</h1>
      <p class="command-lede">{copy['pain']} This pack gives you the worksheets, checklists, and clean-room examples to handle that work deliberately.</p>
      <div class="command-actions">
        <a href="{op['stripe_payment_link']}" class="btn btn-primary">Buy {candidate['title']}</a>
        <a href="/products" class="btn btn-outline">View all products</a>
      </div>
    </div>

    <section class="command-section">
      <div class="section-kicker">Outcome</div>
      <h2>{copy['outcome']}</h2>
      <p>{copy['first_session']}</p>
    </section>

    <section class="command-section">
      <div class="section-kicker">Inside The ZIP</div>
      <h2>Actual version {op['package_version']} files included.</h2>
      <ul>
    {file_items}
      </ul>
    </section>

    <section class="command-section">
      <div class="section-kicker">What The Templates Help You Do</div>
      <h2>Concrete outputs, not generic AI advice.</h2>
      <div class="proof-grid">
    {preview}
      </div>
    </section>

    <section class="command-section">
      <div class="section-kicker">Deliverables</div>
      <h2>The pack is organized around these buyer tasks.</h2>
      <ul>
    {deliverables}
      </ul>
    </section>

    <section class="command-section">
      <div class="section-kicker">Best Fit</div>
      <h2>Buy this if you need a working operator worksheet more than another theory post.</h2>
      <ul>
    {best_for}
      </ul>
    </section>

    <section class="command-section">
      <div class="section-kicker">Boundaries</div>
      <h2>What this is not.</h2>
      <ul>
    {not_for}
      </ul>
      <p>This is documentation and templates. It is not legal, financial, medical, security certification, compliance, or managed-service advice.</p>
    </section>

    <section class="command-section principles-panel">
      <h2>Checkout and fulfillment</h2>
      <p>One-time Stripe checkout. Manual v1 fulfillment sends the matching ZIP artifact recorded in the local product manifest.</p>
      <div class="command-actions">
        <a href="{op['stripe_payment_link']}" class="btn btn-primary">Buy for {price}</a>
        <a href="mailto:ssmanji89@gmail.com" class="btn btn-outline">Ask before buying</a>
      </div>
    </section>
    """)


def render_index(candidates: list[dict]) -> str:
    cards = []
    for c in candidates:
        copy = PRODUCT_COPY[c["id"]]
        op = c["operationalization"]
        price = PRODUCT_PRICES[c["id"]]
        files = exact_files(op)
        cards.append(textwrap.dedent(f"""\
        <div>
          <strong><a href="/products/{c['id']}">{c['title']}</a></strong>
          <span>{copy['pain']}</span>
          <small>{len(files)} files in the ZIP / {price} / live Stripe checkout</small>
          <a href="/products/{c['id']}" class="btn btn-outline">See contents</a>
        </div>"""))
    return f"""---
layout: default
title: AI Tooling Products | Suleman Manji
description: Downloadable AI tooling worksheets, runbooks, and clean-room templates for operator-grade agent work.
permalink: /products
---

<div class="command-header">
  <p class="command-eyebrow">Storefront / AI Tooling Packs</p>
  <h1>Operator worksheets for agent work that has to survive real use.</h1>
  <p class="command-lede">These are small, specific downloadable packs: worksheets, checklists, clean-room examples, and runbooks built from the tooling patterns in this portfolio. They are for people who need to make agent workflows inspectable, repeatable, and safer before they scale them.</p>
</div>

<section class="command-section">
  <div class="section-kicker">Available Packs</div>
  <h2>Pick the painful moment you are actually dealing with.</h2>
  <div class="proof-grid">
{chr(10).join(cards)}
  </div>
</section>

<section class="command-section principles-panel">
  <h2>What all packs have in common</h2>
  <ul>
    <li>One-time Stripe checkout.</li>
    <li>Manual v1 fulfillment with a versioned ZIP artifact.</li>
    <li>Markdown files you can edit, fork, or convert into your own docs.</li>
    <li>Clean-room examples, not private implementation dumps.</li>
  </ul>
</section>
"""


ROOT = Path(__file__).resolve().parents[2]
data = yaml.safe_load((ROOT / "_control-plane/product-candidates.yml").read_text())
for candidate in data["candidates"]:
    page = ROOT / candidate["operationalization"]["public_page"]
    content = render_page(candidate)
    page.write_text(content, encoding="utf-8")
    draft = ROOT / candidate["operationalization"]["public_page_draft"]
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text(content, encoding="utf-8")
(ROOT / "products/index.md").write_text(render_index(data["candidates"]), encoding="utf-8")
print("PASS: rendered richer product pages")
