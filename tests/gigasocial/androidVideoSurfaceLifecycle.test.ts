import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(path, "utf8");
describe("Android video surface lifecycle", () => {
  it("removes feed playback tree before opening the composer", () => {
    const feed = read("web/components/gigasocial/GigaSocialFeedPanel.tsx");
    const guard = feed.indexOf("if (sessionToken && composerOpen)");
    expect(guard).toBeGreaterThan(0);
    const opening = feed.slice(guard, feed.indexOf("<FeedVideoPlaybackProvider", guard));
    expect(opening).toContain("return <GigaSocialPanelErrorBoundary");
    expect(opening).toContain("GigaSocialComposerSheet");
  });
  it("uses a static upload screen before rendering media or template surfaces", () => {
    const composer = read("web/components/gigasocial/GigaSocialComposer.tsx");
    const guard = composer.indexOf("if (busy && uploadPercent !== null)");
    expect(guard).toBeGreaterThan(0);
    const stage = composer.slice(guard, composer.indexOf("if (episodeSplitDraft)", guard));
    expect(stage).toContain('role="progressbar"');
    expect(stage).toContain("handleCancelUpload");
    expect(stage).not.toMatch(/<video|<GigaSocialPendingMediaPreview|<CreatorTemplateQuickPick/);
    expect(composer).toContain("onPublishingChange?.(busy || publishing)");
    expect(composer).toContain("pendingPublishRef.current = attempt");
  });
  it("only mounts review playback after request and metadata probe completion", () => {
    const review = read("web/components/gigasocial/studio/GigaSocialMediaReview.tsx");
    expect(review).toContain("playbackOpen && !finishing && !probeBusy");
    expect(review).toContain('video.removeAttribute("src")');
    expect(review).toContain("video.pause()");
    expect(review).toContain("video.load()");
    expect(review).toContain("releasePlayback(); setPlaybackOpen(false)");
    expect(review).toContain("thumbnailUrl: thumbnail");
  });
  it("releases the composer preview and avoids automatic playback", () => {
    const source = read("web/components/gigasocial/GigaSocialPostMedia.tsx");
    const pending = source.slice(source.indexOf("export const GigaSocialPendingMediaPreview"));
    expect(pending).toContain("releaseLocalPreview");
    expect(pending).toContain('video.removeAttribute("src")');
    expect(pending).not.toContain("autoPlay");
    expect(pending).toContain("videoPreviewOpen && !locked");
  });
});
