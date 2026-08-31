---
layout: default
title: "ff-cli: an auction war room"
permalink: /case-studies/ff-cli
description: "Building a valuation engine, a live auction-night web app, and 240 tests to walk into a fantasy football draft as a first-timer with an actual edge."
---

# ff-cli: an auction war room

## Context

I joined a 12-team coworker fantasy football league in 2026 having never played before. That's not a humblebrag — it's the actual starting condition. Everyone else at the table had years of muscle memory for what a player is "worth" at the table versus on paper. I didn't have that instinct, so I built the thing I usually build when I don't have an instinct: a system that turns public data into a defensible number.

The premise is simple. Consensus average draft position (ADP) is the market's price for a player. A points-based valuation, calibrated to the league's own scoring rules, is closer to fair value. The gap between those two numbers — the edge — is the whole game. `ff-cli` is the tool I wrote to compute that gap, track it live at the table, and turn it into decisions a first-timer could actually execute under pressure.

## The build

The valuation core is a value-over-replacement (VOR) engine: take a player's projected points, subtract what a replacement-level player at the same position would score, and rank the surplus. VOR alone isn't useful at an auction, though — an auction runs on dollars, not ranks — so the second piece converts VOR into an auction-dollar figure, anchored against the league's actual budget and calibrated against a real market curve (FantasyFootballCalculator's consensus ADP, converted to average auction value through an exponential curve fit rather than a linear guess, because early-round prices don't move linearly with rank). Divergence between that computed dollar figure and the market's price is the signal the rest of the tool is built around.

That's the part I could have stopped at — a script that prints a ranked list. The part that actually mattered on draft night was the war room: a local, offline web app (`ff warroom`, stdlib `http.server`, zero extra installs) that runs at the table with no dependency on venue wifi. Type a player's name as they're nominated, and it returns a BUY, PASS, or CAP verdict with a hard max bid, computed against my remaining budget and roster needs in real time. Log a sale — player, price, winning owner — and the whole board recomputes: inflation-adjusted prices for every player still on the board, every owner's remaining budget, my own spending ceiling. Every event is flushed to a append-only log as it happens, so a crash or a restart at 11pm on draft night never loses the draft state. A `- Undo` button covers the inevitable mis-tap.

Around that core sits everything a first-timer actually needs and nobody tells you about up front: a plain-English "coach mode" that explains what VOR, inflation, and FAAB actually mean before you need to know; opponent dossiers built from a rival's draft history (spend-by-position, overpay tendencies, tells) so the war room can suggest which players to dangle at a rival who's known to overpay; a Monte Carlo mock-draft simulator to rehearse the plan against a hundred simulated auctions before the real one; and an instant post-draft grade that scores the finished roster against the market. Eighteen `ff` commands in total, covering the full season arc from draft-night through weekly waivers, start/sit, trades, and matchup previews — all fail-soft, all rendering as a self-contained HTML report you can open in any browser at a kitchen table with no connectivity.

None of it ships without confidence that it actually works, so the project carries 240 tests across the valuation math, the market-curve calibration, the war-room server and its event log, the report renderers, and the CLI surface itself — the same discipline I'd want from any tool making a real-time call with real money on the line, even if the stakes here are a league buy-in and bragging rights. The tool ships two ways: a released Python wheel installable with `uv tool install`, and a container published to GHCR, so a rival who wants to run their own copy doesn't need to touch source at all.

## The demo

The clip below is the war room running against public NFL projection and market data, with synthetic owner names standing in for the real league (no reason to put anyone else's name in a public demo). It walks through the actual sequence from a live draft: nominate a player, get a verdict and a max bid, log a sale, watch inflation and the live board react, nominate again.

<video controls src="/assets/ffcli/demo.mp4" style="max-width:100%;border-radius:8px;"></video>

<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
  <img src="/assets/ffcli/warroom-verdict.png" alt="War room nomination showing a CAP verdict and max bid" style="max-width:48%;border-radius:6px;">
  <img src="/assets/ffcli/warroom-sale-logged.png" alt="War room after a sale is logged, board and budgets updated" style="max-width:48%;border-radius:6px;">
  <img src="/assets/ffcli/warroom-best-available.png" alt="Live inflation-adjusted best-available board" style="max-width:48%;border-radius:6px;">
  <img src="/assets/ffcli/warroom-full-board.png" alt="Full war room view with verdict, sale log, board, and budget panel" style="max-width:48%;border-radius:6px;">
</div>

## What it's for

I don't think the interesting part of this project is fantasy football. It's that a novice with public data and a calibrated model can walk into a room full of people with years of instinct and hold their own on the numbers — and that the same shape of problem (a market price, a fair-value estimate, a live decision under a budget constraint) shows up in a lot of places that aren't a fantasy draft. This one just happened to be the version I could build, test, and ship in the open.

Source: [github.com/ssmanji89/viyu-fantasy-football](https://github.com/ssmanji89/viyu-fantasy-football)
