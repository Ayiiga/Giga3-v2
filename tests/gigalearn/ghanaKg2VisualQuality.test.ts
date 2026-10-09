import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMediaItemById } from "../../web/lib/gigalearn/mediaLibrary/catalog";
import { GHANA_KG2_MEDIA_SLICE_IDS } from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana";
import {
  GHANA_KG2_ASSET_MANIFEST,
  ghanaKg2GeneratedAssets,
  ghanaKg2PendingAssets,
} from "../../web/lib/gigalearn/mediaLibrary/ghanaKg2AssetManifest";
import { requiredRemoteAssets } from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";

const PUBLIC = resolve(__dirname, "../../web/public");

function publicPath(url: string) {
  return resolve(PUBLIC, url.replace(/^\//, ""));
}

describe("Ghana KG2 high-quality visual collection", () => {
  it("records fal-generated assets with provenance fields", () => {
    expect(GHANA_KG2_ASSET_MANIFEST.collectionId).toMatch(/^ghana-kg2-hq-v/);
    expect(GHANA_KG2_ASSET_MANIFEST.country).toBe("Ghana");
    const generated = ghanaKg2GeneratedAssets();
    expect(generated.length).toBeGreaterThanOrEqual(40);
    expect(ghanaKg2PendingAssets()).toHaveLength(0);
    const ids = new Set(generated.map((a) => a.id));
    expect(ids.size).toBe(generated.length);
    for (const asset of generated) {
      expect(asset.filename).toMatch(/\.webp$/);
      expect(asset.learningObjective.length).toBeGreaterThan(10);
      expect(asset.ageGroup).toMatch(/KG2/);
      expect(asset.country).toBe("Ghana");
      expect(asset.aspectRatio).toBe("1:1");
      expect(asset.altText.length).toBeGreaterThan(20);
      expect(asset.offlineRequired).toBe(true);
      expect(asset.licensing.provider).toBe("fal");
      expect(asset.licensing.rights).toBe("original-ai-generated");
      expect(asset.licensing.reviewed).toBe(false);
      expect(asset.byteLength).toBeGreaterThan(5_000);
      expect(asset.byteLength).toBeLessThan(1_500_000);
      expect(asset.contentHash).toMatch(/^[a-f0-9]+$/);
    }
  });

  it("keeps photographic and storybook styles separated", () => {
    const photo = GHANA_KG2_ASSET_MANIFEST.assets.filter((a) => a.style === "photographic");
    const story = GHANA_KG2_ASSET_MANIFEST.assets.filter(
      (a) => a.style === "storybook_illustration"
    );
    expect(photo.length).toBeGreaterThanOrEqual(35);
    expect(story.map((a) => a.id).sort()).toEqual(
      ["hq-ananse-listens", "hq-ananse-sharing-pot", "hq-little-weaver", "hq-market-morning"].sort()
    );
    expect(photo.every((a) => a.style === "photographic")).toBe(true);
  });

  it("ships real WebP binaries that match manifest hashes and sizes", () => {
    for (const asset of ghanaKg2GeneratedAssets()) {
      const file = publicPath(asset.publicPath);
      expect(existsSync(file), asset.publicPath).toBe(true);
      const buf = readFileSync(file);
      expect(buf.byteLength).toBe(asset.byteLength);
      expect(buf.byteLength).toBeLessThan(1_500_000);
      // RIFF....WEBP
      expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
      const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
      expect(hash).toBe(asset.contentHash);
    }
  });

  it("wires HQ posters into the KG2 Discover slice with required offline remotes", () => {
    for (const id of GHANA_KG2_MEDIA_SLICE_IDS) {
      const item = getMediaItemById(id)!;
      expect(item, id).toBeTruthy();
      expect(item.posterImage?.url).toMatch(/\/hq\/.+\.webp$/);
      expect(item.posterImage?.mimeType).toBe("image/webp");
      expect(item.posterImage?.alt.length).toBeGreaterThan(10);
      const required = requiredRemoteAssets(item);
      expect(required.some((a) => a.url === item.posterImage!.url)).toBe(true);
      expect(existsSync(publicPath(item.posterImage!.url))).toBe(true);
      // Legacy SVG may remain optional only.
      const svgOptional = (item.remoteMedia ?? []).filter(
        (a) => a.mimeType === "image/svg+xml"
      );
      for (const svg of svgOptional) {
        expect(svg.required).not.toBe(true);
      }
    }
  });

  it("does not invent remote CDN image URLs", () => {
    for (const id of GHANA_KG2_MEDIA_SLICE_IDS) {
      const item = getMediaItemById(id)!;
      for (const asset of item.remoteMedia ?? []) {
        expect(asset.url.startsWith("http")).toBe(false);
        expect(asset.url.startsWith("/gigalearn/")).toBe(true);
      }
      expect(item.posterImage!.url.startsWith("/gigalearn/")).toBe(true);
    }
  });
});
