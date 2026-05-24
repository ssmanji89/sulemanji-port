#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCT_ID = "ai-agent-control-plane"
PAGE = ROOT / "products" / f"{PRODUCT_ID}.md"
PACKAGE = ROOT / "_control-plane" / "products" / PRODUCT_ID / "releases" / "v1.1.0" / "package"
ZIP = ROOT / "_control-plane" / "products" / PRODUCT_ID / "releases" / "v1.1.0" / f"{PRODUCT_ID}-v1.1.0.zip"

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
    "Codex",
    "Claude",
    "Cursor",
    "opencode",
    "Preview",
    "Buy",
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


def check_private_artifacts_absent() -> None:
    if PACKAGE.exists():
        fail(f"private package source must not live in public repo: {PACKAGE.relative_to(ROOT)}")
    if ZIP.exists():
        fail(f"private package zip must not live in public repo: {ZIP.relative_to(ROOT)}")


def main() -> None:
    check_page()
    check_private_artifacts_absent()
    print("PASS: AI Agent Control Plane storefront validation")


if __name__ == "__main__":
    main()
