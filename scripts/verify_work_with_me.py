#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
CNAME = ROOT / "CNAME"
CONTACT_PAGE = ROOT / "work-with-me.md"
PAGE = ROOT / "work-with-me-personal.md"
PRIORITY_PAGE = ROOT / "work-with-me-priority.md"
QUOTE_PAGE = ROOT / "work-with-me-quote.md"
THANKS_PAGE = ROOT / "work-with-me-thanks.md"
TERMS_PAGE = ROOT / "work-with-me-terms.md"
PRIVACY_PAGE = ROOT / "privacy.md"
INDEX = ROOT / "index.html"
NAV = ROOT / "_data" / "navigation.yml"
LAYOUT = ROOT / "_layouts" / "default.html"
SCRIPT = ROOT / "assets" / "js" / "work-with-me.js"
STYLE = ROOT / "assets" / "css" / "style.scss"
CONFIG = ROOT / "_config.yml"
SITE_CONTACT_PAGE = ROOT / "_site" / "work-with-me.html"
SITE_PAGE = ROOT / "_site" / "work-with-me" / "personal.html"
SITE_PRIORITY_PAGE = ROOT / "_site" / "work-with-me" / "priority.html"
SITE_QUOTE_PAGE = ROOT / "_site" / "work-with-me" / "quote.html"
SITE_THANKS_PAGE = ROOT / "_site" / "work-with-me" / "thanks.html"
SITE_TERMS_PAGE = ROOT / "_site" / "work-with-me" / "terms.html"
SITE_PRIVACY_PAGE = ROOT / "_site" / "privacy.html"
SITE_INDEX = ROOT / "_site" / "index.html"

PUBLIC_SOURCE_FILES = [
    CONTACT_PAGE,
    PAGE,
    PRIORITY_PAGE,
    QUOTE_PAGE,
    THANKS_PAGE,
    TERMS_PAGE,
    PRIVACY_PAGE,
    INDEX,
    NAV,
    CONFIG,
]

