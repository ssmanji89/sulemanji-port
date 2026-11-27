#!/usr/bin/env python3
"""Build and serve an isolated Jekyll preview for browser qualification."""

import argparse
import functools
import http.server
import pathlib
import subprocess
import tempfile


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        translated = pathlib.Path(super().translate_path(path))
        if not translated.exists() and not translated.suffix:
            html_file = pathlib.Path(f'{translated}.html')
            if html_file.is_file():
                return str(html_file)
        return str(translated)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4000)
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parent.parent
    with tempfile.TemporaryDirectory(prefix='sulemanji-preview-') as directory:
        output = pathlib.Path(directory)
        subprocess.run(
            ['bundle', 'exec', 'jekyll', 'build', '--quiet', '--destination', str(output)],
            cwd=root,
            check=True,
        )
        handler = functools.partial(PreviewHandler, directory=str(output))
        with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass


if __name__ == '__main__':
    main()
