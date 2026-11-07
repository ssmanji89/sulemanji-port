#!/usr/bin/env python3
"""Fail-closed editorial preflight for MSP Field Notes (no network or side effects).

This tool does NOT authorize generation or publication and is not an OpenMontage
orchestrator. The engine's AGENT_GUIDE and selected pipeline director skills remain
controlling. Human/independent source review remains mandatory.
"""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

SCHEMA_VERSION = 1
FORMATS = {
    "explainer": {"pipeline": "animated-explainer", "aspect": "16:9", "narration": "synthetic", "duration": (240, 420)},
    "short": {"pipeline": "animation", "aspect": "9:16", "narration": "none", "duration": (30, 60)},
}
TOP_FIELDS = {"schema_version", "editorial_id", "source_article", "sources", "claims", "identity", "formats", "execution"}
SOURCE_FIELDS = {"url", "visibility", "approved_for_public", "asset_rights", "evidence_digest"}
CLAIM_FIELDS = {"text", "kind", "source_urls"}
FORMAT_FIELDS = {"id", "pipeline_candidate", "aspect_ratio", "narration", "duration_seconds"}
ARTICLE_FIELDS = {"url", "published"}
IDENTITY_FIELDS = {"credited_author", "personal_face", "personal_voice", "voice_clone"}
EXECUTION_FIELDS = {"provider_mode", "max_generation_cost_usd", "publish_mode"}
ALLOWED_CLAIMS = {"sourced_fact", "interpretation", "hypothesis"}
ALLOWED_RIGHTS = {"owned", "licensed", "citation_only", "public_domain"}
JOB_PATTERN = re.compile(r"^mfn-[a-z0-9]+(?:-[a-z0-9]+)*$")
DIGEST_PATTERN = re.compile(r"^[a-f0-9]{64}$")


def _key_errors(obj: object, fields: set[str], label: str) -> list[str]:
    if not isinstance(obj, dict):
        return [f"{label} must be an object"]
    missing = sorted(fields - set(obj))
    extra = sorted(set(obj) - fields)
    return ([f"{label}: missing {', '.join(missing)}"] if missing else []) + (
        [f"{label}: unsupported {', '.join(extra)}"] if extra else []
    )


def _public_https(url: object) -> bool:
    if not isinstance(url, str) or any(ord(c) < 32 for c in url) or "\\" in url:
        return False
    try:
        p = urlsplit(url)
        if p.scheme != "https" or not p.hostname or p.username or p.password or p.port not in (None, 443):
            return False
        h = p.hostname.lower()
        if h in {"localhost", "localhost.localdomain"} or h.endswith((".local", ".lan", ".internal", ".corp", ".test")):
            return False
        try:
            ipaddress.ip_address(h)
            return False  # public editorial sources require independently named public hosts
        except ValueError:
            pass
        return "." in h and not p.fragment
    except ValueError:
        return False


