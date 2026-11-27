import json
import re
import threading
import tempfile
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from scripts.build_site_manifest import article_content_sha256, build_manifest, render_release_headers
from scripts.verify_cloudflare_deployment import verify_deployment
from scripts.site_release import ReleaseError, fetch_public_manifest, verify_artifact

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / '.github' / 'workflows' / 'jekyll.yml'


def add_article(root):
    notes = root / 'notes'
    notes.mkdir(exist_ok=True)
    rendered = ('<html><head><link rel="canonical" href="https://www.sulemanji.com/notes/a"></head>'
                '<body><h1>Known title</h1><time data-published-on datetime="2024-01-01"></time>'
                '<div data-writing-body>Known content.</div></body></html>')
    (notes / 'a.html').write_text(rendered, encoding='utf-8')
    return [{
        'url': '/notes/a',
        'published_on': '2024-01-01',
        'content_sha256': article_content_sha256(rendered),
    }]


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
            manifest = build_manifest(root, '1111111', [], '2026-11-26T00:00:00Z')
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

    def test_artifact_requires_manifest_bound_static_identity_headers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'writing.html').write_text('<h1>site</h1>', encoding='utf-8')
            articles = add_article(root)
            manifest = build_manifest(root, '1111111', articles, '2026-11-26T00:00:00Z')
            (root / 'release.json').write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ReleaseError, 'identity headers'):
                verify_artifact(root, '1111111', '1111111')

    def test_article_body_change_is_rejected_even_if_release_header_remains(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            articles = add_article(root)
            articles[0]['content_sha256'] = article_content_sha256('<div data-writing-body>Changed content.</div>')
            manifest = build_manifest(root, '1111111', articles, '2026-11-26T00:00:00Z')
            (root / 'release.json').write_text(json.dumps(manifest), encoding='utf-8')
            (root / '_headers').write_text(render_release_headers(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ReleaseError, 'article identity or visible content'):
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

    def test_public_manifest_readback_uses_curl_transport(self):
        deploy = (ROOT / 'scripts' / 'deploy_site.sh').read_text(encoding='utf-8')
        self.assertIn('fetch_public_manifest', deploy)
        self.assertNotIn('urllib.request.urlopen', deploy)

    def test_public_manifest_fetch_uses_cloudflare_accepted_curl_user_agent(self):
        payload = b'{"source_commit":"a"}'

        class CurlOnlyHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.server.user_agent = self.headers.get('User-Agent', '')
                if not self.server.user_agent.startswith('curl/'):
                    self.send_response(403)
                    self.end_headers()
                    return
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, _format, *_args):
                pass

        server = HTTPServer(('127.0.0.1', 0), CurlOnlyHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            manifest = fetch_public_manifest(f'http://127.0.0.1:{server.server_port}/release.json')
            self.assertEqual(manifest, {'source_commit': 'a'})
            self.assertTrue(server.user_agent.startswith('curl/'))
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()

    def test_production_uses_the_existing_www_route_without_changing_dns(self):
        config = json.loads(self.production_config)
        self.assertEqual([route['pattern'] for route in config['routes']], ['www.sulemanji.com/*'])
        self.assertEqual(config['routes'][0]['zone_name'], 'sulemanji.com')
        self.assertNotIn('custom_domain', self.production_config)

    def test_worker_deployment_readback_selects_newest_timestamp(self):
        expected_message = 'site ' + ('a' * 40)
        payload = [
            {'created_on': '2026-11-26T23:00:00Z', 'annotations': {'workers/message': 'site stale'},
             'versions': [{'version_id': 'old-version', 'percentage': 100}]},
            {'created_on': '2026-11-27T00:00:00Z', 'annotations': {'workers/message': expected_message},
             'versions': [{'version_id': 'new-version', 'percentage': 100}]},
        ]
        self.assertEqual(verify_deployment(payload, expected_message), 'new-version')
        payload[1]['annotations']['workers/message'] = 'site stale'
        with self.assertRaisesRegex(ValueError, 'latest deployment source'):
            verify_deployment(payload, expected_message)


if __name__ == '__main__':
    unittest.main()
