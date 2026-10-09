/**
 * Ghana KG2 visual upgrade — photographic objects + storybook stories.
 *
 * Planned prompts: `ghanaKg2AssetManifest.seed.json`
 * Provenance after fal generation: `ghanaKg2AssetManifest.generated.json`
 * Regenerate: `node scripts/gigalearn-generate-kg2-hq.mjs` (requires FAL_API_KEY)
 * Coverage: `node scripts/gigalearn-kg2-hq-coverage.mjs`
 */

import type { GigaLearnAssetManifest } from "@/lib/gigalearn/mediaLibrary/assetManifest.types";
import generated from "@/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest.generated.json";

export const GHANA_KG2_ASSET_MANIFEST = generated as GigaLearnAssetManifest;

export function ghanaKg2GeneratedAssets() {
  return GHANA_KG2_ASSET_MANIFEST.assets.filter((asset) => asset.status === "generated");
}

export function ghanaKg2PendingAssets() {
  return GHANA_KG2_ASSET_MANIFEST.assets.filter((asset) => asset.status !== "generated");
}

export function ghanaKg2AssetsAwaitingEducatorReview() {
  return ghanaKg2GeneratedAssets().filter((asset) => !asset.licensing.reviewed);
}
