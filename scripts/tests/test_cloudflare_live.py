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
    page_content_sha256,
    verify_live_release,
)


ROOT = Path(__file__).resolve().parents[2]
SITE_ROUTE_RULES = json.loads((ROOT / 'cloudflare/config/site-routes.json').read_text(encoding='utf-8'))
COMMIT = 'a' * 40
DIGEST = 'sha256:' + 'b' * 64
BUILT_AT = '2026-11-27T15:00:00Z'
ARTICLE_BODY = 'Article body text.'
ARTICLE_DIGEST = hashlib.sha256(ARTICLE_BODY.encode()).hexdigest()
ARTICLE = {
    'url': '/notes/example-article', 'canonical': f'{CANONICAL_ORIGIN}/notes/example-article',
    'published_on': '2026-11-20', 'content_sha256': ARTICLE_DIGEST,
    'title': 'Article | Sulemanji', 'description': 'Article description', 'og_title': 'Article',
    'h1': 'Article title', 'robots': '', 'indexable': True,
}
LEGACY_ARTICLE = {**ARTICLE, 'url': '/notes/agent-safety', 'canonical': f'{CANONICAL_ORIGIN}/notes/agent-safety', 'published_on': None}
NOINDEX_ARTICLE = {
    **ARTICLE, 'url': '/notes/hidden-article', 'canonical': f'{CANONICAL_ORIGIN}/notes/hidden-article',
    'published_on': '2027-01-01', 'robots': 'noindex,follow', 'indexable': False,
}


@dataclass
class Response:
    status: int
    body: str = ''
    headers: dict | None = None


def site_manifest(source_commit=COMMIT, articles=None):
    articles = articles if articles is not None else [ARTICLE]
    indexed_articles = [article for article in articles if article.get('indexable', True)]
    pages = []
    for path, (_, heading) in REQUIRED_ROUTE_CONTRACTS.items():
        if heading is None:
            continue
        body = ''.join(f'<a href="{article["url"]}">Article</a>' for article in indexed_articles) if path == '/writing' else f'<p>Public section for {path}.</p>'
        pages.append({
            'url': path,
            'canonical': f'{CANONICAL_ORIGIN}{path}',
            'title': f'{heading} | Suleman Manji',
            'description': 'A useful page description.',
            'og_title': heading,
            'content_sha256': page_content_sha256(f'<main><h1>{heading}</h1>{body}</main>'),
        })
    return {
        'schema_version': 1,
        'source_commit': source_commit,
        'asset_digest': DIGEST,
        'built_at': BUILT_AT,
        'files': {'index.html': 'f' * 64},
        'articles': articles,
        'pages': pages,
    }


