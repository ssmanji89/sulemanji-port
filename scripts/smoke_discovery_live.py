#!/usr/bin/env python3
"""Check live article discovery with an honest monitor identity."""

import argparse
from dataclasses import dataclass
import json
import re
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


USER_AGENT = "SulemanjiDiscoveryMonitor/1.0 (+https://www.sulemanji.com/robots.txt)"
POLICY_AGENTS = (
    "OAI-SearchBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "ChatGPT-User",
    "Claude-User",
    "Perplexity-User",
    "Google-Agent",
)
ATOM = {"a": "http://www.w3.org/2005/Atom"}
SITEMAP = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


@dataclass(frozen=True)
class Response:
    status: int
    url: str
    body: str
    headers: dict


def fetch_url(url, user_agent=USER_AGENT):
    request = Request(
        url,
        headers={"User-Agent": user_agent, "Cache-Control": "no-cache"},
    )
    try:
        with urlopen(request, timeout=30, context=ssl.create_default_context()) as response:
            body = response.read().decode("utf-8", errors="replace")
            return Response(
                response.status,
                response.geturl(),
                body,
                {key.lower(): value for key, value in response.headers.items()},
            )
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return Response(
            error.code,
            error.geturl(),
            body,
            {key.lower(): value for key, value in error.headers.items()},
        )
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


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


def robots_allows(robots_text, agent, path):
    groups = robots_groups(robots_text)
    exact = [rules for agents, rules in groups if agent.lower() in {value.lower() for value in agents}]
    selected = exact or [rules for agents, rules in groups if "*" in agents]
    matching = []
    for rules in selected:
        for directive, value in rules:
            if directive not in {"allow", "disallow"} or not value:
                continue
            if path.startswith(value):
                matching.append((len(value), directive == "allow"))
    if not matching:
        return True
    longest = max(length for length, _allowed in matching)
    return all(allowed for length, allowed in matching if length == longest)


def managed_policy_conflicts(robots_text, label, required_paths):
    groups = robots_groups(robots_text)
    conflicts = []
    for agent in POLICY_AGENTS:
        for path in required_paths:
            if not robots_allows(robots_text, agent, path):
                conflicts.append(f"{label}: {agent} disallows {path}")
    return conflicts


def safe_final_url(response, approved_hosts):
    parsed = urlsplit(response.url)
    return parsed.scheme == "https" and parsed.hostname in approved_hosts


def check_live(base_url, robots_origin, articles, *, fetcher=fetch_url):
    base_url = base_url.rstrip("/")
    robots_origin = robots_origin.rstrip("/")
    origins = {urlsplit(base_url).hostname, urlsplit(robots_origin).hostname}
    failures = []
    conflicts = []
    observations = []
    canonical_robots = None
    required_paths = ["/writing", "/feed.xml", "/sitemap.xml", *articles]

    def fetch(label, url):
        try:
            response = fetcher(url, USER_AGENT)
        except Exception as error:  # Network failures become bounded smoke evidence.
            failures.append(f"{label}: request failed: {error}")
            return None
        observations.append({"label": label, "status": response.status, "url": response.url})
        if response.status != 200:
            failures.append(f"{label}: HTTP {response.status}")
        if not safe_final_url(response, origins):
            failures.append(f"{label}: redirected outside approved origins")
        if "noindex" in response.headers.get("x-robots-tag", "").lower():
            failures.append(f"{label}: X-Robots-Tag contains noindex")
        return response

    for label, origin in (("canonical robots", base_url), ("apex robots", robots_origin)):
        response = fetch(label, origin + "/robots.txt")
        if response and response.status == 200:
            conflicts.extend(managed_policy_conflicts(response.body, label, required_paths))
            if label == "canonical robots":
                canonical_robots = response.body

    monitor_agent = USER_AGENT.split("/", 1)[0]

    def fetch_public(label, path):
        if canonical_robots is not None and not robots_allows(canonical_robots, monitor_agent, path):
            conflicts.append(f"canonical robots: monitor disallowed {path}")
            return None
        return fetch(label, base_url + path)

    writing = fetch_public("writing", "/writing")
    feed = fetch_public("feed", "/feed.xml")
    sitemap = fetch_public("sitemap", "/sitemap.xml")
    expected_paths = list(dict.fromkeys(articles))
    expected_urls = [base_url + path for path in expected_paths]

    if writing:
        writing_paths = re.findall(r'data-writing-(?:legacy-)?url=["\']([^"\']+)', writing.body)
        for path in expected_paths:
            if writing_paths.count(path) != 1:
                failures.append(f"writing: {path} missing or duplicated")

    if feed:
        try:
            root = ET.fromstring(feed.body)
            feed_urls = [entry.findtext("a:id", namespaces=ATOM) for entry in root.findall("a:entry", ATOM)]
            for url in expected_urls:
                if feed_urls.count(url) != 1:
                    failures.append(f"feed: {url} missing or duplicated")
        except ET.ParseError as error:
            failures.append(f"feed: invalid XML: {error}")

    if sitemap:
        try:
            root = ET.fromstring(sitemap.body)
            sitemap_urls = [node.text for node in root.findall("s:url/s:loc", SITEMAP)]
            for url in expected_urls:
                if sitemap_urls.count(url) != 1:
                    failures.append(f"sitemap: {url} missing or duplicated")
        except ET.ParseError as error:
            failures.append(f"sitemap: invalid XML: {error}")

    for path in expected_paths:
        response = fetch_public(f"article {path}", path)
        if response and re.search(r'<meta[^>]+(?:name=["\']robots["\'][^>]+noindex|noindex[^>]+name=["\']robots["\'])', response.body, re.I):
            failures.append(f"article {path}: HTML robots metadata contains noindex")

    return {
        "ok": not failures and not conflicts,
        "user_agent": USER_AGENT,
        "failures": failures,
        "managed_policy_conflicts": conflicts,
        "observations": observations,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--robots-origin", required=True)
    parser.add_argument("--article", action="append", required=True)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = check_live(args.base_url, args.robots_origin, args.article)
    if args.json:
        json.dump(result, sys.stdout, indent=2, sort_keys=True)
        print()
    else:
        for failure in result["failures"]:
            print("FAIL " + failure)
        for conflict in result["managed_policy_conflicts"]:
            print("CONFLICT " + conflict)
        if result["ok"]:
            print("PASS live article discovery")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
