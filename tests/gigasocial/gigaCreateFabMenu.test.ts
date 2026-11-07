import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getGigaCreateFabItems,
  GIGA_CREATE_FAB_ITEMS,
} from "../../web/components/gigasocial/create/gigaCreateMenu";

describe("GigaSocial upload FAB menu", () => {
  it("defines exactly six upload options", () => {
    expect(GIGA_CREATE_FAB_ITEMS).toHaveLength(6);
    expect(GIGA_CREATE_FAB_ITEMS.map((item) => item.label)).toEqual([
      "Camera",
      "Photo / Photo with Music",
      "Video",
      "Post",
      "Story",
      "Go Live",
    ]);
  });

  it("maps to stable create action ids", () => {
    expect(GIGA_CREATE_FAB_ITEMS.map((item) => item.id)).toEqual([
      "media-camera",
      "media-unified",
      "video-studio",
      "text-post",
      "story-content",
      "live-content",
    ]);
  });

  it("can hide Go Live when live is disabled", () => {
    expect(getGigaCreateFabItems({ enableLive: true })).toHaveLength(6);
    expect(getGigaCreateFabItems({ enableLive: false })).toHaveLength(5);
    expect(getGigaCreateFabItems({ enableLive: false }).some((i) => i.id === "live-content")).toBe(
      false
    );
  });
});

describe("GigaSocial Android video preview compositor guard", () => {
  it("isolates local video previews from adjacent mobile layers", () => {
    const css = readFileSync(resolve(__dirname, "../../web/styles/globals.css"), "utf8");
    const media = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/GigaSocialPostMedia.tsx"),
      "utf8"
    );
    const review = readFileSync(
      resolve(__dirname, "../../web/components/gigasocial/studio/GigaSocialMediaReview.tsx"),
      "utf8"
    );
    expect(css).toContain(".gigasocial-local-video-preview");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain("contain: paint");
    expect(css).toContain("backface-visibility: hidden");
    expect(media).toContain("gigasocial-local-video-preview");
    expect(review).toContain("gigasocial-local-video-preview");
  });
});
