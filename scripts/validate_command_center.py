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
    "work-map.md",
    "notes.md",
    "blog.md",
    "assets/css/components/command-center.css",
]

REQUIRED_NAV_LINKS = {
    "Home": "/",
    "Work Map": "/work-map",
    "Projects": "/projects",
    "Notes": "/notes",
    "About": "/about",
}
FORBIDDEN_NAV_LABELS = ["Experience", "Skills", "Blog"]

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

BANNED_SOURCE_PATTERNS = [
    r"\b\d{7}\b",  # ticket-like IDs
    r"@[A-Za-z0-9.-]+\.(?:local|lan|internal)\b",
    r"\b[A-Za-z0-9._%+-]+@(?!gmail\.com\b|viyu\.net\b|github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    r"gh[opsu]_[A-Za-z0-9_]{20,}",
    r"sk-[A-Za-z0-9]{20,}",
]

PUBLIC_SAFE_DISPLAY_NAMES = {
    "MSP Operations Control Plane",
    "Financial-Agent Paper Runtime",
    "Agent Memory and Runtime Infrastructure",
    "Operator Dashboard Systems",
    "MCP/API Toolchain",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def read(path: str) -> str:
    try:
        return (ROOT / path).read_text(encoding="utf-8")
    except FileNotFoundError:
        fail(f"missing required file: {path}")


def check_required_files() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    if missing:
        fail(f"missing required files: {', '.join(missing)}")


def check_nav() -> None:
    layout = read("_layouts/default.html")
    nav_match = re.search(
        r'<nav\b[^>]*class="[^"]*\bmain-nav\b[^"]*"[^>]*>(.*?)</nav>',
        layout,
        re.DOTALL,
    )
    if not nav_match:
        fail('missing primary nav block: <nav class="main-nav">')

    nav = nav_match.group(1)
    links = {}
    for href, anchor_label in re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', nav, re.DOTALL):
        label = re.sub(r"<[^>]+>", "", anchor_label)
        links[" ".join(label.split())] = href

    for label, href in REQUIRED_NAV_LINKS.items():
        if label not in links:
            fail(f"missing primary nav label: {label}")
        if links[label] != href:
            fail(f"primary nav label {label} points to {links[label]}, expected {href}")
    for label in FORBIDDEN_NAV_LABELS:
        if label in links:
            fail(f"old primary nav label still present: {label}")


def check_homepage() -> None:
    home = read("index.md")
    for phrase in REQUIRED_HOME_PHRASES:
        if phrase not in home:
            fail(f"homepage missing required phrase: {phrase}")


def check_blog_compatibility() -> None:
    blog = read("blog.md")
    if "/notes" not in blog:
        fail("blog.md must point legacy readers to /notes")


def check_systems_data() -> None:
    data_path = ROOT / "_data/systems.yml"
    try:
        systems = yaml.safe_load(data_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        fail(f"_data/systems.yml is not valid YAML: {exc}")
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
        "_includes/system-card.html",
        "_includes/system-lane.html",
        "index.md",
        "about.md",
        "projects.md",
        "work-map.md",
        "notes.md",
        "blog.md",
    ]
    for path in checked_paths:
        text = read(path)
        for pattern in BANNED_SOURCE_PATTERNS:
            if re.search(pattern, text):
                fail(f"{path} matched banned pattern: {pattern}")


def main() -> None:
    check_required_files()
    check_nav()
    check_homepage()
    check_blog_compatibility()
    check_systems_data()
    check_source_safety()
    print("PASS: command center validation")


if __name__ == "__main__":
    main()
