---
layout: default
title: AI Agent Control Plane | Suleman Manji
description: A GitHub Projects based framework for coordinating AI agents and humans from product idea through Stripe launch readiness.
permalink: /products/ai-agent-control-plane
---

<div class="command-header">
  <p class="command-eyebrow">Flagship AI Tooling Product / Version 1.2.0 / $149</p>
  <h1>AI Agent Control Plane</h1>
  <p class="command-lede">For technical solo builders and small teams already using GitHub and coding agents: use GitHub Projects as the shared operating layer for agent tasks, human review gates, proof artifacts, launch readiness, Stripe commercialization, and project-local agent setup.</p>
  <div class="command-actions">
    <a href="https://buy.stripe.com/dRm5kF5AY1wCbkV2eq3oA09" class="btn btn-primary">Buy AI Agent Control Plane for $149</a>
    <a href="#inside" class="btn btn-outline">See what is inside</a>
  </div>
</div>

<section class="command-section">
  <div class="section-kicker">Why This Exists</div>
  <h2>AI agents can produce work. The hard part is coordinating judgment, proof, and launch decisions.</h2>
  <p>Modern product work is converging around a few strong patterns: Atlassian is pushing agent collaboration around work items and team context, Linear keeps product execution fast and issue-led, GitHub Copilot shows how coding agents can receive issue-shaped work and return pull requests, and Stripe turns launch readiness into concrete products, prices, checkout links, and fulfillment events.</p>
  <p>This product interprets those patterns into a clean GitHub Projects control plane that a small builder can operate without buying a new platform.</p>
</section>

<section class="command-section principles-panel">
  <div class="section-kicker">Technical requirements</div>
  <h2>You should be comfortable running this in an existing repository.</h2>
  <ul>
    <li>An existing GitHub repository with Issues or Projects, or a willingness to create one.</li>
    <li>Node and npm available locally for the included provisioning CLI.</li>
    <li>Comfort reviewing generated project-local files before committing them.</li>
    <li>A human owner who can accept, revise, or reject agent output.</li>
  </ul>
</section>

<section class="command-section principles-panel">
  <div class="section-kicker">What you can build this week</div>
  <h2>A working board for solo builders and small technical teams shipping agent-assisted products.</h2>
  <ul>
    <li>Create a GitHub Project with fields for status, work type, product, agent scope, proof required, public safety, launch stage, Stripe status, and next human decision.</li>
    <li>Turn product ideas into issue-shaped work that can be dispatched to an AI agent without handing over product judgment.</li>
    <li>Require proof before a task moves from agent output to human review.</li>
    <li>Track page, package, checkout, fulfillment, and advertising readiness in the same control surface.</li>
  </ul>
</section>

<section class="command-section" id="inside">
  <div class="section-kicker">Inside the product</div>
  <h2>Version 1.2.0 includes 30 files: framework, templates, manifests, quickstarts, examples, operations handoff, and a provisioning CLI.</h2>
  <ul>
    <li><code>README.md</code></li>
    <li><code>adapters/platform-coverage-guide.md</code></li>
    <li><code>framework/control-plane-model.md</code></li>
    <li><code>framework/github-projects-field-schema.md</code></li>
    <li><code>framework/agent-human-operating-loop.md</code></li>
    <li><code>framework/product-development-lifecycle.md</code></li>
    <li><code>quickstart/buyer-30-minute-setup.md</code></li>
    <li><code>quickstart/github-project-bootstrap.md</code></li>
    <li><code>manifests/control-plane.manifest.yml</code></li>
    <li><code>manifests/field-schema.yml</code></li>
    <li><code>templates/issue-intake-template.md</code></li>
    <li><code>templates/agent-task-brief.md</code></li>
    <li><code>templates/human-review-gate.md</code></li>
    <li><code>templates/stripe-launch-readiness-card.md</code></li>
    <li><code>templates/agent-handoff-note.md</code></li>
    <li><code>templates/project-board-views.md</code></li>
    <li><code>examples/sample-product-control-plane.md</code></li>
    <li><code>examples/sample-agent-human-week.md</code></li>
    <li><code>examples/sample-launch-readiness-review.md</code></li>
    <li><code>operations/fulfillment-handoff.md</code></li>
    <li><code>checklists/ad-readiness-checklist.md</code></li>
    <li><code>checklists/legal-ip-safety-checklist.md</code></li>
    <li><code>policies/support-refund-policy.md</code></li>
    <li><code>packages/ai-agent-control-plane-cli/</code></li>
    <li><code>dist/ai-agent-control-plane-1.2.0.tgz</code></li>
  </ul>
