#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCT_ID = "ai-agent-control-plane"
VERSION = "2.0.0"
FILE_COUNT = "26"
PAGE = ROOT / "products" / f"{PRODUCT_ID}.md"
PUBLIC_METADATA = ROOT / "_control-plane" / "public-product-metadata" / f"{PRODUCT_ID}.yml"
PRIVATE_ARTIFACT_DIRS = [
    ROOT / "_control-plane" / "products",
    ROOT / "_control-plane" / "fulfillment",
    ROOT / "_control-plane" / "public-page-drafts",
    ROOT / "_control-plane" / "launch",
]

REQUIRED_PAGE_PHRASES = [
    "AI Agent Control Plane",
    "GitHub Projects",
    "agents and humans",
    "Atlassian",
    "Linear",
    "GitHub Copilot",
    "Stripe",
    "What you can build this week",
    "Inside the product",
    "Provisioning Kit",
    "Control Plane Core",
    "Human Gates",
    "Hermes/Telegram Layer",
    "Commercialization Layer",
    "Knowledge/Evidence Layer",
    "Codex",
    "Claude",
    "Cursor",
    "opencode",
    "Preview",
    "Buy",
    "Ask before buying",
    "Open GitHub issue",
    "buyer-inquiry",
    "manual email fulfillment",
    "one business day",
    "Refund requests within seven days",
    "Future versions may be sold separately",
    "Technical requirements",
    "Node and npm",
    "Buyer role",
    "Current GitHub workflow",
    f"Version {VERSION}",
    f"{FILE_COUNT} files",
    f"ai-agent-control-plane-{VERSION}.tgz",
]

FORBIDDEN_TERMS = [
    r"\bV[i]yu\b",
    r"\bemploy(?:er|ment)\b",
    r"\bclient\b",
    r"\bM" r"SP\b",
    r"\bservice\s+ticket\b",
    r"\bProject\s+4\b",
    r"\bSTRIPE_PAYMENT_LINK_PENDING\b",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def check_no_forbidden(path: Path, text: str) -> None:
    for pattern in FORBIDDEN_TERMS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            fail(f"{path.relative_to(ROOT)} matched forbidden term: {pattern}")


def check_page() -> None:
    text = read(PAGE)
    check_no_forbidden(PAGE, text)
    for phrase in REQUIRED_PAGE_PHRASES:
        if phrase not in text:
            fail(f"product page missing phrase: {phrase}")
    if text.count("class=\"btn btn-primary\"") < 2:
        fail("product page needs at least two primary checkout CTAs")


def check_public_metadata() -> None:
    text = read(PUBLIC_METADATA)
    check_no_forbidden(PUBLIC_METADATA, text)
    required = [
        f"version: {VERSION}",
        f"file_count: {FILE_COUNT}",
        "repository: ssmanji89/sulemanji-ip-products",
        "issue_template: ai-agent-control-plane-question.md",
        "Buyer artifacts stay private",
    ]
    for phrase in required:
        if phrase not in text:
            fail(f"public metadata missing phrase: {phrase}")


def check_private_artifacts_absent() -> None:
    for path in PRIVATE_ARTIFACT_DIRS:
        if path.exists():
            fail(f"private artifact directory must not live in public repo: {path.relative_to(ROOT)}")


def main() -> None:
    check_page()
    check_public_metadata()
    check_private_artifacts_absent()
    print("PASS: AI Agent Control Plane storefront validation")


if __name__ == "__main__":
    main()
