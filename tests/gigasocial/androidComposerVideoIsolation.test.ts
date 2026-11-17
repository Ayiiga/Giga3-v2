import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android composer video surface isolation", () => {
  const sheet = readFileSync(resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposerSheet.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../../web/styles/gigasocial-pro.css"), "utf8");

  it("keeps upload progress height fixed and avoids repainting for every percent change", () => {
    const composer = readFileSync(resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"), "utf8");
    expect(composer).toContain('className="h-[44px] shrink-0 space-y-1.5 overflow-hidden [overflow-anchor:none]"');
    expect(composer).toContain("next - previous < 5");
    expect(composer).toContain("uploadPercent !== null && busy");
  });

  it("reuses the verified selected video duration rather than probing metadata again", () => {
    const composer = readFileSync(resolve(__dirname, "../../web/components/gigasocial/GigaSocialComposer.tsx"), "utf8");
    const upload = readFileSync(resolve(__dirname, "../../web/lib/gigasocial/mediaUpload.ts"), "utf8");
    expect(composer).toContain("durationSec: pendingVideo.durationSec,");
    const videoUpload = upload.slice(upload.indexOf("export async function uploadSocialVideo("), upload.indexOf("export async function uploadSocialAudio("));
    expect(videoUpload).toContain("isUsableVideoDuration(options?.durationSec ?? NaN)");
    expect(videoUpload).toContain("await getVideoDuration(file, { signal: options?.signal })");
    expect(videoUpload).toContain("durationSec > SOCIAL_MAX_VIDEO_DURATION_SEC");
  });

  it("isolates background video surfaces while the composer is open and restores them on close", () => {
    expect(sheet).toContain('document.body.classList.add("gigasocial-composer-video-isolation")');
    expect(sheet).toContain('document.body.classList.remove("gigasocial-composer-video-isolation")');
    expect(css).toContain("body.gigasocial-composer-video-isolation .gigasocial-feed-media video");
    expect(css).toContain("display: none !important;");
    expect(sheet).toContain('document.body.style.overflow = prevOverflow');
  });
});
