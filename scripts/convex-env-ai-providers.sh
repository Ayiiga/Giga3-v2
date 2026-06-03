#!/usr/bin/env bash
# Set fal.ai + optional Gemini env on Convex (run after: npx convex login)
set -euo pipefail

: "${FAL_KEY:?Set FAL_KEY in your shell before running}"

npx convex env set FAL_KEY "$FAL_KEY"
npx convex env set FAL_VIDEO_MODEL "nvidia/cosmos-3-super/image-to-video"
npx convex env set FAL_IMAGE_MODEL "fal-ai/nano-banana-pro"

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  npx convex env set GEMINI_API_KEY "$GEMINI_API_KEY"
fi
if [[ -n "${GEMINI_MODEL:-}" ]]; then
  npx convex env set GEMINI_MODEL "$GEMINI_MODEL"
fi

echo "Convex fal/Gemini env updated."
