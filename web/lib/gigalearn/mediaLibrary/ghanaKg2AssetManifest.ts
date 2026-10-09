/**
 * Ghana KG2 visual upgrade — small polished collection first.
 * Photographic objects stay photographic; Ananse story art stays storybook.
 *
 * Planned prompts live in `ghanaKg2AssetManifest.seed.json`.
 * Provenance + on-disk status after fal generation: `ghanaKg2AssetManifest.generated.json`.
 * Regenerate with: `node scripts/gigalearn-generate-kg2-hq.mjs` (requires FAL_API_KEY).
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
