#!/usr/bin/env python3
"""Check the built portfolio's shared metadata, landmarks and local navigation."""
import argparse
from html.parser import HTMLParser
import json
import struct
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ORIGIN = 'https://www.sulemanji.com'
PERSON_ID = ORIGIN + '/#person'
ROUTES = (
    '/', '/about', '/experience', '/projects', '/story', '/beyond', '/resume',
    '/work-with-me', '/work-with-me/personal', '/work-with-me/quote',
    '/work-with-me/thanks', '/work-with-me/terms', '/work-with-me/priority',
    '/case-studies/agentic-msp-delivery', '/case-studies/ff-cli',
    '/case-studies/microsoft-365-acquisition-integration', '/case-studies/rfms-operations',
)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = set()
        self.title = ''
        self.schemas = []
        self.capture = None
        self.buffer = ''
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'title' or (tag == 'script' and attrs.get('type') == 'application/ld+json'):
            self.capture, self.buffer = tag, ''

    def handle_data(self, data):
        if self.capture:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == self.capture:
            if tag == 'title':
                self.title = self.buffer.strip()
            else:
                self.schemas.append(json.loads(self.buffer))
            self.capture = None

    def elements(self, tag):
        return [attrs for name, attrs in self.tags if name == tag]

    def meta(self, key):
        return [a.get('content') for a in self.elements('meta')
                if a.get('name') == key or a.get('property') == key]


def resolve(root, path):
    relative = unquote(path).lstrip('/')
    candidate = (root / relative).resolve()
    if not candidate.is_relative_to(root):
        return None
    choices = [candidate, Path(str(candidate) + '.html'), candidate / 'index.html']
    return next((p for p in choices if p.is_file()), None)


def objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from objects(child)


def verify(root):
    failures, cache = [], {}
    titles, descriptions, canonicals = set(), set(), set()

    def check(ok, route, name):
        if not ok:
            failures.append(f'{route}: {name}')

    def document(path):
        if path not in cache:
            cache[path] = Document(path.read_text(encoding='utf-8'))
        return cache[path]

    portrait = root / 'images/sulemanji-profile.png'
    if portrait.is_file():
        header = portrait.read_bytes()[:24]
        check(len(header) == 24 and header[:8] == b'\x89PNG\r\n\x1a\n'
              and struct.unpack('>II', header[16:24]) == (201, 200), '/', 'portrait has declared PNG dimensions')

    check(not (root / 'worker').exists(), '/', 'Worker source/dependencies excluded from public build')

    for route in ROUTES:
        path = resolve(root, route)
        check(path is not None, route, 'required rendered route missing')
        if path is None:
            continue
        try:
            doc = document(path)
        except (ValueError, OSError) as error:
            check(False, route, f'HTML/JSON-LD parse: {error}')
            continue
        for tag in ('main', 'h1', 'title'):
            check(len(doc.elements(tag)) == 1, route, f'exactly one {tag}')
        canonical = [a.get('href') for a in doc.elements('link') if 'canonical' in a.get('rel', '').split()]
        check(canonical == [ORIGIN + route], route, 'one route-specific canonical')
        desc = doc.meta('description')
        for values, seen, label in (([doc.title], titles, 'title'), (desc, descriptions, 'description'), (canonical, canonicals, 'canonical')):
            check(len(values) == 1 and bool(values[0]) and values[0] not in seen, route, f'unique nonempty {label}')
            seen.update(values)
        check(doc.meta('twitter:card') == ['summary'], route, 'portrait uses compact social card')
        check(doc.meta('og:url') == canonical, route, 'Open Graph canonical agrees')
        check(doc.meta('og:description') == desc, route, 'Open Graph description agrees')
        check(doc.meta('og:image') == [ORIGIN + '/images/sulemanji-profile.png'], route, 'truthful portrait preview')
        for key, expected in (('width', '201'), ('height', '200'), ('alt', 'Portrait of Suleman Manji')):
            check(doc.meta('og:image:' + key) == [expected], route, 'portrait ' + key)
        nodes = list(objects(doc.schemas))
        people = [node for node in nodes if node.get('@type') == 'Person']
        check(len(people) == 1, route, 'one Person definition')
        if people:
            person = people[0]
            check(person.get('@id') == PERSON_ID and person.get('name') == 'Suleman Manji'
                  and person.get('jobTitle') == 'Sr. Services Engineer'
                  and person.get('worksFor') == {'@type': 'Organization', 'name': 'Viyu Network Solutions', 'url': 'https://www.viyu.net'}, route, 'Person identity and employer')
        profiles = [node for node in nodes if node.get('@type') == 'ProfilePage']
        check(len(profiles) == (1 if route == '/about' else 0), route, 'About-only ProfilePage')
        if profiles:
            check(profiles[0].get('mainEntity') == {'@id': PERSON_ID}, route, 'profile references shared Person')
        check(any(node.get('@type') in ('WebPage', 'WebSite', 'BlogPosting', 'Article') for node in nodes), route, 'SEO page schema retained')
        check(not any('portfolio-rewrite.css' in a.get('href', '') for a in doc.elements('link')), route, 'retired homepage stylesheet absent')
        if route == '/work-with-me':
            check(not doc.elements('form'), route, 'scenario root has no form')
            check(not any('work-with-me.js' in a.get('src', '') or 'turnstile' in a.get('src', '') for a in doc.elements('script')), route, 'scenario root has no intake scripts')
        if route == '/work-with-me/personal':
            check(any(a.get('id') == 'work-with-me-intake' for a in doc.elements('form')), route, 'personal form present')
            check(any(a.get('name') == 'contextType' and a.get('type') == 'hidden' and a.get('value') == 'personal' for a in doc.elements('input')), route, 'personal context preserved')
        for tag, attrs in doc.tags:
            reference = attrs.get('href') if tag in ('a', 'link') else attrs.get('src') if tag in ('script', 'img') else None
            if not reference:
                continue
            url = urlsplit(urljoin(ORIGIN + route, reference))
            if url.scheme not in ('http', 'https') or url.netloc != urlsplit(ORIGIN).netloc:
                continue
            target = resolve(root, url.path)
            check(target is not None, route, f'local target exists: {reference}')
            if target and url.fragment and target.suffix == '.html':
                try:
                    check(unquote(url.fragment) in document(target).ids, route, f'fragment exists: {reference}')
                except (ValueError, OSError) as error:
                    check(False, route, f'target parse {reference}: {error}')
    if failures:
        print('\n'.join('FAIL ' + item for item in failures))
        return 1
    print(f'PASS portfolio review: {len(ROUTES)} routes; parsed landmarks, metadata, JSON-LD, links and intake separation')
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1] / '_site')
    raise SystemExit(verify(parser.parse_args().site.resolve()))
