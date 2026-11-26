import json
import re
import tempfile
import unittest
from pathlib import Path

from scripts.build_site_manifest import build_manifest
from scripts.site_release import ReleaseError, verify_artifact

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / '.github' / 'workflows' / 'jekyll.yml'


class CloudflareReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding='utf-8')
        cls.config = (ROOT / '_config.yml').read_text(encoding='utf-8')
        cls.production_config = (ROOT / 'cloudflare' / 'wrangler.site.jsonc').read_text(encoding='utf-8')
        cls.release_check = (ROOT / 'scripts' / 'check_site_release.sh').read_text(encoding='utf-8') if (ROOT / 'scripts' / 'check_site_release.sh').exists() else ''

    def test_pull_request_has_no_production_deploy(self):
        match = re.search(r'^  deploy-cloudflare:\n(?P<body>.*?)(?=^  [a-zA-Z_-]+:|\Z)', self.workflow, re.M | re.S)
        self.assertIsNotNone(match, 'production Cloudflare deployment job is required')
        body = match.group('body')
        self.assertIn("github.event_name == 'push'", body)
        self.assertIn("github.ref == 'refs/heads/main'", body)
        self.assertNotIn('pull_request', body)

    def test_fork_has_no_deploy_secret(self):
        match = re.search(r'^  deploy-cloudflare:\n(?P<body>.*?)(?=^  [a-zA-Z_-]+:|\Z)', self.workflow, re.M | re.S)
        self.assertIsNotNone(match)
        body = match.group('body')
        self.assertIn("github.repository == 'ssmanji89/sulemanji-port'", body)
        self.assertIn('secrets.CLOUDFLARE_API_TOKEN', body)
        build = self.workflow.split('  deploy-cloudflare:', 1)[0]
        self.assertNotIn('secrets.CLOUDFLARE_API_TOKEN', build)

    def test_stale_artifact_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'writing.html').write_text('<h1>site</h1>', encoding='utf-8')
            articles = [{'url': '/notes/a', 'published_on': '2024-01-01'}]
            manifest = build_manifest(root, '1111111', articles, '2026-11-26T00:00:00Z')
            (root / 'release.json').write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ReleaseError, 'current main'):
                verify_artifact(root, '1111111', '2222222')

    def test_wrong_artifact_digest_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'writing.html').write_text('<h1>site</h1>', encoding='utf-8')
            manifest = build_manifest(root, '1111111', [], '2026-11-26T00:00:00Z')
            manifest['asset_digest'] = 'sha256:' + ('0' * 64)
            (root / 'release.json').write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ReleaseError, 'digest'):
                verify_artifact(root, '1111111', '1111111')

    def test_operational_docs_and_test_code_stay_out_of_public_build(self):
        for excluded in ('  - cloudflare/', '  - tests/', '  - test-results/', '  - docs/'):
            self.assertIn(excluded, self.config)
        site = ROOT / '_site'
        if site.is_dir():
            for private in ('cloudflare', 'docs', 'tests', 'test-results', 'AGENTS.md'):
                self.assertFalse((site / private).exists(), f'{private} leaked into _site')

    def test_current_worker_checks_remain(self):
        for command in ('npm ci --prefix worker', 'npm run check --prefix worker', 'verify_public_safety.py'):
            self.assertIn(command, self.release_check or self.workflow)

    def test_production_uses_the_existing_www_route_without_changing_dns(self):
        config = json.loads(self.production_config)
        self.assertEqual([route['pattern'] for route in config['routes']], ['www.sulemanji.com/*'])
        self.assertEqual(config['routes'][0]['zone_name'], 'sulemanji.com')
        self.assertNotIn('custom_domain', self.production_config)


if __name__ == '__main__':
    unittest.main()
