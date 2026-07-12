#!/usr/bin/env python3
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
CNAME = ROOT / "CNAME"
PAGE = ROOT / "work-with-me.md"
PRIORITY_PAGE = ROOT / "work-with-me-priority.md"
THANKS_PAGE = ROOT / "work-with-me-thanks.md"
TERMS_PAGE = ROOT / "work-with-me-terms.md"
PRIVACY_PAGE = ROOT / "privacy.md"
INDEX = ROOT / "index.md"
NAV = ROOT / "_data" / "navigation.yml"
LAYOUT = ROOT / "_layouts" / "default.html"
SCRIPT = ROOT / "assets" / "js" / "work-with-me.js"
STYLE = ROOT / "assets" / "css" / "style.scss"
SITE_PAGE = ROOT / "_site" / "work-with-me.html"
SITE_PRIORITY_PAGE = ROOT / "_site" / "work-with-me" / "priority.html"
SITE_THANKS_PAGE = ROOT / "_site" / "work-with-me" / "thanks.html"
SITE_TERMS_PAGE = ROOT / "_site" / "work-with-me" / "terms.html"
SITE_PRIVACY_PAGE = ROOT / "_site" / "privacy.html"

PUBLIC_SOURCE_FILES = [
    PAGE,
    PRIORITY_PAGE,
    THANKS_PAGE,
    TERMS_PAGE,
    PRIVACY_PAGE,
    INDEX,
    NAV,
    ROOT / "_config.yml",
]

