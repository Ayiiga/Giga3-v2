import { describe, expect, it } from "vitest";
import { classifyChatMediaFiles } from "@/lib/chat/chatMediaPicker";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("classifyChatMediaFiles", () => {
  it("routes a single image to camera kind", () => {
    const result = classifyChatMediaFiles([file("a.jpg", "image/jpeg")]);
    expect(result).toEqual({ kind: "camera", files: [expect.any(File)] });
  });

  it("routes multiple images to image kind", () => {
    const files = [file("a.jpg", "image/jpeg"), file("b.png", "image/png")];
    const result = classifyChatMediaFiles(files);
    expect(result.kind).toBe("image");
  });

  it("routes image plus audio together", () => {
    const files = [file("a.jpg", "image/jpeg"), file("b.mp3", "audio/mpeg")];
    const result = classifyChatMediaFiles(files);
    expect(result.kind).toBe("image");
    if (result.kind !== "unsupported") {
      expect(result.files).toHaveLength(2);
    }
  });

  it("rejects mixed video and images", () => {
    const files = [file("a.mp4", "video/mp4"), file("b.jpg", "image/jpeg")];
    const result = classifyChatMediaFiles(files);
    expect(result.kind).toBe("unsupported");
  });
});
