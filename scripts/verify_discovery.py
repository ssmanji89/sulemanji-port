#!/usr/bin/env python3
"""Verify Writing, Atom, sitemap and robots against the source article inventory."""

import argparse
import datetime as dt
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

import yaml


ATOM = {"a": "http://www.w3.org/2005/Atom"}
SITEMAP = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PRIVATE_ARTIFACTS = (
    "AGENTS.md",
    "docs",
    "scripts",
    "worker",
    "requirements.txt",
    "requirements-seo.txt",
    "Gemfile",
    "Gemfile.lock",
)


class WritingLinks(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.current = []
        self.legacy = []
        self.feed(source)

    def handle_starttag(self, _tag, attrs):
        values = dict(attrs)
        if "data-writing-url" in values:
            self.current.append(values["data-writing-url"])
        if "data-writing-legacy-url" in values:
            self.legacy.append(values["data-writing-legacy-url"])


def frontmatter(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    return yaml.safe_load(text[4:end]) or {}


def article_inventory(source, as_of):
    writing = yaml.safe_load((source / "_data" / "writing.yml").read_text(encoding="utf-8")) or {}
    legacy_paths = set(writing.get("legacy_paths", []))
    dated = []
    legacy = []
    for path in sorted((source / "notes").glob("*.md")):
        relative = path.relative_to(source).as_posix()
        data = frontmatter(path)
        permalink = data.get("permalink")
        if not isinstance(permalink, str):
            continue
        if relative in legacy_paths:
            legacy.append({"permalink": permalink, "title": data.get("title", "")})
            continue
        published_on = data.get("published_on")
        if not data.get("published") or not published_on or data.get("noindex"):
            continue
        value = published_on.isoformat() if hasattr(published_on, "isoformat") else str(published_on)
        if dt.date.fromisoformat(value) > as_of:
            continue
        updated_on = data.get("updated_on") or value
        updated = updated_on.isoformat() if hasattr(updated_on, "isoformat") else str(updated_on)
        dated.append({
            "permalink": permalink,
            "title": data.get("title", ""),
            "published_on": value,
            "updated_on": updated,
            "social_image": data.get("social_image"),
        })
    dated.sort(key=lambda item: (item["published_on"], item["permalink"]), reverse=True)
    # Equal dates use ascending permalink order.
    dated = sorted(dated, key=lambda item: item["permalink"])
    dated = sorted(dated, key=lambda item: item["published_on"], reverse=True)
    legacy.sort(key=lambda item: item["permalink"])
    return dated, legacy


def normalized_baseurl(value):
    if not value:
        return ""
    return "/" + value.strip("/")


def route(baseurl, permalink):
    return normalized_baseurl(baseurl) + (permalink if permalink.startswith("/") else "/" + permalink)


def robots_groups(text):
    groups = []
    agents = []
    rules = []
    for raw in text.splitlines() + [""]:
        line = raw.strip()
        if not line or line.startswith("#"):
            if agents:
                groups.append((tuple(agents), tuple(rules)))
                agents, rules = [], []
            continue
        key, separator, value = line.partition(":")
        if not separator:
            continue
        key = key.strip().lower()
        value = value.strip()
        if key == "user-agent" and rules:
            groups.append((tuple(agents), tuple(rules)))
            agents, rules = [], []
        if key == "user-agent":
            agents.append(value)
        else:
            rules.append((key, value))
    return groups


def resolve_writing(site):
    for candidate in (site / "writing.html", site / "writing" / "index.html"):
        if candidate.is_file():
            return candidate
    return None


def verify(source, site, *, origin, baseurl="", as_of=None):
    source = Path(source).resolve()
    site = Path(site).resolve()
    day = dt.date.fromisoformat(as_of) if isinstance(as_of, str) else as_of or dt.date.today()
    failures = []
    dated, legacy = article_inventory(source, day)
    article_paths = [route(baseurl, item["permalink"]) for item in dated]
    legacy_paths = [route(baseurl, item["permalink"]) for item in legacy]
    expected_all = article_paths + legacy_paths
    expected_urls = [origin.rstrip("/") + path for path in article_paths]

    writing_path = resolve_writing(site)
    if writing_path is None:
        failures.append("writing: rendered page missing")
    else:
        links = WritingLinks(writing_path.read_text(encoding="utf-8"))
        if links.current != [item["permalink"] for item in dated]:
            failures.append("writing: dated article catalog mismatch")
        if links.legacy != [item["permalink"] for item in legacy]:
            failures.append("writing: legacy catalog mismatch")

    feed_urls = []
    feed_path = site / "feed.xml"
    if not feed_path.is_file():
        failures.append("feed: missing")
    else:
        try:
            root = ET.parse(feed_path).getroot()
            feed_urls = [entry.findtext("a:id", namespaces=ATOM) for entry in root.findall("a:entry", ATOM)]
            if len(feed_urls) != len(set(feed_urls)):
                failures.append("feed: duplicate canonical URL")
            if feed_urls != expected_urls:
                failures.append("feed: article catalog or order mismatch")
            if any(url.endswith("/notes/legacy") for url in feed_urls):
                failures.append("feed: legacy note must remain excluded")
        except (ET.ParseError, OSError) as error:
            failures.append(f"feed: invalid XML: {error}")

    sitemap_article_urls = []
    sitemap_path = site / "sitemap.xml"
    if not sitemap_path.is_file():
        failures.append("sitemap: missing")
    else:
        try:
            root = ET.parse(sitemap_path).getroot()
            urls = [node.text for node in root.findall("s:url/s:loc", SITEMAP)]
            if len(urls) != len(set(urls)):
                failures.append("sitemap: duplicate canonical URL")
            expected_article_urls = {origin.rstrip("/") + path for path in expected_all}
            sitemap_article_urls = [url for url in urls if url in expected_article_urls]
            if set(sitemap_article_urls) != expected_article_urls:
                failures.append("sitemap: public article catalog mismatch")
        except (ET.ParseError, OSError) as error:
            failures.append(f"sitemap: invalid XML: {error}")

    policy = yaml.safe_load((source / "_data" / "crawler-policy.yml").read_text(encoding="utf-8")) or {}
    robots_path = site / "robots.txt"
    if not robots_path.is_file():
        failures.append("robots: missing")
    else:
        robots = robots_path.read_text(encoding="utf-8")
        groups = robots_groups(robots)
        rule_map = {agent: rules for agents, rules in groups for agent in agents}
        if ("allow", "/") not in rule_map.get("*", ()):
            failures.append("robots: default access must allow the site")
        signal = ("content-signal", policy.get("content_signal"))
        if signal not in rule_map.get("*", ()):
            failures.append("robots: content signal mismatch")
        for agent in policy.get("restricted_agents", []):
            if ("disallow", "/") not in rule_map.get(agent, ()):
                failures.append(f"robots: {agent} must be restricted")
        for agent in policy.get("allowed_search_agents", []) + policy.get("allowed_user_agents", []):
            if ("allow", "/") not in rule_map.get(agent, ()):
                failures.append(f"robots: {agent} must be allowed")

    for relative in PRIVATE_ARTIFACTS:
        if (site / relative).exists():
            failures.append(f"public artifact: {relative} must be excluded")

    counts = {
        "articles": len(expected_all),
        "feed": len(feed_urls),
        "sitemap_articles": len(sitemap_article_urls),
    }
    return failures, counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    repo = Path(__file__).resolve().parents[1]
    parser.add_argument("--source", type=Path, default=repo)
    parser.add_argument("--site", type=Path, default=repo / "_site")
    parser.add_argument("--origin", default="https://www.sulemanji.com")
    parser.add_argument("--baseurl", default="")
    parser.add_argument("--as-of")
    args = parser.parse_args()
    failures, counts = verify(
        args.source,
        args.site,
        origin=args.origin,
        baseurl=args.baseurl,
        as_of=args.as_of,
    )
    if failures:
        print("\n".join("FAIL " + failure for failure in failures))
        return 1
    print(
        "PASS discovery: "
        f"{counts['articles']} public articles, {counts['feed']} feed entries, "
        f"{counts['sitemap_articles']} sitemap article URLs"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
