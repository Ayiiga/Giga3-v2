import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FEED_SNAPSHOT_MAX_AGE_MS } from "@/lib/gigasocial/feedOfflineSnapshot";

describe("feedOfflineSnapshot", () => {
  it("uses a 24-hour offline window", () => {
    expect(FEED_SNAPSHOT_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("scopes cached feed snapshots to the signed-in account", () => {
    const source = readFileSync(
      resolve(__dirname, "../../web/lib/gigasocial/feedOfflineSnapshot.ts"),
      "utf8"
    );
    expect(source).toContain("getUserEmail");
    expect(source).toContain("SNAPSHOT_KEY_PREFIX");
    expect(source).toContain("snapshotKey()");
    expect(source).not.toContain("getItem(SNAPSHOT_KEY)");
    expect(source).not.toContain("setItem(SNAPSHOT_KEY,");
  });
});
