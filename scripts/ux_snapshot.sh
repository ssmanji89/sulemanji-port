#!/usr/bin/env bash
# Screenshots the top of every page at desktop+mobile for the 10-second test.
set -euo pipefail
cd "$(dirname "$0")/.."
bundle exec jekyll build
# python3 -m http.server does not resolve Jekyll's extensionless permalinks
# (e.g. /about -> about.html) the way real static hosting (GitHub/Cloudflare
# Pages) does, so a plain http.server 404s on every inner page. Use a tiny
# handler that appends .html when the exact path is missing.
( cd _site && python3 -c "
import http.server, os
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        p = self.path.split('?')[0]
        if p != '/' and not p.endswith('/') and not os.path.isfile('.' + p) and os.path.isfile('.' + p + '.html'):
            self.path = p + '.html'
        return super().do_GET()
http.server.HTTPServer(('127.0.0.1', 4111), Handler).serve_forever()
" & echo $! > /tmp/ux_srv.pid )
sleep 2
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v chromium || command -v google-chrome)"
mkdir -p docs/ux-shots
for p in "index:/" "projects:/projects" "about:/about" "resume:/resume" "experience:/experience" "contact:/work-with-me" "story:/story"; do
  name="${p%%:*}"; path="${p#*:}"
  "$CHROME" --headless --disable-gpu --window-size=1280,900 --screenshot="docs/ux-shots/${name}-desktop.png" "http://localhost:4111${path}" 2>/dev/null
  "$CHROME" --headless --disable-gpu --window-size=375,812 --screenshot="docs/ux-shots/${name}-mobile.png" "http://localhost:4111${path}" 2>/dev/null
done
kill "$(cat /tmp/ux_srv.pid)"; ls -la docs/ux-shots/
