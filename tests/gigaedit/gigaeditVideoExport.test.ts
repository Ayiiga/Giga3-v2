import { describe, expect, it } from "vitest";
import { videoNeedsBake } from "../../web/lib/gigaedit/videoExport";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GigaEdit video export bake detection", () => {
  it("skips bake for untouched full-length clips", () => {
    expect(
      videoNeedsBake({
        startSec: 0,
        endSec: 10,
        duration: 10,
        speed: 1,
        rotateDeg: 0,
        cropScale: 1,
        filterCss: "none",
        overlayText: "",
        captions: "",
        audioMode: "original",
      })
    ).toBe(false);
  });

  it("requires bake when trim/filter/audio change", () => {
    expect(
      videoNeedsBake({
        startSec: 1,
        endSec: 5,
        duration: 10,
        speed: 1,
        rotateDeg: 0,
        cropScale: 1,
        filterCss: "none",
        overlayText: "",
        captions: "",
        audioMode: "original",
      })
    ).toBe(true);
    expect(
      videoNeedsBake({
        startSec: 0,
        endSec: 10,
        duration: 10,
        speed: 1.5,
        rotateDeg: 0,
        cropScale: 1,
        filterCss: "none",
        overlayText: "",
        captions: "",
        audioMode: "original",
      })
    ).toBe(true);
    expect(
      videoNeedsBake({
        startSec: 0,
        endSec: 10,
        duration: 10,
        speed: 1,
        rotateDeg: 0,
        cropScale: 1,
        filterCss: "contrast(1.2)",
        overlayText: "",
        captions: "",
        audioMode: "mute",
      })
    ).toBe(true);
  });

  it("wires bake into the video editor publish path", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    expect(src).toContain("exportEditedVideoFile");
    expect(src).toContain("exportJoinedVideoClips");
    expect(src).toContain("bakeEditedFile");
    expect(src).toContain("attachLatestAudioProject");
    expect(src).toContain("MAX_GIGAEDIT_JOIN_CLIPS");
  });
});
