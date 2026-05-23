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
  <h2>Problem surface -> system built -> proof discipline -> operator leverage.</h2>
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
