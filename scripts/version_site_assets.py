"""Give rendered styles and scripts URLs bound to the bytes they load."""
from __future__ import annotations

import argparse
import hashlib
import posixpath
import re
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import SplitResult, quote, unquote, urljoin, urlsplit

ASSET_DIRECTORY = '_site-assets'
SOURCE_PATHS = ('/assets/css/', '/assets/js/')
SITE_ORIGIN = 'https://www.sulemanji.com'
SITE_HOSTS = {'www.sulemanji.com', 'sulemanji.com'}
DIGEST = r'[0-9a-f]{64}'
VERSIONED_PATH = re.compile(rf'^/{ASSET_DIRECTORY}/({DIGEST})(/assets/(?:css|js)/.+)$')
ATTRIBUTE = re.compile(r"""\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?""")
CSS_REFERENCE = re.compile(
    r"""/\*.*?\*/|(?<![\w-])(?:(?:@import\s+)?url\(\s*|@import\s+)(?:"([^"]*)"|'([^']*)'|([^\s'";()]+))"""
    r"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'""",
    re.DOTALL | re.IGNORECASE,
)


class AssetReferences(HTMLParser):
    def __init__(self, html: str) -> None:
        super().__init__()
        self.references: list[tuple[int, int, str]] = []
        self.line_offsets = [0, *(match.end() for match in re.finditer('\n', html))]
        self.feed(html)
        self.close()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == 'script':
            name = 'src'
        elif tag == 'link' and {'stylesheet', 'preload', 'modulepreload'} & set((values.get('rel') or '').lower().split()):
            name = 'href'
        else:
            return
        tag_text = self.get_starttag_text()
        row, column = self.getpos()
        offset = self.line_offsets[row - 1] + column
        for match in ATTRIBUTE.finditer(tag_text):
            if match.group(1).lower() != name:
                continue
            group = next((i for i in (2, 3, 4) if match[i] is not None), None)
            if group is not None:
                start, end = match.span(group)
                self.references.append((offset + start, offset + end, match[group]))


def _source_asset(path: str) -> bool:
    return path.startswith(SOURCE_PATHS) and Path(path).suffix in {'.css', '.js', '.mjs'}


def _site_url(value: str, page: Path) -> SplitResult | None:
    base = SITE_ORIGIN + '/' + quote(page.as_posix())
    parsed = urlsplit(urljoin(base, unescape(value)))
    if parsed.scheme not in {'http', 'https'} or parsed.netloc.lower() not in SITE_HOSTS:
        return None
    return parsed


def _read_asset(root: Path, path: str) -> bytes:
    candidate = root / path
    if not candidate.resolve().is_relative_to(root) or not candidate.is_file() or candidate.is_symlink():
        raise ValueError(f'missing site asset: {path}')
    return candidate.read_bytes()


def _build_bundle(root: Path, paths: set[str]) -> dict[str, bytes]:
    bundle = {}
    pending = set(paths)
    while pending:
        path = pending.pop()
        if path in bundle:
            continue
        content = _read_asset(root, path)
        if Path(path).suffix == '.css':
            def rewrite_reference(match: re.Match[str]) -> str:
                group = next((i for i in (1, 2, 3) if match[i] is not None), None)
                if group is None:
                    return match[0]
                parsed = urlsplit(match[group])
                if parsed.scheme or parsed.netloc or not parsed.path:
                    return match[0]
                folder = posixpath.dirname(path)
                resolved = posixpath.normpath(posixpath.join('/' + folder, unquote(parsed.path))).lstrip('/')
                if not resolved.startswith(('assets/', 'images/')):
                    raise ValueError(f'{path}: CSS dependency is outside site assets: {parsed.path}')
                pending.add(resolved)
                relative_path = posixpath.relpath(resolved, folder)
                replacement = parsed._replace(path=quote(relative_path)).geturl()
                start, end = match.span(group)
                return match[0][:start - match.start()] + replacement + match[0][end - match.start():]
            content = CSS_REFERENCE.sub(rewrite_reference, content.decode('utf-8')).encode('utf-8')
        bundle[path] = content
    return bundle


