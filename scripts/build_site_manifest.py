"""Build public, non-sensitive release metadata for a Jekyll asset bundle."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EXCLUDED = {'release.json', 'release-manifest.json', '_headers', '_redirects', '.assetsignore'}


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(root: Path, source_commit: str, articles: list[dict[str, str | None]], built_at: str | None = None) -> dict[str, Any]:
    root = Path(root).resolve()
    if not root.is_dir():
        raise ValueError('site root must be a directory')
    if not re.fullmatch(r'[0-9a-fA-F]{7,64}|local|test', source_commit):
        raise ValueError('source commit must be a commit id or local/test marker')
    normalized_articles = []
    seen_urls = set()
    for article in articles:
        url = article.get('url', '')
        published_on = article.get('published_on')
        if not url.startswith('/') or url.startswith('//') or url in seen_urls:
            raise ValueError(f'invalid or duplicate article URL: {url}')
        if published_on is not None and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(published_on)):
            raise ValueError(f'invalid publication date for {url}')
        seen_urls.add(url)
        normalized_articles.append({'url': url, 'published_on': published_on})
    files = {}
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(root).as_posix()
        if relative in EXCLUDED or relative.startswith(('.git/', '.wrangler/')):
            continue
        files[relative] = _file_hash(path)
    aggregate = hashlib.sha256()
    for name, file_digest in files.items():
        aggregate.update(name.encode('utf-8') + b'\0' + file_digest.encode('ascii') + b'\n')
    return {
        'schema_version': 1,
        'source_commit': source_commit,
        'asset_digest': 'sha256:' + aggregate.hexdigest(),
        'built_at': built_at or datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'files': files,
        'articles': sorted(normalized_articles, key=lambda item: item['url']),
    }


def _article_identity(site_root: Path) -> list[dict[str, str | None]]:
    notes_dir = site_root / 'notes'
    if not notes_dir.is_dir():
        raise ValueError('built notes directory is required to preserve article routes')
    articles = []
    for html_path in sorted(notes_dir.rglob('*.html')):
        rendered = html_path.read_text(encoding='utf-8', errors='replace')
        canonical = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', rendered, re.I)
        if not canonical:
            canonical = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical', rendered, re.I)
        if canonical:
            from urllib.parse import urlparse
            url = urlparse(canonical.group(1)).path
        else:
            relative = html_path.relative_to(site_root).with_suffix('')
            url = '/' + relative.as_posix().removesuffix('/index')
        published = re.search(r'<time[^>]+data-published-on[^>]+datetime=["\'](\d{4}-\d{2}-\d{2})', rendered, re.I)
        if not published:
            published = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', rendered, re.I)
        articles.append({'url': url, 'published_on': published.group(1) if published else None})
    if not articles:
        raise ValueError('no rendered note pages found')
    return articles


def validate_article_baseline(articles: list[dict[str, str | None]], baseline: list[dict[str, str | None]]) -> bool:
    """Require every baseline article URL and date while allowing new articles."""
    def by_url(rows: list[dict[str, str | None]]) -> dict[str, str | None]:
        result: dict[str, str | None] = {}
        for row in rows:
            url = row.get('url')
            if not isinstance(url, str) or not url.startswith('/') or url.startswith('//'):
                raise ValueError(f'invalid article URL in baseline check: {url}')
            if url in result:
                raise ValueError(f'duplicate article URL: {url}')
            result[url] = row.get('published_on')
        return result

    actual = by_url(articles)
    expected = by_url(baseline)
    missing = sorted(expected.keys() - actual.keys())
    if missing:
        raise ValueError(f'missing baseline article: {", ".join(missing)}')
    changed = sorted(url for url in expected if actual[url] != expected[url])
    if changed:
        raise ValueError(f'published date changed for baseline article: {", ".join(changed)}')
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--site-root', type=Path, default=Path('_site'))
    parser.add_argument('--source-commit')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--baseline', type=Path, help='JSON file with article URLs and dates that must remain unchanged; additions are allowed')
    parser.add_argument('--allow-dirty', action='store_true', help='label a local test artifact as source_commit=local when the checkout is dirty')
    args = parser.parse_args()
    root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
    dirty = bool(subprocess.check_output(['git', '-C', str(root), 'status', '--porcelain'], text=True).strip())
    if dirty and not args.allow_dirty:
        raise SystemExit('refusing to label a dirty source tree as a release commit; commit the tree or pass --allow-dirty for local tests')
    source_commit = args.source_commit or ('local' if dirty else subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--verify', 'HEAD'], text=True).strip())
    articles = _article_identity(args.site_root)
    if args.baseline:
        baseline_payload = json.loads(args.baseline.read_text(encoding='utf-8'))
        baseline = baseline_payload.get('articles', baseline_payload)
        try:
            validate_article_baseline(articles, baseline)
        except ValueError as exc:
            raise SystemExit(f'built article URLs or dates differ from the approved baseline: {exc}') from exc
    manifest = build_manifest(args.site_root, source_commit, articles)
    output = args.output or args.site_root / 'release.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f"{len(manifest['files'])} assets; {len(articles)} preserved articles; {manifest['asset_digest']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