def validate_manifest(data: object) -> list[str]:
    errors = _key_errors(data, TOP_FIELDS, "manifest")
    if not isinstance(data, dict):
        return errors
    if type(data.get("schema_version")) is not int or data["schema_version"] != SCHEMA_VERSION:
        errors.append("schema_version must be 1")
    if not isinstance(data.get("editorial_id"), str) or not JOB_PATTERN.fullmatch(data["editorial_id"]):
        errors.append("editorial_id must be a stable mfn-... slug")

    article = data.get("source_article")
    errors += _key_errors(article, ARTICLE_FIELDS, "source_article")
    if isinstance(article, dict):
        if not _public_https(article.get("url")):
            errors.append("source_article.url must be a public HTTPS hostname")
        if article.get("published") is not True:
            errors.append("source_article must be marked published (verify independently)")

    sources = data.get("sources")
    urls = set()
    if not isinstance(sources, list) or not sources:
        errors.append("sources must be a non-empty array")
    else:
        for i, source in enumerate(sources):
            label = f"sources[{i}]"
            errors += _key_errors(source, SOURCE_FIELDS, label)
            if not isinstance(source, dict):
                continue
            url = source.get("url")
            if not _public_https(url):
                errors.append(f"{label}.url must use a public HTTPS hostname")
            elif url in urls:
                errors.append(f"{label}.url duplicates another source")
            else:
                urls.add(url)
            if source.get("visibility") != "public" or source.get("approved_for_public") is not True:
                errors.append(f"{label} must explicitly be public and approved")
            if source.get("asset_rights") not in ALLOWED_RIGHTS:
                errors.append(f"{label}.asset_rights must be an allowed rights class")
            digest = source.get("evidence_digest")
            if digest is not None and (not isinstance(digest, str) or not DIGEST_PATTERN.fullmatch(digest)):
                errors.append(f"{label}.evidence_digest must be null or SHA-256 hex")
    if isinstance(article, dict) and article.get("url") not in urls:
        errors.append("source_article.url must also be listed in sources")

    claims = data.get("claims")
    if not isinstance(claims, list) or not claims:
        errors.append("claims must be a non-empty array")
    else:
        for i, claim in enumerate(claims):
            label = f"claims[{i}]"
            errors += _key_errors(claim, CLAIM_FIELDS, label)
            if not isinstance(claim, dict):
                continue
            if not isinstance(claim.get("text"), str) or not 8 <= len(claim["text"].strip()) <= 320:
                errors.append(f"{label}.text must be 8–320 characters")
            if claim.get("kind") not in ALLOWED_CLAIMS:
                errors.append(f"{label}.kind must be sourced_fact, interpretation, or hypothesis")
            refs = claim.get("source_urls")
            if not isinstance(refs, list) or not refs or any(not isinstance(u, str) or u not in urls for u in refs):
                errors.append(f"{label}.source_urls must reference listed public sources")

    identity = data.get("identity")
    errors += _key_errors(identity, IDENTITY_FIELDS, "identity")
    if isinstance(identity, dict):
        if identity.get("credited_author") != "Suleman Manji":
            errors.append("identity.credited_author must match approved author")
        for key in ("personal_face", "personal_voice", "voice_clone"):
            if identity.get(key) is not False:
                errors.append(f"identity.{key} must be false")

    formats = data.get("formats")
    if not isinstance(formats, list) or len(formats) != 2:
        errors.append("formats must contain one explainer and one short")
    else:
        observed = set()
        for i, fmt in enumerate(formats):
            label = f"formats[{i}]"
            errors += _key_errors(fmt, FORMAT_FIELDS, label)
            if not isinstance(fmt, dict):
                continue
            name = fmt.get("id")
            if name not in FORMATS:
                errors.append(f"{label}.id must be explainer or short")
                continue
            if name in observed:
                errors.append(f"{label}.id duplicated")
            observed.add(name)
            expected = FORMATS[name]
            for key, desired in (("pipeline_candidate", expected["pipeline"]), ("aspect_ratio", expected["aspect"]), ("narration", expected["narration"])):
                if fmt.get(key) != desired:
                    errors.append(f"{label}.{key} must be {desired}")
            duration = fmt.get("duration_seconds")
            if type(duration) is not int or not expected["duration"][0] <= duration <= expected["duration"][1]:
                errors.append(f"{label}.duration_seconds outside approved range")
        if observed != set(FORMATS):
            errors.append("formats must have exactly one of each id")

    execution = data.get("execution")
    errors += _key_errors(execution, EXECUTION_FIELDS, "execution")
    if isinstance(execution, dict):
        if execution.get("provider_mode") != "local_only":
            errors.append("provider_mode must be local_only in first pilot")
        if execution.get("publish_mode") != "export_only":
            errors.append("publish_mode must be export_only in first pilot")
        budget = execution.get("max_generation_cost_usd")
        if type(budget) not in (int, float) or budget != 0:
            errors.append("first pilot must use a zero paid-generation budget")
    return errors


def job_fingerprint(data: dict) -> str:
    """Content-keyed idempotency identity; a changed source/claim makes a new job."""
    payload = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate an MSP Field Notes preflight manifest (offline)")
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "REJECTED", "errors": [str(exc)]}))
        return 2
    errors = validate_manifest(data)
    if errors:
        print(json.dumps({"status": "REJECTED", "errors": errors}, indent=2))
        return 1
    print(json.dumps({
        "status": "VALIDATED_FOR_PREFLIGHT_ONLY",
        "editorial_id": data["editorial_id"],
        "job_fingerprint": job_fingerprint(data),
        "pipeline_candidates": {f["id"]: f["pipeline_candidate"] for f in data["formats"]},
        "next_gates": ["source_and_privacy_review", "openmontage_provider_preflight", "upstream_creative_approvals", "independent_review"],
        "publication_authorized": False,
        "media_generated": False,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
