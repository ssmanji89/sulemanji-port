#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
PYTHON_ENV="$(mktemp -d "${TMPDIR:-/tmp}/sulemanji-release-python.XXXXXX")"
python3 -m venv "$PYTHON_ENV"
export PATH="$PYTHON_ENV/bin:$PATH"
trap 'rm -rf "$PYTHON_ENV"' EXIT
SITE_DEPLOY_TARGET="${SITE_DEPLOY_TARGET:-pages}"
case "$SITE_DEPLOY_TARGET" in
  pages|cloudflare) ;;
  *) echo "SITE_DEPLOY_TARGET must be pages or cloudflare" >&2; exit 2 ;;
esac

npm ci --prefix worker
npm run check --prefix worker
bundle exec ruby scripts/verify_writing.rb --source-only
bundle exec ruby scripts/verify_content_catalog.rb
python -m pip install --disable-pip-version-check --requirement requirements-seo.txt
python3 scripts/generate_article_images.py --check
bundle exec jekyll clean
JEKYLL_ENV=production bundle exec jekyll build
if [[ "${SITE_VERSION_ASSETS:-}" == 1 ]]; then
  version_args=(_site)
  if [[ -n "${SITE_RETAIN_ASSETS_FROM:-}" ]]; then
    version_args+=(--retain-from "$SITE_RETAIN_ASSETS_FROM")
  fi
  python3 scripts/version_site_assets.py "${version_args[@]}"
fi
python3 scripts/build_site_manifest.py --baseline docs/redevelopment/2026-11-26/article-baseline.json
npm ci --prefix cloudflare
SITE_BUILD_PATH="$ROOT/_site" npm run check --prefix cloudflare
bundle exec ruby scripts/verify_writing.rb
python3 scripts/verify_discovery.py
bundle exec ruby -I scripts/tests -e 'Dir["scripts/tests/test_*.rb"].sort.each { |path| require_relative path }'
python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/verify_public_safety.py
python3 scripts/verify_portfolio_review.py
python3 scripts/verify_priority_discovery_plan.py
