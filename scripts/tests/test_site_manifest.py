import json
import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scripts.build_site_manifest import PUBLIC_PAGE_FILES, article_content_sha256, build_article_citation_index, build_manifest, page_content_sha256, render_release_headers


class SiteManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for route, relative_path in PUBLIC_PAGE_FILES.items():
            page = self.root / relative_path
            page.parent.mkdir(parents=True, exist_ok=True)
            page.write_text(
                f'<html><head><title>{route} | Suleman Manji</title>'
                f'<link rel="canonical" href="https://www.sulemanji.com{route}">'
                f'<meta name="description" content="Description for {route}">'
                f'<meta property="og:title" content="{route}"></head>'
                f'<main><h1>{route}</h1><p>Page content for {route}.</p></main></html>', encoding='utf-8')
        (self.root / 'writing').mkdir()
        (self.root / 'assets').mkdir()
        (self.root / 'writing' / 'notes.html').write_text(
            '<h1>Research note</h1><div data-writing-body><p>Research article.</p></div>', encoding='utf-8')
        (self.root / 'assets' / 'app-a1.js').write_text('const current = true;', encoding='utf-8')
        self.baseline = [{
            'url': '/writing/notes', 'published_on': '2024-03-10',
            'content_sha256': hashlib.sha256(b'Research article.').hexdigest(),
            'canonical': 'https://www.sulemanji.com/writing/notes', 'title': 'Research note',
            'description': 'Research note description', 'og_title': 'Research note',
            'h1': 'Research note', 'robots': '', 'indexable': True,
        }]

    def tearDown(self):
        self.temp.cleanup()

    def test_preserves_article_identity_and_tracks_immutable_assets(self):
        first = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertEqual(first['articles'], self.baseline)
        self.assertIn('assets/app-a1.js', first['files'])
        (self.root / 'assets' / 'app-a1.js').write_text('const current = false;', encoding='utf-8')
        second = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertNotEqual(first['asset_digest'], second['asset_digest'])

    def test_release_cli_preserves_baseline_while_including_a_new_note(self):
        notes = self.root / 'notes'
        notes.mkdir()
        for slug in ('preserved', 'new'):
            (notes / f'{slug}.html').write_text(
                f'<link rel="canonical" href="https://www.sulemanji.com/notes/{slug}">'
                f'<title>{slug}</title><meta name="description" content="A note">'
                f'<meta property="og:title" content="{slug}"><h1>{slug}</h1>'
                '<time data-published-on datetime="2026-11-26"></time>'
                '<div data-writing-body><p>Rendered article.</p></div>', encoding='utf-8')
        with tempfile.TemporaryDirectory() as temp:
            baseline = Path(temp) / 'baseline.json'
            command = [sys.executable, 'scripts/build_site_manifest.py', '--allow-dirty',
                       '--site-root', str(self.root), '--baseline', str(baseline)]
            baseline.write_text(json.dumps({'articles': [{'url': '/notes/preserved', 'published_on': '2026-11-26'}]}))
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = json.loads((self.root / 'release.json').read_text())
            self.assertEqual({a['url'] for a in manifest['articles']}, {'/notes/preserved', '/notes/new'})

            for url, date in (('/notes/missing', '2026-11-26'), ('/notes/preserved', '2026-11-25')):
                with self.subTest(url=url, date=date):
                    baseline.write_text(json.dumps({'articles': [{'url': url, 'published_on': date}]}))
                    rejected = subprocess.run(command, capture_output=True, text=True)
                    self.assertNotEqual(rejected.returncode, 0)
                    self.assertIn('differ from the approved baseline', rejected.stderr)

    def test_public_manifest_excludes_private_paths_and_secret_values(self):
        result = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        serialized = json.dumps(result).lower()
        self.assertNotIn('/users/', serialized)
        self.assertNotIn('api_key', serialized)
        self.assertNotIn('private', serialized)

    def test_release_headers_bind_static_assets_to_manifest_identity(self):
        result = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        headers = render_release_headers(result)
        self.assertEqual(headers, (
            '/*\n'
            '  X-Site-Source-Commit: abc1234\n'
            f'  X-Site-Asset-Digest: {result["asset_digest"]}\n'
            '  X-Site-Built-At: 2026-11-26T00:00:00Z\n'
        ))
        (self.root / '_headers').write_text(headers, encoding='utf-8')
        changed = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertEqual(changed['asset_digest'], result['asset_digest'])

    def test_article_text_digest_matches_normalized_publisher_text(self):
        rendered = ('<main><div data-writing-body>One <strong>two</strong>'
                    '<script>hidden words</script><template>also hidden</template> three&nbsp;four</div></main>')
        expected = hashlib.sha256(b'One two three four').hexdigest()
        self.assertEqual(article_content_sha256(rendered), expected)

    def test_article_text_digest_requires_one_nonempty_body(self):
        with self.assertRaisesRegex(ValueError, 'one nonempty visible content region'):
            article_content_sha256('<main><p>Not inside the writing body</p></main>')

    def test_article_citation_index_reads_only_public_writing_body_links(self):
        notes = self.root / 'notes'
        notes.mkdir(exist_ok=True)
        (notes / 'cited.html').write_text(
            '<a href="https://example.org/navigation">Outside</a>'
            '<div data-writing-body><p>Evidence <a href="https://docs.example.org/?a=1&amp;b=2#policy">Policy</a>'
            ' <a href="https://docs.example.org/?a=1&amp;b=2#policy">Same</a>'
            ' <a href="https://user:pass@example.org/private">Credentials</a>'
            ' <a href="https://@example.org/empty-userinfo">Empty userinfo</a>'
            ' <a href="https://example.org:65536/invalid-port">Invalid port</a>'
            ' <a href="/notes/related">Internal</a>'
            ' <img src="https://example.org/not-a-citation"></p>'
            '<template><a href="https://example.org/not-visible">Hidden</a></template></div>',
            encoding='utf-8',
        )
        articles = [{'url': '/notes/cited', 'indexable': True}, {'url': '/notes/hidden', 'indexable': False}]
        self.assertEqual(build_article_citation_index(self.root, articles),
                         {'/notes/cited': ['https://docs.example.org/?a=1&b=2#policy']})

    def test_key_page_content_is_manifest_bound(self):
        first = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertEqual({page['url'] for page in first['pages']}, set(PUBLIC_PAGE_FILES))
        expected = page_content_sha256((self.root / PUBLIC_PAGE_FILES['/']).read_text(encoding='utf-8'))
        page = next(page for page in first['pages'] if page['url'] == '/')
        self.assertEqual(page['content_sha256'], expected)
        self.assertEqual(page['title'], '/ | Suleman Manji')
        self.assertEqual(page['canonical'], 'https://www.sulemanji.com/')

    def test_asset_digest_binds_article_content_identity(self):
        first = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        changed_article = [{**self.baseline[0], 'content_sha256': 'c' * 64}]
        second = build_manifest(self.root, 'abc1234', changed_article, built_at='2026-11-26T00:00:00Z')
        self.assertNotEqual(first['asset_digest'], second['asset_digest'])


if __name__ == '__main__':
    unittest.main()
