#!/usr/bin/env python3
"""Verify Writing, Atom, sitemap and robots against the source article inventory."""

import argparse
import datetime as dt
from html.parser import HTMLParser
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

import yaml


ATOM = {"a": "http://www.w3.org/2005/Atom"}
SITEMAP = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
PUBLICATION_TIMEZONE = ZoneInfo("America/Chicago")
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


class RenderedSignals(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals = []
        self.feeds = []
        self.local_links = []
        self.in_head = False

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        values = dict(attrs)
        rel = (values.get("rel") or "").lower().split()
        if self.in_head and tag == "link" and "canonical" in rel:
            self.canonicals.append(values.get("href"))
        if self.in_head and tag == "link" and "alternate" in rel and (values.get("type") or "").lower() == "application/atom+xml":
            self.feeds.append(values.get("href"))
        if tag == "a" and "href" in values:
            self.local_links.append(values["href"])

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


def rendered_output(site: Path, route: str) -> Path | None:
    path = unquote(route).lstrip("/")
    parts = Path(path).parts
    if any(part in ("..", ".") for part in parts) or "\\" in path:
        return None
    candidates = (site / path, site / (path + ".html"), site / path / "index.html")
    return next((candidate for candidate in candidates if candidate.is_file() and candidate.resolve().is_relative_to(site.resolve())), None)


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


def load_discovery_pages(source, baseurl):
    try:
        data = yaml.safe_load((source / "_data" / "discovery-pages.yml").read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as error:
        raise ValueError(f"cannot read inventory: {error}") from error
    if not isinstance(data, dict) or type(data.get("version")) is not int or data["version"] != 1:
        raise ValueError("version must be 1")
    if not isinstance(data.get("pages"), list):
        raise ValueError("pages must be a list")
    ids, paths, pages = set(), set(), []
    excluded = {"/404.html"} | {f"/work-with-me/{name}" for name in ("personal", "priority", "quote", "thanks", "terms")}
    for item in data["pages"]:
        if not isinstance(item, dict) or set(item) != {"id", "class", "route"}:
            raise ValueError("record keys must be id, class, and route")
        ident, kind, path = item["id"], item["class"], item["route"]
        if not isinstance(ident, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ident):
            raise ValueError(f"invalid id {ident!r}")
        if ident in ids:
            raise ValueError(f"duplicate id {ident}")
        if kind not in ("core-profile", "service", "public-support", "case-study"):
            raise ValueError(f"invalid class {kind!r}")
        if not isinstance(path, str) or not path.startswith("/") or path.startswith("//") or urlsplit(path).query or urlsplit(path).fragment or urlsplit(path).path != path or "//" in path or any(part in (".", "..") for part in path.split("/")):
            raise ValueError(f"invalid route {path!r}")
        if path.rstrip("/") in excluded:
            raise ValueError(f"excluded route {path}")
        if path in paths:
            raise ValueError(f"duplicate route {path}")
        ids.add(ident)
        paths.add(path)
        pages.append({**item, "route": route(baseurl, path)})
    return pages


def publication_day(now=None):
    instant = now or dt.datetime.now(dt.timezone.utc)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=dt.timezone.utc)
    return instant.astimezone(PUBLICATION_TIMEZONE).date()


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
    day = dt.date.fromisoformat(as_of) if isinstance(as_of, str) else as_of or publication_day()
    failures = []
    try:
        pages = load_discovery_pages(source, baseurl)
    except ValueError as error:
        return [f"discovery pages: {error}"], {"articles": 0, "feed": 0, "sitemap_articles": 0, "sitemap_pages": 0}
    dated, legacy = article_inventory(source, day)
    article_paths = [route(baseurl, item["permalink"]) for item in dated]
    legacy_paths = [route(baseurl, item["permalink"]) for item in legacy]
    expected_all = article_paths + legacy_paths
    expected_urls = [origin.rstrip("/") + path for path in article_paths]
    expected_feed = {
        origin.rstrip("/") + route(baseurl, item["permalink"]): {
            "published": f'{item["published_on"]}T00:00:00Z',
            "updated": f'{item["updated_on"]}T00:00:00Z',
        }
        for item in dated
    }

    base = normalized_baseurl(baseurl)
    for page_route in [page["route"] for page in pages] + expected_all:
        relative_route = page_route[len(base):] if base and page_route.startswith(base + "/") else page_route
        output = rendered_output(site, relative_route)
        if output is None:
            failures.append(f"rendered: missing page {page_route}")
            continue
        signals = RenderedSignals()
        signals.feed(output.read_text(encoding="utf-8"))
        if signals.canonicals != [origin.rstrip("/") + page_route]:
            failures.append(f"rendered: canonical mismatch for {page_route}")
        if signals.feeds != [origin.rstrip("/") + route(baseurl, "/feed.xml")]:
            failures.append(f"rendered: feed link mismatch for {page_route}")
        for link in signals.local_links:
            if link is None or any(ord(char) < 32 or ord(char) == 127 for char in link) or "\\" in link or link.startswith("//"):
                failures.append(f"rendered: invalid link {link!r} on {page_route}")
                continue
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path.startswith("/"):
                continue
            target = parsed.path
            if base and not (target == base or target.startswith(base + "/")):
                failures.append(f"rendered: local target outside baseurl {link} on {page_route}")
                continue
            if base:
                target = target[len(base):] or "/"
            if rendered_output(site, target) is None:
                failures.append(f"rendered: missing local target {link} on {page_route}")

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
            entries = root.findall("a:entry", ATOM)
            for entry in entries:
                entry_id = entry.findtext("a:id", namespaces=ATOM)
                expected = expected_feed.get(entry_id)
                if expected is None:
                    continue
                link = entry.find("a:link", ATOM)
                if link is None or link.get("href") != entry_id:
                    failures.append(f"feed: entry link mismatch for {entry_id}")
                if entry.findtext("a:published", namespaces=ATOM) != expected["published"]:
                    failures.append(f"feed: publication date mismatch for {entry_id}")
                if entry.findtext("a:updated", namespaces=ATOM) != expected["updated"]:
                    failures.append(f"feed: update date mismatch for {entry_id}")
            expected_updated = max(
                (metadata["updated"] for metadata in expected_feed.values()),
                default=None,
            )
            if root.findtext("a:updated", namespaces=ATOM) != expected_updated:
                failures.append("feed: overall updated timestamp mismatch")
        except (ET.ParseError, OSError) as error:
            failures.append(f"feed: invalid XML: {error}")

    sitemap_article_urls = []
    sitemap_page_urls = []
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
            expected_page_urls = {origin.rstrip("/") + page["route"] for page in pages}
            sitemap_page_urls = [url for url in urls if url in expected_page_urls]
            for url in sorted(expected_page_urls - set(sitemap_page_urls)):
                failures.append(f"sitemap: missing configured page {url}")
            sitemap_article_urls = [url for url in urls if url in expected_article_urls]
            for url in urls:
                if url not in expected_article_urls | expected_page_urls:
                    failures.append(f"sitemap: unexpected URL {url}")
            if set(sitemap_article_urls) != expected_article_urls:
                failures.append("sitemap: public article catalog mismatch")
        except (ET.ParseError, OSError) as error:
            failures.append(f"sitemap: invalid XML: {error}")

    policy = json.loads((source / "_data" / "crawler-policy.json").read_text(encoding="utf-8"))
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
        "sitemap_pages": len(sitemap_page_urls),
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
        f"{counts['sitemap_articles']} sitemap article URLs, {counts['sitemap_pages']} sitemap page URLs"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
