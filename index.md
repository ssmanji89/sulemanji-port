---
layout: default
title: Suleman Manji | Proof-Gated AI Operations for MSP Systems
description: Proof-gated AI operations, MSP systems engineering, agent runtime infrastructure, and public-safe technical work by Suleman Manji.
---

<div class="command-hero">
  <p class="command-eyebrow">Operator / Engineering Portfolio</p>
  <h1>MSP command planes that survive contact with real work.</h1>
  <p class="command-lede">I build the glue between service tickets, platform APIs, billing systems, agent runtimes, stakeholder artifacts, and proof gates. The work is less about demos and more about making messy operational state safe enough to act on.</p>
  <div class="command-actions">
    <a href="/work-map" class="btn btn-primary">View Work Map</a>
    <a href="/projects" class="btn btn-outline">Featured Systems</a>
    <a href="mailto:ssmanji89@gmail.com" class="btn btn-outline">Contact</a>
  </div>
  <div class="signal-row" aria-label="Current work signals">
    <span>Eight-platform MSP tooling</span>
    <span>CWM execution control planes</span>
    <span>Microsoft Graph diagnostics</span>
    <span>AlgaPSA / vArida billing</span>
    <span>Qdrant / mem0 recall</span>
    <span>Stakeholder artifact pipelines</span>
  </div>
</div>

<section class="command-section">
  <div class="section-kicker">Current Operating Surface</div>
  <h2>The active work is a command center, not a portfolio theme.</h2>
  <div class="proof-grid proof-grid--wide">
    <div><strong>Platform depth</strong><span>ConnectWise Manage, CW Automate, ScreenConnect, Microsoft Graph, ITGlue, Sophos, Cavelo, vCloud, Meraki, Portainer, GitHub, and AlgaPSA/vArida all show up in the current local work surface.</span></div>
    <div><strong>Execution discipline</strong><span>Tickets become task structures, notes, status gates, schedule entries, time entries, and repo-side registers. Work is verified after writes instead of assumed complete.</span></div>
    <div><strong>Agent infrastructure</strong><span>Session logs, Project 4 items, Qdrant-backed memory, generated CLI contracts, and reusable skills are treated as operational infrastructure.</span></div>
    <div><strong>Public boundary</strong><span>The site abstracts client-sensitive details while keeping the engineering pattern visible: real platforms, real constraints, real proof.</span></div>
  </div>
</section>

<section class="command-section">
  <div class="section-kicker">Featured Systems</div>
  <h2>Evidence-led systems lanes.</h2>
  <div class="systems-grid systems-grid--featured">
    {% for system in site.data.systems limit:3 %}
      {% include system-card.html system=system %}
    {% endfor %}
  </div>
</section>

<section class="command-section">
  <div class="section-kicker">Active Lanes</div>
  <h2>Problem surface -> operating system -> proof path -> leverage.</h2>
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
  <h2>What counts as proof here.</h2>
  <div class="proof-grid">
    <div><strong>CWM evidence</strong><span>Ticket state, tasks, notes, time entries, and post-write verification.</span></div>
    <div><strong>Runtime proof</strong><span>Deployed behavior, route checks, stack state, and smoke tests.</span></div>
    <div><strong>Control-plane gates</strong><span>GitHub Project 4 fields, issue hierarchy, validation commands, and proof comments.</span></div>
    <div><strong>Memory continuity</strong><span>Qdrant/mem0 recall, checkpoint wrappers, and session-harvest artifacts.</span></div>
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
    <li>Use the live system as the source of truth.</li>
    <li>Preview risky writes and verify the result after execution.</li>
    <li>Turn one-off troubleshooting into reusable skills, scripts, and runbooks.</li>
    <li>Keep client-sensitive details out of public artifacts.</li>
    <li>Make agent work durable enough for another operator to resume.</li>
  </ul>
</section>
