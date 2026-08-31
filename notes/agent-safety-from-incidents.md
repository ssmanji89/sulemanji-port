---
layout: default
title: "A write is a claim, not evidence"
permalink: /notes/agent-safety
description: "How real incidents turned into safety protocol for agents that touch production systems."
---

# A write is a claim, not evidence

<div class="tldr" markdown="0">
  <p><strong>In brief:</strong> Three real incidents &mdash; a near-miss write, a bulk action caught one confirmation away, and a mixed verified/inferred brief &mdash; became three standing rules: typed destructive-action confirmation, an approval gate in front of the riskiest writes, and reading state back before reporting success.</p>
</div>

Most of what I build now touches other people's systems — a ticketing platform, a documentation system with client-visible views, billing software, identity providers. An agent that can only read is a research assistant. The moment it can write — reset a password, close a ticket, push a config change — the question "did it work" stops being a courtesy and starts being the whole job. For a while I treated a returned success code the way I'd treat a colleague saying "done." I don't anymore.

That change didn't come from reading a paper on agent safety. It came from two incidents, about six weeks apart, and a third episode that wasn't a system failure at all — it was a writing problem that turned out to be the same problem wearing different clothes.

## Three failures worth keeping

Late May: a session had legitimate access to a documentation platform's password records and ran an update against a live one — no preview, no confirmation step, just a call that succeeded. The record it touched wasn't purely internal; certain fields on that platform propagate to a partner-facing view. Nothing was exposed that shouldn't have been, but the near-miss made something obvious that I'd been fuzzy about: being authorized to call an API is not the same as being authorized to make the specific decision that call represents. An agent can hold both kinds of permission and still be wrong, because the second one needs a human in the loop that the first one doesn't.

Early July: a bulk action — the kind that touches many records in one call, a reset sweep, a batch of remote commands — was one confirmation away from running against a wider set than intended. It got caught before it executed, which is the only reason it's a paragraph in a note instead of a paragraph in an apology. The lesson wasn't "add a confirmation dialog." We already had one. The lesson was that a confirmation dialog which doesn't show the blast radius, in a plain number, isn't informed consent — it's a formality an operator can click through without reading.

The third one wasn't a system doing something wrong. It was me, drafting an external brief on a security investigation, writing sentences that mixed what I'd verified through a direct query with what I'd inferred from a pattern of timestamps, as if the two carried the same weight. They read fine. They were also, in places, wrong, because inference dressed as fact doesn't announce itself — it just sits next to the real thing until someone downstream builds a decision on it. That one taught me the safety problem isn't only "the agent did something." It's also "the agent, or I, said something with more confidence than the evidence behind it."

## The protocols

Three practices came out of that stretch, and all three are still running.

The first is destructive-action gating with a typed confirmation. Any write with a wide or hard-to-reverse blast radius has to show what it's about to touch, in a count a person can sanity-check, and the operator has to type a phrase that names that count back — not click a button, type the number. High-risk bulk actions also carry an explicit authorized-by field: a name or a reference recorded with the action, not implied by whoever happened to be logged in.

The second is an approval gate sitting in front of the riskiest categories of write — billing, security, anything touching a live credential — as its own layer, not a flag buried inside each individual tool. It denies with a reason a person can act on, not a bare error code, and it's provider-neutral on purpose: the same gate protects a billing sync and a password update, because the shape of "this needs a second look" doesn't actually depend on which vendor's API sits on the other end.

The third is the one that reframed everything else: a write's return value is a claim, not evidence. The API said success. That's a claim. Whether the change actually landed is a separate question, answered by reading the state back — independently, after a pause long enough for an eventually-consistent system to catch up — and only then reporting the outcome. Skipping straight from "the call returned 200" to "done" is the same mistake as skipping straight from "the pattern fits" to "verified": both cut the step where you go look.

The writing problem got its own version of the same fix. Every claim in an external-facing brief now carries a label — verified, inferred, or open — and a second reviewer reads specifically for the places where those got flattened into one voice. It sounds like paperwork until you've watched an unlabeled inference get treated as fact three steps downstream, by someone who wasn't in the room when it was written and had no way to tell the difference.

## Why incidents beat foresight

None of these three rules would have occurred to me as a design principle in advance. I could have written "add human confirmation for destructive actions" on a whiteboard on day one, and it would have been true and useless — too general to catch the actual failure, which was never "no confirmation exists." It was "the confirmation didn't carry the information a person needed to actually decide." You don't get that kind of specificity from thinking harder before you ship. You get it from watching where a real one almost went wrong and asking what, exactly, would have stopped it — not the general shape of a safeguard, but the one number, the one label, the one re-read that was actually missing.

That's the part I keep having to relearn: the incident isn't the failure of the safety work. It's the only way the safety work gets specific enough to matter. Foresight gives you good intentions. Incidents give you the exact shape of the thing that goes wrong — which is the only shape a rule can actually be built around.
