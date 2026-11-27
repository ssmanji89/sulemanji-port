import hashlib
import json
import re
import unittest
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from scripts.verify_cloudflare_live import (
    CANONICAL_ORIGIN,
    REQUIRED_ROUTE_CONTRACTS,
    LiveReleaseError,
    PageIdentity,
    _safe_article_path,
    _safe_feed_path,
    article_content_sha256,
    verify_live_release,
)


COMMIT = 'a' * 40
DIGEST = 'sha256:' + 'b' * 64
BUILT_AT = '2026-11-20T00:00:00Z'
ARTICLE_BODY = 'Article body text.'
ARTICLE_DIGEST = hashlib.sha256(ARTICLE_BODY.encode()).hexdigest()
ARTICLE = {'url': '/notes/example-article', 'published_on': '2026-11-20', 'content_sha256': ARTICLE_DIGEST}
LEGACY_ARTICLE = {'url': '/notes/agent-safety', 'published_on': None, 'content_sha256': ARTICLE_DIGEST}


@dataclass
class Response:
    status: int
    body: str = ''
    headers: dict | None = None


def site_manifest(source_commit=COMMIT, articles=None):
    return {
        'schema_version': 1,
        'source_commit': source_commit,
        'asset_digest': DIGEST,
        'built_at': BUILT_AT,
        'files': {'index.html': 'f' * 64},
        'articles': articles if articles is not None else [ARTICLE],
    }


