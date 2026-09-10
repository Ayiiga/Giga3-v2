import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("chat path consolidation", () => {
  it("retires legacy aiActions token path with explicit error", () => {
    const src = read("convex/aiActions.ts");
    expect(src).toContain("@deprecated");
    expect(src).toContain("retired");
    expect(src).not.toContain("user.tokens - 1");
    expect(src).not.toContain("persistLegacyChat");
  });

  it("enforces entitlements on primary chat accept path", () => {
    const chat = read("convex/chatMessaging.ts");
    expect(chat).toContain("requireProModelAccess");
    expect(chat).toContain("advanced_personas");
  });

  it("enforces entitlements on gated mutations", () => {
    expect(read("convex/media.ts")).toContain("assertFeatureInternal");
    expect(read("convex/marketplace.ts")).toContain("marketplace_listing");
    expect(read("convex/gigalearnStudio.ts")).toContain("creator_studio");
  });
});
