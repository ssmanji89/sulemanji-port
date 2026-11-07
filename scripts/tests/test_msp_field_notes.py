import copy
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from msp_field_notes import job_fingerprint, validate_manifest  # noqa: E402

FIXTURE = Path(__file__).parent / "fixtures" / "msp_field_notes_intune.json"


class FieldNotesManifestTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def assertRejected(self, phrase):
        errors = validate_manifest(self.data)
        self.assertTrue(any(phrase in error for error in errors), errors)

    def test_valid_manifest(self):
        self.assertEqual(validate_manifest(self.data), [])

    def test_canonical_hash_ignores_key_order(self):
        self.assertEqual(job_fingerprint(self.data), job_fingerprint(json.loads(json.dumps(self.data, sort_keys=True))))

    def test_changed_claim_changes_idempotency_identity(self):
        original = job_fingerprint(self.data)
        self.data["claims"][0]["text"] += " This requires separate verification."
        self.assertNotEqual(job_fingerprint(self.data), original)

    def test_private_source_rejected(self):
        self.data["sources"][0]["visibility"] = "team"
        self.assertRejected("must explicitly be public")

    def test_unapproved_source_rejected(self):
        self.data["sources"][1]["approved_for_public"] = False
        self.assertRejected("must explicitly be public")

    def test_private_hostname_rejected(self):
        self.data["sources"][1]["url"] = "https://memory.internal/private"
        self.assertRejected("public HTTPS hostname")

    def test_ip_source_rejected(self):
        self.data["sources"][1]["url"] = "https://192.168.1.5/runbook"
        self.assertRejected("public HTTPS hostname")

    def test_embedded_credentials_rejected(self):
        self.data["sources"][1]["url"] = "https://user:secret@example.org/foo"
        self.assertRejected("public HTTPS hostname")

    def test_source_not_referenced_rejected(self):
        self.data["claims"][0]["source_urls"] = ["https://unlisted.example.com/report"]
        self.assertRejected("listed public sources")

    def test_cannot_claim_measured_results(self):
        self.data["claims"][0]["kind"] = "measured"
        self.assertRejected("claims[0].kind")

    def test_no_personal_face(self):
        self.data["identity"]["personal_face"] = True
        self.assertRejected("personal_face must be false")

    def test_no_personal_voice(self):
        self.data["identity"]["personal_voice"] = True
        self.assertRejected("personal_voice must be false")

    def test_no_voice_cloning(self):
        self.data["identity"]["voice_clone"] = True
        self.assertRejected("voice_clone must be false")

    def test_short_must_be_silent(self):
        self.data["formats"][1]["narration"] = "synthetic"
        self.assertRejected("narration must be none")

    def test_explainer_must_be_narrated(self):
        self.data["formats"][0]["narration"] = "none"
        self.assertRejected("narration must be synthetic")

    def test_pipeline_must_match_format(self):
        self.data["formats"][1]["pipeline_candidate"] = "clip-factory"
        self.assertRejected("pipeline_candidate must be animation")

    def test_budget_must_be_zero(self):
        self.data["execution"]["max_generation_cost_usd"] = 1.0
        self.assertRejected("zero paid-generation budget")

    def test_cannot_publish_from_manifest(self):
        self.data["execution"]["publish_mode"] = "upload_public"
        self.assertRejected("export_only")

    def test_unknown_payload_keys_rejected(self):
        self.data["client_ticket"] = "redacted"
        self.assertRejected("unsupported client_ticket")

    def test_article_must_be_published(self):
        self.data["source_article"]["published"] = False
        self.assertRejected("must be marked published")

    def test_cli_reports_preflight_only(self):
        process = subprocess.run([sys.executable, str(ROOT / "scripts" / "msp_field_notes.py"), str(FIXTURE)], capture_output=True, text=True, check=False)
        self.assertEqual(process.returncode, 0, process.stderr)
        output = json.loads(process.stdout)
        self.assertEqual(output["status"], "VALIDATED_FOR_PREFLIGHT_ONLY")
        self.assertFalse(output["publication_authorized"])
        self.assertFalse(output["media_generated"])


if __name__ == "__main__":
    unittest.main()
