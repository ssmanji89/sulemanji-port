import json
import tempfile
import unittest
from pathlib import Path

from scripts.verify_redevelopment import verify_site


class RedevelopmentAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.site = self.root / 'site'
        self.site.mkdir()
        self.baseline = self.root / 'baseline.json'
        self.article = {'url': '/notes/example', 'published_on': '2026-11-01'}
        self.baseline.write_text(json.dumps({'articles': [self.article]}), encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def put(self, route: str, content: str):
        target = self.site / route.strip('/') / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')

    def build_minimum_candidate(self):
        routes = ['/', '/explore/', '/writing/', '/about/', '/experience/', '/contact/', '/work/market-systems/', '/work/integrations/', '/work/mathematical-verification/', '/notes/example/']
        for route in routes:
            self.put(route, '<html><head><title>Page</title></head><body><main><h1>Page</h1></main></body></html>')
        self.put('/notes/example/', '<html><head><link rel="canonical" href="https://www.sulemanji.com/notes/example"></head><body><main><h1>Example</h1><time data-published-on datetime="2026-11-01">Nov 1</time></main></body></html>')
        (self.site / 'writing' / 'index.html').write_text('<html><body><main><a href="/notes/example">Example</a></main></body></html>', encoding='utf-8')
        (self.site / 'feed.xml').write_text('<rss><link>https://www.sulemanji.com/notes/example</link></rss>', encoding='utf-8')
        (self.site / 'sitemap.xml').write_text('<urlset><loc>https://www.sulemanji.com/notes/example</loc></urlset>', encoding='utf-8')

    def test_candidate_requires_surfaces_and_article_discovery_evidence(self):
        self.build_minimum_candidate()
        self.assertEqual(verify_site(self.site, self.baseline), [])

    def test_homepage_only_and_operational_document_do_not_qualify(self):
        self.put('/', '<html><body><main><h1>Home</h1></main></body></html>')
        (self.site / 'OPERATIONS.md').write_text('private runbook', encoding='utf-8')
        issues = verify_site(self.site, self.baseline)
        self.assertTrue(any(issue.startswith('missing surface:') for issue in issues))
        self.assertTrue(any(issue.startswith('article identity:') for issue in issues))
        self.assertTrue(any(issue.startswith('excluded operational file:') for issue in issues))


if __name__ == '__main__':
    unittest.main()
