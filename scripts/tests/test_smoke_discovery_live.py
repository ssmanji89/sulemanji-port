import unittest

from scripts.smoke_discovery_live import Response, USER_AGENT, check_live


class LiveDiscoverySmokeTests(unittest.TestCase):
    def response_map(self):
        origin = "https://www.sulemanji.com"
        robots_origin = "https://sulemanji.com"
        article = "/notes/example"
        robots = """User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Agent
Allow: /
"""
        writing = '<article data-writing-url="/notes/example"></article>'
        feed = """<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>https://www.sulemanji.com/notes/example</id></entry></feed>"""
        sitemap = """<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.sulemanji.com/notes/example</loc></url></urlset>"""
        return {
            origin + "/robots.txt": Response(200, origin + "/robots.txt", robots, {}),
            robots_origin + "/robots.txt": Response(200, robots_origin + "/robots.txt", robots, {}),
            origin + "/writing": Response(200, origin + "/writing", writing, {}),
            origin + "/feed.xml": Response(200, origin + "/feed.xml", feed, {}),
            origin + "/sitemap.xml": Response(200, origin + "/sitemap.xml", sitemap, {}),
            origin + article: Response(200, origin + article, "<html>article</html>", {}),
        }

    def test_success_uses_honest_identity_and_checks_discovery(self):
        responses = self.response_map()
        identities = []

        def fetch(url, user_agent):
            identities.append(user_agent)
            return responses[url]

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=fetch,
        )

        self.assertTrue(result["ok"])
        self.assertEqual([], result["failures"])
        self.assertTrue(identities)
        self.assertEqual({USER_AGENT}, set(identities))
        self.assertNotIn("Bot", USER_AGENT)

    def test_managed_robots_conflict_is_reported_without_spoofing(self):
        responses = self.response_map()
        url = "https://www.sulemanji.com/robots.txt"
        responses[url] = Response(
            200,
            url,
            responses[url].body + "\nUser-agent: OAI-SearchBot\nDisallow: /\n",
            {},
        )

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        self.assertFalse(result["ok"])
        self.assertIn("OAI-SearchBot", " ".join(result["managed_policy_conflicts"]))

    def test_redirect_outside_requested_hosts_fails(self):
        responses = self.response_map()
        url = "https://www.sulemanji.com/writing"
        responses[url] = Response(200, "https://attacker.example/writing", "", {})

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        self.assertIn("redirected outside approved origins", " ".join(result["failures"]))

    def test_missing_discovery_output_fails(self):
        responses = self.response_map()
        url = "https://www.sulemanji.com/feed.xml"
        responses[url] = Response(200, url, '<feed xmlns="http://www.w3.org/2005/Atom"/>', {})

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        self.assertIn("feed:", " ".join(result["failures"]))
        self.assertIn("missing or duplicated", " ".join(result["failures"]))


if __name__ == "__main__":
    unittest.main()
