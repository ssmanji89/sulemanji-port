from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "jekyll.yml"


class ReleaseWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")

    def test_pull_requests_run_the_build_without_deploying(self):
        self.assertIn("pull_request:", self.workflow)
        deploy_guard = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')"
        self.assertEqual(self.workflow.count(deploy_guard), 2)

    def test_runtime_versions_are_pinned(self):
        self.assertIn("ruby-version: '3.1'", self.workflow)
        self.assertIn("node-version: '22'", self.workflow)
        self.assertIn("python-version: '3.12'", self.workflow)

    def test_discovery_and_safety_gates_run_before_upload(self):
        upload_index = self.workflow.index("- name: Upload artifact")
        required_commands = (
            "python scripts/generate_article_images.py --check",
            "python scripts/verify_discovery.py",
            "python3 scripts/verify_public_safety.py",
            "python3 scripts/verify_priority_discovery_plan.py",
        )
        for command in required_commands:
            self.assertLess(self.workflow.index(command), upload_index)

    def test_pull_requests_use_an_independent_concurrency_group(self):
        self.assertIn("format('pages-pr-{0}', github.event.pull_request.number)", self.workflow)
        self.assertIn("'pages-production'", self.workflow)


if __name__ == "__main__":
    unittest.main()
