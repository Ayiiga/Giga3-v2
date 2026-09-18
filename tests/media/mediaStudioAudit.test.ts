import { describe, expect, it } from "vitest";
import { CREDIT_PACK_LIST } from "@/lib/payments/creditPacksCatalog";
import { VIDEO_CATEGORIES } from "@/lib/media/catalog";
import { MEDIA_STUDIO_TOOLS } from "@/lib/media/studioTools";
import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import {
  createTextOverlay,
  normalizeOverlayText,
} from "@/lib/media/videoProject/textOverlays";

describe("media studio audit fixes", () => {
  it("keeps real credit tiers (5s=9, 10s=20, 15s=30) — not a flat 5", () => {
    expect(mediaVideoCreditCost(5)).toBe(9);
    expect(mediaVideoCreditCost(10)).toBe(20);
    expect(mediaVideoCreditCost(15)).toBe(30);
  });

  it("keeps real GH₵ top-up packs (1 GHS = 1 credit)", () => {
    const packs = CREDIT_PACK_LIST.map((p) => `${p.amountGhs}/${p.credits}`);
    expect(packs).toContain("60/60");
    expect(packs).toContain("150/150");
    expect(packs).toContain("500/500");
  });

  it("adds the Ghanaian Shorts video style (9:16 vertical)", () => {
    const ghanaian = VIDEO_CATEGORIES.find((c) => c.id === "ghanaian_shorts");
    expect(ghanaian?.label).toBe("Ghanaian Shorts");
    expect(ghanaian?.description).toMatch(/9:16/);
  });

  it("lists 10 studio tools with ON DEVICE vs AI STUDIO badges", () => {
    expect(MEDIA_STUDIO_TOOLS).toHaveLength(10);
    const onDevice = MEDIA_STUDIO_TOOLS.filter((t) => t.runtime === "ON DEVICE");
    const aiStudio = MEDIA_STUDIO_TOOLS.filter((t) => t.runtime === "AI STUDIO");
    expect(onDevice.map((t) => t.id)).toEqual(["ai-photo-editor", "ai-video-editor"]);
    expect(aiStudio).toHaveLength(8);
    for (const tool of aiStudio) {
      expect(tool.creditHint).toMatch(/credits/);
    }
  });

  it("creates caption overlays defaulting to bottom with outline + shadow", () => {
    const layer = createTextOverlay({ text: "This knot will keep your hands secure", kind: "caption" });
    expect(layer.position).toBe("bottom");
    expect(layer.outline).toBe(true);
    expect(layer.background).toBe(true);
    expect(normalizeOverlayText("  hello  ")).toBe("hello");
    expect(layer.text).toBe("This knot will keep your hands secure");
  });
});
