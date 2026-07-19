import { describe, expect, it } from "vitest";
import { getLiveReactionCount } from "../../web/lib/gigasocial/liveStreaming";

describe("getLiveReactionCount", () => {
  it("reads emoji counts from Convex-safe array payloads", () => {
    const counts = [
      { emoji: "❤️", count: 3 },
      { emoji: "🔥", count: 1 },
    ];
    expect(getLiveReactionCount(counts, "❤️")).toBe(3);
    expect(getLiveReactionCount(counts, "🔥")).toBe(1);
    expect(getLiveReactionCount(counts, "👏")).toBe(0);
    expect(getLiveReactionCount(undefined, "❤️")).toBe(0);
  });
});
