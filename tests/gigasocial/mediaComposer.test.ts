import { describe, expect, it } from "vitest";
import { classifyMediaFiles } from "../../web/lib/gigasocial/mediaComposer";

function mockFile(type: string, name = "file"): File {
  return new File(["x"], name, { type });
}

describe("classifyMediaFiles", () => {
  it("classifies a single image", () => {
    const result = classifyMediaFiles([mockFile("image/jpeg", "a.jpg")]);
    expect(result.kind).toBe("single-image");
  });

  it("classifies multiple photos with music as slideshow", () => {
    const result = classifyMediaFiles([
      mockFile("image/png", "a.png"),
      mockFile("image/png", "b.png"),
      mockFile("audio/mpeg", "track.mp3"),
    ]);
    expect(result.kind).toBe("slideshow");
  });

  it("rejects audio without photos", () => {
    const result = classifyMediaFiles([mockFile("audio/mpeg")]);
    expect(result).toEqual({
      kind: "unsupported",
      reason: "Add at least one photo before attaching music.",
    });
  });

  it("exports unified media accept string for composer file input", async () => {
    const { UNIFIED_MEDIA_ACCEPT } = await import("../../web/lib/gigasocial/mediaComposer");
    expect(UNIFIED_MEDIA_ACCEPT).toContain("image/jpeg");
    expect(UNIFIED_MEDIA_ACCEPT).toContain("video/mp4");
    expect(UNIFIED_MEDIA_ACCEPT).toContain(".mp4");
  });

  it("classifies Android gallery videos with empty MIME via extension", () => {
    const file = new File(["x"], "VID_android.mp4", { type: "" });
    expect(classifyMediaFiles([file]).kind).toBe("single-video");
  });

  it("resolves Android gallery images with empty MIME via extension", async () => {
    const { resolveImageContentType } = await import("../../web/lib/gigasocial/constants");
    const file = new File(["x"], "IMG_2026_10_29.JPG", { type: "" });
    expect(resolveImageContentType(file)).toBe("image/jpeg");
  });
});
