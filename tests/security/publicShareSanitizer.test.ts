import { describe, expect, it } from "vitest";
import { sanitizePublicShareMessageContent } from "../../convex/publicShareSanitizer";

describe("publicShareSanitizer", () => {
  it("removes embedded base64 thumbnails from shared message content", () => {
    const input = `Hello

![screenshot](data:image/jpeg;base64,/9j/4AAQSkZJRg==)

More text`;
    const out = sanitizePublicShareMessageContent(input);
    expect(out).not.toContain("base64");
    expect(out).toContain("![screenshot](shared image)");
    expect(out).toContain("More text");
  });

  it("replaces bare data URLs", () => {
    const input = "See data:image/png;base64,abc123+def=";
    const out = sanitizePublicShareMessageContent(input);
    expect(out).toBe("See [shared image]");
  });
});
