#!/usr/bin/env bash
# Report a deployment to Cursor Rollouts (Factory Deployments API).
#
# Entry points:
#   bootstrap              — ensure environment + service catalog rows exist
#   start                  — open a deployment when the ship begins
#   finish <outcome>       — close it: succeeded | failed | aborted
#
# Required env:
#   CURSOR_API_KEY           — GitHub Actions secret of the same name
#   CHANGE_MONITOR_ENV       — environment slug (e.g. production)
#   CHANGE_MONITOR_SERVICE   — service slug (e.g. web, convex)
#   DEPLOY_VERSION           — git SHA being shipped (usually GITHUB_SHA)
#
# Optional env:
#   DEPLOY_SOURCE_URI        — defaults to this repository's GitHub URL
#   ROLLOUTS_ACTOR           — stable actor id (defaults to the Actions run URL)
#   ROLLOUTS_DEPLOYMENT_NAME — set by start; finish reads it (or GITHUB_ENV)
#   ROLLOUTS_STATE_FILE      — path to persist deployment.name between steps
set -euo pipefail

AUTH_URL="https://api2.cursor.sh/auth/exchange_user_api_key"
API_BASE="https://api.cursor.com/factory.v1.DeploymentsService"
DEPLOY_SOURCE_URI="${DEPLOY_SOURCE_URI:-https://github.com/Ayiiga/Giga3-v2}"
STATE_FILE="${ROLLOUTS_STATE_FILE:-${RUNNER_TEMP:-/tmp}/rollouts-deployment-name}"

die() {
  echo "::warning::Rollouts reporter: $*" >&2
  exit 0
}

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    die "missing required env ${name}; skipping report"
  fi
}

exchange_token() {
  require CURSOR_API_KEY
  local resp
  resp="$(curl -fsS -X POST "$AUTH_URL" \
    -H "Authorization: Bearer ${CURSOR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null)" || die "API key exchange failed"
  TOKEN="$(printf '%s' "$resp" | jq -r '.accessToken // empty')"
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    die "API key exchange returned no accessToken"
  fi
}

api_post() {
  local path="$1"
  local body="$2"
  local tmp http_code
  tmp="$(mktemp)"
  http_code="$(curl -sS -o "$tmp" -w '%{http_code}' -X POST "${API_BASE}/${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Connect-Protocol-Version: 1" \
    -d "$body" || true)"
  RESP_BODY="$(cat "$tmp")"
  rm -f "$tmp"
  RESP_CODE="$http_code"
}

# Treat HTTP 409 / already_exists as success for idempotent catalog creates.
catalog_ok() {
  local code="$1"
  local body="$2"
  if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "409" ]; then
    return 0
  fi
  if printf '%s' "$body" | grep -qi 'already_exists\|already exists\|AlreadyExists'; then
    return 0
  fi
  return 1
}

cmd_bootstrap() {
  require CHANGE_MONITOR_ENV
  require CHANGE_MONITOR_SERVICE
  exchange_token

  api_post "CreateEnvironment" \
    "$(jq -n --arg id "$CHANGE_MONITOR_ENV" \
      '{environmentId:$id, environment:{displayName:$id}}')"
  if ! catalog_ok "$RESP_CODE" "$RESP_BODY"; then
    die "CreateEnvironment failed (HTTP ${RESP_CODE}): ${RESP_BODY}"
  fi

  api_post "CreateService" \
    "$(jq -n --arg id "$CHANGE_MONITOR_SERVICE" \
      '{serviceId:$id, service:{displayName:$id}}')"
  if ! catalog_ok "$RESP_CODE" "$RESP_BODY"; then
    die "CreateService failed (HTTP ${RESP_CODE}): ${RESP_BODY}"
  fi

  echo "Rollouts catalog ready: environments/${CHANGE_MONITOR_ENV} services/${CHANGE_MONITOR_SERVICE}"
}

