"""Verify a built site release against public canonical routes and page content."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


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
COMMIT_RE = re.compile(r'^[0-9a-f]{40}$')
DIGEST_RE = re.compile(r'^sha256:[0-9a-f]{64}$')


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


def _check_identity_headers(response: LiveResponse, expected_commit: str, expected_digest: str, path: str) -> None:
    headers = {key.lower(): value for key, value in (response.headers or {}).items()}
    if headers.get('x-site-source-commit') != expected_commit:
        raise LiveReleaseError(f'source commit header does not match on {path}')
    if headers.get('x-site-asset-digest') != expected_digest:
        raise LiveReleaseError(f'asset digest header does not match on {path}')


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


def verify_live_release(base_url: str, expected_commit: str, expected_digest: str,
                        fetcher=fetch_live, public_manifest: dict | None = None) -> dict:
    """Verify the public site against the source revision and digest of a built artifact."""
    parsed_base = urlparse(base_url)
    if (parsed_base.scheme != 'https' or parsed_base.netloc != 'www.sulemanji.com'
            or parsed_base.path not in ('', '/') or parsed_base.query or parsed_base.fragment):
        raise LiveReleaseError(f'base URL must be the canonical origin {CANONICAL_ORIGIN}')
    if not COMMIT_RE.fullmatch(expected_commit):
        raise LiveReleaseError('expected source commit is invalid')
    if not DIGEST_RE.fullmatch(expected_digest):
        raise LiveReleaseError('expected asset digest is invalid')
    digest = expected_digest

    manifest_response = _fetch(fetcher, base_url.rstrip('/') + '/release.json', 200, 'release manifest')
    _check_identity_headers(manifest_response, expected_commit, digest, '/release.json')
    _check_content_type(manifest_response, 'application/json', '/release.json')
    if public_manifest is None:
        try:
            public_manifest = json.loads(manifest_response.body)
        except (TypeError, json.JSONDecodeError) as error:
            raise LiveReleaseError('live release manifest is not valid JSON') from error
    if not isinstance(public_manifest, dict) or public_manifest.get('schema_version') != 1:
        raise LiveReleaseError('live release manifest schema is invalid')
    if public_manifest.get('source_commit') != expected_commit:
        raise LiveReleaseError('live release source commit does not match expected commit')
    if public_manifest.get('asset_digest') != digest:
        raise LiveReleaseError('live release asset digest does not match expected artifact')
    articles = public_manifest.get('articles')
    if not isinstance(public_manifest.get('files'), dict) or not public_manifest['files']:
        raise LiveReleaseError('live release manifest has no asset inventory')
    if not isinstance(articles, list) or not articles:
        raise LiveReleaseError('live release manifest has no preserved articles')

    writing_response = None
    sitemap_response = None
    feed_response = None
    robots_response = None
    home_response = None
    route_count = 0
    for path, (content_type, expected_heading) in REQUIRED_ROUTE_CONTRACTS.items():
        response = _fetch(fetcher, base_url.rstrip('/') + path, 200, f'required route {path}')
        _check_identity_headers(response, expected_commit, digest, path)
        _check_content_type(response, content_type, path)
        if expected_heading is not None:
            facts = PageIdentity()
            facts.feed(response.body)
            if facts.canonical != CANONICAL_ORIGIN + path:
                raise LiveReleaseError(f'page canonical URL changed for {path}')
            if not facts.title or not facts.meta.get('description') or not facts.meta.get('og:title'):
                raise LiveReleaseError(f'page metadata is incomplete for {path}')
            if expected_heading not in facts.headings:
                raise LiveReleaseError(f'expected page content is missing on {path}')
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
    if writing_alias_location != CANONICAL_ORIGIN + '/writing':
        raise LiveReleaseError('Writing alias does not target the canonical /writing path')
    route_count += 1

    writing_facts = PageIdentity()
    writing_facts.feed(writing_response.body if writing_response else '')
    writing_paths = {normalized for link in writing_facts.links if (parsed := _safe_article_path(link)) for normalized in (parsed[1],)}
    sitemap_paths = set(re.findall(r'<loc>https://www\.sulemanji\.com([^<]+)</loc>', sitemap_response.body if sitemap_response else ''))
    if 'Sitemap: https://www.sulemanji.com/sitemap.xml' not in (robots_response.body if robots_response else ''):
        raise LiveReleaseError('robots.txt does not advertise the canonical sitemap')
    feed_text = feed_response.body if feed_response else ''
    feed_urls = re.findall(r'<link\b[^>]*\bhref=["\']([^"\']+)', feed_text, re.I)
    feed_urls.extend(re.findall(r'<link>(.*?)</link>', feed_text, re.I | re.S))
    feed_paths = {path for value in feed_urls if (path := _safe_feed_path(value)) is not None}
    article_count = 0
    article_dates: list[tuple[str, str]] = []
    for article in articles:
        route = _safe_article_path(article.get('url') if isinstance(article, dict) else None)
        published_on = article.get('published_on') if isinstance(article, dict) else None
        valid_date = isinstance(published_on, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', published_on)
        if (route is None or not isinstance(article, dict) or 'published_on' not in article
                or (published_on is not None and not valid_date)):
            raise LiveReleaseError('live release manifest contains an invalid article identity')
        article_path, normalized = route
        if normalized not in writing_paths:
            raise LiveReleaseError(f'Writing index is missing article {article_path}')
        if article_path not in sitemap_paths and article_path.rstrip('/') not in sitemap_paths:
            raise LiveReleaseError(f'sitemap is missing article {article_path}')
        if published_on is not None and normalized not in feed_paths:
            raise LiveReleaseError(f'feed.xml is missing dated article {article_path}')
        article_response = _fetch(fetcher, base_url.rstrip('/') + article_path, 200, f'article {article_path}')
        _check_identity_headers(article_response, expected_commit, digest, article_path)
        _check_content_type(article_response, 'text/html', article_path)
        facts = PageIdentity()
        facts.feed(article_response.body)
        if facts.canonical != CANONICAL_ORIGIN + article_path:
            raise LiveReleaseError(f'article canonical URL changed for {article_path}')
        if not facts.title or not facts.meta.get('description') or not facts.meta.get('og:title') or not any(facts.headings):
            raise LiveReleaseError(f'article metadata or heading is missing for {article_path}')
        if published_on is None and facts.published_on is not None:
            raise LiveReleaseError(f'legacy article gained an unverified publication date for {article_path}')
        if published_on is not None and facts.published_on != published_on:
            raise LiveReleaseError(f'article publication date changed for {article_path}')
        article_count += 1
        if published_on is not None:
            article_dates.append((published_on, normalized))

    if not article_dates:
        raise LiveReleaseError('live release manifest has no dated articles')
    if not article_dates:
        raise LiveReleaseError('live release manifest has no dated articles')

    home_facts = PageIdentity()
    home_facts.feed(home_response.body if home_response else '')
    image_value = home_facts.meta.get('og:image') or home_facts.meta.get('twitter:image')
    if not image_value:
        raise LiveReleaseError('Home page is missing its social image')
    image_url = urlparse(image_value)
    if image_url.scheme != 'https' or image_url.netloc != 'www.sulemanji.com' or not image_url.path.startswith('/'):
        raise LiveReleaseError('Home social image is not served from the canonical site')
    image = _fetch(fetcher, image_value, 200, 'Home social image')
    image_headers = {key.lower(): value for key, value in (image.headers or {}).items()}
    if not image_headers.get('content-type', '').lower().startswith('image/'):
        raise LiveReleaseError('Home social image did not return an image MIME type')
    _check_identity_headers(image, expected_commit, digest, image_url.path)

    _fetch(fetcher, base_url.rstrip('/') + RETIRED_ROUTE, 410, 'retired route')
    _fetch(fetcher, base_url.rstrip('/') + MISSING_ROUTE, 404, 'unknown route')
    apex = _fetch(fetcher, APEX_ORIGIN + '/', 301, 'apex redirect')
    location = {key.lower(): value for key, value in (apex.headers or {}).items()}.get('location')
    if location != CANONICAL_ORIGIN + '/':
        raise LiveReleaseError('apex redirect does not target the canonical host')

    return {
        'source_commit': expected_commit,
        'asset_digest': digest,
        'checked_response_count': route_count + article_count + SUPPLEMENTAL_RESPONSE_COUNT,
        'article_count': article_count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--expected-commit', required=True)
    parser.add_argument('--expected-digest', required=True, help='asset digest from the locally built release manifest')
    args = parser.parse_args()
    try:
        receipt = verify_live_release(args.base_url, args.expected_commit, args.expected_digest)
    except LiveReleaseError as error:
        parser.error(str(error))
    print('PASS live public-site checks: ' + json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
