#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs/superpowers/specs/2026-07-11-work-with-me-priority-discovery-design.md"
PLAN = ROOT / "docs/superpowers/plans/2026-07-11-work-with-me-priority-discovery.md"
WRANGLER = ROOT / "worker/wrangler.jsonc"


def read(path):
    return path.read_text(encoding="utf-8")


def require(condition, message, failures):
    if not condition:
        failures.append(message)


def main():
    failures = []

    for path in (SPEC, PLAN, WRANGLER):
        require(path.exists(), f"{path.relative_to(ROOT)} is missing", failures)

    spec = read(SPEC) if SPEC.exists() else ""
    plan = read(PLAN) if PLAN.exists() else ""
    wrangler = read(WRANGLER) if WRANGLER.exists() else ""
    combined = "\n".join([spec, plan, wrangler])

    require("Fixed deposit: `$295`" in spec, "spec must define one fixed $295 deposit", failures)
    require("session pricing remains private" in spec.lower(), "spec must keep session pricing private", failures)
    require("Credit validity: 60 days after blueprint delivery." in spec, "spec must preserve 60-day credit validity", failures)
    require("text and sanitized links only" in spec.lower(), "spec must restrict intake to text and sanitized links", failures)
    require("No file attachments at launch." in spec, "spec must reject launch attachments", failures)
    require("ssmanji89@gmail.com" in spec, "spec must name the launch Gmail sender", failures)
    require("within one business day" in spec.lower(), "spec must preserve the human-review SLA", failures)
    require("routine outputs can eventually send automatically" in spec.lower(), "spec must allow routine auto-send later", failures)
    require("become Gmail drafts" in spec, "spec must hold sensitive outputs as Gmail drafts", failures)
    require("employment surveillance" in spec.lower(), "spec must exclude employment-surveillance cases", failures)
    require("high-impact decisions" in spec.lower(), "spec must exclude high-impact decision workflows", failures)
    require("credentials, secrets" in spec.lower(), "spec must exclude credential handling", failures)
    require("private third-party data" in spec.lower(), "spec must exclude sensitive third-party data", failures)

    require('"PRIORITY_DEPOSIT_CENTS": "29500"' in wrangler, "wrangler must expose a single fixed deposit variable", failures)
    require('"MANDATORY_REVIEW_CASE_LIMIT": "10"' in wrangler, "wrangler must expose launch review gate size", failures)
    require("FOUNDING_DEPOSIT_CENTS" not in wrangler, "wrangler must not use founding deposit pricing", failures)
    require("STANDARD_DEPOSIT_CENTS" not in wrangler, "wrangler must not use standard deposit pricing", failures)
    require("FOUNDING_CASE_LIMIT" not in wrangler, "wrangler must not use founding case limit", failures)

    forbidden_phrases = [
        "founding price",
        "standard price",
        "founding offer",
        "standard offer",
        "first ten paid cases that reach `discovery_active` use `$295`",
        "otherwise `$395`",
        "FOUNDING_DEPOSIT_CENTS",
        "STANDARD_DEPOSIT_CENTS",
    ]
    for phrase in forbidden_phrases:
        require(phrase.lower() not in combined.lower(), f"must not contain stale phrase: {phrase}", failures)

    require(re.search(r"Priority Discovery uses one fixed `\$295` deposit", spec) is not None, "acceptance criteria must assert fixed deposit", failures)
    require("uses the configured fixed Priority Discovery Deposit" in plan, "plan must implement configured fixed deposit", failures)
    require("records whether the case is inside the launch review gate" in plan, "plan must implement launch review gate tracking", failures)

    if failures:
        print("Priority Discovery plan verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Priority Discovery plan verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
