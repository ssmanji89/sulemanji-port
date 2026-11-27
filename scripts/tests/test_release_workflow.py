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
        self.assertIn("bash scripts/check_site_release.sh", self.workflow)
        self.assertIn("github.event_name == 'push'", self.workflow)
        self.assertIn("github.repository == 'ssmanji89/sulemanji-port'", self.workflow)
        self.assertNotIn("secrets.CLOUDFLARE_API_TOKEN", self.workflow.split("  deploy-cloudflare:", 1)[0])
        self.assertNotIn("secrets.CLOUDFLARE_STAGING_API_TOKEN", self.workflow.split("  deploy-cloudflare-staging:", 1)[0])

    def test_runtime_versions_are_pinned(self):
        self.assertIn("ruby-version: '3.1'", self.workflow)
        self.assertIn("node-version: '22'", self.workflow)
        self.assertIn("python-version: '3.12'", self.workflow)

    def test_social_card_build_uses_repository_fonts_without_apt_update(self):
        self.assertNotIn("apt-get update", self.workflow)
        for font in ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"):
            self.assertTrue((ROOT / "scripts" / "fonts" / font).is_file(), font)

    def test_discovery_and_safety_gates_run_before_upload(self):
        check_index = self.workflow.index("bash scripts/check_site_release.sh")
        upload_index = self.workflow.index("- name: Upload Pages artifact")
        self.assertLess(check_index, upload_index)
        self.assertIn("python3 scripts/verify_public_safety.py", (ROOT / "scripts" / "check_site_release.sh").read_text())

    def test_pull_requests_use_an_independent_concurrency_group(self):
        self.assertIn("format('site-pr-{0}', github.event.pull_request.number)", self.workflow)
        self.assertIn("'site-production'", self.workflow)

    def test_cloudflare_staging_is_manual_and_production_is_main_only(self):
        staging = self.workflow.split("  deploy-cloudflare-staging:", 1)[1].split("  deploy-cloudflare:", 1)[0]
        production = self.workflow.split("  deploy-cloudflare:", 1)[1]
        self.assertIn("github.event_name == 'workflow_dispatch'", staging)
        self.assertIn("inputs.deploy_environment == 'staging'", staging)
        self.assertIn("github.ref == 'refs/heads/main'", production)
        self.assertIn("github.event_name == 'push'", production)
        pages = self.workflow.split("  deploy-pages:", 1)[1].split("  deploy-cloudflare-staging:", 1)[0]
        self.assertIn("inputs.deploy_environment == 'production'", pages)

    def test_runner_temp_is_not_used_in_job_level_environment(self):
        self.assertNotIn("DEPLOYMENT_RECEIPT_PATH: ${{ runner.temp }}", self.workflow)
        deploy_script = (ROOT / "scripts" / "deploy_site.sh").read_text(encoding="utf-8")
        self.assertIn("RUNNER_TEMP:-${TMPDIR:-/tmp}", deploy_script)

    def test_manual_workflow_dispatch_defaults_to_validation_without_deployment(self):
        self.assertIn("options: [validate, staging, production]", self.workflow)
        self.assertIn("default: validate", self.workflow)
        staging = self.workflow.split("  deploy-cloudflare-staging:", 1)[1].split("  deploy-cloudflare:", 1)[0]
        production = self.workflow.split("  deploy-cloudflare:", 1)[1]
        self.assertIn("inputs.deploy_environment == 'staging'", staging)
        self.assertIn("inputs.deploy_environment == 'production'", production)


if __name__ == "__main__":
    unittest.main()
