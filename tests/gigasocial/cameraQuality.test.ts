import { describe, expect, it } from "vitest";
import {
  CAMERA_QUALITY_PRESETS,
  getCameraQualityPreset,
} from "../../web/lib/gigasocial/cameraCapture";

describe("camera quality presets", () => {
  it("offers HD, Full HD, and 4K presets", () => {
    expect(CAMERA_QUALITY_PRESETS.map((p) => p.id)).toEqual(["hd", "full-hd", "ultra-hd"]);
  });

  it("defaults to Full HD", () => {
    expect(getCameraQualityPreset(null).id).toBe("full-hd");
    expect(getCameraQualityPreset("ultra-hd").width).toBe(3840);
  });
});
