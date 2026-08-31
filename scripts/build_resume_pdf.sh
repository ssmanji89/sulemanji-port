#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bundle exec jekyll build
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v chromium || command -v google-chrome)"
mkdir -p assets/resume
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="assets/resume/Suleman-Manji-Resume.pdf" \
  "file://$(pwd)/_site/resume.html"
ls -la assets/resume/Suleman-Manji-Resume.pdf
