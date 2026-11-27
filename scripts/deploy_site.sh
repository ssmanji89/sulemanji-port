#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: scripts/deploy_site.sh --environment staging|production|editorial-fixture --source-commit SHA --artifact PATH" >&2; exit 2; }
ENVIRONMENT=""
SOURCE_COMMIT=""
ARTIFACT=""
while (($#)); do
  case "$1" in
    --environment) ENVIRONMENT="${2:-}"; shift 2 ;;
    --source-commit) SOURCE_COMMIT="${2:-}"; shift 2 ;;
    --artifact) ARTIFACT="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$ENVIRONMENT" == staging || "$ENVIRONMENT" == production || "$ENVIRONMENT" == editorial-fixture ]] || usage
[[ "$SOURCE_COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo "source commit must be a full SHA" >&2; exit 2; }
[[ -n "$ARTIFACT" ]] || usage
[[ "${SITE_DEPLOY_TARGET:-}" == cloudflare ]] || { echo "SITE_DEPLOY_TARGET must be cloudflare" >&2; exit 2; }
[[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] || { echo "Cloudflare token and account id are required" >&2; exit 2; }

if [[ "$ENVIRONMENT" == editorial-fixture ]]; then
  [[ "${GITHUB_REPOSITORY:-}" == ssmanji89/sulemanji-editorial-fixture && "${GITHUB_REF:-}" == refs/heads/main ]] ||
    { echo "fixture deployment requires the fixture repository main branch" >&2; exit 2; }
fi
ROOT="$(git rev-parse --show-toplevel)"
CF="$ROOT/cloudflare"
ARTIFACT="$(cd "$ARTIFACT" && pwd)"
if [[ "$ENVIRONMENT" == editorial-fixture ]]; then
  git fetch --quiet origin main
  CURRENT_MAIN_SHA="$(git rev-parse refs/remotes/origin/main)"
elif [[ "$ENVIRONMENT" == production ]]; then
  if [[ -n "${CURRENT_MAIN_SHA:-}" ]]; then CURRENT_MAIN_SHA="$CURRENT_MAIN_SHA"; else
    git fetch --quiet origin main
    CURRENT_MAIN_SHA="$(git rev-parse refs/remotes/origin/main)"
  fi
else CURRENT_MAIN_SHA="$SOURCE_COMMIT"; fi
PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}" python3 -m scripts.site_release \
  verify --artifact "$ARTIFACT" --source-commit "$SOURCE_COMMIT" --current-main "$CURRENT_MAIN_SHA"

if [[ "$ENVIRONMENT" == editorial-fixture ]]; then
  CONFIG_SOURCE="$CF/wrangler.site-staging.jsonc"
  WORKER_NAME="sulemanji-editorial-fixture-site"
  TARGET_HOST=""
elif [[ "$ENVIRONMENT" == production ]]; then
  CONFIG_SOURCE="$CF/wrangler.site.jsonc"
  WORKER_NAME="sulemanji-site"
  TARGET_HOST="https://www.sulemanji.com"
else
  CONFIG_SOURCE="$CF/wrangler.site-staging.jsonc"
  WORKER_NAME="sulemanji-site-staging"
  TARGET_HOST="${SITE_TARGET_HOST:-}"
  [[ -n "$TARGET_HOST" ]] || { echo "SITE_TARGET_HOST is required for staging readback" >&2; exit 2; }
fi
TEMP_CONFIG="$CF/.wrangler-deploy-$ENVIRONMENT-$$.jsonc"
TEMP_LOG="$(mktemp)"
TEMP_DEPLOYMENTS="$(mktemp)"
RECEIPT="${DEPLOYMENT_RECEIPT_PATH:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/sulemanji-$ENVIRONMENT-$SOURCE_COMMIT.json}"
cleanup() { rm -f "$TEMP_CONFIG" "$TEMP_LOG" "$TEMP_DEPLOYMENTS"; }
trap cleanup EXIT
python3 - "$CONFIG_SOURCE" "$TEMP_CONFIG" "$ARTIFACT" "$CLOUDFLARE_ACCOUNT_ID" "$ENVIRONMENT" <<'PY'
import json,sys
from pathlib import Path
source,destination,artifact,account,environment=sys.argv[1:]
config=json.loads(Path(source).read_text())
manifest=json.loads((Path(artifact)/'release.json').read_text())
config['assets']['directory']=str(Path(artifact).resolve())
config['account_id']=account
config['vars']={'SOURCE_COMMIT':manifest['source_commit'],'ASSET_DIGEST':manifest['asset_digest'],'BUILT_AT':manifest['built_at']}
if environment == 'editorial-fixture':
    config.update(name='sulemanji-editorial-fixture-site', workers_dev=False, preview_urls=False, routes=[])
Path(destination).write_text(json.dumps(config,indent=2)+'\n')
PY
cd "$CF"
./node_modules/.bin/wrangler deploy --config "$TEMP_CONFIG" --message "site $SOURCE_COMMIT" >"$TEMP_LOG" 2>&1
./node_modules/.bin/wrangler deployments list --name "$WORKER_NAME" --json --config "$TEMP_CONFIG" >"$TEMP_DEPLOYMENTS" 2>>"$TEMP_LOG"
VERSION_ID="$(python3 "$ROOT/scripts/verify_cloudflare_deployment.py" "$TEMP_DEPLOYMENTS" "site $SOURCE_COMMIT")"
[[ -n "$VERSION_ID" ]] || { echo "deployment readback omitted worker version id" >&2; exit 1; }
if [[ "$ENVIRONMENT" == staging ]]; then TARGET_HOST="${SITE_TARGET_HOST%/}"; fi
if [[ "$ENVIRONMENT" != editorial-fixture ]]; then
  [[ "$TARGET_HOST" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || { echo "target host must be HTTPS" >&2; exit 2; }
fi
python3 - "$RECEIPT" "$ENVIRONMENT" "$SOURCE_COMMIT" "$ARTIFACT/release.json" "$VERSION_ID" "$TARGET_HOST" <<'PY'
import json,sys
from datetime import datetime,timezone
from pathlib import Path
receipt,environment,source,manifest_path,version,host=sys.argv[1:]
manifest=json.loads(Path(manifest_path).read_text())
result={'environment':environment,'source_commit':source,'asset_digest':manifest['asset_digest'],'worker_version':version,'target_host':host,'observed_at':datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'),'result':'deployed; readback pending'}
p=Path(receipt);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(result,indent=2)+'\n')
print('Private deployment receipt written')
PY
if [[ "$ENVIRONMENT" == editorial-fixture ]]; then
  echo "Private Worker deployment matched. Editorial service-binding readback remains pending."
  exit 0
fi
check_status() {
  local path="$1" expected="$2" observed
  observed="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 20 "$TARGET_HOST$path" || true)"
  [[ "$observed" == "$expected" ]] || { echo "readback $path expected HTTP $expected, received $observed" >&2; return 1; }
}
for attempt in $(seq 1 24); do
  if curl --silent --show-error --fail --output /dev/null --max-time 15 "$TARGET_HOST/writing"; then break; fi
  if [[ "$attempt" == 24 ]]; then echo "deployment host not reachable" >&2; exit 1; fi
  sleep 5
done
check_status /writing 200
check_status /writing/ 301
check_status /work/market-systems/ 200
check_status /notes/late-october-skywatching-binoculars-telescope 200
check_status /workshop-intake/ 410
check_status /notes/does-not-exist 404
VERIFY_ARGS=(
  --base-url "$TARGET_HOST"
  --expected-commit "$SOURCE_COMMIT"
  --manifest "$ARTIFACT/release.json"
)
if [[ "$ENVIRONMENT" == staging ]]; then VERIFY_ARGS+=(--staging); fi
PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}" python3 -m scripts.verify_cloudflare_live "${VERIFY_ARGS[@]}"
python3 - "$RECEIPT" <<'PY'
import json,sys
from pathlib import Path
receipt_path=sys.argv[1]
receipt=json.loads(Path(receipt_path).read_text())
receipt['result']='deployed and full public release verification passed'
Path(receipt_path).write_text(json.dumps(receipt,indent=2)+'\n')
print('Full public release verification passed')
PY
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '\nCloudflare %s deployment verified\n- Source: %s\n- Worker version: %s\n- Host: %s\n' "$ENVIRONMENT" "$SOURCE_COMMIT" "$VERSION_ID" "$TARGET_HOST" >> "$GITHUB_STEP_SUMMARY"
fi
