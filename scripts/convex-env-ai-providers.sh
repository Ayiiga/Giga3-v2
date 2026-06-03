#!/usr/bin/env bash
# Set optional multi-provider AI env vars on Convex production.
# Run from repo root after: npx convex login
#
# Usage:
#   GEMINI_API_KEY=... FAL_KEY=... ./scripts/convex-env-ai-providers.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${GEMINI_API_KEY:-}" ]; then
  npx convex env set GEMINI_API_KEY "$GEMINI_API_KEY"
fi

npx convex env set GEMINI_MODEL "${GEMINI_MODEL:-gemini-2.5-flash}"

if [ -n "${FAL_KEY:-}" ]; then
  npx convex env set FAL_KEY "$FAL_KEY"
elif [ -n "${FAL_API_KEY:-}" ]; then
  npx convex env set FAL_API_KEY "$FAL_API_KEY"
fi

npx convex env set FAL_MODEL "${FAL_MODEL:-google/gemini-2.5-flash}"
npx convex env set FAL_IMAGE_MODEL "${FAL_IMAGE_MODEL:-fal-ai/nano-banana-pro}"

echo "Done. Redeploy: npx convex deploy --yes"
