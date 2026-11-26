#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = [
    ROOT / "index.html",
    ROOT / "about.md",
    ROOT / "contact.md",
    ROOT / "work.md",
    ROOT / "_data" / "work-cases.yml",
    ROOT / "work" / "service-operations.md",
    ROOT / "work" / "market-systems.md",
    ROOT / "work" / "integrations.md",
    ROOT / "work" / "knowledge-tools.md",
    ROOT / "work" / "ff-cli.md",
    ROOT / "work" / "mathematical-verification.md",
    ROOT / "experience.md",
    ROOT / "resume.md",
]
PUBLIC_METADATA_FILES = [
    ROOT / "_config.yml",
]

FORBIDDEN = [
    "bodhi",
    "commissions console",
    "commission console",
    "commission dashboard",
    "commission operations",
    "earned/paid/owed",
    "eight-platform",
    "eight typescript clis",
    "per-customer isolation",
    "docker container",
    "typed adapter",
    "viyu-agents apis",
    "viyu-agents",
    "msp automation",
    "ai agent tooling",
]

FORBIDDEN_PATTERNS = [
    re.compile(r"\bcommissions?\b", re.IGNORECASE),
]

REQUIRED_BY_FILE = {
    "about.md": [
        "services engineer at Viyu Network Solutions",
        "Management Information Systems",
    ],
    "index.html": [
        "Dependable operations. Practical automation.",
        "contact-support/contact-us/",
    ],
    "contact.md": [
        "Business inquiries",
        "contact-support/contact-us/",
    ],
    "work-cases.yml": [
        "Service delivery with AI agents",
        "Business delivery is through Viyu",
    ],
}


def read(path):
    return path.read_text(encoding="utf-8")


def main():
    failures = []

    cname = ROOT / "CNAME"
    if not cname.exists() or read(cname).strip() != "www.sulemanji.com":
        failures.append("CNAME must remain www.sulemanji.com")

    for path in [*PUBLIC_FILES, *PUBLIC_METADATA_FILES]:
        if not path.exists():
            failures.append(f"{path.name} is missing")
            continue
        text = read(path)
        lowered = text.lower()
        for forbidden in FORBIDDEN:
            if forbidden.lower() in lowered:
                failures.append(f"{path.name} contains forbidden public term: {forbidden}")
        for forbidden_pattern in FORBIDDEN_PATTERNS:
            if forbidden_pattern.search(text):
                failures.append(
                    f"{path.name} contains forbidden public pattern: {forbidden_pattern.pattern}"
                )

        for required in REQUIRED_BY_FILE.get(path.name, []):
            if required not in text:
                failures.append(f"{path.name} missing required phrase: {required}")

    if failures:
        print("Viyu positioning verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Viyu positioning verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
