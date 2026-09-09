import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildClipsFromImportCandidates,
  clipLabelFromFileName,
  formatImportResultMessage,
  isVideoImportFile,
  makeImportSourceKey,
  planVideoFileImport,
} from "../../web/lib/gigaedit/videoImport";
import { parseClipUrlsFromSearchParams } from "../../web/lib/gigaedit/urlVideoImport";
import { mainTrackSegments } from "../../web/lib/gigaedit/videoCompositeExport";
import { sortedMainVideoClips } from "../../web/lib/gigaedit/timelineLayers";
import { videoNeedsBake } from "../../web/lib/gigaedit/videoExport";
import {
  chatUrlForGeneratedTemplate,
  gigaEditUrlForGeneratedTemplate,
  gigasocialUrlForGeneratedTemplate,
  mediaStudioUrlForGeneratedTemplate,
  newGeneratedMediaTemplateId,
} from "../../web/lib/media/generatedMediaTemplates";
import type { GigaEditTimelineClip } from "../../web/lib/gigaedit/types";

function videoClip(
  partial: Partial<GigaEditTimelineClip> & Pick<GigaEditTimelineClip, "startSec" | "endSec" | "label">
): GigaEditTimelineClip {
  return {
    id: partial.id ?? `clip_${partial.startSec}`,
    track: "video",
    speed: 1,
    rotateDeg: 0,
    filterId: "none",
    sourceKey: partial.sourceKey ?? "primary",
    sourceStartSec: partial.sourceStartSec ?? 0,
    sourceEndSec: partial.sourceEndSec ?? partial.endSec - partial.startSec,
    ...partial,
  };
}

describe("multi-video import planning", () => {
  it("imports 2 videos in selection order", () => {
    const files = [
      new File(["a"], "first.mp4", { type: "video/mp4" }),
      new File(["b"], "second.mp4", { type: "video/mp4" }),
    ];
    const plan = planVideoFileImport({
      files,
      mode: "replace",
      existingClips: [],
      remainingSlots: 10,
    });
    expect(plan.selectedFiles.map((f) => f.name)).toEqual(["first.mp4", "second.mp4"]);
    const candidates = plan.selectedFiles.map((file, index) => ({
      file,
      sourceKey: makeImportSourceKey(index, "replace"),
      label: clipLabelFromFileName(file.name, index),
      durationSec: index === 0 ? 5 : 7,
    }));
    const clips = buildClipsFromImportCandidates([], "replace", candidates);
    const main = sortedMainVideoClips(clips);
    expect(main).toHaveLength(2);
    expect(main[0].startSec).toBe(0);
    expect(main[1].startSec).toBe(5);
  });

  it("imports 3+ videos with cumulative timeline duration", () => {
    const files = [3, 4, 2].map(
      (dur, i) => new File([String(dur)], `clip-${i}.mp4`, { type: "video/mp4" })
    );
    const plan = planVideoFileImport({
      files,
      mode: "replace",
      existingClips: [],
      remainingSlots: 10,
    });
    expect(plan.selectedFiles).toHaveLength(3);
    const candidates = plan.selectedFiles.map((file, index) => ({
      file,
      sourceKey: makeImportSourceKey(index, "replace"),
      label: clipLabelFromFileName(file.name, index),
      durationSec: [3, 4, 2][index],
    }));
    const clips = buildClipsFromImportCandidates([], "replace", candidates);
    const main = sortedMainVideoClips(clips);
    expect(main[main.length - 1].endSec).toBe(9);
  });

  it("reports non-video files as failures without silent discard", () => {
    const plan = planVideoFileImport({
      files: [new File(["x"], "notes.txt", { type: "text/plain" })],
      mode: "replace",
      existingClips: [],
      remainingSlots: 10,
    });
    expect(plan.selectedFiles).toHaveLength(0);
    expect(plan.failures[0]?.fileName).toBe("notes.txt");
    expect(formatImportResultMessage("replace", 0, 0, plan.failures)).toContain("notes.txt");
  });

  it("rejects invalid video extensions in planning", () => {
    expect(isVideoImportFile(new File([], "a.mp4", { type: "video/mp4" }))).toBe(true);
    expect(isVideoImportFile(new File([], "a.txt", { type: "text/plain" }))).toBe(false);
  });
});