class LiveCloudflareVerificationTests(unittest.TestCase):
    def setUp(self):
        self.public_manifest = site_manifest()
        self.overrides = {}
        self.calls = []

    def fetch(self, url):
        parsed = urlparse(url)
        path = parsed.path
        self.calls.append(url)
        if parsed.netloc == 'sulemanji.com':
            return Response(301, headers={'location': 'https://www.sulemanji.com/'})
        if path == '/writing/':
            location = self.overrides.get('writing_alias_location', 'https://www.sulemanji.com/writing')
            return Response(301, headers={'location': location})
        if path == '/release.json':
            return Response(200, json.dumps(self.public_manifest), self.response_headers(path))
        if path == '/assets/images/site-social.png':
            return Response(200, 'png', {**self.release_headers(), 'content-type': 'image/png'})
        if path == '/workshop-intake/':
            return Response(self.overrides.get(path, 410))
        if path == '/missing-release-probe-404/':
            return Response(self.overrides.get(path, 404))
        if isinstance(self.overrides.get(path), int):
            return Response(self.overrides[path])
        if path == '/writing':
            articles = [] if self.overrides.get('missing_writing_entry') else self.public_manifest['articles']
            links = ''.join(f'<a href="{article["url"]}">Article</a>' for article in articles)
            return Response(200, self.page_html(path, links), self.response_headers(path))
        if path == ARTICLE['url']:
            return Response(200, self.article_html(ARTICLE), self.response_headers(path))
        if path == LEGACY_ARTICLE['url']:
            return Response(200, self.article_html(LEGACY_ARTICLE), self.response_headers(path))
        if path == '/sitemap.xml':
            locations = ''.join(f'<url><loc>https://www.sulemanji.com{article["url"]}</loc></url>' for article in self.public_manifest['articles'])
            return Response(200, f'<urlset>{locations}</urlset>', self.response_headers(path))
        if path == '/feed.xml':
            feed_url = self.overrides.get('feed_url', f'https://www.sulemanji.com{ARTICLE["url"]}')
            link = '' if self.overrides.get('missing_feed_entry') else f'<entry><link href="{feed_url}" /></entry>'
            return Response(200, link, self.response_headers(path))
        if path == '/robots.txt':
            return Response(200, 'User-agent: *\nSitemap: https://www.sulemanji.com/sitemap.xml\n', self.response_headers(path))
        if path in ('/', '/explore/', '/writing', '/about/', '/experience/', '/contact/', '/work/market-systems/',
                    '/work/integrations/', '/work/mathematical-verification/'):
            body = self.page_html(path)
            if path == '/':
                body = body.replace('</head>', '<meta property="og:image" content="https://www.sulemanji.com/assets/images/site-social.png"></head>')
            return Response(200, body, self.response_headers(path))
        return Response(404)

    def page_html(self, path, body_content=''):
        description = '' if self.overrides.get('missing_page_description') == path else 'A useful page description.'
        heading = REQUIRED_ROUTE_CONTRACTS[path][1] or 'page'
        if self.overrides.get('wrong_page_heading') == path:
            heading = 'wrong content'
        return (f'<html><head><title>{heading} | Suleman Manji</title>'
                f'<link rel="canonical" href="{CANONICAL_ORIGIN}{path}">'
                f'<meta name="description" content="{description}">'
                f'<meta property="og:title" content="{heading}"></head>'
                f'<body><main><h1>{heading}</h1>{body_content}</main></body></html>')

    def article_html(self, article):
        date = article['published_on']
        time = f'<time data-published-on datetime="{date}"></time>' if date else ''
        body = 'Altered article body.' if self.overrides.get('alter_article_body') else ARTICLE_BODY
        return (f'<html><head><title>Article | Suleman Manji</title>'
                f'<link rel="canonical" href="{CANONICAL_ORIGIN}{article["url"]}">'
                '<meta name="description" content="Article description">'
                '<meta property="og:title" content="Article"></head>'
                f'<body><main><h1>Article title</h1><div data-writing-body>{body}</div>{time}</main></body></html>')

    def release_headers(self):
        built_at = '2026-11-21T00:00:00Z' if self.overrides.get('wrong_built_at') else BUILT_AT
        return {'x-site-source-commit': COMMIT, 'x-site-asset-digest': DIGEST, 'x-site-built-at': built_at}

    def response_headers(self, path):
        content_type = {
            '/release.json': 'application/json', '/feed.xml': 'application/xml',
            '/sitemap.xml': 'application/xml', '/robots.txt': 'text/plain',
        }.get(path, 'text/html')
        if self.overrides.get('wrong_mime') == path:
            content_type = 'text/plain'
        return {**self.release_headers(), 'content-type': content_type}

    def verify(self, public_manifest=None, base_url='https://www.sulemanji.com', expected_digest=DIGEST):
        return verify_live_release(
            base_url=base_url,
            expected_commit=COMMIT,
            expected_digest=expected_digest,
            fetcher=self.fetch,
            public_manifest=public_manifest,
        )

    def test_wrong_origin_fails(self):
        with self.assertRaisesRegex(LiveReleaseError, 'canonical origin'):
            self.verify(base_url='https://example.invalid')
        self.assertEqual(self.calls, [])

    def test_wrong_revision_fails(self):
        self.public_manifest = site_manifest('c' * 40)
        with self.assertRaisesRegex(LiveReleaseError, 'source commit'):
            self.verify()

    def test_build_timestamp_must_match_static_identity_headers(self):
        self.overrides['wrong_built_at'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'build timestamp header'):
            self.verify()

    def test_missing_writing_entry_fails(self):
        self.overrides['missing_writing_entry'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'Writing index'):
            self.verify()

    def test_legacy_article_remains_discoverable_without_an_invented_date(self):
        self.public_manifest = site_manifest(articles=[ARTICLE, LEGACY_ARTICLE])
        receipt = self.verify()
        self.assertEqual(receipt['article_count'], 2)
        self.assertIn('https://www.sulemanji.com/notes/agent-safety', self.calls)

    def test_article_visible_body_must_match_release_manifest(self):
        self.overrides['alter_article_body'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'article visible body changed'):
            self.verify()

    def test_checked_response_count_includes_supplemental_checks(self):
        receipt = self.verify()
        self.assertEqual(receipt['checked_response_count'], 19)

    def test_invalid_expected_digest_fails_before_live_requests(self):
        with self.assertRaisesRegex(LiveReleaseError, 'expected asset digest'):
            self.verify(expected_digest='not-a-digest')
        self.assertEqual(self.calls, [])

    def test_required_route_mime_is_verified(self):
        self.overrides['wrong_mime'] = '/about/'
        with self.assertRaisesRegex(LiveReleaseError, 'content type on /about/'):
            self.verify()

    def test_required_route_checks_expected_page_content(self):
        self.overrides['wrong_page_heading'] = '/about/'
        with self.assertRaisesRegex(LiveReleaseError, 'expected page content is missing on /about/'):
            self.verify()

    def test_required_route_checks_page_metadata(self):
        self.overrides['missing_page_description'] = '/contact/'
        with self.assertRaisesRegex(LiveReleaseError, 'page metadata is incomplete for /contact/'):
            self.verify()

    def test_writing_slash_alias_redirects_to_canonical_path(self):
        self.verify()
        self.assertIn('https://www.sulemanji.com/writing/', self.calls)

    def test_writing_slash_alias_cannot_redirect_off_canonical_path(self):
        self.overrides['writing_alias_location'] = 'https://example.invalid/writing'
        with self.assertRaisesRegex(LiveReleaseError, 'Writing alias'):
            self.verify()

    def test_retired_admission_stays_closed(self):
        self.overrides['/workshop-intake/'] = 200
        with self.assertRaisesRegex(LiveReleaseError, 'retired route'):
            self.verify()

    def test_feed_must_discover_every_dated_preserved_article(self):
        self.overrides['missing_feed_entry'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'feed.xml is missing dated article'):
            self.verify()

    def test_feed_does_not_accept_article_path_from_foreign_host(self):
        self.overrides['feed_url'] = f'https://evil.example{ARTICLE["url"]}'
        with self.assertRaisesRegex(LiveReleaseError, 'feed.xml is missing dated article'):
            self.verify()

    def test_feed_must_include_older_dated_articles(self):
        older = {'url': '/notes/older-article', 'published_on': '2026-11-01', 'content_sha256': ARTICLE_DIGEST}
        self.public_manifest = site_manifest(articles=[older, ARTICLE])
        with self.assertRaisesRegex(LiveReleaseError, 'feed.xml is missing dated article /notes/older-article'):
            self.verify()

    def test_homepage_200_alone_does_not_pass_release(self):
        self.overrides.update({
            '/explore/': 404, '/writing/': 404, '/about/': 404, '/experience/': 404,
            '/contact/': 404, '/work/market-systems/': 404, '/work/integrations/': 404,
            '/work/mathematical-verification/': 404, '/feed.xml': 404, '/sitemap.xml': 404,
            '/robots.txt': 404,
        })
        with self.assertRaises(LiveReleaseError):
            self.verify()

    @unittest.skipUnless(Path('_site/release.json').is_file(), 'built site is not available')
    def test_built_site_matches_public_page_and_article_contracts(self):
        site = Path('_site')

        def page_file(path):
            stem = path.strip('/')
            candidates = [site / (stem + '.html'), site / stem / 'index.html', site / 'index.html' if not stem else site / stem]
            return next((candidate for candidate in candidates if candidate.is_file()), None)

        for path, (_, expected_heading) in REQUIRED_ROUTE_CONTRACTS.items():
            if expected_heading is None:
                continue
            output = page_file(path)
            self.assertIsNotNone(output, f'built page is missing for {path}')
            facts = PageIdentity()
            facts.feed(output.read_text(encoding='utf-8'))
            self.assertEqual(facts.canonical, CANONICAL_ORIGIN + path, path)
            self.assertTrue(facts.title, path)
            self.assertTrue(facts.meta.get('description'), path)
            self.assertTrue(facts.meta.get('og:title'), path)
            self.assertIn(expected_heading, facts.headings, path)

        manifest = json.loads((site / 'release.json').read_text(encoding='utf-8'))
        writing = PageIdentity()
        writing.feed(page_file('/writing').read_text(encoding='utf-8'))
        writing_paths = {parsed[1] for href in writing.links if (parsed := _safe_article_path(href))}
        feed = (site / 'feed.xml').read_text(encoding='utf-8')
        feed_urls = re.findall(r'<link\b[^>]*\bhref=["\']([^"\']+)', feed, re.I)
        feed_urls.extend(re.findall(r'<link>(.*?)</link>', feed, re.I | re.S))
        feed_paths = {path for url in feed_urls if (path := _safe_feed_path(url))}
        sitemap = (site / 'sitemap.xml').read_text(encoding='utf-8')
        sitemap_paths = set(re.findall(r'<loc>https://www\.sulemanji\.com([^<]+)</loc>', sitemap))

        for article in manifest['articles']:
            parsed = _safe_article_path(article['url'])
            self.assertIsNotNone(parsed, article['url'])
            article_path, normalized = parsed
            self.assertIn(normalized, writing_paths, article_path)
            self.assertTrue(article_path in sitemap_paths or article_path.rstrip('/') in sitemap_paths, article_path)
            if article['published_on'] is not None:
                self.assertIn(normalized, feed_paths, article_path)
            output = page_file(article_path)
            self.assertIsNotNone(output, article_path)
            facts = PageIdentity()
            rendered = output.read_text(encoding='utf-8')
            facts.feed(rendered)
            self.assertEqual(facts.canonical, CANONICAL_ORIGIN + article_path)
            self.assertTrue(facts.title and facts.meta.get('description') and facts.meta.get('og:title'), article_path)
            self.assertTrue(any(facts.headings), article_path)
            self.assertEqual(article_content_sha256(rendered), article['content_sha256'], article_path)
            if article['published_on'] is None:
                self.assertIsNone(facts.published_on, article_path)
            else:
                self.assertEqual(facts.published_on, article['published_on'], article_path)


if __name__ == '__main__':
    unittest.main()