</section>

<section class="command-section">
  <div class="section-kicker">Provisioning Kit</div>
  <h2>Install the control plane into the agent workspace your buyer already uses.</h2>
  <p>The included local npm package can provision project-local setup files for Codex, Claude, Cursor, GitHub Copilot, opencode, Cline, Windsurf, Aider, Continue, and generic agent clients. It supports <code>plan</code>, <code>init</code>, and <code>doctor</code> commands and refuses to overwrite existing files unless <code>--force</code> is passed.</p>
  <div class="proof-grid">
    <div><strong>Plan</strong><span><code>npx --package "$PWD/dist/ai-agent-control-plane-1.2.0.tgz" ai-agent-control-plane plan --target all</code></span></div>
    <div><strong>Install</strong><span><code>ai-agent-control-plane init --target codex,claude,copilot</code></span></div>
    <div><strong>Check</strong><span><code>ai-agent-control-plane doctor</code></span></div>
  </div>
</section>

<section class="command-section">
  <div class="section-kicker">Preview</div>
  <h2>The field schema is the spine of the system.</h2>
  <div class="proof-grid">
    <div><strong>Agent Scope</strong><span>Draft, Research, Implement, Review, Package, Validate, or Publish Prep.</span></div>
    <div><strong>Proof Required</strong><span>None, Link, File, Test, Screenshot, Build, Stripe Object, or Human Approval.</span></div>
    <div><strong>Launch Stage</strong><span>Not Started, Page Draft, Package Draft, Checkout Ready, Fulfillment Ready, Advertise Ready, or Live.</span></div>
    <div><strong>Next Human Decision</strong><span>The one decision a person must make before the item moves forward.</span></div>
  </div>
</section>

<section class="command-section">
  <div class="section-kicker">Operating Loop</div>
  <h2>Agents move work. Humans own acceptance.</h2>
  <p>The package gives you a repeatable loop: shape the work, prepare the agent brief, dispatch the agent, record proof, run a human review gate, harden the artifact, and only then move to launch. The point is not to slow the agent down. The point is to stop agent work from becoming unverifiable product debt.</p>
</section>

<section class="command-section">
  <div class="section-kicker">Best Fit</div>
  <h2>Buy this if you are already doing real agent-assisted product work in GitHub.</h2>
  <ul>
    <li>You use GitHub and want agents, issues, pull requests, review gates, and launch tasks in one control surface.</li>
    <li>You are a solo builder or small technical team turning AI-assisted work into a downloadable product, internal tool, or automation package.</li>
    <li>You want a practical framework influenced by Atlassian, Linear, GitHub Copilot, Stripe, and hands-on agent operations, without adopting another full project-management platform.</li>
  </ul>
</section>

<section class="command-section">
  <div class="section-kicker">Boundaries</div>
  <h2>What this is not.</h2>
  <ul>
    <li>Not a SaaS application.</li>
    <li>Not a GitHub automation bot.</li>
    <li>Not an official Atlassian, Linear, GitHub Copilot, or Stripe integration.</li>
    <li>Not custom consulting, implementation, legal advice, financial advice, or third-party support.</li>
  </ul>
  <p>The package is a clean-room framework and template set. It does not include private repositories, private board data, customer data, secrets, or organization-specific workflows.</p>
</section>

