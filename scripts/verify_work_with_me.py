#!/usr/bin/env python3
"""Verify retired public admission while retaining servicing return pages."""
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"
RETIRED = {
    "work-with-me": "contact/",
    "work-with-me/personal": "contact/",
    "work-with-me/priority": "contact/",
}
SERVICING = ("work-with-me/quote", "work-with-me/thanks", "work-with-me/terms")
BUSINESS_URL = "https://viyu.net/contact-support/contact-us/"


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def rendered(route):
    path = SITE / route / "index.html"
    if not path.is_file():
        path = SITE / f"{route}.html"
    return path.read_text(encoding="utf-8") if path.is_file() else None


def main():
    failures = []
    for route, destination in RETIRED.items():
        html = rendered(route)
        if html is None:
            failures.append(f"{route}: rendered compatibility route is missing")
            continue
        page = Page(html)
        if any(tag == "form" for tag, _ in page.tags):
            failures.append(f"{route}: retired admission form remains")
        if any("work-with-me.js" in attrs.get("src", "") or "turnstile" in attrs.get("src", "") for tag, attrs in page.tags if tag == "script"):
            failures.append(f"{route}: retired intake scripts remain")
        if not any(tag == "meta" and attrs.get("http-equiv", "").lower() == "refresh" and destination in attrs.get("content", "") for tag, attrs in page.tags):
            failures.append(f"{route}: reviewed redirect to /{destination} is missing")
        if not any(tag == "meta" and attrs.get("name") == "robots" and attrs.get("content") == "noindex,follow" for tag, attrs in page.tags):
            failures.append(f"{route}: noindex control is missing")
        if '/contact/' not in html:
            failures.append(f"{route}: visible contact fallback is missing")

    contact = (SITE / "contact" / "index.html")
    if not contact.is_file() or BUSINESS_URL not in contact.read_text(encoding="utf-8"):
        failures.append("contact: direct Viyu business destination is missing")

    for route in SERVICING:
        html = rendered(route)
        if html is None:
            failures.append(f"{route}: obligation servicing route is missing")
            continue
        page = Page(html)
        if not any(tag == "meta" and attrs.get("name") == "robots" and attrs.get("content") == "noindex,follow" for tag, attrs in page.tags):
            failures.append(f"{route}: servicing route is missing noindex")
        if route.endswith("/quote") and not any(tag == "script" and "work-with-me-quote.js" in attrs.get("src", "") for tag, attrs in page.tags):
            failures.append("work-with-me/quote: existing paid-case servicing script is missing")

    if (SITE / "assets/js/work-with-me.js").exists():
        failures.append("assets/js/work-with-me.js: retired intake client script remains public")
    if not (SITE / "assets/js/work-with-me-quote.js").is_file():
        failures.append("assets/js/work-with-me-quote.js: paid-case servicing script is missing")

    sitemap_path = SITE / "sitemap.xml"
    locs = set()
    if sitemap_path.is_file():
        locs = {node.text for node in ET.parse(sitemap_path).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
    for route in (*RETIRED, *SERVICING):
        if any(loc and loc.rstrip("/").endswith("/" + route) for loc in locs):
            failures.append(f"{route}: retired or servicing route is promoted in sitemap")
    if failures:
        print("Offer-retirement verification failed:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print("Offer-retirement verification passed: new admission is retired and servicing routes remain.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
