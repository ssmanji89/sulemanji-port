import datetime as dt
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts" / "verify_discovery.py"


def load_verifier():
    if not SCRIPT.is_file():
        return None
    spec = importlib.util.spec_from_file_location("verify_discovery", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DiscoveryVerifierTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.source = root / "source"
        self.site = root / "site"
        (self.source / "notes").mkdir(parents=True)
        (self.source / "_data").mkdir()
        self.site.mkdir()
        (self.source / "_data" / "writing.yml").write_text(
            "legacy_paths:\n  - notes/legacy.md\n", encoding="utf-8"
        )
        self.inventory("  - {id: home, class: core-profile, route: /}\n  - {id: about, class: core-profile, route: /about}\n")
        (self.source / "_data" / "crawler-policy.json").write_text(
            json.dumps(
                {
                    "default_access": "allow",
                    "content_signal": "search=yes,ai-train=no,use=reference",
                    "allowed_search_agents": ["OAI-SearchBot"],
                    "allowed_user_agents": ["ChatGPT-User"],
                    "restricted_agents": ["GPTBot"],
                }
            ),
            encoding="utf-8",
        )
        self.note("dated", published=True, published_on="2026-10-20")
        self.note("draft", published=False)
        self.note("legacy", legacy=True)

    def tearDown(self):
        self.tmp.cleanup()

    def inventory(self, pages):
        (self.source / "_data" / "discovery-pages.yml").write_text(
            "version: 1\npages:\n" + pages, encoding="utf-8"
        )

    def note(self, slug, published=False, published_on=None, legacy=False):
        lines = [
            "---",
            f"title: {slug.title()}",
            f"description: {slug} description",
            f"permalink: /notes/{slug}",
        ]
        if not legacy:
            lines.extend(["writing_schema: 2", f"published: {str(published).lower()}"])
            if published_on:
                lines.append(f'published_on: "{published_on}"')
        lines.extend(["---", "", "## Body", ""])
        (self.source / "notes" / f"{slug}.md").write_text("\n".join(lines), encoding="utf-8")

    def write_outputs(self, duplicate_feed=False):
        for path in ("index.html", "about.html", "notes/dated.html", "notes/legacy.html"):
            output = self.site / path
            output.parent.mkdir(parents=True, exist_ok=True)
            route = "/" if path == "index.html" else "/" + path.removesuffix(".html")
            output.write_text(
                f'<html><head><link rel="canonical" href="https://example.test/preview{route}">'
                '<link rel="alternate" type="application/atom+xml" href="https://example.test/preview/feed.xml">'
                '</head><body></body></html>',
                encoding="utf-8",
            )
        dated = "https://example.test/preview/notes/dated"
        entries = f"<entry><title> Dated </title><id>{dated}</id><link href=\"{dated}\"/><published>2026-10-20T00:00:00Z</published><updated>2026-10-20T00:00:00Z</updated></entry>"
        if duplicate_feed:
            entries += entries
        (self.site / "feed.xml").write_text(
            f'<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><updated>2026-10-20T00:00:00Z</updated>{entries}</feed>',
            encoding="utf-8",
        )
        (self.site / "sitemap.xml").write_text(
            '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f"<url><loc>{dated}</loc></url>"
            "<url><loc>https://example.test/preview/</loc></url>"
            "<url><loc>https://example.test/preview/about</loc></url>"
            "<url><loc>https://example.test/preview/notes/legacy</loc></url>"
            "</urlset>",
            encoding="utf-8",
        )
        (self.site / "writing.html").write_text(
            '<article data-writing-url="/notes/dated"></article>'
            '<article data-writing-legacy-url="/notes/legacy"></article>',
            encoding="utf-8",
        )
        (self.site / "robots.txt").write_text(
            "User-agent: *\nContent-Signal: search=yes,ai-train=no,use=reference\nAllow: /\n\n"
            "User-agent: GPTBot\nDisallow: /\n\n"
            "User-agent: OAI-SearchBot\nAllow: /\n\n"
            "User-agent: ChatGPT-User\nAllow: /\n\n",
            encoding="utf-8",
        )

    def test_verifier_requires_one_atom_link_on_every_discovery_page_and_article(self):
        self.write_outputs()
        for path in ("index.html", "about.html", "notes/dated.html", "notes/legacy.html"):
            output = self.site / path
            original = output.read_text(encoding="utf-8")
            link = '<link rel="alternate" type="application/atom+xml" href="https://example.test/preview/feed.xml">'
            for replacement in ("", link + link, link.replace("https://example.test/preview/feed.xml", "/feed.xml"), link.replace("example.test", "other.test")):
                with self.subTest(path=path, replacement=replacement):
                    output.write_text(original.replace(link, replacement), encoding="utf-8")
                    failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                    self.assertTrue(any("feed" in failure for failure in failures), failures)
            output.write_text(original, encoding="utf-8")

    def test_verifier_rejects_unknown_general_sitemap_urls_and_missing_local_targets(self):
        self.write_outputs()
        sitemap = self.site / "sitemap.xml"
        original = sitemap.read_text(encoding="utf-8")
        for url in ("https://other.test/preview/about", "https://example.test/preview/private-preview"):
            sitemap.write_text(original.replace("</urlset>", f"<url><loc>{url}</loc></url></urlset>"), encoding="utf-8")
            failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
            self.assertIn(f"sitemap: unexpected URL {url}", failures)
        sitemap.write_text(original, encoding="utf-8")
        home = self.site / "index.html"
        original = home.read_text(encoding="utf-8")
        home.write_text(original + '<a href="/preview/about?view=full#team">About</a>', encoding="utf-8")
        failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
        self.assertEqual([], failures)
        home.write_text(original + '<a href="/preview/projects">Projects</a>', encoding="utf-8")
        failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
        self.assertTrue(any("missing local target" in failure for failure in failures), failures)

    def test_verifier_rejects_invalid_canonicals_and_unsafe_links(self):
        self.write_outputs()
        home = self.site / "index.html"
        original = home.read_text(encoding="utf-8")
        canonical = '<link rel="canonical" href="https://example.test/preview/">'
        for replacement in ("", canonical + canonical, canonical.replace("example.test", "other.test")):
            with self.subTest(canonical=replacement):
                home.write_text(original.replace(canonical, replacement), encoding="utf-8")
                failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                self.assertTrue(any("canonical" in failure for failure in failures), failures)
        for link in ("//other.test/path", "/preview/\\bad", "/preview/&#10;bad"):
            with self.subTest(link=link):
                home.write_text(original + f'<a href="{link}">bad</a>', encoding="utf-8")
                failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                self.assertTrue(any("invalid link" in failure for failure in failures), failures)

    def test_verifier_rejects_discovery_links_only_in_body(self):
        self.write_outputs()
        home = self.site / "index.html"
        original = home.read_text(encoding="utf-8")
        canonical = '<link rel="canonical" href="https://example.test/preview/">'
        feed = '<link rel="alternate" type="application/atom+xml" href="https://example.test/preview/feed.xml">'
        for signal, name in ((canonical, "canonical"), (feed, "feed")):
            with self.subTest(signal=name):
                home.write_text(original.replace(signal, "").replace("<body>", "<body>" + signal), encoding="utf-8")
                failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                self.assertTrue(any(name in failure for failure in failures), failures)

    def test_verifier_rejects_root_link_outside_baseurl(self):
        self.write_outputs()
        home = self.site / "index.html"
        home.write_text(home.read_text(encoding="utf-8").replace("</body>", '<a href="/about">About</a></body>'), encoding="utf-8")
        failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
        self.assertTrue(any("/about" in failure for failure in failures), failures)

    def test_verifier_rejects_body_discovery_links_when_head_closes_implicitly(self):
        self.write_outputs()
        home = self.site / "index.html"
        original = home.read_text(encoding="utf-8")
        canonical = '<link rel="canonical" href="https://example.test/preview/">'
        feed = '<link rel="alternate" type="application/atom+xml" href="https://example.test/preview/feed.xml">'
        for signal, name in ((canonical, "canonical"), (feed, "feed")):
            with self.subTest(signal=name):
                html = original.replace(signal, "").replace("</head>", "").replace("<body>", "<body>" + signal)
                home.write_text(html, encoding="utf-8")
                failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                self.assertTrue(any(name in failure for failure in failures), failures)

    def test_verifier_accepts_agreeing_catalog_with_baseurl_and_legacy_exception(self):
        verifier = load_verifier()
        self.assertIsNotNone(verifier, "discovery verifier must exist")
        self.write_outputs()
        failures, counts = verifier.verify(
            self.source,
            self.site,
            origin="https://example.test",
            baseurl="/preview",
            as_of="2026-10-30",
        )
        self.assertEqual([], failures)
        self.assertEqual({"articles": 2, "feed": 1, "sitemap_articles": 2, "sitemap_pages": 2}, counts)

    def test_verifier_requires_configured_pages_with_baseurl(self):
        self.write_outputs()
        sitemap = self.site / "sitemap.xml"
        full = sitemap.read_text(encoding="utf-8")
        for url in ("https://example.test/preview/", "https://example.test/preview/about"):
            sitemap.write_text(full.replace(f"<url><loc>{url}</loc></url>", ""), encoding="utf-8")
            failures, counts = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
            self.assertIn(f"sitemap: missing configured page {url}", failures)
            self.assertEqual(1, counts["sitemap_pages"])
        sitemap.write_text(full, encoding="utf-8")
        failures, counts = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
        self.assertEqual([], failures)
        self.assertEqual(2, counts["sitemap_pages"])

    def test_page_inventory_rejects_duplicates_unknown_fields_and_transaction_routes(self):
        cases = [
            ("  - {id: home, class: core-profile, route: /}\n  - {id: home, class: core-profile, route: /about}\n", "duplicate id"),
            ("  - {id: home, class: core-profile, route: /}\n  - {id: about, class: core-profile, route: /}\n", "duplicate route"),
            ("  - {id: home, class: core-profile, route: /, extra: true}\n", "record keys"),
            ("  - {id: quote, class: service, route: /work-with-me/quote}\n", "excluded route"),
        ]
        for pages, expected in cases:
            with self.subTest(expected=expected):
                self.inventory(pages)
                failures, _ = load_verifier().verify(self.source, self.site, origin="https://example.test", baseurl="/preview", as_of="2026-10-30")
                self.assertTrue(any(failure.startswith("discovery pages:") and expected in failure for failure in failures), failures)

    def test_publication_day_uses_chicago_before_local_midnight(self):
        verifier = load_verifier()
        instant = dt.datetime(2026, 9, 11, 0, 30, tzinfo=dt.timezone.utc)

        self.assertEqual(dt.date(2026, 9, 10), verifier.publication_day(instant))

    def test_verifier_rejects_duplicate_feed_entries(self):
        verifier = load_verifier()
        self.assertIsNotNone(verifier, "discovery verifier must exist")
        self.write_outputs(duplicate_feed=True)
        failures, _ = verifier.verify(
            self.source,
            self.site,
            origin="https://example.test",
            baseurl="/preview",
            as_of="2026-10-30",
        )
        self.assertIn("feed: duplicate canonical URL", failures)

    def test_verifier_rejects_private_artifacts_and_crawler_policy_drift(self):
        verifier = load_verifier()
        self.assertIsNotNone(verifier, "discovery verifier must exist")
        self.write_outputs()
        (self.site / "scripts").mkdir()
        robots = self.site / "robots.txt"
        robots.write_text(robots.read_text(encoding="utf-8").replace("Disallow: /", "Allow: /", 1), encoding="utf-8")
        failures, _ = verifier.verify(
            self.source,
            self.site,
            origin="https://example.test",
            baseurl="/preview",
            as_of="2026-10-30",
        )
        self.assertIn("public artifact: scripts must be excluded", failures)
        self.assertIn("robots: GPTBot must be restricted", failures)

    def test_verifier_rejects_unexpected_sitemap_urls_and_bad_feed_metadata(self):
        verifier = load_verifier()
        self.assertIsNotNone(verifier, "discovery verifier must exist")
        self.write_outputs()

        feed = self.site / "feed.xml"
        feed.write_text(
            feed.read_text(encoding="utf-8")
            .replace(
                "<updated>2026-10-20T00:00:00Z</updated>",
                "<updated>2026-10-19T00:00:00Z</updated>",
                1,
            )
            .replace(
                '<link href="https://example.test/preview/notes/dated"/>',
                '<link href="https://example.test/preview/notes/wrong"/>',
            )
            .replace(
                "<published>2026-10-20T00:00:00Z</published>",
                "<published>2026-10-19T00:00:00Z</published>",
            )
            .replace(
                "<updated>2026-10-20T00:00:00Z</updated>",
                "<updated>2026-10-18T00:00:00Z</updated>",
            ),
            encoding="utf-8",
        )

        sitemap = self.site / "sitemap.xml"
        sitemap.write_text(
            sitemap.read_text(encoding="utf-8").replace(
                "</urlset>",
                "<url><loc>https://example.test/preview/notes/draft</loc></url>"
                "<url><loc>https://attacker.example/notes/dated</loc></url>"
                "</urlset>",
            ),
            encoding="utf-8",
        )

        failures, _ = verifier.verify(
            self.source,
            self.site,
            origin="https://example.test",
            baseurl="/preview",
            as_of="2026-10-30",
        )

        joined = "\n".join(failures)
        self.assertIn("feed: entry link mismatch", joined)
        self.assertIn("feed: publication date mismatch", joined)
        self.assertIn("feed: update date mismatch", joined)
        self.assertIn("feed: overall updated timestamp mismatch", joined)
        self.assertIn("sitemap: unexpected URL https://example.test/preview/notes/draft", joined)
        self.assertIn("sitemap: unexpected URL https://attacker.example/notes/dated", joined)


if __name__ == "__main__":
    unittest.main()
