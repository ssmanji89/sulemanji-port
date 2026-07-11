#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
CNAME = ROOT / "CNAME"
PAGE = ROOT / "work-with-me.md"
INDEX = ROOT / "index.md"
NAV = ROOT / "_data" / "navigation.yml"
SITE_PAGE = ROOT / "_site" / "work-with-me.html"

PUBLIC_SOURCE_FILES = [
    PAGE,
    INDEX,
    NAV,
    ROOT / "_config.yml",
]

FORBIDDEN_PUBLIC_PATTERNS = [
    (r"\bstripe\b", "Stripe"),
    (r"\bpricing\b", "pricing"),
    (r"pricing tables?", "pricing tables"),
    (r"\bcalendly\b", "Calendly"),
    (r"google calendar", "Google Calendar"),
    (r"google forms?", "Google Forms"),
    (r"intake forms?", "intake forms"),
    (r"booking forms?", "booking forms"),
    (r"payment links?", "payment links"),
    (r"custom booking backend", "custom booking backend"),
    (r"agency branding", "separate agency branding"),
    (r"mechanic quote", "mechanic quote"),
    (r"vehicle[- ]repair", "vehicle repair"),
    (r"invoice review", "vehicle-repair invoice review"),
    (r"brakes\s*&\s*bytes", "Brakes & Bytes"),
]


def read(path):
    return path.read_text(encoding="utf-8")


def require(condition, message, failures):
    if not condition:
        failures.append(message)


def contains_forbidden(text, pattern):
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def check_forbidden(path, failures):
    if not path.exists():
        return
    text = read(path)
    for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
        if contains_forbidden(text, pattern):
            failures.append(f"{path.name} must not mention {label}")


def main():
    failures = []

    require(CNAME.exists(), "CNAME file is missing", failures)
    if CNAME.exists():
        require(read(CNAME).strip() == "www.sulemanji.com", "CNAME must remain www.sulemanji.com", failures)

    require(PAGE.exists(), "work-with-me.md is missing", failures)
    require(INDEX.exists(), "index.md is missing", failures)
    require(NAV.exists(), "_data/navigation.yml is missing", failures)

    if PAGE.exists():
        page = read(PAGE)
        lowered = page.lower()
        require("layout: default" in page, "work-with-me.md must use the default layout", failures)
        require("title: Work With Me" in page, "work-with-me.md must set title: Work With Me", failures)
        require("permalink: /work-with-me" in page, "work-with-me.md must publish at /work-with-me", failures)
        require("hero_eyebrow: Work With Me" in page, "work-with-me.md must set hero_eyebrow", failures)
        require("AI Workflow Clinic" in page, "work-with-me.md must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in page, "work-with-me.md must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in page, "work-with-me.md must include Build Path / Technical Triage", failures)
        require("mailto:ssmanji89@gmail.com?subject=Work%20With%20Me" in page, "work-with-me.md must include the Work With Me email CTA", failures)
        require("Bring me a messy problem" in page, "work-with-me.md must include the primary CTA label", failures)
        require("secrets" in lowered, "work-with-me.md must warn against sending secrets", failures)
        require("private third-party data" in lowered, "work-with-me.md must warn against private third-party data", failures)
        require("production credential" in lowered, "work-with-me.md must say no production credential custody is needed", failures)
        require("not regulated legal, medical, financial, or compliance advice" in lowered, "work-with-me.md must include regulated-advice boundary language", failures)
        require("does not guarantee production deployment" in lowered, "work-with-me.md must avoid promising production deployment", failures)
        require("sanitized examples" in lowered, "work-with-me.md must prefer sanitized examples", failures)

    if NAV.exists():
        nav = read(NAV)
        nav_pattern = re.compile(
            r"- title: Projects\s+url: /projects\s+- title: Work With Me\s+url: /work-with-me\s+- title: Beyond Work\s+url: /beyond",
            re.MULTILINE,
        )
        require(nav_pattern.search(nav) is not None, "navigation must place Work With Me after Projects and before Beyond Work", failures)

    if INDEX.exists():
        index = read(INDEX)
        require("url: /work-with-me" in index or 'href="/work-with-me"' in index, "index.md must link to /work-with-me", failures)
        require("Work With Me" in index, "index.md must include Work With Me", failures)
        require("messy" in index.lower(), "index.md Work With Me entry must use messy-problem language", failures)

    for path in PUBLIC_SOURCE_FILES:
        check_forbidden(path, failures)

    require(SITE_PAGE.exists(), "_site/work-with-me.html is missing; run bundle exec jekyll build", failures)
    if SITE_PAGE.exists():
        site_text = read(SITE_PAGE)
        require("AI Workflow Clinic" in site_text, "_site/work-with-me.html must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in site_text, "_site/work-with-me.html must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in site_text, "_site/work-with-me.html must include Build Path / Technical Triage", failures)
        require("mailto:ssmanji89@gmail.com?subject=Work%20With%20Me" in site_text, "_site/work-with-me.html must include the email CTA", failures)
        for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
            if contains_forbidden(site_text, pattern):
                failures.append(f"_site/work-with-me.html must not mention {label}")

    if failures:
        print("Work With Me verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Work With Me verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