def _bundle_digest(files: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(path.encode('utf-8') + b'\0' + hashlib.sha256(files[path]).digest())
    return digest.hexdigest()


def _verified_bundles(root: Path) -> dict[str, dict[str, bytes]]:
    bundles = {}
    directory = root / ASSET_DIRECTORY
    if not directory.is_dir() or directory.is_symlink():
        raise ValueError('immutable asset directory is missing or invalid')
    for namespace in sorted(directory.iterdir()):
        if not re.fullmatch(DIGEST, namespace.name) or not namespace.is_dir() or namespace.is_symlink():
            raise ValueError(f'invalid immutable asset namespace: {namespace.name}')
        files = {
            path.relative_to(namespace).as_posix(): _read_asset(namespace, path.relative_to(namespace).as_posix())
            for path in namespace.rglob('*') if path.is_file() or path.is_symlink()
        }
        if not files or _bundle_digest(files) != namespace.name:
            raise ValueError(f'immutable asset digest does not match: {namespace.name}')
        bundles[namespace.name] = files
    if not bundles:
        raise ValueError('immutable asset directory is empty')
    return bundles


def _html_pages(root: Path):
    for page in sorted(root.rglob('*.html')):
        if ASSET_DIRECTORY not in page.relative_to(root).parts:
            if page.is_symlink():
                raise ValueError(f'symlinked HTML is unsupported: {page.relative_to(root)}')
            if page.is_file():
                yield page


def verify_versioned_assets(root: Path, *, allow_legacy: bool = False) -> None:
    root = root.resolve()
    directory = root / ASSET_DIRECTORY
    legacy = allow_legacy and not directory.exists() and not directory.is_symlink()
    bundles = {} if legacy else _verified_bundles(root)
    for page in _html_pages(root):
        for _, _, value in AssetReferences(page.read_bytes().decode('utf-8')).references:
            parsed = _site_url(value, page.relative_to(root))
            if parsed is None:
                continue
            path = unquote(parsed.path)
            version = VERSIONED_PATH.fullmatch(path)
            if (not legacy and _source_asset(path)) or (path.startswith(f'/{ASSET_DIRECTORY}/') and
                    (version is None or version[2][1:] not in bundles.get(version[1], {}))):
                raise ValueError(f'{page.relative_to(root)}: missing immutable asset reference {path}')


def version_assets(root: Path, *, retain_from: Path | None = None) -> str:
    root = root.resolve()
    directory = root / ASSET_DIRECTORY
    if directory.exists() or directory.is_symlink():
        raise ValueError('asset versioning requires a clean Jekyll build')
    pages = []
    paths: set[str] = set()
    for page in _html_pages(root):
        html = page.read_bytes().decode('utf-8')
        references = []
        for start, end, value in AssetReferences(html).references:
            parsed = _site_url(value, page.relative_to(root))
            if parsed is not None and _source_asset(unquote(parsed.path)):
                paths.add(unquote(parsed.path)[1:])
                references.append((start, end, parsed))
        if references:
            pages.append((page, html, references))
    if not paths:
        raise ValueError('no site script or style entrypoints found')
    current = _build_bundle(root, paths)
    revision = _bundle_digest(current)
    bundles = _verified_bundles(retain_from.resolve()) if retain_from is not None else {}
    bundles[revision] = current
    for digest, files in bundles.items():
        for filename, content in files.items():
            target = root / ASSET_DIRECTORY / digest / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    prefix = f'/{ASSET_DIRECTORY}/{revision}'
    for page, html, references in pages:
        for start, end, parsed in reversed(references):
            path = prefix + quote(unquote(parsed.path))
            target = parsed._replace(scheme='', netloc='', path=path).geturl()
            html = html[:start] + escape(target, quote=True) + html[end:]
        page.write_bytes(html.encode('utf-8'))
    verify_versioned_assets(root)
    return revision


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('site', type=Path)
    parser.add_argument('--retain-from', type=Path)
    args = parser.parse_args()
    print(f'immutable asset namespace {version_assets(args.site, retain_from=args.retain_from)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