FORBIDDEN_PUBLIC_PATTERNS = [
    (r"\bcalendly\b", "Calendly"),
    (r"google calendar", "Google Calendar"),
    (r"agency branding", "separate agency branding"),
    (r"mechanic quote", "mechanic quote"),
    (r"vehicle[- ]repair", "vehicle repair"),
    (r"vehicle[- ]repair invoice review", "vehicle-repair invoice review"),
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


def configured_api_base():
    if not CONFIG.exists():
        return ""
    match = re.search(r"^work_with_me_api_base:\s*(\S+)\s*$", read(CONFIG), flags=re.MULTILINE)
    return match.group(1) if match else ""


def configured_checkout_ready():
    if not CONFIG.exists():
        return ""
    match = re.search(r"^priority_discovery_checkout_ready:\s*(true|false)\s*$", read(CONFIG), flags=re.MULTILINE)
    return match.group(1) if match else ""


def check_forbidden(path, failures):
    if not path.exists():
        return
    text = read(path)
    for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
        if contains_forbidden(text, pattern):
            failures.append(f"{path.name} must not mention {label}")


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent

    def within(self, tag, element_id=None):
        parent = self.parent
        while parent:
            if parent.tag == tag and (element_id is None or parent.attrs.get("id") == element_id):
                return True
            parent = parent.parent
        return False


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes, self.stack = [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1] if self.stack else None)
        self.nodes.append(node)
        if tag not in {"input", "br", "hr", "img", "meta", "link", "source", "wbr"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break


def check_scenarios(doc, path, failures):
    for anchor, subject in [("business-engagements", "Organizational%20project"), ("professional-conversations", "Professional%20conversation"), ("personal-projects", "Personal%20project")]:
        sections = [n for n in doc.nodes if n.tag == "section" and n.attrs.get("id") == anchor]
        require(len(sections) == 1, f"{path.name}: missing scenario section {anchor}", failures)
        href = f"mailto:ssmanji89@gmail.com?subject={subject}%20via%20sulemanji.com"
        require(any(n.tag == "a" and n.attrs.get("href") == href and n.parent in sections for n in doc.nodes), f"{path.name}: scenario {anchor} must have its direct email action", failures)
    require(not any(n.tag == "form" for n in doc.nodes), f"{path.name}: contact must not contain a form", failures)
    require(not any(n.tag == "script" and ("work-with-me.js" in n.attrs.get("src", "") or "turnstile" in n.attrs.get("src", "")) for n in doc.nodes), f"{path.name}: contact must not load intake or CAPTCHA scripts", failures)
    require(any(n.tag == "a" and n.attrs.get("id") == "work-with-me-intake" and n.attrs.get("href") == "/work-with-me/personal#work-with-me-intake" for n in doc.nodes), f"{path.name}: legacy intake anchor must link to personal intake", failures)
    require(any(n.tag == "a" and n.attrs.get("href") == "/work-with-me/personal" for n in doc.nodes), f"{path.name}: personal scenario must link to workshop", failures)


def check_personal(doc, path, failures):
    forms = [n for n in doc.nodes if n.tag == "form" and n.attrs.get("id") == "work-with-me-intake"]
    require(len(forms) == 1, f"{path.name}: requires one intake form", failures)
    fields = [n for n in doc.nodes if n.tag in {"input", "textarea"} and n.within("form", "work-with-me-intake")]
    contexts = [n.attrs for n in fields if n.attrs.get("name") == "contextType"]
    require(len(contexts) == 1 and contexts[0].get("type") == "hidden" and contexts[0].get("value") == "personal", f"{path.name}: context must be hidden personal", failures)
    categories = [n.attrs.get("value") for n in fields if n.attrs.get("name") == "workshopCategory"]
    require(sorted(categories) == ["github_codebase_review", "home_personal_automation", "not_sure_other"], f"{path.name}: personal categories must exclude organizational work", failures)
    require(any(n.attrs.get("name") == "workshopCategory" and n.attrs.get("value") == "not_sure_other" and "checked" in n.attrs for n in fields), f"{path.name}: preserve default category", failures)
    paths = [n.attrs for n in fields if n.attrs.get("name") == "path"]
    require(sorted(n.get("value") for n in paths) == ["normal", "priority"] and all(n.get("type") == "radio" and "required" in n and "checked" not in n for n in paths), f"{path.name}: preserve explicit normal/priority selection", failures)
    require(not any(n.attrs.get("type") == "file" for n in fields), f"{path.name}: no file uploads", failures)
    expected = {"name", "email", "contextType", "workshopCategory", "problem", "desiredOutcome", "priorAttempts", "sanitizedLinks", "path", "termsAccepted", "website", "turnstileToken"}
    require(expected <= {n.attrs.get("name") for n in fields}, f"{path.name}: missing payload fields inside intake", failures)
    for name, attrs in {"name": {"required": None, "minlength": "2", "maxlength": "120"}, "email": {"type": "email", "required": None, "maxlength": "254"}, "problem": {"required": None, "minlength": "40", "maxlength": "6000"}, "desiredOutcome": {"required": None, "minlength": "20", "maxlength": "3000"}, "termsAccepted": {"type": "checkbox", "required": None}, "website": {"class": "honeypot", "tabindex": "-1", "autocomplete": "off", "aria-hidden": "true"}, "turnstileToken": {"type": "hidden"}}.items():
        require(any(n.attrs.get("name") == name and all(k in n.attrs and (v is None or n.attrs[k] == v) for k, v in attrs.items()) for n in fields), f"{path.name}: {name} validation/security attributes changed", failures)
    require(any(n.attrs.get("id") == "intake-status" and n.attrs.get("role") == "status" and n.attrs.get("aria-live") == "polite" and n.within("form", "work-with-me-intake") for n in doc.nodes), f"{path.name}: missing live status inside form", failures)
    for href in ["/work-with-me/terms", "/privacy"]:
        require(any(n.tag == "a" and n.attrs.get("href") == href and n.within("form", "work-with-me-intake") for n in doc.nodes), f"{path.name}: missing consent link {href}", failures)
    require(any(n.attrs.get("class") == "cf-turnstile" and n.attrs.get("data-callback") == "onWorkWithMeTurnstile" and n.attrs.get("data-expired-callback") == "onWorkWithMeTurnstileExpired" and n.attrs.get("data-error-callback") == "onWorkWithMeTurnstileExpired" and n.within("form", "work-with-me-intake") for n in doc.nodes), f"{path.name}: missing CAPTCHA callback contract", failures)


def main():
    failures = []
    api_base = configured_api_base()
    checkout_ready = configured_checkout_ready()

    require(CNAME.exists(), "CNAME file is missing", failures)
    if CNAME.exists():
        require(read(CNAME).strip() == "www.sulemanji.com", "CNAME must remain www.sulemanji.com", failures)

    require(PAGE.exists(), "work-with-me-personal.md is missing", failures)
    require(PRIORITY_PAGE.exists(), "work-with-me-priority.md is missing", failures)
    require(QUOTE_PAGE.exists(), "work-with-me-quote.md is missing", failures)
    require(THANKS_PAGE.exists(), "work-with-me-thanks.md is missing", failures)
    require(TERMS_PAGE.exists(), "work-with-me-terms.md is missing", failures)
    require(PRIVACY_PAGE.exists(), "privacy.md is missing", failures)
    require(SCRIPT.exists(), "assets/js/work-with-me.js is missing", failures)
    require(STYLE.exists(), "assets/css/style.scss is missing", failures)
    require(CONFIG.exists(), "_config.yml is missing", failures)
    require(LAYOUT.exists(), "_layouts/default.html is missing", failures)
    require(INDEX.exists(), "index.html is missing", failures)
    require(NAV.exists(), "_data/navigation.yml is missing", failures)

    if PAGE.exists():
        page = read(PAGE)
        lowered = page.lower()
        require("layout: default" in page, "work-with-me-personal.md must use the default layout", failures)
        require("title: Personal workshop" in page, "work-with-me-personal.md must set title: Personal workshop", failures)
        require("permalink: /work-with-me/personal" in page, "work-with-me-personal.md must publish at /work-with-me/personal", failures)
        require("hero_eyebrow: Personal projects" in page, "work-with-me-personal.md must set hero_eyebrow", failures)
        require("work_with_me_form: true" in page, "work-with-me-personal.md must enable the Work With Me form script", failures)
        require("AI Workflow Clinic" in page, "work-with-me-personal.md must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in page, "work-with-me-personal.md must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in page, "work-with-me-personal.md must include Build Path / Technical Triage", failures)
        require("secrets" in lowered, "work-with-me-personal.md must warn against sending secrets", failures)
        require("attachments" in lowered, "work-with-me-personal.md must prohibit attachments", failures)
        require("private third-party data" in lowered, "work-with-me-personal.md must warn against private third-party data", failures)
        require("production credential" in lowered, "work-with-me-personal.md must say no production credential custody is needed", failures)
        require("not regulated legal, medical, financial, or compliance advice" in lowered, "work-with-me-personal.md must include regulated-advice boundary language", failures)
        require("does not guarantee production deployment" in lowered, "work-with-me-personal.md must avoid promising production deployment", failures)
        require("sanitized examples" in lowered, "work-with-me-personal.md must prefer sanitized examples", failures)
        require("AI participates" in page or "AI-assisted" in page, "work-with-me-personal.md must disclose AI participation", failures)
        require_text(page, 'id="work-with-me-intake"', PAGE, failures)
        require_text(page, 'class="intake-form"', PAGE, failures)
        require_text(page, 'data-endpoint="{{ site.work_with_me_api_base }}/v1/intakes"', PAGE, failures)
        require_text(page, 'name="name"', PAGE, failures)
        require_text(page, 'name="email"', PAGE, failures)
        require_text(page, 'name="contextType"', PAGE, failures)
        for phrase in [
            "Pick the closest starting point",
            "GitHub / Codebase Review",
            "Home + Personal Automation",
            "Not sure / Other",
            'name="workshopCategory"',
            'value="github_codebase_review"',
            'value="home_personal_automation"',
            'value="not_sure_other"',
        ]:
            require_text(page, phrase, PAGE, failures)
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
        require_text(page, 'class="cf-turnstile"', PAGE, failures)
        require_text(page, 'data-sitekey="{{ site.turnstile_site_key }}"', PAGE, failures)
        require_text(page, 'data-callback="onWorkWithMeTurnstile"', PAGE, failures)
        require_text(page, 'role="status"', PAGE, failures)
        require_text(page, 'aria-live="polite"', PAGE, failures)
        require('type="file"' not in page.lower(), "work-with-me-personal.md must not include file inputs", failures)

    if PRIORITY_PAGE.exists():
        priority = read(PRIORITY_PAGE)
        priority_lower = priority.lower()
        require("permalink: /work-with-me/priority" in priority, "work-with-me-priority.md must publish at /work-with-me/priority", failures)
        require("$295" in priority, "work-with-me-priority.md must state the fixed $295 deposit", failures)
        require("non-refundable" in priority_lower, "work-with-me-priority.md must explain the non-refundable trigger", failures)
        require("60-day" in priority_lower or "60 days" in priority_lower, "work-with-me-priority.md must explain the 60-day credit", failures)
        require("AI participates" in priority or "AI-assisted" in priority, "work-with-me-priority.md must disclose AI participation", failures)
        require("legal/tax review" in priority_lower, "work-with-me-priority.md must mark checkout unavailable until legal/tax review", failures)
        require_text(priority, "{% assign priority_checkout_ready = site.priority_discovery_checkout_ready | default: false %}", PRIORITY_PAGE, failures)
        require_text(priority, 'id="priority-checkout"', PRIORITY_PAGE, failures)
        require_text(priority, 'data-endpoint-base="{{ site.work_with_me_api_base }}/v1/cases"', PRIORITY_PAGE, failures)
        require_text(priority, 'data-checkout-ready="{{ priority_checkout_ready }}"', PRIORITY_PAGE, failures)
        require_text(priority, "case", PRIORITY_PAGE, failures)

    if QUOTE_PAGE.exists():
        quote = read(QUOTE_PAGE)
        require("permalink: /work-with-me/quote" in quote, "work-with-me-quote.md must publish at /work-with-me/quote", failures)
        require("work_with_me_quote: true" in quote, "work-with-me-quote.md must enable the quote script", failures)
        require("Private Priority Session Quote" in quote, "work-with-me-quote.md must identify the private quote page", failures)
        require_text(quote, 'class="quote-shell"', QUOTE_PAGE, failures)
        require_text(quote, 'data-endpoint-base="{{ site.work_with_me_api_base }}/v1/quotes"', QUOTE_PAGE, failures)

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
        require_text(script, "workshopCategory", SCRIPT, failures)
        require_text(script, 'formData.get("workshopCategory")', SCRIPT, failures)
        require_text(script, "onWorkWithMeTurnstile", SCRIPT, failures)
        require_text(script, "onWorkWithMeTurnstileExpired", SCRIPT, failures)
        require_text(script, "cf-turnstile-response", SCRIPT, failures)
        require_text(script, "Complete the verification check before submitting", SCRIPT, failures)
        require_text(script, "work-with-me-intake", SCRIPT, failures)
        require_text(script, "FormData", SCRIPT, failures)
        require_text(script, "fetch(form.dataset.endpoint", SCRIPT, failures)
        require_text(script, "content-type", SCRIPT, failures)
        require_text(script, "JSON.stringify", SCRIPT, failures)
        require_text(script, "result.next === 'checkout_pending'", SCRIPT, failures)
        require_text(script, "/work-with-me/priority?case=", SCRIPT, failures)
        require_text(script, "/work-with-me/thanks?case=", SCRIPT, failures)
        require_text(script, "Submission failed. Your text remains here", SCRIPT, failures)
        require_text(script, "deposit-checkout", SCRIPT, failures)

    if STYLE.exists():
        style = read(STYLE)
        for selector in [".intake-form", ".form-field", ".field-error", ".path-choice", ".form-status"]:
            require(selector in style, f"assets/css/style.scss must style {selector}", failures)
        require(".turnstile-field" in style, "assets/css/style.scss must style .turnstile-field", failures)
        require("border-radius: 8px" in style, "assets/css/style.scss must use 8px radius for form controls", failures)
        require(":focus" in style or ":focus-visible" in style, "assets/css/style.scss must include visible focus styles", failures)

    if LAYOUT.exists():
        layout = read(LAYOUT)
        require("page.work_with_me_form" in layout, "_layouts/default.html must conditionally load the Work With Me script", failures)
        require("assets/js/work-with-me.js" in layout, "_layouts/default.html must reference assets/js/work-with-me.js", failures)
        require("https://challenges.cloudflare.com/turnstile/v0/api.js" in layout, "_layouts/default.html must load the Turnstile script on Work With Me form pages", failures)
        require("page.work_with_me_quote" in layout, "_layouts/default.html must conditionally load the private quote script", failures)
        require("assets/js/work-with-me-quote.js" in layout, "_layouts/default.html must reference assets/js/work-with-me-quote.js", failures)

    if CONFIG.exists():
        config = read(CONFIG)
        require("turnstile_site_key:" in config, "_config.yml must define the public Turnstile site key", failures)
        require("work_with_me_api_base:" in config, "_config.yml must define the Work With Me API base", failures)
        require(api_base.startswith("https://"), "_config.yml Work With Me API base must be an HTTPS URL", failures)
        require("priority_discovery_checkout_ready:" in config, "_config.yml must define the Priority Discovery checkout launch flag", failures)
        require(checkout_ready == "false", "Priority Discovery checkout must remain disabled during internal review", failures)

    if NAV.exists():
        nav = read(NAV)
        nav_pattern = re.compile(
            r"- title: Projects\s+url: /projects\s+- title: Contact\s+url: /work-with-me\s+- title: Beyond Work\s+url: /beyond",
            re.MULTILINE,
        )
        require(nav_pattern.search(nav) is not None, "navigation must place Work With Me after Projects and before Beyond Work", failures)

    require(SITE_INDEX.exists(), "_site/index.html is missing; run bundle exec jekyll build", failures)
    if SITE_INDEX.exists():
        doc = Document(read(SITE_INDEX))
        require(any(n.tag == "a" and n.attrs.get("href") == "/work-with-me" and n.within("nav") for n in doc.nodes), "rendered homepage navigation must link to contact", failures)
    for path in [CONTACT_PAGE, SITE_CONTACT_PAGE]:
        require(path.exists(), f"{path} is missing", failures)
        if path.exists():
            check_scenarios(Document(read(path)), path, failures)
    for path in [PAGE, SITE_PAGE]:
        if path.exists():
            check_personal(Document(read(path)), path, failures)

    if SITE_CONTACT_PAGE.exists():
        check_forbidden(SITE_CONTACT_PAGE, failures)

    for path in PUBLIC_SOURCE_FILES:
        check_forbidden(path, failures)

    require(SITE_PAGE.exists(), "_site/work-with-me/personal.html is missing; run bundle exec jekyll build", failures)
    if SITE_PAGE.exists():
        site_text = read(SITE_PAGE)
        require("AI Workflow Clinic" in site_text, "_site/work-with-me/personal.html must include AI Workflow Clinic", failures)
        require("Automation / Ops Systems Review" in site_text, "_site/work-with-me/personal.html must include Automation / Ops Systems Review", failures)
        require("Build Path / Technical Triage" in site_text, "_site/work-with-me/personal.html must include Build Path / Technical Triage", failures)
        for phrase in [
            "Pick the closest starting point",
            "GitHub / Codebase Review",
            "Home + Personal Automation",
            "Not sure / Other",
            'name="workshopCategory"',
        ]:
            require(phrase in site_text, f"_site/work-with-me/personal.html must include {phrase!r}", failures)
        require('id="work-with-me-intake"' in site_text, "_site/work-with-me/personal.html must include the native intake form", failures)
        if api_base:
            require(f'data-endpoint="{api_base}/v1/intakes"' in site_text, "_site/work-with-me/personal.html must render the configured API base", failures)
        require("assets/js/work-with-me.js" in site_text, "_site/work-with-me/personal.html must load the Work With Me script", failures)
        require("https://challenges.cloudflare.com/turnstile/v0/api.js" in site_text, "_site/work-with-me/personal.html must load the Turnstile script", failures)
        require('class="cf-turnstile"' in site_text, "_site/work-with-me/personal.html must include the Turnstile widget", failures)
        require('type="file"' not in site_text.lower(), "_site/work-with-me/personal.html must not include file inputs", failures)
        for pattern, label in FORBIDDEN_PUBLIC_PATTERNS:
            if contains_forbidden(site_text, pattern):
                failures.append(f"_site/work-with-me/personal.html must not mention {label}")

    for site_file, label in [
        (SITE_PRIORITY_PAGE, "_site/work-with-me/priority.html"),
        (SITE_QUOTE_PAGE, "_site/work-with-me/quote.html"),
        (SITE_THANKS_PAGE, "_site/work-with-me/thanks.html"),
        (SITE_TERMS_PAGE, "_site/work-with-me/terms.html"),
        (SITE_PRIVACY_PAGE, "_site/privacy.html"),
    ]:
        require(site_file.exists(), f"{label} is missing; run bundle exec jekyll build", failures)
        if site_file.exists():
            site_text = read(site_file)
            if site_file == SITE_PRIORITY_PAGE and api_base:
                require(f'data-endpoint-base="{api_base}/v1/cases"' in site_text, "_site/work-with-me/priority.html must render the configured API base", failures)
                if checkout_ready:
                    require(f'data-checkout-ready="{checkout_ready}"' in site_text, "_site/work-with-me/priority.html must render the configured checkout launch flag", failures)
            if site_file == SITE_QUOTE_PAGE:
                require("assets/js/work-with-me-quote.js" in site_text, "_site/work-with-me/quote.html must load the private quote script", failures)
                require('class="quote-shell"' in site_text, "_site/work-with-me/quote.html must include the private quote shell", failures)
                if api_base:
                    require(f'data-endpoint-base="{api_base}/v1/quotes"' in site_text, "_site/work-with-me/quote.html must render the configured API base", failures)
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
