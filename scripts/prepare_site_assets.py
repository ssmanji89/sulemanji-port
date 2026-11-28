"""Package a release with an additive prepare version and a compatible promotion."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

from scripts.build_site_manifest import IMMUTABLE_ASSET_HEADERS, PUBLIC_ORIGIN, build_manifest, render_release_headers
from scripts.site_release import ReleaseError, fetch_public_manifest, verify_artifact
from scripts.version_site_assets import ASSET_DIRECTORY, legacy_asset_paths, verify_versioned_assets

COMMIT = re.compile(r'[0-9a-f]{40}')
WORKER_VERSION = re.compile(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}')
ASSET_PATH = re.compile(rf'{ASSET_DIRECTORY}/[0-9a-f]{{64}}/.+')
DEPLOYMENT_FILES = ('_headers', 'release.json', '_redirects', '.assetsignore')


def _copy_files(source: Path, destination: Path, files) -> None:
    for name in files:
        path = source / name
        if not path.is_file() or path.is_symlink():
            raise ReleaseError(f'invalid deployment file: {name}')
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)


def _copy_artifact(source: Path, destination: Path, manifest: dict) -> None:
    _copy_files(source, destination, manifest['files'])
    _copy_files(source, destination, [name for name in DEPLOYMENT_FILES if (source / name).exists()])


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _immutable_files(manifest: dict) -> dict:
    return {path: digest for path, digest in manifest['files'].items() if path.startswith(ASSET_DIRECTORY + '/')}


def prepare_release(previous: Path, candidate: Path, output: Path, live: dict, candidate_sha: str) -> dict:
    previous, candidate, output = (path.resolve() for path in (previous, candidate, output))
    live_sha = live.get('source_commit', '')
    if not isinstance(live_sha, str) or not COMMIT.fullmatch(live_sha) or not COMMIT.fullmatch(candidate_sha):
        raise ReleaseError('exact live and candidate commit IDs are required')
    if output.exists() or output.is_relative_to(previous) or output.is_relative_to(candidate):
        raise ReleaseError('output must be new and outside both artifacts')

    prior = verify_artifact(previous, live_sha, live_sha)
    if prior != live:
        raise ReleaseError('previous artifact does not match the canonical live release')
    next_release = verify_artifact(candidate, candidate_sha, candidate_sha)
    prior_articles = {article['url']: article['published_on'] for article in prior['articles']}
    next_articles = {article['url']: article['published_on'] for article in next_release['articles']}
    if any(url not in next_articles or next_articles[url] != date for url, date in prior_articles.items()):
        raise ReleaseError('candidate removed or redated a live article')

    old_assets = _immutable_files(prior)
    next_assets = _immutable_files(next_release)
    if not next_assets:
        raise ReleaseError('candidate must have versioned assets')
    if any(next_assets[path] != old_assets[path] for path in old_assets.keys() & next_assets.keys()):
        raise ReleaseError('candidate changes an existing immutable asset')
    required_assets = old_assets | next_assets
    aliases = legacy_asset_paths(previous)
    if not aliases <= prior['files'].keys():
        raise ReleaseError('legacy asset omitted from prior release inventory')

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix='.site-release-') as directory:
        temporary = Path(directory) / 'release'
        prepare, promote = temporary / 'prepare', temporary / 'promote'
        _copy_artifact(previous, prepare, prior)
        _copy_files(candidate, prepare, next_assets.keys() - old_assets.keys())
        if not old_assets:
            with (prepare / '_headers').open('a', encoding='utf-8') as headers:
                headers.write(IMMUTABLE_ASSET_HEADERS)
        _copy_artifact(candidate, promote, next_release)
        _copy_files(previous, promote, old_assets.keys() - next_assets.keys())
        _copy_files(previous, promote, aliases)
        promoted = build_manifest(promote, candidate_sha, next_release['articles'], built_at=next_release['built_at'])
        (promote / 'release.json').write_text(json.dumps(promoted, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        (promote / '_headers').write_text(render_release_headers(promoted), encoding='utf-8')
        verify_artifact(promote, candidate_sha, candidate_sha)
        for path, digest in (prior['files'] | required_assets).items():
            if _sha256(prepare / path) != digest:
                raise ReleaseError(f'prepare altered live data or candidate asset: {path}')
        for path, digest in required_assets.items():
            if promoted['files'].get(path) != digest:
                raise ReleaseError(f'promotion is missing a required asset: {path}')
        plan = {
            'live_source': live_sha,
            'live_asset_digest': prior['asset_digest'],
            'candidate_source': candidate_sha,
            'promoted_asset_digest': promoted['asset_digest'],
            'required_assets': required_assets,
            'new_asset_paths': sorted(next_assets.keys() - old_assets.keys()),
            'retained_legacy_paths': sorted(aliases),
        }
        (temporary / 'plan.json').write_text(json.dumps(plan, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        temporary.rename(output)
    return plan


def _read_public_asset(path: str, version: str | None) -> tuple[bytes, str, str]:
    with tempfile.TemporaryDirectory(prefix='site-prepare-readback-') as directory:
        body, headers = Path(directory) / 'body', Path(directory) / 'headers'
        command = ['curl', '--fail', '--silent', '--show-error', '--max-time', '12', '--write-out', '%{http_code}',
                   '--max-filesize', '30000000', '--dump-header', str(headers), '--output', str(body)]
        if version:
            command += ['--header', f'Cloudflare-Workers-Version-Overrides: sulemanji-site="{version}"']
        try:
            result = subprocess.run(command + [PUBLIC_ORIGIN + '/' + quote(path)], capture_output=True, check=False, timeout=15)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise ReleaseError(f'canonical prepare asset unavailable: /{path}') from error
        if result.returncode or result.stdout != b'200':
            raise ReleaseError(f'canonical prepare asset unavailable: /{path}')
        response = dict(line.split(': ', 1) for line in headers.read_text().lower().splitlines() if ': ' in line)
        return body.read_bytes(), response.get('cache-control', ''), response.get('cf-ray', '')


def _validated_path(path: str, digest: str) -> None:
    if (not ASSET_PATH.fullmatch(path) or '..' in Path(path).parts
            or not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest)):
        raise ReleaseError('prepared asset path or digest is invalid')


def _verified_read(path: str, digest: str, version: str | None, read_asset) -> tuple[bytes, str]:
    contents, cache_control, ray = read_asset(path, version)
    if (hashlib.sha256(contents).hexdigest() != digest
            or cache_control != 'public, max-age=31536000, immutable' or not ray):
        raise ReleaseError(f'canonical prepare readback did not match: /{path}')
    return contents, ray


def verify_prepared_assets(assets: dict, *, version: str | None = None, read_asset=_read_public_asset) -> list[dict]:
    if not assets or (version is not None and not WORKER_VERSION.fullmatch(version)):
        raise ReleaseError('prepared asset inventory or Worker version is invalid')
    observations = []
    for path, digest in sorted(assets.items()):
        _validated_path(path, digest)
        _, ray = _verified_read(path, digest, version, read_asset)
        observations.append({'path': '/' + path, 'sha256': digest, 'cf_ray': ray})
    return observations


def retain_live_assets(site: Path, live: dict, *, read_asset=_read_public_asset) -> int:
    site = site.resolve()
    retained = 0
    for path, digest in _immutable_files(live).items():
        _validated_path(path, digest)
        target = site / path
        if target.exists():
            if _sha256(target) != digest:
                raise ReleaseError(f'candidate changes a live immutable asset: /{path}')
            continue
        contents, _ = _verified_read(path, digest, None, read_asset)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(contents)
        retained += 1
    verify_versioned_assets(site)
    return retained


def verify_promotion(candidate: dict, live: dict, *, read_asset=_read_public_asset) -> list[dict]:
    next_assets, live_assets = _immutable_files(candidate), _immutable_files(live)
    if any(next_assets.get(path) != digest for path, digest in live_assets.items()):
        raise ReleaseError('candidate omits a live immutable asset')
    if not next_assets:
        return []
    previous_articles = {item['url']: item['published_on'] for item in live['articles']}
    next_articles = {item['url']: item['published_on'] for item in candidate['articles']}
    if any(url not in next_articles or next_articles[url] != date for url, date in previous_articles.items()):
        raise ReleaseError('candidate removed or redated a live article')
    if not live_assets and any(
        path.startswith(('assets/css/', 'assets/js/')) and candidate['files'].get(path) != digest
        for path, digest in live['files'].items()
    ):
        raise ReleaseError('first immutable release must preserve legacy style and script aliases')
    return verify_prepared_assets(next_assets, read_asset=read_asset)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('build')
    build.add_argument('--previous', type=Path, required=True)
    build.add_argument('--candidate', type=Path, required=True)
    build.add_argument('--candidate-sha', required=True)
    build.add_argument('--output', type=Path, required=True)
    verify = commands.add_parser('verify')
    verify.add_argument('--plan', type=Path, required=True)
    verify.add_argument('--version', help='Select an already deployed prepare version')
    retain = commands.add_parser('retain-live')
    retain.add_argument('--site', type=Path, required=True)
    promote = commands.add_parser('check-promotion')
    promote.add_argument('--manifest', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'verify':
        plan = json.loads(args.plan.read_text(encoding='utf-8'))
        observations = verify_prepared_assets(plan['required_assets'], version=args.version)
        print(json.dumps(observations, indent=2))
        return 0
    live = fetch_public_manifest(PUBLIC_ORIGIN + '/release.json')
    if args.command == 'retain-live':
        print(f'retained {retain_live_assets(args.site, live)} additional live immutable assets')
        return 0
    if args.command == 'check-promotion':
        manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
        observations = verify_promotion(manifest, live)
        print(json.dumps(observations, indent=2))
        return 0
    plan = prepare_release(args.previous, args.candidate, args.output, live, args.candidate_sha)
    print(f"qualified prepare and promote for {len(plan['required_assets'])} immutable assets")
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except ReleaseError as error:
        raise SystemExit(str(error)) from error
