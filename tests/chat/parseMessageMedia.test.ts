import { describe, expect, it } from "vitest";
import { parseMessageMedia } from "../../web/lib/chat/parseMessageMedia";

describe("parseMessageMedia", () => {
  it("renders Convex storage URLs (no file extension) as images", () => {
    const content =
      "Here is your generated image:\n\nhttps://perfect-lark-521.convex.cloud/api/storage/65ef051a-de27-420b-81e8-8b0deb90f99c";
    const parsed = parseMessageMedia(content);
    expect(parsed.images).toEqual([
      "https://perfect-lark-521.convex.cloud/api/storage/65ef051a-de27-420b-81e8-8b0deb90f99c",
    ]);
    expect(parsed.text).toBe("Here is your generated image:");
  });

  it("still recognizes extension-based image URLs", () => {
    const parsed = parseMessageMedia("see https://cdn.example.com/pic.png here");
    expect(parsed.images).toContain("https://cdn.example.com/pic.png");
  });

  it("keeps plain prose free of media", () => {
    const parsed = parseMessageMedia("The capital of France is Paris.");
    expect(parsed.images).toEqual([]);
    expect(parsed.videos).toEqual([]);
    expect(parsed.text).toBe("The capital of France is Paris.");
  });
});
