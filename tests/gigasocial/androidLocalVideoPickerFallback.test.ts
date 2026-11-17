import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android GigaSocial local video selection fallback", () => {
  const source = readFileSync(resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"), "utf8");

  it("retains the normal video input and offers a separate generic Android Files route", () => {
    expect(source).toContain("accept={SOCIAL_VIDEO_ACCEPT}");
    expect(source).toContain("Browse phone files");
    expect(source).toContain('accept="*/*"');
    expect(source).toContain("Use Android Files if Google Photos gets stuck preparing a video");
  });

  it("validates selected file type and uses the same video preparation path", () => {
    expect(source).toContain("if (!isLikelySocialVideoFile(file) || !resolveVideoContentType(file))");
    expect(source).toContain('setError("Please select a video file (MP4, MOV, or WebM) from your phone.")');
    expect(source).toContain("void addVideoFile(file);");
    expect(source).toContain("const selected = readInputFilesAndReset(event.currentTarget);");
  });
});
