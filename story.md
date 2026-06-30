---
layout: default
title: Story | Suleman Manji
description: The long version — how Suleman Manji went from a brake-shop counter in Houston to building AI agent platforms for managed-service operations.
permalink: /story
hero_eyebrow: The long version
hero_title: From brakes to bytes.
hero_lede: "A counter at a brake shop, a NOC running fifteen thousand machines, a few hundred repositories, and a habit I've never shaken: point automation at a problem and see what holds."
---

## Houston

I grew up in Houston, mostly. The detail I remember best about being a kid is that I watched everything — I was the one in the room keeping track of who was where and what was about to go wrong. That turned out to be useful later, professionally; pattern recognition is most of the job. It came from somewhere harder than a job, though. My father's illness and his passing in 2000 set the terms for a lot of what followed, and I'll leave it there except to say it's the hinge the rest of the story turns on.

My teenage years ran straight into the years after 9/11, and I learned early what it feels like to be singled out for who people assume you are. Once that was literal: I got jumped and kicked in the sternum. I don't dwell on it, but it's part of how I read a room — and probably part of why I notice when something's about to go wrong before it does.

School eventually pointed me at the University of Houston's Bauer College, where I studied Management Information Systems. I started at ERGOS in December 2011, a year and a half before I graduated, so for a while "student" and "support consultant" were the same person with two badges.

## The brake shop

Before any of that, my first real job was behind the counter at a Brake Check. It was the opposite of school — nothing abstract about it, the work was the work — and I've borrowed the phrase *brakes to bytes* ever since to describe the jump into technology. It stuck for a reason. Years later, in the gap between two enterprise consulting jobs, I ran a small mobile-mechanic operation on the side: diagnostics in someone's driveway, brake jobs, AC repair, booked through Calendly and paid through PayPal. Brakes never fully left.

## ERGOS, the crucible

I spent more than five years at ERGOS Technology Partners and grew up there, professionally — from managed-services intern to Senior Automation Architect, with a Network Operations Manager title stacked on for a stretch in between.

The automation habit started almost immediately and almost by accident. As an intern I was handed corporate device onboarding — a tedious, error-prone ritual — and instead of doing it by hand I scripted it: PowerShell, LabTech, a Run Once registry key, and, in my own words at the time, "a dash of general systems administrator hackery." That was the first time I felt the specific satisfaction of replacing a chore with a process. I never got over it.

It compounded from there. I built a Windows monitoring program that chewed through fleet telemetry to flag problems before tickets came in. For patching, I scraped Reddit and Google to stay ahead of which vulnerabilities and updates actually mattered that week — threat intelligence assembled out of where practitioners were already complaining. By the time I was running network operations, the reporting surface was around fifteen thousand workstations and a couple thousand servers, and I'd written a "New User Device Onboarding" playbook — secure, repeatable provisioning — that, looking back, was a SOAR runbook before the industry had the acronym.

I left ERGOS in 2017, abruptly. The honest version is that I was burned out and needed to reset and figure out what I actually wanted from the work. I took the time. It was the right call.

## The consulting years

What followed was a decade-ish of going where the hard problems were.

At a Houston energy company — Sugar Land Petroleum — I stabilized an aging Windows Small Business Server environment, cut downtime, streamlined the petroleum back-office processing, and remediated the network across seventeen sites. I set up disaster-recovery policies that didn't exist yet and digitized a paper process that was costing people hours.

At Fulcrum Technology Solutions I worked as the security-and-architecture hired gun across a string of client engagements: a CyberArk endpoint-privilege rollout for an international healthcare org, a GDPR-compliant Azure migration for a UK/Ireland system, VMware security-posture reporting wired into Splunk, a KeePass-to-CyberArk privileged-access migration with automated credential rotation, and an Active Directory rebuild after a ransomware incident at a building-supplies company. At one point I was supporting infrastructure spanning a hundred thousand-plus Azure identities. Security work suits the vigilant kid; the job is mostly noticing what's wrong before it's loud.

A short, intense stint at StackAdvisors put me on the other side of the wall as an interim Azure/.NET engineer — I took a 40% bite out of their hosting costs, cut deployment failures in half by building real CI/CD, and chased down the architectural reasons a Blazor app was throwing 500s until it stopped.

Then ZG Companies, a real-estate group, where the work turned operational and broad: I pushed their Microsoft 365 Secure Score to 88.8%, built seventy-plus Power Automate flows for things like expense reconciliation, and rolled out physical security and wireless across dozens of properties. It's also where a parallel project of mine — automating the boring parts of a property portfolio — turned into a real cluster of tools: budget forecasting pipelines, HUD inspection processors, payroll and Planner reporting.

## The maker thread

Running underneath the day jobs is a hobby that refuses to stay a hobby. On January 12, 2021, I committed the first version of a repository called `botStuff`: a Python bot that traded stocks through Robinhood. That repository became a personal lab. Trading bots, a crypto high-frequency experiment, machine-learning detours, a lottery-probability tool — all of it the same instinct from the brake shop and the NOC, just pointed at the market.

When the first wave of AI agent frameworks showed up in 2023, I was already there, forking and extending MetaGPT, AutoGen, MemGPT — building things like an AutoGen-to-Azure integration and an early AI-SOAR prototype before "agent" was a product category. By 2025 the hobby and the profession had collapsed into the same thing.

The trading work is the clearest example of how far the instinct runs. What started as a script is now a multi-agent system: four analysts arguing fundamentals, sentiment, news, and technicals in parallel, a bull-versus-bear debate, a risk manager and a fund manager who can veto a trade, a dozen validation gates before anything executes — and a desktop app wrapped around it. It still only trades on paper. The point was never the money; it was whether I could build a thing that reasons about a decision the way a careful person would.

## Now

Since July 2025 I've been a Solutions Architect and Automation Engineer at Viyu Network Solutions, and the two halves of my career finally do the same work. The biggest recent project was a tenant-to-tenant Microsoft 365 migration — 641 users, 6,543 GB, 122 SharePoint sites, all of it — which I largely turned into tooling so it could be done safely and verified instead of crossed-fingers. The rest of the time I build the connective tissue between service platforms and AI: roughly a hundred-plus MCP and CLI tools spanning Microsoft 365, ITGlue, ConnectWise, and HaloPSA, a Claude Code plugin with autonomous agents for the repetitive operational work, and a multi-tenant Teams ticketing platform with its own per-customer isolation. A couple of the smaller MCP servers are public and on npm.

## What I'm actually chasing

I'll be honest about the engine underneath all of this: ambition has been a double-edged thing for me — it's propelled me and it's been my own worst adversary, and I haven't fully resolved that tension. Some of what I build, I build because the problem is probably unsolvable and I want to see how far I get anyway. There's a research platform of mine quietly attacking the Beal Conjecture, a number-theory problem with a million-dollar prize attached. I don't expect to win it. That's not really the point.

The point, as far as I can tell, is the same as it's always been: find a problem, build something that holds, and keep going.

<div class="cta-buttons" markdown="0">
  <a href="/experience" class="btn btn-primary">The work, by the numbers</a>
  <a href="/projects" class="btn btn-outline">What I've built</a>
  <a href="/beyond" class="btn btn-outline">Beyond work</a>
</div>
