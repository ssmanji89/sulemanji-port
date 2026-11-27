from pathlib import Path
import json
import os
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github" / "workflows" / "editorial.yml"


class EditorialWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")

    def test_deployments_are_manual_and_main_only(self):
        self.assertIn("workflow_dispatch:", self.workflow)
        self.assertIn("options: [validate, staging, production]", self.workflow)
        self.assertIn("default: validate", self.workflow)
        for job_name, target in (("deploy-staging:", "staging"), ("deploy-production:", "production")):
            job = self.workflow.split(f"  {job_name}", 1)[1]
            self.assertIn("github.event_name == 'workflow_dispatch'", job)
            self.assertIn("github.ref == 'refs/heads/main'", job)
            self.assertIn(f"inputs.deploy_environment == '{target}'", job)
        self.assertIn("format('cloudflare-{0}', inputs.deploy_environment)", self.workflow)
        self.assertNotIn("secrets.CLOUDFLARE_STAGING_API_TOKEN", self.workflow)
        self.assertNotIn("secrets.CLOUDFLARE_EDITORIAL_API_TOKEN", self.workflow)

    def test_environments_supply_private_identity_values(self):
        self.assertIn("secrets[vars.EDITORIAL_TOKEN_SECRET_NAME]", self.workflow)
        for name in (
            "EDITORIAL_DATABASE_ID", "EDITORIAL_DATABASE_NAME", "EDITORIAL_WORKER_NAME",
            "EDITORIAL_WORKFLOW_NAME", "EDITORIAL_CUSTOM_DOMAIN", "EDITORIAL_WORKERS_DEV",
            "EDITORIAL_CRON_SCHEDULE", "EDITORIAL_POLICY_REVISION",
        ):
            self.assertIn(f"vars.{name}", self.workflow)

    def test_remote_migrations_precede_worker_deployments_and_logs_are_suppressed(self):
        for job_name, config in (("deploy-staging:", "wrangler.editorial-staging.runtime.jsonc"), ("deploy-production:", "wrangler.editorial.runtime.jsonc")):
            job = self.workflow.split(f"  {job_name}", 1)[1]
            migration = job.index(f"d1 migrations apply DB --remote --config {config}")
            deploy = job.index(f"wrangler deploy --config {config}")
            self.assertLess(migration, deploy)
            self.assertIn(f"d1 migrations list DB --remote --config {config}", job)
            self.assertIn("verify-editorial-migrations.mjs", job)
            self.assertIn(f"deployments list --json --config {config}", job)
            self.assertIn("private resource diagnostics were suppressed", job)

    def test_tracked_configs_use_only_generic_runtime_placeholders(self):
        for filename in ("wrangler.editorial.jsonc", "wrangler.editorial-staging.jsonc"):
            config = (ROOT / "cloudflare" / filename).read_text(encoding="utf-8")
            self.assertIn('"name": "runtime-worker"', config)
            self.assertIn('"database_name": "runtime-database"', config)
            self.assertIn('"database_id": "00000000-0000-0000-0000-000000000000"', config)
            ids = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", config)
            self.assertEqual(ids, ["00000000-0000-0000-0000-000000000000"])

    def test_runtime_config_renderer_injects_only_environment_values(self):
        renderer = ROOT / "cloudflare" / "scripts" / "render-editorial-config.mjs"
        with tempfile.TemporaryDirectory() as directory:
            environment = os.environ.copy()
            environment.update({
                "EDITORIAL_DATABASE_ID": "123e4567-e89b-12d3-a456-426614174000",
                "EDITORIAL_DATABASE_NAME": "test-database",
                "EDITORIAL_WORKER_NAME": "test-worker",
                "EDITORIAL_WORKFLOW_NAME": "test-workflow",
                "EDITORIAL_POLICY_REVISION": "test-policy",
                "EDITORIAL_CUSTOM_DOMAIN": "example.invalid",
                "EDITORIAL_WORKERS_DEV": "true",
                "EDITORIAL_CRON_SCHEDULE": "* * * * *",
            })
            subprocess.run(["node", str(renderer), "staging", directory], check=True, env=environment)
            generated = json.loads((Path(directory) / "wrangler.editorial-staging.runtime.jsonc").read_text(encoding="utf-8"))
            self.assertEqual(generated["name"], "test-worker")
            self.assertEqual(generated["d1_databases"][0]["database_id"], environment["EDITORIAL_DATABASE_ID"])
            self.assertEqual(generated["d1_databases"][0]["database_name"], "test-database")
            self.assertEqual(generated["workflows"][0]["name"], "test-workflow")
            self.assertEqual(generated["routes"], [{"pattern": "example.invalid", "custom_domain": True}])
            self.assertEqual(generated["triggers"]["crons"], ["* * * * *"])

    def test_deployment_readback_requires_exact_sha_and_full_traffic(self):
        verifier = ROOT / "cloudflare" / "scripts" / "verify-editorial-deployment.mjs"
        sha = "a" * 40
        payload = [{"id": "deployment-id", "annotations": {"workers/message": f"service staging {sha}"}, "versions": [{"version_id": "version-id", "percentage": 100}]}]
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as fixture:
            json.dump(payload, fixture)
            fixture.flush()
            subprocess.run(["node", str(verifier), fixture.name, "staging", sha], check=True, capture_output=True, text=True)
            payload[0]["annotations"]["workers/message"] = "service staging stale"
            fixture.seek(0)
            fixture.truncate()
            json.dump(payload, fixture)
            fixture.flush()
            rejected = subprocess.run(["node", str(verifier), fixture.name, "staging", sha], capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)

    def test_migration_readback_rejects_pending_migrations(self):
        verifier = ROOT / "cloudflare" / "scripts" / "verify-editorial-migrations.mjs"
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as fixture:
            fixture.write("No migrations to apply!\n")
            fixture.flush()
            subprocess.run(["node", str(verifier), fixture.name], check=True, capture_output=True, text=True)
            fixture.seek(0)
            fixture.truncate()
            fixture.write("1 unapplied migration\n")
            fixture.flush()
            rejected = subprocess.run(["node", str(verifier), fixture.name], capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)


if __name__ == "__main__":
    unittest.main()
