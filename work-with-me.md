---
layout: default
title: Work With Me
description: Practical working sessions for people trying to automate messy workflows, rescue stuck AI-assisted projects, or turn rough automation ideas into safer next steps.
permalink: /work-with-me
work_with_me_form: true
hero_eyebrow: Work With Me
hero_title: Practical help for messy automation work.
hero_lede: "Bring me a workflow, repo, AI-assisted process, operations problem, or rough automation idea that feels hard to untangle. We will turn it into a clearer map, safer next step, or build path."
hero_ctas:
  - label: Bring me a messy problem
    url: "#work-with-me-intake"
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

A first working session does not require custody of production systems or employer/client access. Sanitized examples are preferred. Do not send attachments at intake. This is not regulated legal, medical, financial, or compliance advice.

One session may produce a plan, map, prototype direction, cleanup path, or next-step checklist. It does not guarantee production deployment.

## How to start

Use the intake below to describe one messy problem. AI participates in discovery and blueprint generation when the backend processes a case, and Suleman may review any thread before next steps are sent.

{% if site.priority_discovery_checkout_ready %}
Choose normal review if you want me to look manually as time allows. Choose Priority Discovery if you want the paid discovery path after intake; eligible priority cases can request deposit checkout after submission.
{% else %}
Choose normal review if you want me to look manually as time allows. Choose Priority Discovery if you want the paid discovery path after intake; live checkout is unavailable until the legal/tax review is complete.
{% endif %}

<form id="work-with-me-intake" class="intake-form" data-endpoint="{{ site.work_with_me_api_base }}/v1/intakes">
  <label class="form-field">Name <input name="name" required minlength="2" maxlength="120" autocomplete="name"></label>
  <label class="form-field">Email <input name="email" type="email" required maxlength="254" autocomplete="email"></label>
  <fieldset><legend>This workflow is mainly</legend>
    <label><input type="radio" name="contextType" value="personal" required> Personal</label>
    <label><input type="radio" name="contextType" value="professional" required> Professional</label>
  </fieldset>
  <fieldset class="workshop-category-choice"><legend>Pick the closest starting point</legend>
    <p class="form-help">It just helps me ask better first questions. Choose Not sure / Other if the work does not fit cleanly.</p>
    <label><input type="radio" name="workshopCategory" value="github_codebase_review"> <strong>GitHub / Codebase Review</strong><span>Repo, prototype, AI-built app, broken automation, or unclear technical build path.</span></label>
    <label><input type="radio" name="workshopCategory" value="ai_business_operations"> <strong>AI Business Operations</strong><span>Recurring work across email, docs, spreadsheets, tickets, forms, or business systems.</span></label>
    <label><input type="radio" name="workshopCategory" value="home_personal_automation"> <strong>Home + Personal Automation</strong><span>Household, personal admin, inbox, calendar, files, or lightweight life-operations workflows.</span></label>
    <label><input type="radio" name="workshopCategory" value="not_sure_other" checked> <strong>Not sure / Other</strong><span>A messy problem that needs triage before it has a clean category.</span></label>
  </fieldset>
  <label class="form-field">What is messy? <textarea name="problem" required minlength="40" maxlength="6000"></textarea></label>
  <label class="form-field">What would useful look like? <textarea name="desiredOutcome" required minlength="20" maxlength="3000"></textarea></label>
  <label class="form-field">What have you tried? <textarea name="priorAttempts" maxlength="3000"></textarea></label>
  <label class="form-field">Sanitized links, one per line <textarea name="sanitizedLinks" maxlength="2000"></textarea></label>
  <fieldset class="path-choice"><legend>Review path</legend>
    <label><input type="radio" name="path" value="normal" required> Normal review queue</label>
    <label><input type="radio" name="path" value="priority" required> Priority Discovery deposit</label>
  </fieldset>
  <label><input type="checkbox" name="termsAccepted" required> I accept the <a href="/work-with-me/terms">service terms</a> and <a href="/privacy">privacy notice</a>.</label>
  <input name="website" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
  <input name="turnstileToken" type="hidden">
  <div class="turnstile-field">
    <div class="cf-turnstile" data-sitekey="{{ site.turnstile_site_key }}" data-size="flexible" data-callback="onWorkWithMeTurnstile" data-expired-callback="onWorkWithMeTurnstileExpired" data-error-callback="onWorkWithMeTurnstileExpired"></div>
  </div>
  <p id="intake-status" class="form-status" role="status" aria-live="polite"></p>
  <button class="btn btn-primary" type="submit">Submit problem</button>
</form>
