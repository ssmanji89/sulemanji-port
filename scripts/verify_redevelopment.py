"""Verify an integrated public-site candidate against required surfaces and article identity."""
from __future__ import annotations

import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


SURFACES = ('/', '/explore/', '/writing/', '/about/', '/experience/', '/contact/', '/work/market-systems/', '/work/integrations/', '/work/mathematical-verification/')
EXCLUDED_NAMES = {'OPERATIONS.md', 'EXECUTION.md', 'RELEASE.md', 'MEMORY.md', 'AI-SPEC.md'}
EXCLUDED_PATTERNS = (re.compile(r'(^|/)\.env(?:\.|$)', re.I), re.compile(r'(^|/)(?:secrets?|credentials?)(?:/|\.|$)', re.I), re.compile(r'(^|/)private-memory(?:/|$)', re.I))


def normalize_route(value: str) -> str:
    path = urlparse(value).path
    if not path.startswith('/'):
        path = '/' + path
    return path.rstrip('/') or '/'


class PageFacts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.main_count = 0
        self.canonical = None
        self.published_on = None
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'main':
            self.main_count += 1
        if tag == 'link' and 'canonical' in (attrs.get('rel') or '').split():
            self.canonical = attrs.get('href')
        if tag == 'time' and 'data-published-on' in attrs:
            value = attrs.get('datetime', '')
            self.published_on = value[:10] if re.match(r'^\d{4}-\d{2}-\d{2}', value) else None
        if tag == 'a' and attrs.get('href'):
            self.links.add(normalize_route(attrs['href']))


def html_facts(path: Path) -> PageFacts:
    facts = PageFacts()
    facts.feed(path.read_text(encoding='utf-8', errors='replace'))
    return facts


def route_file(root: Path, route: str) -> Path | None:
    path = root / route.strip('/')
    candidates = [path / 'index.html', path.with_suffix('.html') if path.suffix != '.html' else path]
    return next((candidate for candidate in candidates if candidate.is_file()), None)


def verify_site(site: Path, baseline_path: Path) -> list[str]:
    site = Path(site)
    issues: list[str] = []
    if not site.is_dir():
        return [f'missing site directory: {site}']
    baseline_payload = json.loads(Path(baseline_path).read_text(encoding='utf-8'))
    baseline = baseline_payload.get('articles', baseline_payload)
    if not isinstance(baseline, list) or not baseline:
        return ['article identity: baseline is missing or empty']

    surface_facts: dict[str, PageFacts] = {}
    for route in SURFACES:
        path = route_file(site, route)
        if path is None:
            issues.append(f'missing surface: {route}')
            continue
        facts = html_facts(path)
        surface_facts[route] = facts
        if facts.main_count != 1:
            issues.append(f'main landmark count for {route}: expected 1, got {facts.main_count}')

    articles = {}
    notes = site / 'notes'
    for path in notes.rglob('*.html') if notes.is_dir() else []:
        facts = html_facts(path)
        if not facts.canonical:
            continue
        route = normalize_route(facts.canonical)
        if route in articles:
            issues.append(f'article identity: duplicate canonical route {route}')
        articles[route] = facts.published_on

    for expected in baseline:
        route = normalize_route(expected.get('url', ''))
        if route not in articles:
            issues.append(f'article identity: missing baseline route {route}')
        elif articles[route] != expected.get('published_on'):
            issues.append(f'article identity: date changed for {route}: expected {expected.get("published_on")}, got {articles[route]}')
    if not articles:
        issues.append('article identity: no canonical rendered notes found')

    writing = surface_facts.get('/writing/')
    sitemap = site / 'sitemap.xml'
    feed = site / 'feed.xml'
    if not writing:
        issues.append('article discovery: Writing surface unavailable')
    if not sitemap.is_file():
        issues.append('article discovery: sitemap.xml missing')
    if not feed.is_file():
        issues.append('article discovery: feed.xml missing')
    sitemap_text = sitemap.read_text(encoding='utf-8', errors='replace') if sitemap.is_file() else ''
    feed_text = feed.read_text(encoding='utf-8', errors='replace') if feed.is_file() else ''
    writing_routes = writing.links if writing else set()
    for route, published_on in articles.items():
        if published_on and route not in writing_routes:
            issues.append(f'article discovery: {route} missing from Writing index')
        if published_on and route not in {normalize_route(value) for value in re.findall(r'<loc>(.*?)</loc>', sitemap_text, re.S)}:
            issues.append(f'article discovery: {route} missing from sitemap')
        # Feeds are allowed to be bounded to recent articles; verify the current Writing head.
    if articles:
        latest = sorted((date, route) for route, date in articles.items() if date)[-1][1]
        feed_links = re.findall(r'<link\b[^>]*\bhref=["\']([^"\']+)', feed_text, re.I) + re.findall(r'<link>(.*?)</link>', feed_text, re.S)
        if latest not in {normalize_route(value) for value in feed_links}:
            issues.append(f'article discovery: current article {latest} missing from feed')

    for path in site.rglob('*'):
        if not path.is_file():
            continue
        relative = path.relative_to(site).as_posix()
        if path.name in EXCLUDED_NAMES or any(pattern.search(relative) for pattern in EXCLUDED_PATTERNS):
            issues.append(f'excluded operational file: {relative}')
    return issues


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', type=Path, default=Path('_site'))
    parser.add_argument('--baseline', type=Path, required=True)
    args = parser.parse_args()
    issues = verify_site(args.site, args.baseline)
    if issues:
        for issue in issues:
            print(f'FAIL {issue}')
        return 1
    print('PASS required experience surfaces, rendered article identity, discovery, and public-file exclusion')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
