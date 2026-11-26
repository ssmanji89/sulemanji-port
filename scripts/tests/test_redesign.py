from pathlib import Path
import json
import hashlib
import tempfile
import unittest
from collections import Counter
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
from scripts.verify_public_safety import public_output_files, scan_files


class WritingEntries(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.entries = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "article" and values.get("data-writing-url"):
            self.entries.append(values)


class RedesignShellTests(unittest.TestCase):
    def test_main_navigation_and_business_destination(self):
        navigation = (ROOT / "_data/navigation.yml").read_text()
        labels = [line.split(": ", 1)[1] for line in navigation.splitlines() if line.startswith("- title:")]
        self.assertEqual(labels, ["Explore", "Writing", "About", "Contact"])
        self.assertIn("/explore/", navigation)
        header = (ROOT / "_includes/site-header.html").read_text()
        self.assertNotIn("https://viyu.net/contact-support/contact-us/", header)
        contact = (ROOT / "contact.md").read_text()
        self.assertIn("https://viyu.net/contact-support/contact-us/", contact)

    def test_legacy_business_case_calls_go_directly_to_viyu(self):
        destination = "https://viyu.net/contact-support/contact-us/"
        for name in ("microsoft-365-acquisition-integration", "rfms-operations"):
            source = (ROOT / "case-studies" / f"{name}.md").read_text()
            self.assertIn(destination, source)
            self.assertNotIn("](/contact/)", source)

    def test_shared_redirect_fallback_has_no_javascript_dependency(self):
        head = (ROOT / "_includes/head-custom.html").read_text()
        self.assertIn("redirect_target", head)
        self.assertIn("http-equiv=\"refresh\"", head)
        self.assertIn("noindex", head)
        layout = (ROOT / "_layouts/default.html").read_text()
        self.assertIn("page.redirect_target", layout)
        self.assertIn("Continue to", layout)

    def test_main_pages_keep_shared_document_contract(self):
        layout = (ROOT / "_layouts/default.html").read_text()
        self.assertIn('id="main"', layout)
        self.assertIn('class="skip-link"', layout)
        schema = (ROOT / "_includes/person-schema.html").read_text()
        self.assertIn('"@type": "Person"', schema)
        self.assertIn("/#person", schema)

    def test_all_six_case_routes_and_sources_remain_attached(self):
        cases = json.loads((ROOT / "docs/superpowers/reference/2026-11-25-portfolio-redesign/content.json").read_text())["cases"]
        self.assertEqual(len(cases), 6)
        for case in cases:
            route = ROOT / "work" / f"{case['slug']}.md"
            self.assertTrue(route.is_file(), case["slug"])
            self.assertTrue(case["status"])
            self.assertTrue(case["sources"], case["slug"])
            self.assertTrue(case["diagram"], case["slug"])
        self.assertTrue((ROOT / "work.md").is_file())

    def test_rendered_cases_keep_state_sources_and_accessible_diagrams(self):
        cases = json.loads((ROOT / "docs/superpowers/reference/2026-11-25-portfolio-redesign/content.json").read_text())["cases"]
        for case in cases:
            output = ROOT / "_site/work" / case["slug"] / "index.html"
            rendered = output.read_text()
            self.assertIn(case["status"], rendered)
            self.assertIn("assets/diagrams/portfolio/" + case["diagram"] + ".svg", rendered)
            for source in case["sources"]:
                self.assertIn(source["label"], rendered)
        manifest = json.loads((ROOT / "docs/superpowers/reference/2026-11-25-portfolio-redesign/diagram-manifest.json").read_text())
        for diagram in manifest["diagrams"]:
            source = ROOT / "assets/diagrams/portfolio" / diagram["file"]
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), diagram["sha256"])
            tree = ET.parse(source)
            names = {node.tag.rsplit("}", 1)[-1] for node in tree.getroot()}
            self.assertIn("title", names)
            self.assertIn("desc", names)
            self.assertTrue((ROOT / "_site/assets/diagrams/portfolio" / diagram["file"]).is_file())

    def test_nested_work_content_is_scanned(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / "work" / "nested" / "unsafe.md"
            fixture.parent.mkdir(parents=True)
            fixture.write_text("Crebrid")
            findings = scan_files([fixture])
        self.assertEqual(len(findings), 1)
        self.assertIn("client name", findings[0])

    def test_generated_public_output_is_scanned(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory) / "_site"
            fixture = site / "work" / "case" / "index.html"
            fixture.parent.mkdir(parents=True)
            fixture.write_text("saved 20 hours")
            output_files = list(public_output_files(site))
            findings = scan_files(output_files)
        self.assertEqual(output_files, [fixture])
        self.assertEqual(len(findings), 1)
        self.assertIn("unsupported hours-saved claim", findings[0])

    def test_privacy_notice_limits_intake_to_previously_submitted_cases(self):
        notice = (ROOT / "privacy.md").read_text()
        self.assertIn("New Work With Me intake is not available.", notice)
        self.assertIn("cases submitted before intake closed", notice)
        self.assertIn("90 days after case closure", notice)

    def test_stale_resume_assets_are_absent_from_public_output(self):
        site = ROOT / "_site"
        self.assertFalse((site / "assets/SulemanManji_Resume.pdf").exists())
        self.assertFalse((site / "assets/resume/Suleman-Manji-Resume.pdf").exists())
        resume = (site / "resume/index.html").read_text()
        self.assertNotIn("Suleman-Manji-Resume.pdf", resume)
        self.assertNotIn("SulemanManji_Resume.pdf", resume)

    def test_current_article_baseline_remains_discoverable(self):
        baseline = json.loads((ROOT / "docs/redesign/2026-11-25/ARTICLE-BASELINE.json").read_text())
        index = (ROOT / "_site/writing.html").read_text()
        eligible = [article for article in baseline["articles"] if article["classification"] == "eligible"]
        self.assertEqual(len(eligible), baseline["eligible_count"])
        for article in eligible:
            self.assertTrue((ROOT / article["source_path"]).is_file(), article["source_path"])
            self.assertIn(f'data-writing-url="{article["canonical_url"]}"', index)

    def test_writing_index_has_progressive_filters_and_other_fallback(self):
        index = (ROOT / "writing.md").read_text()
        script = (ROOT / "assets/js/writing-browser.js").read_text()
        self.assertIn("data-writing-controls", index)
        self.assertIn("writing_browser: true", index)
        self.assertIn('default: "Other"', (ROOT / "_includes/writing-entry.html").read_text())
        self.assertIn("readFilterState", script)
        self.assertIn("matchesEntry", script)
        self.assertIn("renderFilterState", script)

    def test_category_counts_cover_the_current_server_rendered_catalog(self):
        index = (ROOT / "_site/writing.html").read_text()
        entries = WritingEntries(index).entries
        categories = Counter(entry["data-category"] for entry in entries)
        self.assertEqual(len(entries), len({entry["data-writing-url"] for entry in entries}))
        self.assertEqual(sum(categories.values()), len(entries))
        self.assertTrue(categories)
        self.assertTrue(set(categories).issubset({"operations", "automation", "security", "research", "other"}))


if __name__ == "__main__":
    unittest.main()
