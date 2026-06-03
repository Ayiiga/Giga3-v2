#!/usr/bin/env bash
# Deploy Giga3 Convex backend (production).
# Usage:
#   ./scripts/convex-deploy.sh
# Or with a deploy key (CI / non-interactive):
#   CONVEX_DEPLOY_KEY=... ./scripts/convex-deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "Deploying with CONVEX_DEPLOY_KEY..."
  npx convex deploy --yes
else
  echo "No CONVEX_DEPLOY_KEY — using interactive login..."
  npx convex login
  npx convex deploy
fi

echo "Done. Set production env in Convex dashboard:"
echo "  OPENAI_API_KEY, PAYSTACK_SECRET_KEY, FRONTEND_URL=https://www.giga3ai.com"
echo "  Optional: OPENAI_FALLBACK_MODEL, OPENAI_FALLBACK_API_KEY, REPLICATE_API_TOKEN"
