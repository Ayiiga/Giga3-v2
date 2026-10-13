import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("media image credit charge retain", () => {
  it("records setMediaJobCharge after a successful image credit charge", () => {
    const media = read("convex/media.ts");
    expect(media).toContain('chargeCreditsForMedia(');
    expect(media).toContain('"image"');
    expect(media).toContain("setMediaJobCharge");
    const imageSection = media.slice(media.indexOf("generateImage"));
    const chargeIdx = imageSection.indexOf('chargeCreditsForMedia(');
    const setIdx = imageSection.indexOf("setMediaJobCharge");
    expect(chargeIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(chargeIdx);
  });

  it("video text-frame helper does not force OpenAI without entitlement", () => {
    const pipeline = read("convex/mediaVideoTextPipeline.ts");
    expect(pipeline).toContain("{ allowOpenAi: false }");
    expect(pipeline).not.toContain("{ allowOpenAi: true }");
  });
});