class LiveCloudflareVerificationTests(unittest.TestCase):
    def setUp(self):
        self.expected_manifest = site_manifest()
        self.public_manifest = json.loads(json.dumps(self.expected_manifest))
        self.overrides = {}
        self.calls = []

    def fetch(self, url):
        parsed = urlparse(url)
        path = parsed.path
        self.calls.append(url)
        if parsed.netloc == 'sulemanji.com':
            return Response(301, headers={'location': 'https://www.sulemanji.com/'})
        if path == '/writing/':
            location = self.overrides.get('writing_alias_location', f'{parsed.scheme}://{parsed.netloc}/writing')
            return Response(301, headers={'location': location})
        route_rule = next((rule for rule in SITE_ROUTE_RULES if rule['source'] == path), None)
        if route_rule and path != '/writing/':
            status = self.overrides.get(path, self.overrides.get(f'route_status:{path}', route_rule.get('status', 410)))
            target = route_rule.get('target') or route_rule.get('destination')
            location = self.overrides.get(f'route_location:{path}', f'{parsed.scheme}://{parsed.netloc}{target}')
            return Response(status, headers={'location': location} if target else {})
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
            articles = [article for article in self.public_manifest['articles'] if article.get('indexable', True)]
            if self.overrides.get('missing_writing_entry'):
                articles = []
            links = ''.join(f'<a href="{article["url"]}">Article</a>' for article in articles)
            return Response(200, self.page_html(path, links), self.response_headers(path))
        article = next((item for item in self.public_manifest['articles'] if item['url'] == path), None)
        if article:
            return Response(200, self.article_html(article), self.response_headers(path))
        if path == '/sitemap.xml':
            if self.overrides.get('malformed_sitemap'):
                return Response(200, '<urlset><url><loc>https://www.sulemanji.com' + ARTICLE['url'] + '</loc>', self.response_headers(path))
            paths = [path for path, (_, heading) in REQUIRED_ROUTE_CONTRACTS.items() if heading is not None]
            paths.extend(article['url'] for article in self.public_manifest['articles'] if article.get('indexable', True))
            locations = ''.join(f'<url><loc>https://www.sulemanji.com{path}</loc></url>' for path in paths)
            return Response(200, f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{locations}</urlset>', self.response_headers(path))
        if path == '/feed.xml':
            if self.overrides.get('malformed_feed'):
                feed_url = f'https://www.sulemanji.com{ARTICLE["url"]}'
                truncated = ('<feed xmlns="http://www.w3.org/2005/Atom"><title>Writing</title>'
                             f'<entry><id>{feed_url}</id><title>Article</title><published>2026-11-20T00:00:00Z</published>'
                             f'<link href="{feed_url}" /></entry>')
                return Response(200, truncated, self.response_headers(path))
            dated = [article for article in self.public_manifest['articles']
                     if article.get('indexable', True) and article.get('published_on')]
            if self.overrides.get('missing_feed_entry'):
                dated = []
            omitted_path = self.overrides.get('missing_feed_entry_path')
            if omitted_path:
                dated = [article for article in dated if article['url'] != omitted_path]
            entries = []
            for article in dated:
                feed_url = self.overrides.get('feed_url', f'https://www.sulemanji.com{article["url"]}')
                entries.append(
                    f'<entry><id>{feed_url}</id><title>{article.get("title", "Article")}</title>'
                    f'<published>{article["published_on"]}T00:00:00Z</published>'
                    f'<link href="{feed_url}" /></entry>'
                )
            body = ('<feed xmlns="http://www.w3.org/2005/Atom"><title>Writing</title>'
                    '<id>https://www.sulemanji.com/feed.xml</id><updated>2026-11-20T00:00:00Z</updated>'
                    + ''.join(entries) + '</feed>')
            return Response(200, body, self.response_headers(path))
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
        expected_heading = REQUIRED_ROUTE_CONTRACTS[path][1] or 'page'
        heading = 'wrong content' if self.overrides.get('wrong_page_heading') == path else expected_heading
        if path != '/writing':
            body_content = '' if self.overrides.get('alter_page_content') == path else f'<p>Public section for {path}.</p>'
        return (f'<html><head><title>{expected_heading} | Suleman Manji</title>'
                f'<link rel="canonical" href="{CANONICAL_ORIGIN}{path}">'
                f'<meta name="description" content="{description}">'
                f'<meta property="og:title" content="{expected_heading}"></head>'
                f'<body><main><h1>{heading}</h1>{body_content}</main></body></html>')

    def article_html(self, article):
        date = article['published_on']
        time = f'<time data-published-on datetime="{date}"></time>' if date else ''
        body = 'Altered article body.' if self.overrides.get('alter_article_body') else ARTICLE_BODY
        title = 'Changed title | Suleman Manji' if self.overrides.get('alter_article_metadata') else article['title']
        description = 'Changed description' if self.overrides.get('alter_article_metadata') else article['description']
        og_title = 'Changed social title' if self.overrides.get('alter_article_metadata') else article['og_title']
        heading = 'Changed heading' if self.overrides.get('alter_article_metadata') else article['h1']
        robots = f'<meta name="robots" content="{article["robots"]}">' if article.get('robots') else ''
        return (f'<html><head><title>{title}</title>'
                f'<link rel="canonical" href="{article["canonical"]}">'
                f'<meta name="description" content="{description}">'
                f'<meta property="og:title" content="{og_title}">{robots}</head>'
                f'<body><main><h1>{heading}</h1><div data-writing-body>{body}</div>{time}</main></body></html>')

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

    def verify(self, expected_manifest=None, base_url='https://www.sulemanji.com', staging=False):
        return verify_live_release(
            base_url=base_url,
            expected_commit=COMMIT,
            expected_manifest=expected_manifest or self.expected_manifest,
            fetcher=self.fetch,
            staging=staging,
        )

    def test_wrong_origin_fails(self):
        with self.assertRaisesRegex(LiveReleaseError, 'canonical origin'):
            self.verify(base_url='https://example.invalid', staging=False)
        self.assertEqual(self.calls, [])

    def test_staging_origin_is_verified_without_reading_production_host(self):
        staging_origin = 'https://sulemanji-site-staging.preview.workers.dev'
        try:
            receipt = self.verify(base_url=staging_origin, staging=True)
        except (TypeError, LiveReleaseError) as error:
            self.fail(f'isolated staging release should pass its configured readback: {error}')
        self.assertEqual(receipt['article_count'], 1)
        self.assertTrue(self.calls)
        self.assertTrue(all(urlparse(url).netloc == urlparse(staging_origin).netloc for url in self.calls))
        self.assertEqual(receipt['checked_response_count'], 25)

    def test_staging_mode_rejects_canonical_production_origin(self):
        for origin in (CANONICAL_ORIGIN, 'https://www.sulemanji.com:443', 'https://sulemanji.com:443'):
            with self.subTest(origin=origin):
                try:
                    self.verify(base_url=origin, staging=True)
                except TypeError as error:
                    self.fail(f'staging mode must reject a production origin through release validation: {error}')
                except LiveReleaseError as error:
                    self.assertIn('staging origin', str(error))
                else:
                    self.fail('staging mode accepted the production origin')
                self.assertEqual(self.calls, [])

    def test_wrong_revision_fails(self):
        self.public_manifest = site_manifest('c' * 40)
        with self.assertRaisesRegex(LiveReleaseError, 'source commit'):
            self.verify()

    def test_modified_live_manifest_is_rejected_even_when_digest_field_is_unchanged(self):
        self.public_manifest['pages'][0]['content_sha256'] = '0' * 64
        with self.assertRaisesRegex(LiveReleaseError, 'manifest does not match the qualified artifact'):
            self.verify()

    def test_build_timestamp_must_match_static_identity_headers(self):
        self.overrides['wrong_built_at'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'build timestamp header'):
            self.verify()

    def test_missing_writing_entry_fails(self):
        self.overrides['missing_writing_entry'] = True
        for manifest in (self.expected_manifest, self.public_manifest):
            writing_page = next(page for page in manifest['pages'] if page['url'] == '/writing')
            writing_page['content_sha256'] = page_content_sha256(self.page_html('/writing'))
        with self.assertRaisesRegex(LiveReleaseError, 'Writing index'):
            self.verify()

    def test_legacy_article_remains_discoverable_without_an_invented_date(self):
        self.expected_manifest = site_manifest(articles=[ARTICLE, LEGACY_ARTICLE])
        self.public_manifest = json.loads(json.dumps(self.expected_manifest))
        receipt = self.verify()
        self.assertEqual(receipt['article_count'], 2)
        self.assertIn('https://www.sulemanji.com/notes/agent-safety', self.calls)

    def test_article_visible_body_must_match_release_manifest(self):
        self.overrides['alter_article_body'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'article visible body changed'):
            self.verify()

    def test_checked_response_count_includes_supplemental_checks(self):
        receipt = self.verify()
        self.assertEqual(receipt['checked_response_count'], 26)

    def test_invalid_artifact_digest_fails_before_live_requests(self):
        invalid_manifest = json.loads(json.dumps(self.expected_manifest))
        invalid_manifest['asset_digest'] = 'not-a-digest'
        with self.assertRaisesRegex(LiveReleaseError, 'qualified artifact asset digest'):
            self.verify(expected_manifest=invalid_manifest)
        self.assertEqual(self.calls, [])

    def test_required_route_mime_is_verified(self):
        self.overrides['wrong_mime'] = '/about/'
        with self.assertRaisesRegex(LiveReleaseError, 'content type on /about/'):
            self.verify()

    def test_required_route_checks_expected_page_content(self):
        self.overrides['wrong_page_heading'] = '/about/'
        with self.assertRaisesRegex(LiveReleaseError, 'expected page content is missing on /about/'):
            self.verify()

    def test_required_route_checks_manifest_bound_page_body_content(self):
        self.overrides['alter_page_content'] = '/about/'
        with self.assertRaisesRegex(LiveReleaseError, 'page visible body changed on /about/'):
            self.verify()

    def test_required_route_checks_page_metadata(self):
        self.overrides['missing_page_description'] = '/contact/'
        with self.assertRaisesRegex(LiveReleaseError, 'page metadata does not match the qualified artifact for /contact/'):
            self.verify()

    def test_article_metadata_must_match_the_qualified_artifact(self):
        self.overrides['alter_article_metadata'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'article metadata does not match the qualified artifact'):
            self.verify()

    def test_noindex_article_remains_served_but_stays_out_of_discovery(self):
        self.expected_manifest = site_manifest(articles=[ARTICLE, NOINDEX_ARTICLE])
        self.public_manifest = json.loads(json.dumps(self.expected_manifest))
        try:
            receipt = self.verify()
        except LiveReleaseError as error:
            self.fail(f'valid noindex article should remain available without blocking release: {error}')
        self.assertEqual(receipt['article_count'], 2)
        noindex_url = 'https://www.sulemanji.com' + NOINDEX_ARTICLE['url']
        self.assertIn(noindex_url, self.calls)

    def test_all_configured_business_retirement_redirects_are_verified(self):
        self.verify()
        for rule in SITE_ROUTE_RULES:
            if rule['source'].startswith('/work-with-me'):
                route_url = 'https://www.sulemanji.com' + rule['source']
                self.assertIn(route_url, self.calls)

    def test_wrong_business_retirement_redirect_target_fails(self):
        self.overrides['route_location:/work-with-me/quote'] = 'https://www.sulemanji.com/work-with-me/quote'
        with self.assertRaisesRegex(LiveReleaseError, 'route disposition'):
            self.verify()

    def test_truncated_atom_feed_fails_even_when_article_link_is_present(self):
        self.overrides['malformed_feed'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'Atom feed'):
            self.verify()

    def test_truncated_sitemap_fails_even_when_article_location_is_present(self):
        self.overrides['malformed_sitemap'] = True
        with self.assertRaisesRegex(LiveReleaseError, 'sitemap XML'):
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
        with self.assertRaisesRegex(LiveReleaseError, 'Atom feed'):
            self.verify()

    def test_feed_must_include_older_dated_articles(self):
        older = {**ARTICLE, 'url': '/notes/older-article', 'canonical': f'{CANONICAL_ORIGIN}/notes/older-article',
                 'published_on': '2026-11-01'}
        self.expected_manifest = site_manifest(articles=[older, ARTICLE])
        self.public_manifest = json.loads(json.dumps(self.expected_manifest))
        self.overrides['missing_feed_entry_path'] = older['url']
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

        manifest = json.loads((site / 'release.json').read_text(encoding='utf-8'))
        for path, (_, expected_heading) in REQUIRED_ROUTE_CONTRACTS.items():
            if expected_heading is None:
                continue
            output = page_file(path)
            self.assertIsNotNone(output, f'built page is missing for {path}')
            facts = PageIdentity()
            facts.feed(output.read_text(encoding='utf-8'))
            self.assertEqual(facts.canonical, CANONICAL_ORIGIN + path, path)
            page = next(page for page in manifest['pages'] if page['url'] == path)
            self.assertEqual(facts.canonical, page['canonical'], path)
            self.assertEqual(facts.title, page['title'], path)
            self.assertEqual(facts.meta.get('description'), page['description'], path)
            self.assertEqual(facts.meta.get('og:title'), page['og_title'], path)
            self.assertIn(expected_heading, facts.headings, path)
            self.assertEqual(page_content_sha256(output.read_text(encoding='utf-8')), page['content_sha256'], path)

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
