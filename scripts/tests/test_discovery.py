import datetime as dt
import importlib.util
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
        (self.source / "_data" / "crawler-policy.yml").write_text(
            "default_access: allow\n"
            "content_signal: search=yes,ai-train=no,use=reference\n"
            "allowed_search_agents: [OAI-SearchBot]\n"
            "allowed_user_agents: [ChatGPT-User]\n"
            "restricted_agents: [GPTBot]\n",
            encoding="utf-8",
        )
        self.note("dated", published=True, published_on="2026-10-20")
        self.note("draft", published=False)
        self.note("legacy", legacy=True)

    def tearDown(self):
        self.tmp.cleanup()

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
        self.assertEqual({"articles": 2, "feed": 1, "sitemap_articles": 2}, counts)

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
