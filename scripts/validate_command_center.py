#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "_data/systems.yml",
    "_includes/system-card.html",
    "_includes/system-lane.html",
    "_tabs/work-map.md",
    "_tabs/projects.md",
    "_tabs/notes.md",
    "_tabs/about.md",
    "_data/locales/en.yml",
    "_sass/command-center.scss",
    "assets/css/jekyll-theme-chirpy.scss",
]

REQUIRED_TAB_FILES = {
    "_tabs/work-map.md": "Work Map",
    "_tabs/projects.md": "Projects",
    "_tabs/notes.md": "Notes",
    "_tabs/about.md": "About",
}

REQUIRED_HOME_PHRASES = [
    "Proof-Gated AI Operations for MSP Systems",
    "Featured Systems",
    "Proof Stream",
    "Operating Principles",
]

ALLOWED_VISIBILITY = {
    "public_repo",
    "public_summary_only",
    "private_internal_do_not_link",
}

PUBLIC_SAFE_DISPLAY_NAMES = {
    "MSP Operations Control Plane",
    "Financial-Agent Paper Runtime",
    "Agent Memory and Runtime Infrastructure",
    "Operator Dashboard Systems",
    "MCP/API Toolchain",
}

BANNED_SOURCE_PATTERNS = [
    r"\b\d{7}\b",
    r"@[A-Za-z0-9.-]+\.(?:local|lan|internal)\b",
    r"\b[A-Za-z0-9._%+-]+@(?!gmail\.com\b|viyu\.net\b|github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    r"gh[opsu]_[A-Za-z0-9_]{20,}",
    r"sk-[A-Za-z0-9]{20,}",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def check_required_files() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    if missing:
        fail(f"missing required files: {', '.join(missing)}")


def check_tabs() -> None:
    locale = read("_data/locales/en.yml")
    for path, label in REQUIRED_TAB_FILES.items():
        text = read(path)
        if f"title: {label}" not in text:
            fail(f"{path} missing title: {label}")
        if label not in locale:
            fail(f"_data/locales/en.yml missing tab label: {label}")


def check_homepage() -> None:
    home = read("index.md")
    for phrase in REQUIRED_HOME_PHRASES:
        if phrase not in home:
            fail(f"homepage missing required phrase: {phrase}")


def check_systems_data() -> None:
    systems = yaml.safe_load(read("_data/systems.yml"))
    if not isinstance(systems, list):
        fail("_data/systems.yml must be a list")
    if len(systems) < 5:
        fail("_data/systems.yml must contain at least five systems")

    display_names = {item.get("display_name") for item in systems if isinstance(item, dict)}
    missing_display_names = PUBLIC_SAFE_DISPLAY_NAMES - display_names
    if missing_display_names:
        fail(f"missing public-safe systems: {', '.join(sorted(missing_display_names))}")

    required_keys = {
        "id",
        "display_name",
        "category",
        "status",
        "summary",
        "problem",
        "system",
        "proof",
        "stack",
        "links",
        "visibility",
    }
    for item in systems:
        if not isinstance(item, dict):
            fail("each system entry must be a map")
        missing = required_keys - set(item)
        if missing:
            fail(f"{item.get('id', '<unknown>')} missing keys: {', '.join(sorted(missing))}")
        if item["visibility"] not in ALLOWED_VISIBILITY:
            fail(f"{item['id']} has invalid visibility: {item['visibility']}")
        if item["visibility"] == "private_internal_do_not_link" and item.get("links"):
            fail(f"{item['id']} is private/internal but has public links")


def check_source_safety() -> None:
    checked_paths = [
        "_data/systems.yml",
        "index.md",
        "_tabs/about.md",
        "_tabs/projects.md",
        "_tabs/work-map.md",
        "_tabs/notes.md",
    ]
    for path in checked_paths:
        text = read(path)
        for pattern in BANNED_SOURCE_PATTERNS:
            if re.search(pattern, text):
                fail(f"{path} matched banned pattern: {pattern}")


def main() -> None:
    check_required_files()
    check_tabs()
    check_homepage()
    check_systems_data()
    check_source_safety()
    print("PASS: command center validation")


if __name__ == "__main__":
    main()
