#!/usr/bin/env python3
"""Serve an existing Jekyll build locally with outbound intake disabled by CSP."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

REVIEW_CSP = "connect-src 'none'; form-action 'none'; frame-src 'none'"


class ReviewHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        root = Path(self.directory).resolve()
        candidate = (root / unquote(urlsplit(path).path).lstrip('/')).resolve()
        if not candidate.is_relative_to(root):
            return str(root / '__invalid_review_path__')
        for choice in (candidate, Path(str(candidate) + '.html'), candidate / 'index.html'):
            if choice.is_file() and choice.resolve().is_relative_to(root):
                return str(choice)
        # A nonexistent path avoids exposing directory listings.
        return str(root / '__missing_review_path__')

    def end_headers(self):
        self.send_header('Content-Security-Policy', REVIEW_CSP)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1] / '_site')
    parser.add_argument('--port', type=int, default=4000)
    args = parser.parse_args()
    root = args.site.resolve()
    if not (root / 'index.html').is_file():
        parser.error(f'{root} has no index.html; run the Jekyll build first')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(ReviewHandler, directory=str(root)))
    print(f'Review {root} at http://127.0.0.1:{server.server_port} (outbound intake blocked)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
