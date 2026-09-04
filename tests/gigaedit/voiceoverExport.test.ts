import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("voiceover export wiring", () => {
  it("starts replace-audio voiceovers from the beginning of the clip", () => {
    const source = read("web/lib/gigaedit/videoExport.ts");
    expect(source).toContain("source.start(0, 0, playDuration)");
    expect(source).not.toContain("source.start(0, startSec, endSec - startSec)");
  });

  it("surfaces voiceover failures instead of silently exporting video-only", () => {
    const source = read("web/lib/gigaedit/videoExport.ts");
    expect(source).toContain("Voiceover export failed");
    expect(source).not.toContain("/* continue video-only */");
  });

  it("mixes replace audio into joined and composite exports", () => {
    expect(read("web/lib/gigaedit/videoExport.ts")).toContain("audioMode === \"replace\"");
    expect(read("web/lib/gigaedit/videoCompositeExport.ts")).toContain("options.replaceAudio");
  });
});
