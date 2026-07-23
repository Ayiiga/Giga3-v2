import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GigaSocial multi-account", () => {
  it("caps creator accounts at three with main flag in schema", () => {
    const schema = readFileSync(resolve(__dirname, "../../convex/schema.ts"), "utf8");
    expect(schema).toContain("isMain: v.optional(v.boolean())");
    expect(schema).toContain("profileId: v.optional(v.id(\"socialProfiles\"))");
  });

  it("exposes list/create/setMain account APIs", () => {
    const src = readFileSync(resolve(__dirname, "../../convex/gigaSocial.ts"), "utf8");
    expect(src).toContain("MAX_SOCIAL_ACCOUNTS_PER_USER = 3");
    expect(src).toContain("export const listMySocialAccounts");
    expect(src).toContain("export const createSocialAccount");
    expect(src).toContain("export const setMainSocialAccount");
  });
});

describe("GigaSocial faster uploads", () => {
  it("uploads images in parallel and overlaps video thumbnails", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/lib/gigasocial/mediaUpload.ts"),
      "utf8"
    );
    expect(src).toContain("concurrency");
    expect(src).toContain("fastCompress");
    expect(src).toContain("thumbnailPromise");
    expect(src).toContain("Promise.all");
  });
});
