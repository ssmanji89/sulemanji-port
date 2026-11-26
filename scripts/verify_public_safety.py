#!/usr/bin/env python3
"""Blocks publication of confidential names/claims identified in portfolio-audit/2026-08-30/do-not-claim.md."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_GLOBS = ["*.md", "*.html", "*.yml", "writing/*.md", "case-studies/*.md", "work/**/*.md", "notes/*.md", "_data/*.yml"]
EXCLUDE_DIRS = {"_site", "vendor", "docs", "node_modules", ".git", "blog_automation", "worker"}

FORBIDDEN = [
    (r"\bCrebrid\b|\bWildcat Lending\b|\bMedve\b|\bBrowningOil\b|\bBrowning Oil\b|\bWNLIC\b|\bJameswood\b|\bJames Wood\b|\bPraesidium\b|\bPresidium\b|\bProvidence Energy\b|\bPeak Trailer\b|\bOden ?Hughes\b|\bEssential HR\b|\bSterling Personnel\b|\bSpectrum ?Diamonds\b|\bFullerLaw\b|\bROMCO\b|\bDunn (&|and) Dill\b|\bEagle Metal\b|\b2112 Capital\b|\bVisitDallas\b|\bAAA Trophy\b", "client name from do-not-claim list"),
    (r"\bLandon\b|\bIrwin\b", "personnel/departure story (do-not-claim #26)"),
    (r"hours saved|saved \d+ hours|\d+% faster (resolution|tickets)", "unsupported hours-saved claim (do-not-claim #30)"),
    (r"(built|created|authored) (the )?AlgaPSA|\bbuilt Hermes Agent\b", "upstream-authorship claim (do-not-claim #1/#4)"),
    (r"\$1[23]\dK/mo|\$130,?000", "unverified billing figure — use 'six-figure monthly' (do-not-claim #26)"),
    (r"(returns? of|profit(able)?|P&L)[^.]{0,40}(trading|Teffo|bot)", "trading performance claim (do-not-claim #6)"),
    (r"80% (AI )?cost reduction", "design target presented as result (do-not-claim #27)"),
]


def public_files():
    for pattern in PUBLIC_GLOBS:
        for p in ROOT.glob(pattern):
            if p.is_file() and not any(part in EXCLUDE_DIRS for part in p.parts):
                yield p


def public_output_files(site_root=None):
    site_root = Path(site_root) if site_root is not None else ROOT / "_site"
    if not site_root.is_dir():
        return
    text_suffixes = {".css", ".html", ".js", ".json", ".md", ".txt", ".xml", ".yaml", ".yml"}
    for path in site_root.rglob("*"):
        if path.is_file() and path.suffix.lower() in text_suffixes:
            yield path


def scan_files(paths):
    failures = []
    for path in paths:
        text = path.read_text(encoding="utf-8", errors="replace")
        for pattern, label in FORBIDDEN:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                failures.append(f"{path}: forbidden ({label}): {m.group(0)!r}")
    return failures


def main():
    failures = scan_files([*public_files(), *public_output_files()])
    if failures:
        print("Public-safety verification failed:")
        for f in failures:
            print(f"- {f}")
        sys.exit(1)
    print("Public-safety verification passed.")


if __name__ == "__main__":
    main()
