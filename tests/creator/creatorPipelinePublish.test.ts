import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCreatorPipelineTeleprompterUrl,
  isTrustedCreatorVideoUrl,
} from "../../web/lib/creator/creatorPipeline";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("creator pipeline publish remediation", () => {
  it("trusts blob and convex storage video URLs only", () => {
    expect(isTrustedCreatorVideoUrl("blob:https://www.giga3ai.com/abc")).toBe(true);
    expect(
      isTrustedCreatorVideoUrl(
        "https://perfect-lark-521.convex.cloud/api/storage/abc123"
      )
    ).toBe(true);
    expect(isTrustedCreatorVideoUrl("https://evil.example/video.mp4")).toBe(false);
  });

  it("stages teleprompter script and opens GigaEdit recorder route", () => {
    const href = buildCreatorPipelineTeleprompterUrl("Hook line for Ghana students.");
    expect(href).toContain("/gigaedit/");
    expect(href).toContain("teleprompter");
    expect(href).toContain("record=1");
  });

  it("uses publish handoff instead of text-only compose in pre-production", () => {
    expect(read("web/components/media/videoPreProduction/VideoPreProductionFlow.tsx")).toContain(
      "publishCreatorVideoToGigaSocial"
    );
    expect(read("web/components/media/videoPreProduction/VideoPreProductionFlow.tsx")).not.toContain(
      'window.open("/gigasocial/?compose=text"'
    );
    expect(read("web/lib/creator/creatorPipeline.ts")).toContain("handoffAndOpenGigaSocial");
  });
});
