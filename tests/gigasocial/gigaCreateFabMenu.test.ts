import { describe, expect, it } from "vitest";
import {
  getGigaCreateFabItems,
  GIGA_CREATE_FAB_ITEMS,
} from "../../web/components/gigasocial/create/gigaCreateMenu";

describe("GigaSocial upload FAB menu", () => {
  it("defines exactly five upload options", () => {
    expect(GIGA_CREATE_FAB_ITEMS).toHaveLength(5);
    expect(GIGA_CREATE_FAB_ITEMS.map((item) => item.label)).toEqual([
      "Camera",
      "Photo / Photo with Music",
      "Video",
      "Post",
      "Go Live",
    ]);
  });

  it("maps to stable create action ids", () => {
    expect(GIGA_CREATE_FAB_ITEMS.map((item) => item.id)).toEqual([
      "media-camera",
      "media-unified",
      "video-studio",
      "text-post",
      "live-content",
    ]);
  });

  it("can hide Go Live when live is disabled", () => {
    expect(getGigaCreateFabItems({ enableLive: true })).toHaveLength(5);
    expect(getGigaCreateFabItems({ enableLive: false })).toHaveLength(4);
    expect(getGigaCreateFabItems({ enableLive: false }).some((i) => i.id === "live-content")).toBe(
      false
    );
  });
});
