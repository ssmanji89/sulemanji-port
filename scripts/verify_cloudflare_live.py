"""Verify a built site release against public canonical routes and page content."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from scripts.build_site_manifest import article_content_sha256, page_content_sha256
from scripts.site_release import ReleaseError, verify_artifact


CANONICAL_ORIGIN = 'https://www.sulemanji.com'
APEX_ORIGIN = 'https://sulemanji.com'
REQUIRED_ROUTE_CONTRACTS = {
    '/': ('text/html', 'Service work, independent projects, and questions worth checking.'),
    '/explore/': ('text/html', 'Follow a project, a question, or a subject.'),
    '/writing': ('text/html', 'Notes from the work and the questions around it.'),
    '/about/': ('text/html', 'The work, the background, and the questions I keep exploring.'),
    '/experience/': ('text/html', 'Professional Experience'),
    '/contact/': ('text/html', 'The right conversation starts in the right place.'),
    '/work/market-systems/': ('text/html', 'Market automation and decision systems'),
    '/work/integrations/': ('text/html', 'Useful connections between systems'),
    '/work/mathematical-verification/': ('text/html', 'Reproduce the calculation'),
    '/feed.xml': ('application/xml', None),
    '/sitemap.xml': ('application/xml', None),
    '/robots.txt': ('text/plain', None),
}
RETIRED_ROUTE = '/workshop-intake/'
MISSING_ROUTE = '/__release-verification-must-404__/'
SUPPLEMENTAL_RESPONSE_COUNT = 5  # manifest, social image, retired path, missing path, apex redirect
SITE_ROUTE_RULES = json.loads((Path(__file__).resolve().parents[1] / 'cloudflare/config/site-routes.json').read_text(encoding='utf-8'))
ATOM_NS = '{http://www.w3.org/2005/Atom}'
SITEMAP_NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
COMMIT_RE = re.compile(r'^[0-9a-f]{40}$')
DIGEST_RE = re.compile(r'^sha256:[0-9a-f]{64}$')
BUILT_AT_RE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')


class LiveReleaseError(ValueError):
    """The candidate or live site does not satisfy the release contract."""


@dataclass
class LiveResponse:
    status: int
    body: str = ''
    headers: dict[str, str] | None = None


def fetch_live(url: str) -> LiveResponse:
    """Fetch with curl so Cloudflare sees a supported CLI transport."""
    with tempfile.TemporaryDirectory(prefix='sulemanji-live-check-') as directory:
        headers_path = Path(directory) / 'headers.txt'
        body_path = Path(directory) / 'body.txt'
        try:
            result = subprocess.run(
                ['curl', '--silent', '--show-error', '--max-time', '20', '--max-filesize', '10000000',
                 '--max-redirs', '0', '--dump-header', str(headers_path), '--output', str(body_path),
                 '--write-out', '%{http_code}', url],
                capture_output=True, text=True, timeout=25, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            raise LiveReleaseError(f'live request failed: {urlparse(url).path}') from error
        if result.returncode != 0 or not result.stdout.strip().isdigit():
            raise LiveReleaseError(f'live request failed: {urlparse(url).path}')
        header_text = headers_path.read_text(encoding='iso-8859-1') if headers_path.exists() else ''
        body = body_path.read_text(encoding='utf-8', errors='replace') if body_path.exists() else ''

    response_blocks = [block for block in re.split(r'\r?\n\r?\n', header_text) if block.startswith('HTTP/')]
    response_headers: dict[str, str] = {}
    if response_blocks:
        for line in response_blocks[-1].splitlines()[1:]:
            if ':' in line:
                name, value = line.split(':', 1)
                response_headers[name.strip().lower()] = value.strip()
    return LiveResponse(status=int(result.stdout.strip()), body=body, headers=response_headers)


class PageIdentity(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.canonical: str | None = None
        self.published_on: str | None = None
        self.links: set[str] = set()
        self.meta: dict[str, str] = {}
        self.title_parts: list[str] = []
        self.heading_parts: list[list[str]] = []
        self.capture: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == 'title':
            self.capture = 'title'
        if tag == 'h1':
            self.heading_parts.append([])
            self.capture = 'h1'
        if tag == 'link' and 'canonical' in (values.get('rel') or '').split():
            self.canonical = values.get('href')
        if tag == 'time' and 'data-published-on' in values:
            date = values.get('datetime') or ''
            if re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
                self.published_on = date
        if tag == 'a' and values.get('href'):
            self.links.add(values['href'] or '')
        if tag == 'meta':
            key = values.get('property') or values.get('name')
            content = values.get('content')
            if key and content:
                self.meta[key.lower()] = content

    def handle_endtag(self, tag: str) -> None:
        if (tag == 'title' and self.capture == 'title') or (tag == 'h1' and self.capture == 'h1'):
            self.capture = None

    def handle_data(self, data: str) -> None:
        if self.capture == 'title':
            self.title_parts.append(data)
        elif self.capture == 'h1' and self.heading_parts:
            self.heading_parts[-1].append(data)

    @property
    def title(self) -> str:
        return ' '.join(' '.join(self.title_parts).split())

    @property
    def headings(self) -> list[str]:
        return [' '.join(' '.join(parts).split()) for parts in self.heading_parts]


def _check_identity_headers(response: LiveResponse, expected_commit: str, expected_digest: str,
                            expected_built_at: str, path: str) -> None:
    headers = {key.lower(): value for key, value in (response.headers or {}).items()}
    if headers.get('x-site-source-commit') != expected_commit:
        raise LiveReleaseError(f'source commit header does not match on {path}')
    if headers.get('x-site-asset-digest') != expected_digest:
        raise LiveReleaseError(f'asset digest header does not match on {path}')
    if headers.get('x-site-built-at') != expected_built_at:
        raise LiveReleaseError(f'build timestamp header does not match on {path}')


def _wait_for_release_headers(fetcher, base_origin: str, identity: tuple[str, str, str],
                              wait_seconds: int):
    deadline = None

    def fetch(url: str) -> LiveResponse:
        nonlocal deadline
        response = fetcher(url)
        if not url.startswith(base_origin + '/'):
            return response
        while response.status in (200, 301, 302, 307, 308, 404, 410):
            headers = {key.lower(): value for key, value in (response.headers or {}).items()}
            observed = (
                headers.get('x-site-source-commit', ''),
                headers.get('x-site-asset-digest', ''),
                headers.get('x-site-built-at', ''),
            )
            if observed == identity or not all(pattern.fullmatch(value) for pattern, value in
                                               zip((COMMIT_RE, DIGEST_RE, BUILT_AT_RE), observed)):
                break
            # Spend one wait budget across all routes. The caller still validates every response.
            if deadline is None:
                deadline = time.monotonic() + wait_seconds
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            time.sleep(min(5, remaining))
            response = fetcher(url)
        return response

    return fetch


def _check_content_type(response: LiveResponse, expected: str, path: str) -> None:
    headers = {key.lower(): value for key, value in (response.headers or {}).items()}
    actual = headers.get('content-type', '').split(';', 1)[0].strip().lower()
    if actual != expected:
        raise LiveReleaseError(f'content type on {path} is {actual or "missing"}; expected {expected}')


def _safe_article_path(value: object) -> tuple[str, str] | None:
    if not isinstance(value, str) or not value.startswith('/') or value.startswith('//'):
        return None
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or '\\' in parsed.path:
        return None
    if any(part in ('.', '..') for part in parsed.path.split('/')):
        return None
    return parsed.path, parsed.path.rstrip('/') or '/'


def _safe_feed_path(value: object) -> str | None:
    """Return a feed link path only when it is relative or canonical-host HTTPS."""
    if not isinstance(value, str):
        return None
    value = unescape(value.strip())
    parsed = urlparse(value)
    if parsed.query or parsed.fragment or parsed.params or '\\' in parsed.path:
        return None
    if parsed.scheme or parsed.netloc:
        if parsed.scheme.lower() != 'https' or parsed.netloc.lower() != 'www.sulemanji.com':
            return None
        path = parsed.path
    else:
        path = value
    route = _safe_article_path(path)
    return route[1] if route else None


def _fetch(fetcher, url: str, expected_status: int, label: str) -> LiveResponse:
    try:
        response = fetcher(url)
    except LiveReleaseError:
        raise
    except Exception as error:
        raise LiveReleaseError(f'live request failed for {label}') from error
    if not isinstance(response, LiveResponse) and not all(hasattr(response, name) for name in ('status', 'body', 'headers')):
        raise LiveReleaseError(f'live transport returned an invalid response for {label}')
    if response.status != expected_status:
        raise LiveReleaseError(f'{label} returned HTTP {response.status}; expected {expected_status}')
    return response


def _xml_root(body: str, expected_tag: str, label: str) -> ET.Element:
    if '<!DOCTYPE' in body.upper() or '<!ENTITY' in body.upper():
        raise LiveReleaseError(f'{label} XML contains a forbidden declaration')
    try:
        root = ET.fromstring(body)
    except ET.ParseError as error:
        raise LiveReleaseError(f'{label} XML is malformed or truncated') from error
    if root.tag != expected_tag:
        raise LiveReleaseError(f'{label} XML has an unexpected root element')
    return root


def _article_discovery_paths(articles: list[dict], key_pages: set[str], feed_body: str, sitemap_body: str):
    expected_feed_dates = {}
    for article in articles:
        route = _safe_article_path(article.get('url') if isinstance(article, dict) else None)
        if route and article.get('indexable') and article.get('published_on'):
            expected_feed_dates[route[1]] = article['published_on']
    feed_root = _xml_root(feed_body, ATOM_NS + 'feed', 'Atom feed')
    feed_paths: list[str] = []
    for entry in feed_root.findall(ATOM_NS + 'entry'):
        ids = entry.findall(ATOM_NS + 'id')
        titles = entry.findall(ATOM_NS + 'title')
        published = entry.findall(ATOM_NS + 'published')
        links = [link for link in entry.findall(ATOM_NS + 'link')
                 if link.attrib.get('rel', 'alternate') == 'alternate' and link.attrib.get('href')]
        if len(ids) != 1 or not (ids[0].text or '').strip() or len(titles) != 1 or not (titles[0].text or '').strip() or len(published) != 1 or not links:
            raise LiveReleaseError('Atom feed contains an incomplete entry')
        path = _safe_feed_path(links[0].attrib['href'])
        if path is None or _safe_feed_path((ids[0].text or '').strip()) != path:
            raise LiveReleaseError('Atom feed entry identity is not canonical')
        published_date = (published[0].text or '').strip()[:10]
        if (not re.fullmatch(r'\d{4}-\d{2}-\d{2}', published_date)
                or expected_feed_dates.get(path) != published_date):
            raise LiveReleaseError(f'Atom feed publication date changed for {path}')
        feed_paths.append(path)
    if len(feed_paths) != len(set(feed_paths)):
        raise LiveReleaseError('Atom feed contains duplicate article entries')

    sitemap_root = _xml_root(sitemap_body, SITEMAP_NS + 'urlset', 'sitemap')
    sitemap_paths: list[str] = []
    for entry in sitemap_root.findall(SITEMAP_NS + 'url'):
        locations = entry.findall(SITEMAP_NS + 'loc')
        if len(locations) != 1 or not (locations[0].text or '').strip():
            raise LiveReleaseError('sitemap XML contains an incomplete URL entry')
        path = _safe_feed_path((locations[0].text or '').strip())
        if path is None:
            raise LiveReleaseError('sitemap XML contains a noncanonical URL')
        sitemap_paths.append(path)
    if len(sitemap_paths) != len(set(sitemap_paths)):
        raise LiveReleaseError('sitemap XML contains duplicate URLs')
    sitemap_set = set(sitemap_paths)
    normalized_key_pages = {_safe_article_path(page)[1] for page in key_pages if _safe_article_path(page)}
    if not normalized_key_pages.issubset(sitemap_set):
        raise LiveReleaseError('sitemap is missing a required key page')
    return set(feed_paths), sitemap_set


def verify_live_release(base_url: str, expected_commit: str, expected_manifest: dict,
                        fetcher=fetch_live, staging: bool = False, *, wait_seconds: int = 0) -> dict:
    """Verify the public site against a locally validated build artifact manifest."""
    parsed_base = urlparse(base_url)
    if (parsed_base.scheme != 'https' or not parsed_base.hostname or parsed_base.username or parsed_base.password
            or parsed_base.path not in ('', '/') or parsed_base.query or parsed_base.fragment):
        raise LiveReleaseError('base URL must be an HTTPS origin without a path, credentials, query, or fragment')
    base_origin = f'{parsed_base.scheme}://{parsed_base.netloc}'
    production_host = parsed_base.hostname.lower() in {'www.sulemanji.com', 'sulemanji.com'}
    if (staging and production_host) or (not staging and parsed_base.netloc != 'www.sulemanji.com'):
        if staging:
            raise LiveReleaseError('staging origin must be separate from the canonical production hosts')
        raise LiveReleaseError(f'base URL must be the canonical origin {CANONICAL_ORIGIN}')
    if not COMMIT_RE.fullmatch(expected_commit):
        raise LiveReleaseError('expected source commit is invalid')
    if not isinstance(expected_manifest, dict) or expected_manifest.get('schema_version') != 1:
        raise LiveReleaseError('qualified artifact manifest is invalid')
    if expected_manifest.get('source_commit') != expected_commit:
        raise LiveReleaseError('qualified artifact source commit does not match expected commit')
    digest = expected_manifest.get('asset_digest')
    if not isinstance(digest, str) or not DIGEST_RE.fullmatch(digest):
        raise LiveReleaseError('qualified artifact asset digest is invalid')
    built_at = expected_manifest.get('built_at')
    if not isinstance(built_at, str) or not BUILT_AT_RE.fullmatch(built_at):
        raise LiveReleaseError('qualified artifact build timestamp is invalid')
    try:
        parsed_built_at = datetime.fromisoformat(built_at.replace('Z', '+00:00'))
    except ValueError as error:
        raise LiveReleaseError('qualified artifact build timestamp is invalid') from error
    if parsed_built_at.isoformat(timespec='seconds').replace('+00:00', 'Z') != built_at:
        raise LiveReleaseError('qualified artifact build timestamp is not canonical UTC')

    if not 0 <= wait_seconds <= 120:
        raise LiveReleaseError('release propagation wait must be between 0 and 120 seconds')
    if wait_seconds:
        fetcher = _wait_for_release_headers(fetcher, base_origin, (expected_commit, digest, built_at), wait_seconds)

    manifest_response = _fetch(fetcher, base_url.rstrip('/') + '/release.json', 200, 'release manifest')
    _check_content_type(manifest_response, 'application/json', '/release.json')
    try:
        live_manifest = json.loads(manifest_response.body)
    except (TypeError, json.JSONDecodeError) as error:
        raise LiveReleaseError('live release manifest is not valid JSON') from error
    if not isinstance(live_manifest, dict) or live_manifest.get('schema_version') != 1:
        raise LiveReleaseError('live release manifest schema is invalid')
    if live_manifest.get('source_commit') != expected_commit:
        raise LiveReleaseError('live release source commit does not match expected commit')
    if live_manifest != expected_manifest:
        raise LiveReleaseError('live release manifest does not match the qualified artifact')
    _check_identity_headers(manifest_response, expected_commit, digest, built_at, '/release.json')
    articles = expected_manifest.get('articles')
    if not isinstance(expected_manifest.get('files'), dict) or not expected_manifest['files']:
        raise LiveReleaseError('live release manifest has no asset inventory')
    if not isinstance(articles, list) or not articles:
        raise LiveReleaseError('live release manifest has no preserved articles')
    expected_page_paths = {path for path, (_, heading) in REQUIRED_ROUTE_CONTRACTS.items() if heading is not None}
    page_rows = expected_manifest.get('pages')
    if not isinstance(page_rows, list) or len(page_rows) != len(expected_page_paths):
        raise LiveReleaseError('live release manifest has an invalid key-page inventory')
    pages_by_path = {}
    for page in page_rows:
        if (not isinstance(page, dict)
                or set(page) != {'url', 'canonical', 'title', 'description', 'og_title', 'content_sha256'}
                or not isinstance(page.get('url'), str)
                or not all(isinstance(page.get(key), str) and page[key] for key in ('canonical', 'title', 'description', 'og_title'))
                or not isinstance(page.get('content_sha256'), str)
                or not re.fullmatch(r'[0-9a-f]{64}', page['content_sha256'])
                or page['url'] in pages_by_path):
            raise LiveReleaseError('live release manifest has an invalid key-page identity')
        pages_by_path[page['url']] = page
    if set(pages_by_path) != expected_page_paths:
        raise LiveReleaseError('live release manifest key-page routes do not match the required routes')

    writing_response = None
    sitemap_response = None
    feed_response = None
    robots_response = None
    home_response = None
    route_count = 0
    for path, (content_type, expected_heading) in REQUIRED_ROUTE_CONTRACTS.items():
        response = _fetch(fetcher, base_url.rstrip('/') + path, 200, f'required route {path}')
        _check_identity_headers(response, expected_commit, digest, built_at, path)
        _check_content_type(response, content_type, path)
        if expected_heading is not None:
            facts = PageIdentity()
            facts.feed(response.body)
            expected_page = pages_by_path[path]
            if facts.canonical != expected_page['canonical'] or facts.canonical != CANONICAL_ORIGIN + path:
                raise LiveReleaseError(f'page canonical URL changed for {path}')
            if (facts.title != expected_page['title']
                    or facts.meta.get('description') != expected_page['description']
                    or facts.meta.get('og:title') != expected_page['og_title']):
                raise LiveReleaseError(f'page metadata does not match the qualified artifact for {path}')
            if expected_heading not in facts.headings:
                raise LiveReleaseError(f'expected page content is missing on {path}')
            try:
                actual_page_sha256 = page_content_sha256(response.body)
            except ValueError as error:
                raise LiveReleaseError(f'page visible content is missing on {path}') from error
            if actual_page_sha256 != expected_page['content_sha256']:
                raise LiveReleaseError(f'page visible body changed on {path}')
        route_count += 1
        if path == '/writing':
            writing_response = response
        elif path == '/sitemap.xml':
            sitemap_response = response
        elif path == '/feed.xml':
            feed_response = response
        elif path == '/robots.txt':
            robots_response = response
        elif path == '/':
            home_response = response

    writing_alias = _fetch(fetcher, base_url.rstrip('/') + '/writing/', 301, 'Writing alias')
    writing_alias_location = {key.lower(): value for key, value in (writing_alias.headers or {}).items()}.get('location')
    expected_writing_alias = (base_origin if staging else CANONICAL_ORIGIN) + '/writing'
    if writing_alias_location != expected_writing_alias:
        raise LiveReleaseError('Writing alias does not target the canonical /writing path')
    route_count += 1

    for rule in SITE_ROUTE_RULES:
        source = rule.get('source')
        if not isinstance(source, str) or source == '/writing/':
            continue
        kind = rule.get('kind')
        expected_status = rule.get('status', 410 if kind == 'gone' else None)
        if kind not in {'redirect', 'gone'} or not isinstance(expected_status, int):
            raise LiveReleaseError('site route rules contain an invalid retirement contract')
        label = 'retired route' if kind == 'gone' else f'configured route {source}'
        response = _fetch(fetcher, base_url.rstrip('/') + source, expected_status, label)
        if kind == 'redirect':
            target = rule.get('target')
            if not isinstance(target, str) or not target.startswith('/'):
                raise LiveReleaseError(f'configured redirect target is invalid for {source}')
            expected_target = (base_origin if staging else CANONICAL_ORIGIN) + target
            location = {key.lower(): value for key, value in (response.headers or {}).items()}.get('location')
            if location != expected_target:
                raise LiveReleaseError(f'route disposition for {source} does not match its configured redirect')
            route_count += 1

    writing_facts = PageIdentity()
    writing_facts.feed(writing_response.body if writing_response else '')
    writing_paths = {normalized for link in writing_facts.links if (parsed := _safe_article_path(link)) for normalized in (parsed[1],)}
    if 'Sitemap: https://www.sulemanji.com/sitemap.xml' not in (robots_response.body if robots_response else ''):
        raise LiveReleaseError('robots.txt does not advertise the canonical sitemap')
    feed_paths, sitemap_paths = _article_discovery_paths(
        articles, expected_page_paths, feed_response.body if feed_response else '',
        sitemap_response.body if sitemap_response else '',
    )
    article_count = 0
    expected_feed_paths: set[str] = set()
    expected_sitemap_article_paths: set[str] = set()
    future_cutoff = parsed_built_at.astimezone(ZoneInfo('America/Chicago')).date()
    for article in articles:
        route = _safe_article_path(article.get('url') if isinstance(article, dict) else None)
        published_on = article.get('published_on') if isinstance(article, dict) else None
        content_sha256 = article.get('content_sha256') if isinstance(article, dict) else None
        valid_date = isinstance(published_on, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', published_on)
        metadata_keys = {'canonical', 'title', 'description', 'og_title', 'h1', 'robots', 'indexable'}
        if (route is None or not isinstance(article, dict) or set(article) !=
                {'url', 'published_on', 'content_sha256', *metadata_keys}
                or (published_on is not None and not valid_date)
                or not isinstance(content_sha256, str) or not re.fullmatch(r'[0-9a-f]{64}', content_sha256)
                or not all(isinstance(article.get(key), str) and article[key]
                           for key in ('canonical', 'title', 'description', 'og_title', 'h1'))
                or not isinstance(article.get('robots'), str) or not isinstance(article.get('indexable'), bool)
                or article['canonical'] != CANONICAL_ORIGIN + article['url']
                or article['indexable'] != ('noindex' not in [token.strip().lower() for token in article['robots'].split(',')])):
            raise LiveReleaseError('live release manifest contains an invalid article identity')
        article_path, normalized = route
        if published_on is not None:
            try:
                publication_day = date.fromisoformat(published_on)
            except ValueError as error:
                raise LiveReleaseError(f'article publication date is invalid for {article_path}') from error
            if publication_day > future_cutoff and article['indexable']:
                raise LiveReleaseError(f'future-dated article is indexable in the qualified artifact: {article_path}')
        if article['indexable']:
            expected_sitemap_article_paths.add(normalized)
            if published_on is not None:
                expected_feed_paths.add(normalized)
            if normalized not in writing_paths:
                raise LiveReleaseError(f'Writing index is missing article {article_path}')
            article_in_sitemap = normalized in sitemap_paths
            if not article_in_sitemap:
                raise LiveReleaseError(f'sitemap is missing article {article_path}')
            if published_on is not None and normalized not in feed_paths:
                raise LiveReleaseError(f'feed.xml is missing dated article {article_path}')
        else:
            if normalized in writing_paths:
                raise LiveReleaseError(f'Writing index exposes excluded article {article_path}')
            if normalized in sitemap_paths:
                raise LiveReleaseError(f'sitemap exposes excluded article {article_path}')
            if normalized in feed_paths:
                raise LiveReleaseError(f'feed.xml exposes excluded article {article_path}')
        article_response = _fetch(fetcher, base_url.rstrip('/') + article_path, 200, f'article {article_path}')
        _check_identity_headers(article_response, expected_commit, digest, built_at, article_path)
        _check_content_type(article_response, 'text/html', article_path)
        facts = PageIdentity()
        facts.feed(article_response.body)
        if facts.canonical != CANONICAL_ORIGIN + article_path:
            raise LiveReleaseError(f'article canonical URL changed for {article_path}')
        robots = facts.meta.get('robots', '')
        if (facts.title != article['title'] or facts.meta.get('description') != article['description']
                or facts.meta.get('og:title') != article['og_title'] or facts.headings != [article['h1']]
                or robots != article['robots']):
            raise LiveReleaseError(f'article metadata does not match the qualified artifact for {article_path}')
        try:
            actual_content_sha256 = article_content_sha256(article_response.body)
        except ValueError as error:
            raise LiveReleaseError(f'article visible body is missing for {article_path}') from error
        if actual_content_sha256 != content_sha256:
            raise LiveReleaseError(f'article visible body changed for {article_path}')
        if published_on is None and facts.published_on is not None:
            raise LiveReleaseError(f'legacy article gained an unverified publication date for {article_path}')
        if published_on is not None and facts.published_on != published_on:
            raise LiveReleaseError(f'article publication date changed for {article_path}')
        article_count += 1

    writing_article_paths = {route[1] for link in writing_facts.links
                             if (route := _safe_article_path(link)) is not None and route[1].startswith('/notes/')}
    if writing_article_paths != expected_sitemap_article_paths:
        raise LiveReleaseError('Writing index article set does not match the qualified artifact')
    actual_sitemap_article_paths = {path for path in sitemap_paths if path.startswith('/notes/')}
    if actual_sitemap_article_paths != expected_sitemap_article_paths:
        raise LiveReleaseError('sitemap article set does not match the qualified artifact')
    if feed_paths != expected_feed_paths:
        raise LiveReleaseError('Atom feed article set does not match the qualified artifact')
    if not expected_feed_paths:
        raise LiveReleaseError('live release manifest has no dated articles')

    home_facts = PageIdentity()
    home_facts.feed(home_response.body if home_response else '')
    image_value = home_facts.meta.get('og:image') or home_facts.meta.get('twitter:image')
    if not image_value:
        raise LiveReleaseError('Home page is missing its social image')
    image_url = urlparse(image_value)
    if image_url.scheme != 'https' or image_url.netloc != 'www.sulemanji.com' or not image_url.path.startswith('/'):
        raise LiveReleaseError('Home social image is not served from the canonical site')
    image_fetch_url = base_origin + image_url.path if staging else image_value
    image = _fetch(fetcher, image_fetch_url, 200, 'Home social image')
    image_headers = {key.lower(): value for key, value in (image.headers or {}).items()}
    if not image_headers.get('content-type', '').lower().startswith('image/'):
        raise LiveReleaseError('Home social image did not return an image MIME type')
    _check_identity_headers(image, expected_commit, digest, built_at, image_url.path)

    _fetch(fetcher, base_url.rstrip('/') + MISSING_ROUTE, 404, 'unknown route')
    if not staging:
        apex = _fetch(fetcher, APEX_ORIGIN + '/', 301, 'apex redirect')
        location = {key.lower(): value for key, value in (apex.headers or {}).items()}.get('location')
        if location != CANONICAL_ORIGIN + '/':
            raise LiveReleaseError('apex redirect does not target the canonical host')

    return {
        'source_commit': expected_commit,
        'asset_digest': digest,
        'built_at': built_at,
        'checked_response_count': route_count + article_count + SUPPLEMENTAL_RESPONSE_COUNT - int(staging),
        'article_count': article_count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--expected-commit', required=True)
    parser.add_argument('--manifest', type=Path, required=True, help='release.json from the exact built artifact')
    parser.add_argument('--staging', action='store_true', help='verify an isolated non-production HTTPS staging origin')
    parser.add_argument('--wait-seconds', type=int, default=0, help='wait for a reported previous release to converge')
    args = parser.parse_args()
    try:
        manifest_path = args.manifest.resolve()
        expected_manifest = verify_artifact(manifest_path.parent, args.expected_commit, args.expected_commit)
        receipt = verify_live_release(args.base_url, args.expected_commit, expected_manifest, staging=args.staging,
                                      wait_seconds=args.wait_seconds)
    except (LiveReleaseError, ReleaseError, OSError, ValueError, json.JSONDecodeError) as error:
        parser.error(str(error))
    print('PASS live public-site checks: ' + json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
