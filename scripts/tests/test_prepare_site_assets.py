import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_site_manifest import build_manifest, render_release_headers
from scripts.prepare_site_assets import prepare_release, retain_live_assets, verify_prepared_assets, verify_promotion
from scripts.site_release import ReleaseError, verify_artifact
from scripts.tests.test_cloudflare_release import add_article, add_public_pages
from scripts.version_site_assets import ASSET_DIRECTORY, version_assets


class PrepareSiteAssetsTest(unittest.TestCase):
    def release(self, path, commit, script, versioned):
        path.mkdir()
        add_public_pages(path)
        articles = add_article(path)
        js = path / 'assets/js'
        js.mkdir(parents=True)
        (js / 'main.js').write_text(script)
        with (path / 'index.html').open('a', encoding='utf-8') as page:
            page.write('<script src="/assets/js/main.js"></script>')
        if versioned:
            version_assets(path)
        manifest = build_manifest(path, commit, articles, '2026-11-28T06:00:00Z')
        (path / 'release.json').write_text(json.dumps(manifest))
        (path / '_headers').write_text(render_release_headers(manifest))
        return manifest

    def test_prepares_exact_live_html_and_preserves_legacy_asset_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            prior, candidate, output = [root / name for name in ('prior', 'candidate', 'output')]
            active = self.release(prior, '1' * 40, 'console.log("old");', versioned=False)
            future = self.release(candidate, '2' * 40, 'console.log("new");', versioned=True)
            plan = prepare_release(prior, candidate, output, active, '2' * 40)
            self.assertEqual((output / 'prepare/index.html').read_bytes(), (prior / 'index.html').read_bytes())
            self.assertEqual((output / 'prepare/release.json').read_bytes(), (prior / 'release.json').read_bytes())
            self.assertIn('immutable', (output / 'prepare/_headers').read_text())
            self.assertEqual((output / 'promote/index.html').read_bytes(), (candidate / 'index.html').read_bytes())
            self.assertEqual((output / 'promote/assets/js/main.js').read_bytes(), (prior / 'assets/js/main.js').read_bytes())
            manifest = verify_artifact(output / 'promote', '2' * 40, '2' * 40)
            assets = {path: digest for path, digest in future['files'].items() if path.startswith(f'{ASSET_DIRECTORY}/')}
            self.assertEqual(plan['required_assets'], assets)
            for path in assets:
                self.assertEqual((output / 'prepare' / path).read_bytes(), (output / 'promote' / path).read_bytes())
            self.assertEqual(manifest['articles'], active['articles'])

    def test_carries_previous_namespace_and_rejects_a_mismatched_live_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            prior, candidate, output = [root / name for name in ('prior', 'candidate', 'output')]
            active = self.release(prior, '1' * 40, 'console.log("old");', versioned=True)
            self.release(candidate, '2' * 40, 'console.log("new");', versioned=True)
            with self.assertRaisesRegex(ReleaseError, 'live release'):
                prepare_release(prior, candidate, output, {**active, 'built_at': '2026-11-28T07:00:00Z'}, '2' * 40)
            self.assertFalse(output.exists())
            plan = prepare_release(prior, candidate, output, active, '2' * 40)
            self.assertEqual(len(plan['required_assets']), 2)
            for path in plan['required_assets']:
                self.assertEqual((output / 'prepare' / path).read_bytes(), (output / 'promote' / path).read_bytes())
            verify_artifact(output / 'promote', '2' * 40, '2' * 40)

    def test_readback_requires_exact_bytes_and_immutable_cache_header(self):
        path = f'{ASSET_DIRECTORY}/{"1" * 64}/assets/js/main.js'
        body = b'console.log("exact");'
        digest = hashlib.sha256(body).hexdigest()
        cache = 'public, max-age=31536000, immutable'
        self.assertEqual(
            verify_prepared_assets({path: digest}, read_asset=lambda *_: (body, cache, 'ray-DFW')),
            [{'path': '/' + path, 'sha256': digest, 'cf_ray': 'ray-DFW'}],
        )
        for observed in [(b'incorrect', cache, 'ray-DFW'), (body, 'max-age=0', 'ray-DFW')]:
            with self.assertRaisesRegex(ReleaseError, 'did not match'):
                verify_prepared_assets({path: digest}, read_asset=lambda *_: observed)

    def test_promotion_requires_retaining_all_live_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            prior, candidate = root / 'prior', root / 'candidate'
            active = self.release(prior, '1' * 40, 'console.log("old");', versioned=True)
            future = self.release(candidate, '2' * 40, 'console.log("new");', versioned=True)
            cache = 'public, max-age=31536000, immutable'

            def read_asset(path, _):
                artifact = prior if (prior / path).exists() else candidate
                return (artifact / path).read_bytes(), cache, 'ray-DFW'

            with self.assertRaisesRegex(ReleaseError, 'omits a live immutable asset'):
                verify_promotion(future, active, read_asset=read_asset)
            self.assertEqual(retain_live_assets(candidate, active, read_asset=read_asset), 1)
            compatible = build_manifest(candidate, future['source_commit'], future['articles'])
            self.assertEqual(len(verify_promotion(compatible, active, read_asset=read_asset)), 2)
