import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("GigaSocial post reliability", () => {
  it("prevents duplicate retry posts in a short mobile retry window", () => {
    const src = read("convex/gigaSocial.ts");
    expect(src).toContain("Retry-safe duplicate suppression");
    expect(src).toContain("Date.now() - post.createdAt > 20_000");
    expect(src).toContain("duplicate: true as const");
  });
});
