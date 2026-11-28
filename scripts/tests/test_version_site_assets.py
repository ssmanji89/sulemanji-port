import tempfile
import unittest
from pathlib import Path

from scripts.version_site_assets import ASSET_DIRECTORY, version_assets, verify_versioned_assets


class SiteAssetVersionTest(unittest.TestCase):
    def build(self, root, script='console.log("one");', image=b'image bytes'):
        (root / 'assets/css').mkdir(parents=True)
        (root / 'assets/js').mkdir()
        (root / 'images').mkdir()
        (root / 'images/grid.svg').write_bytes(image)
        (root / 'images/unused.svg').write_bytes(b'unused')
        (root / 'assets/css/site.css').write_text('@import "tokens.css";\n')
        (root / 'assets/css/tokens.css').write_text('div { background: url(/images/grid.svg#layer) }')
        (root / 'assets/js/main.js').write_text(script)
        (root / 'index.html').write_text(
            '<link rel="stylesheet" href="/assets/css/site.css"/>\n'
            '<script defer src="/assets/js/main.js?lang=en&amp;mode=light"></script>\n'
            '<script src="https://third.example/assets/js/main.js"></script>\n'
            '<a href="/assets/js/main.js">Source</a>\n'
        )

    def test_hashes_emitted_assets_rewrites_html_and_keeps_dependencies(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root)
            digest = version_assets(root)
            bundle = root / ASSET_DIRECTORY / digest
            html = (root / 'index.html').read_text()
            prefix = f'/{ASSET_DIRECTORY}/{digest}'
            self.assertIn(f'href="{prefix}/assets/css/site.css"', html)
            self.assertIn(f'src="{prefix}/assets/js/main.js?lang=en&amp;mode=light"', html)
            self.assertIn('src="https://third.example/assets/js/main.js"', html)
            self.assertIn('<a href="/assets/js/main.js">Source</a>', html)
            self.assertIn('url(../../images/grid.svg#layer)', (bundle / 'assets/css/tokens.css').read_text())
            self.assertEqual((bundle / 'images/grid.svg').read_bytes(), b'image bytes')
            self.assertFalse((bundle / 'images/unused.svg').exists())
            verify_versioned_assets(root)
            (bundle / 'images/grid.svg').write_bytes(b'different')
            with self.assertRaisesRegex(ValueError, 'digest'):
                verify_versioned_assets(root)

    def test_retention_keeps_exact_prior_bytes_after_a_dependency_change(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            prior, identical, current = (base / name for name in ('prior', 'identical', 'current'))
            self.build(prior)
            self.build(identical)
            self.build(current, image=b'revised image')
            first = version_assets(prior)
            self.assertEqual(version_assets(identical), first)
            second = version_assets(current, retain_from=prior)
            self.assertNotEqual(first, second)
            self.assertEqual((current / ASSET_DIRECTORY / first / 'images/grid.svg').read_bytes(), b'image bytes')
            self.assertEqual((current / ASSET_DIRECTORY / second / 'images/grid.svg').read_bytes(), b'revised image')
            verify_versioned_assets(current)

    def test_rejects_missing_transitive_input_before_rewriting_html(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root)
            (root / 'images/grid.svg').unlink()
            with self.assertRaisesRegex(ValueError, 'images/grid.svg'):
                version_assets(root)
            self.assertIn('href="/assets/css/site.css"', (root / 'index.html').read_text())

    def test_keeps_url_form_import_and_rebases_root_clamped_dependencies(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root)
            (root / 'assets/css/site.css').write_text('@import url("tokens.css") screen;')
            (root / 'assets/css/tokens.css').write_text('div { background: url(../../../../images/grid.svg) }')
            bundle = root / ASSET_DIRECTORY / version_assets(root)
            self.assertEqual((bundle / 'assets/css/site.css').read_text(), '@import url("tokens.css") screen;')
            self.assertIn('url(../../images/grid.svg)', (bundle / 'assets/css/tokens.css').read_text())

    def test_rejects_symlinked_html_before_rewriting_any_page(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            root = base / 'site'
            self.build(root)
            external = base / 'external.html'
            original = '<script src="/assets/js/main.js"></script>'
            external.write_text(original)
            (root / 'outside.html').symlink_to(external)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                version_assets(root)
            self.assertEqual(external.read_text(), original)
            self.assertFalse((root / ASSET_DIRECTORY).exists())

    def test_versions_relative_and_same_site_absolute_entrypoints(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root)
            (root / 'projects').mkdir()
            page = root / 'projects/index.html'
            page.write_text(
                '<script src="../assets/js/main.js"></script>'
                '<link rel="stylesheet" href="https://www.sulemanji.com/assets/css/site.css">'
            )
            prefix = f'/{ASSET_DIRECTORY}/{version_assets(root)}'
            self.assertIn(f'src="{prefix}/assets/js/main.js"', page.read_text())
            self.assertIn(f'href="{prefix}/assets/css/site.css"', page.read_text())

    def test_rejects_mutable_script_in_a_versioned_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root)
            version_assets(root)
            (root / 'other.html').write_text('<script src="/assets/js/main.js"></script>')
            with self.assertRaisesRegex(ValueError, 'other.html'):
                verify_versioned_assets(root)
