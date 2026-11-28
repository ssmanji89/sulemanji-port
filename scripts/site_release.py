"""Validate a promoted Jekyll asset artifact before any Cloudflare write."""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

from scripts.build_site_manifest import _article_identity, build_manifest, render_release_headers
from scripts.version_site_assets import ASSET_DIRECTORY, verify_versioned_assets


class ReleaseError(ValueError):
    pass


def fetch_public_manifest(url: str) -> dict[str, Any]:
    """Fetch the public release identity with curl's Cloudflare-compatible transport."""
    try:
        response = subprocess.run(
            ['curl', '--fail', '--silent', '--show-error', '--max-time', '15', url],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ReleaseError('live release manifest request failed') from error
    if response.returncode != 0:
        raise ReleaseError('live release manifest request failed')
    try:
        manifest = json.loads(response.stdout)
    except (TypeError, json.JSONDecodeError) as error:
        raise ReleaseError('live release manifest is not valid JSON') from error
    if not isinstance(manifest, dict):
        raise ReleaseError('live release manifest must be a JSON object')
    return manifest


def verify_artifact(artifact: Path, source_commit: str, current_main_sha: str) -> dict[str, Any]:
    artifact = Path(artifact).resolve()
    release_file = artifact / 'release.json'
    if not artifact.is_dir() or not release_file.is_file():
        raise ReleaseError('artifact directory or release.json is missing')
    manifest = json.loads(release_file.read_text(encoding='utf-8'))
    if source_commit != current_main_sha or source_commit != manifest.get('source_commit'):
        raise ReleaseError('artifact source does not match current main')
    if manifest.get('schema_version') != 1 or not isinstance(manifest.get('files'), dict):
        raise ReleaseError('release manifest schema is invalid')
    try:
        calculated = build_manifest(
            artifact,
            source_commit,
            manifest.get('articles', []),
            built_at=manifest.get('built_at'),
        )
    except (ValueError, OSError, TypeError) as error:
        raise ReleaseError(f'artifact manifest cannot be verified: {error}') from error
    if calculated['files'] != manifest['files'] or calculated['asset_digest'] != manifest.get('asset_digest'):
        raise ReleaseError('artifact file digest does not match release manifest')
    if calculated['pages'] != manifest.get('pages'):
        raise ReleaseError('artifact page identity or visible content does not match release manifest')
    if (artifact / ASSET_DIRECTORY).exists():
        try:
            verify_versioned_assets(artifact)
        except (ValueError, OSError) as error:
            raise ReleaseError(f'artifact immutable asset validation failed: {error}') from error
    try:
        rendered_articles = _article_identity(artifact)
    except (ValueError, OSError) as error:
        raise ReleaseError(f'artifact article identities cannot be verified: {error}') from error
    if rendered_articles != manifest.get('articles'):
        raise ReleaseError('artifact article identity or visible content does not match release manifest')
    try:
        expected_headers = render_release_headers(manifest)
        actual_headers = (artifact / '_headers').read_text(encoding='utf-8')
    except (ValueError, OSError) as error:
        raise ReleaseError(f'artifact identity headers are missing or invalid: {error}') from error
    if actual_headers != expected_headers:
        raise ReleaseError('artifact identity headers do not match release manifest')
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command', required=True)
    verify = subparsers.add_parser('verify')
    verify.add_argument('--artifact', type=Path, required=True)
    verify.add_argument('--source-commit', required=True)
    verify.add_argument('--current-main', required=True)
    args = parser.parse_args()
    manifest = verify_artifact(args.artifact, args.source_commit, args.current_main)
    print(f"verified source {args.source_commit}; {manifest['asset_digest']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
