import { describe, expect, it } from "vitest";
import { FEED_SNAPSHOT_MAX_AGE_MS } from "@/lib/gigasocial/feedOfflineSnapshot";

describe("feedOfflineSnapshot", () => {
  it("uses a 24-hour offline window", () => {
    expect(FEED_SNAPSHOT_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
