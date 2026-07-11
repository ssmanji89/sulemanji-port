#!/usr/bin/env python3
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = [
    ROOT / "index.md",
    ROOT / "about.md",
    ROOT / "projects.md",
    ROOT / "experience.md",
    ROOT / "resume.md",
    ROOT / "story.md",
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
]

REQUIRED_BY_FILE = {
    "projects.md": [
        "Service delivery automation at Viyu",
        "Review-ready operations artifacts",
        "Governed AI-assisted workflows",
        "SOW",
        "PBR/QBR",
        "invoice-review",
        "review gates",
    ],
    "experience.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
        "Service Delivery Automation",
        "Operational Review Artifacts",
        "Governed AI-Assisted Workflows",
    ],
    "resume.md": [
        "Sr. Services Engineer; acting as Solutions Architect & Automation Engineer",
        "SOW",
        "PBR/QBR",
        "invoice-review",
    ],
    "story.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
        "SOW",
        "PBR/QBR",
        "invoice-review",
    ],
    "about.md": [
        "Sr. Services Engineer",
        "acting as a solutions architect and automation engineer",
    ],
    "index.md": [
        "help architect Microsoft 365 migration work",
        "service-delivery automation",
    ],
}


def read(path):
    return path.read_text(encoding="utf-8")


def main():
    failures = []

    cname = ROOT / "CNAME"
    if not cname.exists() or read(cname).strip() != "www.sulemanji.com":
        failures.append("CNAME must remain www.sulemanji.com")

    for path in PUBLIC_FILES:
        if not path.exists():
            failures.append(f"{path.name} is missing")
            continue
        text = read(path)
        lowered = text.lower()
        for forbidden in FORBIDDEN:
            if forbidden in lowered:
                failures.append(f"{path.name} contains forbidden public term: {forbidden}")

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