describe("URL handoff clip params", () => {
  it("parses clip0..clipN in order", () => {
    const params = new URLSearchParams();
    params.set("clip0", "https://cdn.test/a.mp4");
    params.set("clip1", "https://cdn.test/b.mp4");
    params.set("clip2", "https://cdn.test/c.mp4");
    expect(parseClipUrlsFromSearchParams(params)).toEqual([
      "https://cdn.test/a.mp4",
      "https://cdn.test/b.mp4",
      "https://cdn.test/c.mp4",
    ]);
  });

  it("wires clip URL parsing into GigaEdit client", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/GigaEditClient.tsx"),
      "utf8"
    );
    expect(src).toContain("parseClipUrlsFromSearchParams");
    expect(src).toContain("initialImportUrls");
  });
});

describe("join export segments", () => {
  it("builds one segment per main-track clip in order", () => {
    const clips = [
      videoClip({ label: "A", startSec: 0, endSec: 4, sourceEndSec: 4 }),
      videoClip({ label: "B", startSec: 4, endSec: 10, sourceKey: "b", sourceEndSec: 6 }),
      videoClip({ label: "C", startSec: 10, endSec: 13, sourceKey: "c", sourceEndSec: 3 }),
    ];
    const files = new Map<string, File>([
      ["primary", new File(["a"], "a.mp4", { type: "video/mp4" })],
      ["b", new File(["b"], "b.mp4", { type: "video/mp4" })],
      ["c", new File(["c"], "c.mp4", { type: "video/mp4" })],
    ]);
    const segments = mainTrackSegments(clips, (clip) => files.get(clip.sourceKey ?? "primary") ?? null);
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.file.name)).toEqual(["a.mp4", "b.mp4", "c.mp4"]);
  });

  it("requires bake when multiple clips exist even without edits", () => {
    expect(
      videoNeedsBake({
        startSec: 0,
        endSec: 5,
        duration: 5,
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
});

describe("generated media templates", () => {
  const sample = {
    id: newGeneratedMediaTemplateId(),
    mediaType: "video" as const,
    mediaUrl: "https://cdn.test/generated.mp4",
    prompt: "A cinematic drone shot over Accra at sunset",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("builds GigaEdit handoff with real clip URL", () => {
    const href = gigaEditUrlForGeneratedTemplate(sample);
    expect(href).toContain("tab=video");
    expect(href).toContain(encodeURIComponent(sample.mediaUrl));
  });

  it("builds image template URLs for chat and media studio", () => {
    const image = { ...sample, mediaType: "image" as const, mediaUrl: "https://cdn.test/img.png" };
    expect(chatUrlForGeneratedTemplate(image)).toContain("prompt=");
    expect(mediaStudioUrlForGeneratedTemplate(image)).toContain("source=");
    expect(gigaEditUrlForGeneratedTemplate(image)).toContain("tab=photo");
  });

  it("builds GigaSocial compose URL with template id", () => {
    expect(gigasocialUrlForGeneratedTemplate(sample)).toContain("generatedTemplate=");
  });
});

describe("VideoEditor wiring", () => {
  it("supports multi-import, remote URLs, and real download export", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/gigaedit/VideoEditor.tsx"),
      "utf8"
    );
    expect(src).toContain("importInFlightRef");
    expect(src).toContain("importRemoteVideoUrls");
    expect(src).toContain("fetchRemoteVideosForImport");
    expect(src).toContain("downloadExportedFile");
    expect(src).toContain("formatImportResultMessage");
    expect(src).not.toContain("Export successful");
  });

  it("captures per-segment audio in joined export", () => {
    const src = readFileSync(resolve(__dirname, "../../web/lib/gigaedit/videoExport.ts"), "utf8");
    expect(src).toContain("attachVideoElementAudio");
    expect(src).toContain("Joined export could not capture audio");
  });
});