<section class="command-section">
  <div class="section-kicker">Delivery and support</div>
  <h2>Manual fulfillment, clear scope, and buyer-owned implementation.</h2>
  <ul>
    <li>Delivery is manual email fulfillment of the current version 1.2.0 ZIP after Stripe payment confirmation.</li>
    <li>Expected delivery window is one business day while the fulfillment path remains manual.</li>
    <li>Included support covers package access, broken-file replacement, and clarification of the included templates.</li>
    <li>Not included: custom setup, private implementation, third-party platform support, custom GitHub Project administration, or consulting.</li>
    <li>Refund requests within seven days are handled case by case for delivery failures, duplicate purchases, or material package defects.</li>
    <li>Future versions may be sold separately unless the checkout or delivery note explicitly says otherwise.</li>
  </ul>
</section>

<section class="command-section principles-panel">
  <h2>Checkout</h2>
  <p>One-time Stripe checkout for the version 1.2.0 ZIP. Delivery is manual email fulfillment after payment confirmation. The product is delivered as editable Markdown files plus a local npm package that can install project-local instructions for Codex, Claude, Cursor, GitHub Copilot, opencode, Cline, Windsurf, Aider, Continue, and generic agent workspaces.</p>
  <div class="command-actions">
    <a href="https://buy.stripe.com/dRm5kF5AY1wCbkV2eq3oA09" class="btn btn-primary">Buy for $149</a>
    <a href="#ask-before-buying" class="btn btn-outline">Ask before buying</a>
  </div>
</section>

<section class="command-section" id="ask-before-buying">
  <div class="section-kicker">Public Control Plane</div>
  <h2>Ask a structured question before buying.</h2>
  <p>Questions open as public GitHub issues so the product control plane keeps buyer-fit questions, product gaps, and launch feedback visible. Do not include secrets, private repository content, payment details, customer data, or sensitive operational history.</p>
  <form class="intake-form" id="agent-control-plane-inquiry">
    <div>
      <label for="inquiry-name">Name</label>
      <input id="inquiry-name" name="name" autocomplete="name" placeholder="Your name">
    </div>
    <div>
      <label for="inquiry-role">Buyer role</label>
      <select id="inquiry-role" name="role">
        <option>Solo technical builder</option>
        <option>Small technical team</option>
        <option>Product operator</option>
        <option>Engineering lead</option>
        <option>Researching for someone else</option>
      </select>
    </div>
    <div>
      <label for="inquiry-team-size">Team size</label>
      <select id="inquiry-team-size" name="team_size">
        <option>1</option>
        <option>2-5</option>
        <option>6-15</option>
        <option>16+</option>
      </select>
    </div>
    <div>
      <label for="inquiry-github-workflow">Current GitHub workflow</label>
      <select id="inquiry-github-workflow" name="github_workflow">
        <option>Issues and Projects</option>
        <option>Issues only</option>
        <option>Pull requests only</option>
        <option>Not using GitHub yet</option>
      </select>
    </div>
    <div>
      <label for="inquiry-platform">Primary agent platform</label>
      <select id="inquiry-platform" name="platform">
        <option>Codex</option>
        <option>Claude Code</option>
        <option>Cursor</option>
        <option>GitHub Copilot</option>
        <option>opencode</option>
        <option>Cline</option>
        <option>Windsurf</option>
        <option>Aider</option>
        <option>Continue</option>
        <option>Other / mixed</option>
      </select>
    </div>
    <div>
      <label for="inquiry-workspace">Workspace type</label>
      <select id="inquiry-workspace" name="workspace">
        <option>Solo builder repository</option>
        <option>Small team product repo</option>
        <option>Internal tooling repo</option>
        <option>Open source project</option>
        <option>Still deciding</option>
      </select>
    </div>
    <div>
      <label for="inquiry-timeline">Timeline</label>
      <select id="inquiry-timeline" name="timeline">
        <option>This week</option>
        <option>This month</option>
        <option>Researching</option>
      </select>
    </div>
    <div>
      <label for="inquiry-node-comfort">Node/npm comfort</label>
      <select id="inquiry-node-comfort" name="node_comfort">
        <option>Comfortable running a local CLI</option>
        <option>Can run commands with guidance</option>
        <option>Prefer no local CLI</option>
      </select>
    </div>
    <div class="intake-form__wide">
      <label for="inquiry-workflow">First workflow to control</label>
      <textarea id="inquiry-workflow" name="first_workflow" rows="3" placeholder="Example: turning product ideas into agent-scoped GitHub issues with proof gates."></textarea>
    </div>
    <div class="intake-form__wide">
      <label for="inquiry-blocker">Current blocker or failure mode</label>
      <textarea id="inquiry-blocker" name="blocker" rows="3" placeholder="What breaks down today when agents and humans share work?"></textarea>
    </div>
    <div class="intake-form__wide">
      <label for="inquiry-goal">Adoption goal</label>
      <textarea id="inquiry-goal" name="goal" rows="4" placeholder="What are you trying to coordinate with agents and humans?"></textarea>
    </div>
    <div class="intake-form__wide">
      <label for="inquiry-question">Question</label>
      <textarea id="inquiry-question" name="question" rows="5" required placeholder="What do you need to know before buying?"></textarea>
    </div>
    <div class="command-actions intake-form__wide">
      <button class="btn btn-primary" type="submit">Open GitHub issue</button>
      <a class="btn btn-outline" href="mailto:ssmanji89@gmail.com?subject=AI%20Agent%20Control%20Plane%20question">Email instead</a>
    </div>
  </form>
