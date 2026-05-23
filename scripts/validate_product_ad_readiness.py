#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import zipfile
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

REQUIRED_PACKAGE_FILES = [
    "README.md",
    "adapters/platform-coverage-guide.md",
    "framework/control-plane-model.md",
    "framework/github-projects-field-schema.md",
    "framework/agent-human-operating-loop.md",
    "framework/product-development-lifecycle.md",
    "templates/issue-intake-template.md",
    "templates/agent-task-brief.md",
    "templates/human-review-gate.md",
    "templates/stripe-launch-readiness-card.md",
    "templates/agent-handoff-note.md",
    "templates/project-board-views.md",
    "examples/sample-product-control-plane.md",
    "examples/sample-agent-human-week.md",
    "checklists/ad-readiness-checklist.md",
    "checklists/legal-ip-safety-checklist.md",
    "policies/support-refund-policy.md",
    "packages/ai-agent-control-plane-cli/package.json",
    "packages/ai-agent-control-plane-cli/src/cli.js",
    "packages/ai-agent-control-plane-cli/src/provisioner.js",
    "packages/ai-agent-control-plane-cli/test/provisioner.test.js",
    "dist/ai-agent-control-plane-1.1.0.tgz",
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


def check_package() -> None:
    for relative in REQUIRED_PACKAGE_FILES:
        path = PACKAGE / relative
        if relative.endswith(".tgz"):
            if not path.exists():
                fail(f"missing required file: {path.relative_to(ROOT)}")
            continue
        text = read(path)
        check_no_forbidden(path, text)
        if relative.endswith(".md") and len(text.split()) < 120 and not relative.startswith("policies/"):
            fail(f"{path.relative_to(ROOT)} is too thin for an advertisable product")


def check_zip() -> None:
    if not ZIP.exists():
        fail(f"missing package zip: {ZIP.relative_to(ROOT)}")
    with zipfile.ZipFile(ZIP) as archive:
        names = set(archive.namelist())
        missing = [name for name in REQUIRED_PACKAGE_FILES if name not in names]
        if missing:
            fail(f"zip missing files: {', '.join(missing)}")
        for name in names:
            if not name.endswith((".md", ".js", ".json")):
                continue
            text = archive.read(name).decode("utf-8")
            for pattern in FORBIDDEN_TERMS:
                if re.search(pattern, text, flags=re.IGNORECASE):
                    fail(f"zip file {name} matched forbidden term: {pattern}")


def main() -> None:
    check_page()
    check_package()
    check_zip()
    print("PASS: AI Agent Control Plane ad-readiness validation")


if __name__ == "__main__":
    main()
