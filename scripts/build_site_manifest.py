"""Build public, non-sensitive release metadata for a Jekyll asset bundle."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

EXCLUDED = {'release.json', 'release-manifest.json', '_headers', '_redirects', '.assetsignore'}
PUBLIC_ORIGIN = 'https://www.sulemanji.com'
PUBLIC_PAGE_FILES = {
    '/': 'index.html',
    '/explore/': 'explore/index.html',
    '/writing': 'writing.html',
    '/about/': 'about/index.html',
    '/experience/': 'experience/index.html',
    '/contact/': 'contact/index.html',
    '/work/market-systems/': 'work/market-systems/index.html',
    '/work/integrations/': 'work/integrations/index.html',
    '/work/mathematical-verification/': 'work/mathematical-verification/index.html',
}


class _VisibleContainerText(HTMLParser):
    """Extract one rendered content region using the publisher's text-node spacing rules."""
    IGNORED_TAGS = {'script', 'style', 'noscript', 'template'}

    def __init__(self, container_tag: str, data_attribute: str | None = None) -> None:
        super().__init__(convert_charrefs=True)
        self.container_tag = container_tag
        self.data_attribute = data_attribute
        self.depth = 0
        self.container_count = 0
        self.ignored: list[str] = []
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if (not self.depth and tag == self.container_tag
                and (self.data_attribute is None or self.data_attribute in values)):
            self.depth = 1
            self.container_count += 1
            return
        if not self.depth:
            return
        if tag == self.container_tag:
            self.depth += 1
        if tag in self.IGNORED_TAGS:
            self.ignored.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if not self.depth:
            return
        if tag in self.IGNORED_TAGS and tag in self.ignored:
            self.ignored.remove(tag)
        if tag == self.container_tag:
            self.depth -= 1

    def handle_data(self, data: str) -> None:
        if self.depth and not self.ignored:
            self.parts.append(data)


class _PageMetadata(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_depth = 0
        self.title_parts: list[str] = []
        self.heading_depth = 0
        self.heading_parts: list[str] = []
        self.values: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == 'title':
            self.title_depth += 1
        elif tag == 'h1':
            self.heading_depth += 1
        elif tag == 'link' and 'canonical' in (values.get('rel') or '').split():
            self.values['canonical'] = values.get('href') or ''
        elif tag == 'meta':
            key = (values.get('property') or values.get('name') or '').lower()
            if key in {'description', 'og:title', 'robots'}:
                self.values[key] = values.get('content') or ''

    def handle_endtag(self, tag: str) -> None:
        if tag == 'title' and self.title_depth:
            self.title_depth -= 1
        elif tag == 'h1' and self.heading_depth:
            self.heading_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title_parts.append(data)
        if self.heading_depth:
            self.heading_parts.append(data)

    def normalized_values(self) -> dict[str, str]:
        return {
            'canonical': self.values.get('canonical', ''),
            'title': ' '.join(' '.join(self.title_parts).split()),
            'description': self.values.get('description', ''),
            'og_title': self.values.get('og:title', ''),
            'h1': ' '.join(' '.join(self.heading_parts).split()),
            'robots': self.values.get('robots', ''),
        }


def _visible_content_sha256(rendered_html: str, container_tag: str,
                            data_attribute: str | None = None) -> str:
    parser = _VisibleContainerText(container_tag, data_attribute)
    parser.feed(rendered_html)
    parser.close()
    normalized = ' '.join(' '.join(parser.parts).split())
    if parser.container_count != 1 or not normalized:
        raise ValueError('rendered page must contain one nonempty visible content region')
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def article_content_sha256(rendered_html: str) -> str:
    return _visible_content_sha256(rendered_html, 'div', 'data-writing-body')


def page_content_sha256(rendered_html: str) -> str:
    return _visible_content_sha256(rendered_html, 'main')


def _page_identity(site_root: Path) -> list[dict[str, str]]:
    pages = []
    for url, relative_path in sorted(PUBLIC_PAGE_FILES.items()):
        html_path = site_root / relative_path
        if not html_path.is_file():
            raise ValueError(f'missing rendered public page for {url}: {relative_path}')
        rendered = html_path.read_text(encoding='utf-8')
        metadata = _PageMetadata()
        metadata.feed(rendered)
        metadata.close()
        all_metadata = metadata.normalized_values()
        page_metadata = {key: all_metadata[key] for key in ('canonical', 'title', 'description', 'og_title')}
        if page_metadata['canonical'] != PUBLIC_ORIGIN + url or not all(
                page_metadata[key] for key in ('title', 'description', 'og_title')):
            raise ValueError(f'{html_path}: public page metadata is incomplete or noncanonical')
        try:
            content_sha256 = page_content_sha256(rendered)
        except (OSError, ValueError) as error:
            raise ValueError(f'{html_path}: {error}') from error
        pages.append({'url': url, **page_metadata, 'content_sha256': content_sha256})
    return pages


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
        content_sha256 = article.get('content_sha256')
        if not url.startswith('/') or url.startswith('//') or url in seen_urls:
            raise ValueError(f'invalid or duplicate article URL: {url}')
        if published_on is not None and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(published_on)):
            raise ValueError(f'invalid publication date for {url}')
        if not isinstance(content_sha256, str) or not re.fullmatch(r'[0-9a-f]{64}', content_sha256):
            raise ValueError(f'invalid visible article content digest for {url}')
        metadata = {key: article.get(key) for key in ('canonical', 'title', 'description', 'og_title', 'h1', 'robots', 'indexable')}
        if (not all(isinstance(metadata[key], str) for key in ('canonical', 'title', 'description', 'og_title', 'h1', 'robots'))
                or metadata['canonical'] != PUBLIC_ORIGIN + url
                or not all(metadata[key] for key in ('title', 'description', 'og_title', 'h1'))
                or not isinstance(metadata['indexable'], bool)
                or metadata['indexable'] != ('noindex' not in [token.strip().lower() for token in metadata['robots'].split(',')])):
            raise ValueError(f'invalid article metadata identity for {url}')
        seen_urls.add(url)
        normalized_articles.append({
            'url': url, 'published_on': published_on, 'content_sha256': content_sha256, **metadata,
        })
    pages = _page_identity(root)
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
    for article in sorted(normalized_articles, key=lambda item: item['url']):
        aggregate.update(json.dumps(article, sort_keys=True, separators=(',', ':')).encode('utf-8') + b'\n')
    for page in pages:
        aggregate.update(json.dumps(page, sort_keys=True, separators=(',', ':')).encode('utf-8') + b'\n')
    return {
        'schema_version': 1,
        'source_commit': source_commit,
        'asset_digest': 'sha256:' + aggregate.hexdigest(),
        'built_at': built_at or datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'files': files,
        'articles': sorted(normalized_articles, key=lambda item: item['url']),
        'pages': pages,
    }


