import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_site_manifest import build_manifest, render_release_headers


class SiteManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'writing').mkdir()
        (self.root / 'assets').mkdir()
        (self.root / 'writing' / 'notes.html').write_text('<h1>Research note</h1>', encoding='utf-8')
        (self.root / 'assets' / 'app-a1.js').write_text('const current = true;', encoding='utf-8')
        self.baseline = [{'url': '/writing/notes', 'published_on': '2024-03-10'}]

    def tearDown(self):
        self.temp.cleanup()

    def test_preserves_article_identity_and_tracks_immutable_assets(self):
        first = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertEqual(first['articles'], self.baseline)
        self.assertIn('assets/app-a1.js', first['files'])
        (self.root / 'assets' / 'app-a1.js').write_text('const current = false;', encoding='utf-8')
        second = build_manifest(self.root, 'abc1234', self.baseline, built_at='2026-11-26T00:00:00Z')
        self.assertNotEqual(first['asset_digest'], second['asset_digest'])

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


if __name__ == '__main__':
    unittest.main()
