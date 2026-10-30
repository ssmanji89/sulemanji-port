#!/usr/bin/env python3
"""Check live article discovery with an honest monitor identity."""

import argparse
from dataclasses import dataclass
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPSHandler, HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

USER_AGENT = "SulemanjiDiscoveryMonitor/1.0 (+https://www.sulemanji.com/robots.txt)"
POLICY_PATH = Path(__file__).resolve().parents[1] / "_data" / "crawler-policy.json"
ATOM = {"a": "http://www.w3.org/2005/Atom"}
SITEMAP = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


@dataclass(frozen=True)
class Response:
    status: int
    url: str
    body: str
    headers: dict


class ArticleIdentity(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.canonicals = []
        self.article_container = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        rel = (values.get("rel") or "").lower().split()
        if tag.lower() == "link" and "canonical" in rel:
            self.canonicals.append(values.get("href"))
        if tag.lower() == "article" and "data-writing-article" in values:
            self.article_container = True


class PageIdentity(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.canonicals = []
        self.main = False
        self.noindex = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "link" and "canonical" in (values.get("rel") or "").lower().split():
            self.canonicals.append(values.get("href"))
        if tag == "main" and values.get("id") == "main":
            self.main = True
        if tag == "meta" and (values.get("name") or "").lower() == "robots":
            self.noindex |= "noindex" in (values.get("content") or "").lower()


class UnsafeRedirect(RuntimeError):
    pass


class ApprovedRedirectHandler(HTTPRedirectHandler):
    def __init__(self, approved_origins, *, reject_redirects=False):
        super().__init__()
        self.approved_origins = approved_origins
        self.reject_redirects = reject_redirects

    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        destination = urljoin(request.full_url, new_url)
        if self.reject_redirects:
            raise UnsafeRedirect("page redirect rejected")
        if origin_of(destination) not in self.approved_origins:
            raise UnsafeRedirect("redirect outside approved origins")
        return super().redirect_request(request, file_pointer, code, message, headers, destination)


def load_policy(path=POLICY_PATH):
    list_keys = ("allowed_search_agents", "allowed_user_agents", "restricted_agents")
    try:
        policy = json.loads(Path(path).read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise RuntimeError(f"crawler policy: invalid JSON: {error}") from error
    if not isinstance(policy, dict):
        raise RuntimeError("crawler policy: root must be an object")
    for key in list_keys:
        agents = policy.get(key)
        if not isinstance(agents, list) or not agents:
            raise RuntimeError(f"crawler policy: {key} must be a unique, non-empty list")
        if any(not isinstance(agent, str) or re.search(r"\s|[\x00-\x1f\x7f]", agent) for agent in agents):
            raise RuntimeError(f"crawler policy: {key} contains an invalid agent")
        if len(agents) != len(set(agents)):
            raise RuntimeError(f"crawler policy: {key} must be a unique, non-empty list")
    return policy


def fetch_url(url, user_agent=USER_AGENT, *, approved_origins=None, reject_redirects=False):
    request = Request(
        url,
        headers={"User-Agent": user_agent, "Cache-Control": "no-cache"},
    )
    handlers = [HTTPSHandler(context=ssl.create_default_context())]
    if approved_origins is not None:
        handlers.append(ApprovedRedirectHandler(set(approved_origins), reject_redirects=reject_redirects))
    opener = build_opener(*handlers)
    try:
        with opener.open(request, timeout=30) as response:
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
    except UnsafeRedirect as error:
        raise RuntimeError(str(error)) from error
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


def robots_groups(text):
    groups = []
    agents = []
    rules = []
    for raw in text.splitlines() + [""]:
        if raw.strip().startswith("#"):
            continue
        line = raw.split("#", 1)[0].strip()
        if not line:
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
            terminal = value.endswith("$")
            pattern = value[:-1] if terminal else value
            expression = "^" + re.escape(pattern).replace(r"\*", ".*")
            if terminal:
                expression += "$"
            if re.search(expression, path):
                specificity = len(pattern.replace("*", ""))
                matching.append((specificity, directive == "allow"))
    if not matching:
        return True
    longest = max(length for length, _allowed in matching)
    return any(allowed for length, allowed in matching if length == longest)


def managed_policy_conflicts(robots_text, label, required_paths, policy):
    conflicts = []
    allowed_agents = policy["allowed_search_agents"] + policy["allowed_user_agents"]
    for agent in allowed_agents:
        for path in required_paths:
            if not robots_allows(robots_text, agent, path):
                conflicts.append(f"{label}: {agent} disallows {path}")
    restricted_paths = list(dict.fromkeys(["/", *required_paths]))
    for agent in policy["restricted_agents"]:
        for path in restricted_paths:
            if robots_allows(robots_text, agent, path):
                conflicts.append(f"{label}: {agent} allows restricted path {path}")
    return conflicts


def origin_of(url):
    try:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return None
        return (parsed.scheme, parsed.hostname, 443 if parsed.port is None else parsed.port)
    except ValueError:
        return None


def safe_final_url(response, approved_origins):
    origin = origin_of(response.url)
    return origin is not None and origin in approved_origins


def check_live(base_url, robots_origin, articles, *, pages=(), fetcher=None, policy=None):
    base_url = base_url.rstrip("/")
    robots_origin = robots_origin.rstrip("/")
    origins = {origin for url in (base_url, robots_origin) if (origin := origin_of(url)) is not None}
    policy = policy or load_policy()
    failures = []
    conflicts = []
    observations = []
    canonical_robots = None
    required_paths = ["/writing", "/feed.xml", "/sitemap.xml", *articles, *pages]

    configured_pages = set(pages)

    def fetch(label, url, *, configured_page=False):
        try:
            if fetcher is None:
                response = fetch_url(url, USER_AGENT, approved_origins=origins, reject_redirects=configured_page)
            else:
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
        if response and response.status == 200 and safe_final_url(response, origins):
            conflicts.extend(managed_policy_conflicts(response.body, label, required_paths, policy))
            if label == "canonical robots":
                canonical_robots = response.body

    monitor_agent = USER_AGENT.split("/", 1)[0]

    def fetch_public(label, path):
        if path in configured_pages and canonical_robots is None:
            failures.append(f"page {path}: canonical robots unavailable; request skipped")
            return None
        if canonical_robots is not None and not robots_allows(canonical_robots, monitor_agent, path):
            conflicts.append(f"canonical robots: monitor disallowed {path}")
            return None
        return fetch(label, base_url + path, configured_page=path in configured_pages)

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
            for url in list(dict.fromkeys([*expected_urls, *(base_url + path for path in pages)])):
                if sitemap_urls.count(url) != 1:
                    failures.append(f"sitemap: {url} missing or duplicated")
        except ET.ParseError as error:
            failures.append(f"sitemap: invalid XML: {error}")

    for path in expected_paths:
        response = fetch_public(f"article {path}", path)
        if response:
            if re.search(r'<meta[^>]+(?:name=["\']robots["\'][^>]+noindex|noindex[^>]+name=["\']robots["\'])', response.body, re.I):
                failures.append(f"article {path}: HTML robots metadata contains noindex")
            identity = ArticleIdentity(response.body)
            expected_canonical = base_url + path
            if identity.canonicals != [expected_canonical]:
                failures.append(f"article {path}: canonical mismatch")
            if not identity.article_container:
                failures.append(f"article {path}: article container missing")

    for path in dict.fromkeys(pages):
        response = writing if path == "/writing" else fetch_public(f"page {path}", path)
        if response:
            identity = PageIdentity(response.body)
            if identity.canonicals != [base_url + path]:
                failures.append(f"page {path}: canonical mismatch")
            if not identity.main:
                failures.append(f"page {path}: main#main missing")
            if identity.noindex:
                failures.append(f"page {path}: HTML robots metadata contains noindex")

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
    parser.add_argument("--page", action="append", default=[])
    parser.add_argument("--policy", type=Path, default=POLICY_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = check_live(args.base_url, args.robots_origin, args.article, pages=args.page, policy=load_policy(args.policy))
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