def render_release_headers(manifest: dict[str, Any]) -> str:
    """Bind Cloudflare-served static assets to the release manifest identity."""
    source_commit = manifest.get('source_commit')
    asset_digest = manifest.get('asset_digest')
    built_at = manifest.get('built_at')
    if not isinstance(source_commit, str) or not re.fullmatch(r'[0-9a-fA-F]{7,64}|local|test', source_commit):
        raise ValueError('release header source commit is invalid')
    if not isinstance(asset_digest, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', asset_digest):
        raise ValueError('release header asset digest is invalid')
    if not isinstance(built_at, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', built_at):
        raise ValueError('release header build timestamp is invalid')
    try:
        parsed = datetime.fromisoformat(built_at.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError('release header build timestamp is invalid') from error
    if parsed.isoformat(timespec='seconds').replace('+00:00', 'Z') != built_at:
        raise ValueError('release header build timestamp is not canonical UTC')
    headers = (
        '/*\n'
        f'  X-Site-Source-Commit: {source_commit}\n'
        f'  X-Site-Asset-Digest: {asset_digest}\n'
        f'  X-Site-Built-At: {built_at}\n'
    )
    if any(path.startswith('_site-assets/') for path in manifest.get('files', {})):
        headers += '\n/_site-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n'
    return headers


def _article_identity(site_root: Path) -> list[dict[str, str | None]]:
    notes_dir = site_root / 'notes'
    if not notes_dir.is_dir():
        raise ValueError('built notes directory is required to preserve article routes')
    articles = []
    for html_path in sorted(notes_dir.rglob('*.html')):
        rendered = html_path.read_text(encoding='utf-8', errors='replace')
        metadata = _PageMetadata()
        metadata.feed(rendered)
        metadata.close()
        values = metadata.normalized_values()
        from urllib.parse import urlparse
        url = urlparse(values['canonical']).path
        published = re.search(r'<time[^>]+data-published-on[^>]+datetime=["\'](\d{4}-\d{2}-\d{2})', rendered, re.I)
        if not published:
            published = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', rendered, re.I)
        try:
            content_sha256 = article_content_sha256(rendered)
        except ValueError as error:
            raise ValueError(f'{html_path}: {error}') from error
        articles.append({
            'url': url,
            'published_on': published.group(1) if published else None,
            'content_sha256': content_sha256,
            **values,
            'indexable': 'noindex' not in [token.strip().lower() for token in values['robots'].split(',')],
        })
    if not articles:
        raise ValueError('no rendered note pages found')
    return articles


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--site-root', type=Path, default=Path('_site'))
    parser.add_argument('--source-commit')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--baseline', type=Path, help='JSON file with existing article URLs and dates to preserve')
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
        article_identity = {item['url']: item['published_on'] for item in articles}
        baseline_urls = {item['url'] for item in baseline}
        if len(baseline_urls) != len(baseline) or any(
            item['url'] not in article_identity
            or article_identity[item['url']] != item['published_on']
            for item in baseline
        ):
            raise SystemExit('built article URLs or dates differ from the approved baseline')
    manifest = build_manifest(args.site_root, source_commit, articles)
    output = args.output or args.site_root / 'release.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    (Path(args.site_root).resolve() / '_headers').write_text(render_release_headers(manifest), encoding='utf-8')
    print(f"{len(manifest['files'])} assets; {len(articles)} articles; {manifest['asset_digest']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