</section>

<script>
  document.getElementById("agent-control-plane-inquiry")?.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const question = String(data.get("question") || "").trim();
    const name = String(data.get("name") || "Prospective buyer").trim();
    const role = String(data.get("role") || "").trim();
    const teamSize = String(data.get("team_size") || "").trim();
    const githubWorkflow = String(data.get("github_workflow") || "").trim();
    const platform = String(data.get("platform") || "").trim();
    const workspace = String(data.get("workspace") || "").trim();
    const timeline = String(data.get("timeline") || "").trim();
    const nodeComfort = String(data.get("node_comfort") || "").trim();
    const firstWorkflow = String(data.get("first_workflow") || "").trim();
    const blocker = String(data.get("blocker") || "").trim();
    const goal = String(data.get("goal") || "").trim();
    const title = `AI Agent Control Plane inquiry: ${platform || "buyer question"}`;
    const body = [
      "## Buyer Context",
      "",
      `Name: ${name}`,
      `Buyer role: ${role || "Not specified"}`,
      `Team size: ${teamSize || "Not specified"}`,
      `Current GitHub workflow: ${githubWorkflow || "Not specified"}`,
      `Primary agent platform: ${platform || "Not specified"}`,
      `Workspace type: ${workspace || "Not specified"}`,
      `Timeline: ${timeline || "Not specified"}`,
      `Node/npm comfort: ${nodeComfort || "Not specified"}`,
      "",
      "## Adoption Goal",
      "",
      goal || "Not specified.",
      "",
      "## First Workflow To Control",
      "",
      firstWorkflow || "Not specified.",
      "",
      "## Current Blocker Or Failure Mode",
      "",
      blocker || "Not specified.",
      "",
      "## Question",
      "",
      question || "Not specified.",
      "",
      "## Public Notes",
      "",
      "This issue was generated from the public AI Agent Control Plane inquiry form. It should not include secrets, customer data, private repository content, payment details, or sensitive operational history."
    ].join("\n");
    const params = new URLSearchParams({
      template: "ai-agent-control-plane-question.md",
      title,
      labels: "question,ai-agent-control-plane,buyer-inquiry",
      body
    });
    window.location.href = `https://github.com/ssmanji89/sulemanji-port/issues/new?${params.toString()}`;
  });
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "AI Agent Control Plane",
  "description": "A GitHub Projects based Agentic Operations framework for coordinating coding agents and human review through product launch readiness.",
  "brand": {
    "@type": "Brand",
    "name": "Sulemanji"
  },
  "offers": {
    "@type": "Offer",
    "price": "149",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://www.sulemanji.com/products/ai-agent-control-plane"
  }
}
</script>