FORBIDDEN_PUBLIC_PATTERNS = [
    (r"\bcalendly\b", "Calendly"),
    (r"google calendar", "Google Calendar"),
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


def require_text(text, needle, path, failures):
    require(needle in text, f"{path.name} must include {needle!r}", failures)


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
    require(PRIORITY_PAGE.exists(), "work-with-me-priority.md is missing", failures)
    require(THANKS_PAGE.exists(), "work-with-me-thanks.md is missing", failures)
    require(TERMS_PAGE.exists(), "work-with-me-terms.md is missing", failures)
    require(PRIVACY_PAGE.exists(), "privacy.md is missing", failures)
    require(SCRIPT.exists(), "assets/js/work-with-me.js is missing", failures)
    require(STYLE.exists(), "assets/css/style.scss is missing", failures)
    require(LAYOUT.exists(), "_layouts/default.html is missing", failures)
    require(INDEX.exists(), "index.md is missing", failures)
    require(NAV.exists(), "_data/navigation.yml is missing", failures)

    if PAGE.exists():
        page = read(PAGE)
        lowered = page.lower()
        require("layout: default" in page, "work-with-me.md must use the default layout", failures)
        require("title: Work With Me" in page, "work-with-me.md must set title: Work With Me", failures)
        require("permalink: /work-with-me" in page, "work-with-me.md must publish at /work-with-me", failures)
        require("hero_eyebrow: Work With Me" in page, "work-with-me.md must set hero_eyebrow", failures)
        require("work_with_me_form: true" in page, "work-with-me.md must enable the Work With Me form script", failures)
        require("AI Workflow Clinic" in page, "work-with-me.md must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in page, "work-with-me.md must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in page, "work-with-me.md must include Build Path / Technical Triage", failures)
        require("Bring me a messy problem" in page, "work-with-me.md must include the primary CTA label", failures)
        require("secrets" in lowered, "work-with-me.md must warn against sending secrets", failures)
        require("attachments" in lowered, "work-with-me.md must prohibit attachments", failures)
        require("private third-party data" in lowered, "work-with-me.md must warn against private third-party data", failures)
        require("production credential" in lowered, "work-with-me.md must say no production credential custody is needed", failures)
        require("not regulated legal, medical, financial, or compliance advice" in lowered, "work-with-me.md must include regulated-advice boundary language", failures)
        require("does not guarantee production deployment" in lowered, "work-with-me.md must avoid promising production deployment", failures)
        require("sanitized examples" in lowered, "work-with-me.md must prefer sanitized examples", failures)
        require("AI participates" in page or "AI-assisted" in page, "work-with-me.md must disclose AI participation", failures)
        require_text(page, 'id="work-with-me-intake"', PAGE, failures)
        require_text(page, 'class="intake-form"', PAGE, failures)
        require_text(page, 'data-endpoint="https://api.sulemanji.com/v1/intakes"', PAGE, failures)
        require_text(page, 'name="name"', PAGE, failures)
        require_text(page, 'name="email"', PAGE, failures)
        require_text(page, 'name="contextType"', PAGE, failures)
        require_text(page, 'name="problem"', PAGE, failures)
        require_text(page, 'name="desiredOutcome"', PAGE, failures)
        require_text(page, 'name="priorAttempts"', PAGE, failures)
        require_text(page, 'name="sanitizedLinks"', PAGE, failures)
        require_text(page, 'name="path"', PAGE, failures)
        require_text(page, 'value="normal"', PAGE, failures)
        require_text(page, 'value="priority"', PAGE, failures)
        require_text(page, 'Normal review queue', PAGE, failures)
        require_text(page, 'Priority Discovery deposit', PAGE, failures)
        require_text(page, 'name="termsAccepted"', PAGE, failures)
        require_text(page, 'href="/work-with-me/terms"', PAGE, failures)
        require_text(page, 'href="/privacy"', PAGE, failures)
        require_text(page, 'name="website"', PAGE, failures)
        require_text(page, 'class="honeypot"', PAGE, failures)
        require_text(page, 'name="turnstileToken"', PAGE, failures)
        require_text(page, 'role="status"', PAGE, failures)
        require_text(page, 'aria-live="polite"', PAGE, failures)
        require('type="file"' not in page.lower(), "work-with-me.md must not include file inputs", failures)

    if PRIORITY_PAGE.exists():
        priority = read(PRIORITY_PAGE)
        priority_lower = priority.lower()
        require("permalink: /work-with-me/priority" in priority, "work-with-me-priority.md must publish at /work-with-me/priority", failures)
        require("$295" in priority, "work-with-me-priority.md must state the fixed $295 deposit", failures)
        require("non-refundable" in priority_lower, "work-with-me-priority.md must explain the non-refundable trigger", failures)
        require("60-day" in priority_lower or "60 days" in priority_lower, "work-with-me-priority.md must explain the 60-day credit", failures)
        require("AI participates" in priority or "AI-assisted" in priority, "work-with-me-priority.md must disclose AI participation", failures)
        require("legal/tax review" in priority_lower, "work-with-me-priority.md must mark checkout unavailable until legal/tax review", failures)
        require_text(priority, 'id="priority-checkout"', PRIORITY_PAGE, failures)
        require_text(priority, "case", PRIORITY_PAGE, failures)

    if THANKS_PAGE.exists():
        thanks = read(THANKS_PAGE)
        require("permalink: /work-with-me/thanks" in thanks, "work-with-me-thanks.md must publish at /work-with-me/thanks", failures)
        require("customer details" not in thanks.lower(), "work-with-me-thanks.md must not render customer details", failures)
        require("caseToken" not in thanks, "work-with-me-thanks.md must not render a customer token", failures)
        require("email=" not in thanks.lower(), "work-with-me-thanks.md must not render customer email query parameters", failures)

    if TERMS_PAGE.exists():
        terms = read(TERMS_PAGE)
        terms_lower = terms.lower()
        require("permalink: /work-with-me/terms" in terms, "work-with-me-terms.md must publish at /work-with-me/terms", failures)
        for phrase in [
            "One Priority Discovery Deposit covers one defined messy problem",
            "Payment alone does not make the deposit non-refundable",
            "first discovery email is successfully sent",
            "60-day credit window begins when the blueprint is delivered",
            "Final public terms, tax treatment, cancellation language, and receipt wording require Texas attorney/CPA review before live payment is enabled",
        ]:
            require(phrase in terms, f"work-with-me-terms.md must include approved commercial rule: {phrase}", failures)
        require("not regulated legal, medical, financial, or compliance advice" in terms_lower, "work-with-me-terms.md must include regulated-advice boundary", failures)
        require("no file attachments" in terms_lower or "attachments" in terms_lower, "work-with-me-terms.md must prohibit attachments", failures)
        require("legal/tax review" in terms_lower, "work-with-me-terms.md must mark checkout unavailable until legal/tax review", failures)

    if PRIVACY_PAGE.exists():
        privacy = read(PRIVACY_PAGE)
        privacy_lower = privacy.lower()
        require("permalink: /privacy" in privacy, "privacy.md must publish at /privacy", failures)
        for phrase in [
            "AI participates in discovery and blueprint generation",
            "Suleman may review any thread",
            "Customer text is sent only to processors required for the service",
            "not used for unrelated model training by this application",
            "90 days after case closure",
            "deleted one year later",
            "Stripe remains authoritative for financial records",
        ]:
            require(phrase in privacy, f"privacy.md must include approved privacy rule: {phrase}", failures)
        require("secrets" in privacy_lower, "privacy.md must prohibit secrets", failures)
        require("credentials" in privacy_lower, "privacy.md must prohibit credentials", failures)
        require("attachments" in privacy_lower, "privacy.md must prohibit attachments", failures)

    if SCRIPT.exists():
        script = read(SCRIPT)
        require_text(script, "serializeIntake", SCRIPT, failures)
        require_text(script, "work-with-me-intake", SCRIPT, failures)
        require_text(script, "FormData", SCRIPT, failures)
        require_text(script, "fetch(form.dataset.endpoint", SCRIPT, failures)
        require_text(script, "content-type", SCRIPT, failures)
        require_text(script, "JSON.stringify", SCRIPT, failures)
        require_text(script, "result.next === 'checkout'", SCRIPT, failures)
        require_text(script, "/work-with-me/priority?case=", SCRIPT, failures)
        require_text(script, "/work-with-me/thanks?case=", SCRIPT, failures)
        require_text(script, "Submission failed. Your text remains here", SCRIPT, failures)
        require_text(script, "deposit-checkout", SCRIPT, failures)

    if STYLE.exists():
        style = read(STYLE)
        for selector in [".intake-form", ".form-field", ".field-error", ".path-choice", ".form-status"]:
            require(selector in style, f"assets/css/style.scss must style {selector}", failures)
        require("border-radius: 8px" in style, "assets/css/style.scss must use 8px radius for form controls", failures)
        require(":focus" in style or ":focus-visible" in style, "assets/css/style.scss must include visible focus styles", failures)

    if LAYOUT.exists():
        layout = read(LAYOUT)
        require("page.work_with_me_form" in layout, "_layouts/default.html must conditionally load the Work With Me script", failures)
        require("assets/js/work-with-me.js" in layout, "_layouts/default.html must reference assets/js/work-with-me.js", failures)

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
        require('id="work-with-me-intake"' in site_text, "_site/work-with-me.html must include the native intake form", failures)
        require("assets/js/work-with-me.js" in site_text, "_site/work-with-me.html must load the Work With Me script", failures)
        require('type="file"' not in site_text.lower(), "_site/work-with-me.html must not include file inputs", failures)
        for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
            if contains_forbidden(site_text, pattern):
                failures.append(f"_site/work-with-me.html must not mention {label}")

    for site_file, label in [
        (SITE_PRIORITY_PAGE, "_site/work-with-me/priority.html"),
        (SITE_THANKS_PAGE, "_site/work-with-me/thanks.html"),
        (SITE_TERMS_PAGE, "_site/work-with-me/terms.html"),
        (SITE_PRIVACY_PAGE, "_site/privacy.html"),
    ]:
        require(site_file.exists(), f"{label} is missing; run bundle exec jekyll build", failures)
        if site_file.exists():
            site_text = read(site_file)
            for pattern, forbidden_label in FORBIDDEN_PUBLIC_PATTERNS:
                if contains_forbidden(site_text, pattern):
                    failures.append(f"{label} must not mention {forbidden_label}")

    if failures:
        print("Work With Me verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Work With Me verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