actor_id() {
  if [ -n "${ROLLOUTS_ACTOR:-}" ]; then
    printf '%s' "$ROLLOUTS_ACTOR"
    return
  fi
  if [ -n "${GITHUB_SERVER_URL:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ] && [ -n "${GITHUB_RUN_ID:-}" ]; then
    printf '%s/%s/actions/runs/%s' "$GITHUB_SERVER_URL" "$GITHUB_REPOSITORY" "$GITHUB_RUN_ID"
    return
  fi
  printf 'github-actions:%s:%s' "${CHANGE_MONITOR_SERVICE:-unknown}" "${CHANGE_MONITOR_ENV:-unknown}"
}

persist_name() {
  local name="$1"
  printf '%s' "$name" >"$STATE_FILE"
  if [ -n "${GITHUB_ENV:-}" ]; then
    {
      echo "ROLLOUTS_DEPLOYMENT_NAME<<ROLLOUTS_EOF"
      echo "$name"
      echo "ROLLOUTS_EOF"
    } >>"$GITHUB_ENV"
  fi
}

load_name() {
  if [ -n "${ROLLOUTS_DEPLOYMENT_NAME:-}" ]; then
    printf '%s' "$ROLLOUTS_DEPLOYMENT_NAME"
    return
  fi
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
    return
  fi
  printf ''
}

cmd_start() {
  require CHANGE_MONITOR_ENV
  require CHANGE_MONITOR_SERVICE
  require DEPLOY_VERSION
  exchange_token

  local actor
  actor="$(actor_id)"

  api_post "CreateDeployment" \
    "$(jq -n \
      --arg source "$DEPLOY_SOURCE_URI" \
      --arg env "environments/${CHANGE_MONITOR_ENV}" \
      --arg version "$DEPLOY_VERSION" \
      --arg service "services/${CHANGE_MONITOR_SERVICE}" \
      --arg actor "$actor" \
      '{
        deployment: {
          deploySourceUri: $source,
          environment: $env,
          deployVersion: $version,
          service: $service
        },
        event: {
          started: {},
          actor: $actor
        }
      }')"

  if [ "$RESP_CODE" != "200" ] && [ "$RESP_CODE" != "201" ]; then
    die "CreateDeployment failed (HTTP ${RESP_CODE}): ${RESP_BODY}"
  fi

  local name
  name="$(printf '%s' "$RESP_BODY" | jq -r '.deployment.name // .name // empty')"
  if [ -z "$name" ]; then
    die "CreateDeployment response missing deployment.name: ${RESP_BODY}"
  fi
  persist_name "$name"
  echo "Rollouts deployment started: ${name}"
}

cmd_finish() {
  local outcome="${1:-}"
  case "$outcome" in
    succeeded|failed|aborted) ;;
    *) die "finish requires outcome: succeeded | failed | aborted" ;;
  esac

  local name
  name="$(load_name)"
  if [ -z "$name" ]; then
    die "no ROLLOUTS_DEPLOYMENT_NAME; skip finish (start may have been skipped)"
  fi

  exchange_token
  local actor
  actor="$(actor_id)"

  local event_json
  case "$outcome" in
    succeeded)
      event_json="$(jq -n --arg actor "$actor" \
        '{completed:{succeeded:{}}, actor:$actor}')"
      ;;
    failed)
      event_json="$(jq -n --arg actor "$actor" --arg msg "${ROLLOUTS_FAIL_MESSAGE:-deploy step failed}" \
        '{completed:{failed:{message:$msg}}, actor:$actor}')"
      ;;
    aborted)
      event_json="$(jq -n --arg actor "$actor" \
        '{aborted:{}, actor:$actor}')"
      ;;
  esac

  api_post "AppendDeploymentEvent" \
    "$(jq -n --arg name "$name" --argjson event "$event_json" \
      '{name:$name, event:$event}')"

  if [ "$RESP_CODE" != "200" ] && [ "$RESP_CODE" != "201" ]; then
    die "AppendDeploymentEvent failed (HTTP ${RESP_CODE}): ${RESP_BODY}"
  fi
  echo "Rollouts deployment ${outcome}: ${name}"
}

main() {
  local cmd="${1:-}"
  shift || true
  # Never fail the deploy job because of reporting.
  set +e
  case "$cmd" in
    bootstrap) cmd_bootstrap ;;
    start) cmd_start ;;
    finish) cmd_finish "${1:-}" ;;
    *)
      echo "Usage: $0 bootstrap|start|finish <succeeded|failed|aborted>" >&2
      exit 0
      ;;
  esac
}

main "$@"
