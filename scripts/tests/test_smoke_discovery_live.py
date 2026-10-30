from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

from scripts.smoke_discovery_live import Response, USER_AGENT, check_live, fetch_url, load_policy


class LiveDiscoverySmokeTests(unittest.TestCase):
    def test_configured_pages_are_requested_and_identity_checked(self):
        origin = "https://www.sulemanji.com"
        pages = ["/", "/about", "/work-with-me"]
        responses = self.response_map()
        sitemap_url = origin + "/sitemap.xml"
        entries = "".join(f"<url><loc>{origin}{path}</loc></url>" for path in pages)
        responses[sitemap_url] = Response(200, sitemap_url, responses[sitemap_url].body.replace("</urlset>", entries + "</urlset>"), {})
        for path in pages:
            url = origin + path
            responses[url] = Response(200, url, f'<link rel="canonical" href="{url}"><main id="main"></main>', {})
        requested = []

        def fetch(url, _agent):
            requested.append(url)
            return responses[url]

        result = check_live(origin, "https://sulemanji.com", ["/notes/example"], pages=pages, fetcher=fetch)
        self.assertTrue(result["ok"], result)
        for path in pages:
            self.assertEqual(1, requested.count(origin + path))
        for body in ('<main id="main"></main>', '<link rel="canonical" href="https://wrong.example/"><main id="main"></main>', '<link rel="canonical" href="https://www.sulemanji.com/about">', '<link rel="canonical" href="https://www.sulemanji.com/about"><meta name="robots" content="noindex"><main id="main"></main>'):
            with self.subTest(body=body):
                responses[origin + "/about"] = Response(200, origin + "/about", body, {})
                self.assertFalse(check_live(origin, "https://sulemanji.com", ["/notes/example"], pages=pages, fetcher=fetch)["ok"])

    def test_disallowed_configured_page_is_never_requested(self):
        origin = "https://www.sulemanji.com"
        responses = self.response_map()
        url = origin + "/robots.txt"
        responses[url] = Response(200, url, responses[url].body + "\nUser-agent: SulemanjiDiscoveryMonitor\nDisallow: /about\n", {})
        requested = []

        def fetch(url, _agent):
            requested.append(url)
            return responses[url]

        result = check_live(origin, "https://sulemanji.com", ["/notes/example"], pages=["/about"], fetcher=fetch)
        self.assertFalse(result["ok"])
        self.assertNotIn(origin + "/about", requested)

    def test_unavailable_robots_prevents_configured_page_request(self):
        origin = "https://www.sulemanji.com"
        responses = self.response_map()
        url = origin + "/robots.txt"
        responses[url] = Response(200, "https://attacker.example/robots.txt", "User-agent: *\nAllow: /", {})
        requested = []

        def fetch(url, _agent):
            requested.append(url)
            return responses[url]

        result = check_live(origin, "https://sulemanji.com", ["/notes/example"], pages=["/about"], fetcher=fetch)
        self.assertFalse(result["ok"])
        self.assertNotIn(origin + "/about", requested)

    def test_configured_page_redirect_is_rejected_before_external_request(self):
        requested = []

        class RedirectHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                requested.append(self.path)
                self.send_response(302)
                self.send_header("Location", f"http://localhost:{self.server.server_port}/target")
                self.end_headers()

            def log_message(self, _format, *_args):
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        responses = self.response_map()
        original_fetch = fetch_url

        def transport(url, user_agent, *, approved_hosts):
            if url.endswith("/about"):
                return original_fetch(f"http://127.0.0.1:{server.server_port}/about", user_agent, approved_hosts={"127.0.0.1"})
            return responses[url]

        try:
            with patch("scripts.smoke_discovery_live.fetch_url", side_effect=transport):
                result = check_live("https://www.sulemanji.com", "https://sulemanji.com", ["/notes/example"], pages=["/about"])
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()
        self.assertIn("redirect outside approved origins", " ".join(result["failures"]))
        self.assertEqual(["/about"], requested)

    def test_monitor_starts_without_third_party_python_packages(self):
        script = Path(__file__).resolve().parents[1] / "smoke_discovery_live.py"
        result = subprocess.run(
            [sys.executable, "-S", str(script), "--help"],
            capture_output=True,
            check=False,
            text=True,
        )

        self.assertEqual(0, result.returncode, result.stderr)

    def test_policy_loader_accepts_json_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            policy_path = Path(directory) / "crawler-policy.json"
            policy_path.write_text(
                json.dumps(
                    {
                        "allowed_search_agents": ["OAI-SearchBot", "PerplexityBot"],
                        "allowed_user_agents": ["ChatGPT-User"],
                        "restricted_agents": ["GPTBot", "ClaudeBot"],
                    }
                ),
                encoding="utf-8",
            )

            policy = load_policy(policy_path)

        self.assertEqual(["OAI-SearchBot", "PerplexityBot"], policy["allowed_search_agents"])
        self.assertEqual(["ChatGPT-User"], policy["allowed_user_agents"])
        self.assertEqual(["GPTBot", "ClaudeBot"], policy["restricted_agents"])

    def test_policy_loader_rejects_nested_structures(self):
        with tempfile.TemporaryDirectory() as directory:
            policy_path = Path(directory) / "crawler-policy.json"
            policy_path.write_text(
                json.dumps(
                    {
                        "allowed_search_agents": {"metadata": ["OAI-SearchBot"]},
                        "allowed_user_agents": ["ChatGPT-User"],
                        "restricted_agents": ["GPTBot"],
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(RuntimeError, "unique, non-empty list"):
                load_policy(policy_path)

    def response_map(self):
        origin = "https://www.sulemanji.com"
        robots_origin = "https://sulemanji.com"
        article = "/notes/example"
        policy = load_policy()
        robots = "User-agent: *\nAllow: /\n\n"
        for agent in policy["allowed_search_agents"] + policy["allowed_user_agents"]:
            robots += f"User-agent: {agent}\nAllow: /\n\n"
        for agent in policy["restricted_agents"]:
            robots += f"User-agent: {agent}\nDisallow: /\n\n"
        writing = '<article data-writing-url="/notes/example"></article>'
        feed = """<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>https://www.sulemanji.com/notes/example</id></entry></feed>"""
        sitemap = """<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.sulemanji.com/notes/example</loc></url></urlset>"""
        article_body = """<html><head><link rel="canonical" href="https://www.sulemanji.com/notes/example"></head><body><article data-writing-article>Example</article></body></html>"""
        return {
            origin + "/robots.txt": Response(200, origin + "/robots.txt", robots, {}),
            robots_origin + "/robots.txt": Response(200, robots_origin + "/robots.txt", robots, {}),
            origin + "/writing": Response(200, origin + "/writing", writing, {}),
            origin + "/feed.xml": Response(200, origin + "/feed.xml", feed, {}),
            origin + "/sitemap.xml": Response(200, origin + "/sitemap.xml", sitemap, {}),
            origin + article: Response(200, origin + article, article_body, {}),
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
            responses[url].body.replace(
                "User-agent: OAI-SearchBot\nAllow: /",
                "User-agent: OAI-SearchBot\nDisallow: /",
            ),
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

    def test_robots_wildcards_and_terminal_match_are_enforced(self):
        responses = self.response_map()
        robots_url = "https://www.sulemanji.com/robots.txt"
        responses[robots_url] = Response(
            200,
            robots_url,
            responses[robots_url].body
            + "\nUser-agent: SulemanjiDiscoveryMonitor\nDisallow: /*.xml$ # discovery XML\n",
            {},
        )

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        conflicts = " ".join(result["managed_policy_conflicts"])
        self.assertIn("monitor disallowed /feed.xml", conflicts)
        self.assertIn("monitor disallowed /sitemap.xml", conflicts)

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

    def test_path_specific_disallow_blocks_monitor_fetch(self):
        responses = self.response_map()
        robots_url = "https://www.sulemanji.com/robots.txt"
        responses[robots_url] = Response(
            200,
            robots_url,
            responses[robots_url].body
            + "\nUser-agent: SulemanjiDiscoveryMonitor\nDisallow: /feed.xml\n",
            {},
        )
        requested = []

        def fetch(url, _user_agent):
            requested.append(url)
            return responses[url]

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=fetch,
        )

        self.assertFalse(result["ok"])
        self.assertIn("monitor disallowed /feed.xml", " ".join(result["managed_policy_conflicts"]))
        self.assertNotIn("https://www.sulemanji.com/feed.xml", requested)

    def test_named_crawler_path_disallow_is_reported(self):
        responses = self.response_map()
        robots_url = "https://www.sulemanji.com/robots.txt"
        responses[robots_url] = Response(
            200,
            robots_url,
            responses[robots_url].body.replace(
                "User-agent: OAI-SearchBot\nAllow: /",
                "User-agent: OAI-SearchBot\nAllow: /\nDisallow: /notes/example",
            ),
            {},
        )

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        self.assertFalse(result["ok"])
        self.assertIn("OAI-SearchBot disallows /notes/example", " ".join(result["managed_policy_conflicts"]))

    def test_restricted_manifest_agent_must_remain_blocked(self):
        responses = self.response_map()
        for robots_url in (
            "https://www.sulemanji.com/robots.txt",
            "https://sulemanji.com/robots.txt",
        ):
            responses[robots_url] = Response(
                200,
                robots_url,
                responses[robots_url].body.replace(
                    "User-agent: GPTBot\nDisallow: /",
                    "User-agent: GPTBot\nAllow: /",
                ),
                {},
            )

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )

        self.assertFalse(result["ok"])
        self.assertIn("GPTBot allows restricted path", " ".join(result["managed_policy_conflicts"]))
        self.assertEqual(32, len(load_policy()["restricted_agents"]))

    def test_empty_article_body_or_wrong_identity_fails(self):
        responses = self.response_map()
        article_url = "https://www.sulemanji.com/notes/example"
        responses[article_url] = Response(200, article_url, "", {})

        empty = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )
        self.assertIn("article container missing", " ".join(empty["failures"]))
        self.assertIn("canonical mismatch", " ".join(empty["failures"]))

        responses = self.response_map()
        responses[article_url] = Response(
            200,
            article_url,
            '<link rel="canonical" href="https://www.sulemanji.com/notes/other"><article>Wrong</article>',
            {},
        )
        wrong = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=lambda url, _ua: responses[url],
        )
        self.assertIn("article container missing", " ".join(wrong["failures"]))
        self.assertIn("canonical mismatch", " ".join(wrong["failures"]))

    def test_comment_inside_monitor_group_keeps_disallow_and_prevents_request(self):
        responses = self.response_map()
        robots_url = "https://www.sulemanji.com/robots.txt"
        responses[robots_url] = Response(
            200,
            robots_url,
            responses[robots_url].body
            + "\nUser-agent: SulemanjiDiscoveryMonitor\n# monitor restrictions\nDisallow: /feed.xml\n",
            {},
        )
        requested = []

        def fetch(url, _user_agent):
            requested.append(url)
            return responses[url]

        result = check_live(
            "https://www.sulemanji.com",
            "https://sulemanji.com",
            ["/notes/example"],
            fetcher=fetch,
        )

        self.assertFalse(result["ok"])
        self.assertIn("monitor disallowed /feed.xml", " ".join(result["managed_policy_conflicts"]))
        self.assertNotIn("https://www.sulemanji.com/feed.xml", requested)

    def test_transport_rejects_unapproved_redirect_before_request(self):
        requested_paths = []

        class RedirectHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                requested_paths.append(self.path)
                if self.path == "/start":
                    self.send_response(302)
                    self.send_header("Location", f"http://localhost:{self.server.server_port}/target")
                    self.end_headers()
                    return
                self.send_response(200)
                self.end_headers()

            def log_message(self, _format, *_args):
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with self.assertRaisesRegex(RuntimeError, "redirect outside approved origins"):
                fetch_url(
                    f"http://127.0.0.1:{server.server_port}/start",
                    approved_hosts={"127.0.0.1"},
                )
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()

        self.assertEqual(["/start"], requested_paths)


if __name__ == "__main__":
    unittest.main()
