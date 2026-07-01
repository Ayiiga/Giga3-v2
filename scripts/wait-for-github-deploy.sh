#!/usr/bin/env bash
# Wait for a GitHub Actions deploy on main and print short_sha|commit_subject.
# Agents can poll stdout for that marker (e.g. Await pattern "abc1234|Fix").
#
# Usage:
#   ./scripts/wait-for-github-deploy.sh
#   ./scripts/wait-for-github-deploy.sh main "Deploy to Cloudflare Pages" 7c9732c
#
set -euo pipefail

BRANCH="${1:-main}"
WORKFLOW="${2:-Deploy to Cloudflare Pages}"
EXPECTED_SHA="${3:-$(git rev-parse --short=7 HEAD)}"
MAX_WAIT_SECS="${MAX_WAIT_SECS:-900}"
POLL_SECS=5

echo "Waiting for ${WORKFLOW} on ${BRANCH} (commit ${EXPECTED_SHA})..."

deadline=$((SECONDS + MAX_WAIT_SECS))
run_id=""

while [ "$SECONDS" -lt "$deadline" ]; do
  run_id="$(
    gh run list \
      --branch "$BRANCH" \
      --workflow "$WORKFLOW" \
      --limit 20 \
      --json databaseId,headSha,status \
      -q "[.[] | select(.headSha | startswith(\"${EXPECTED_SHA}\"))][0].databaseId" 2>/dev/null || true
  )"
  if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
    break
  fi
  sleep "$POLL_SECS"
done

if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
  echo "::error::No GitHub Actions run found for commit ${EXPECTED_SHA} within ${MAX_WAIT_SECS}s"
  exit 1
fi

echo "Found run ${run_id}; watching until complete..."
gh run watch "$run_id" --exit-status

subject="$(git log -1 --pretty=%s "${EXPECTED_SHA}" 2>/dev/null || git log -1 --pretty=%s)"
marker="${EXPECTED_SHA}|${subject}"

if ! gh run view "$run_id" --log 2>/dev/null | grep -q "GIGA3_DEPLOY_READY ${marker}"; then
  echo "::warning::Deploy marker not found in logs; emitting marker from git metadata anyway."
fi

echo "GIGA3_DEPLOY_READY ${marker}"
echo "${marker}"
