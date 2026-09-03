import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FAL_VIDEO_MAX_SAFE_WAIT_MS } from "../../convex/mediaEngine";
import { STALE_PROGRESS_AFTER_MS } from "../../convex/mediaJobRecovery";
import { toUserMediaError } from "../../convex/mediaUtils";
import { REPLICATE_VIDEO_MAX_SAFE_WAIT_MS } from "../../convex/replicateClient";
import { formatMediaError } from "../../web/lib/media/errors";
import { privacyToSocialVisibility } from "../../web/lib/gigaedit/publishTypes";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("video generation audit fixes", () => {
  it("caps provider waits so one worker stays under the Convex action limit", () => {
    expect(FAL_VIDEO_MAX_SAFE_WAIT_MS + REPLICATE_VIDEO_MAX_SAFE_WAIT_MS).toBeLessThan(
      10 * 60 * 1000
    );
    expect(read("convex/mediaEngine.ts")).toContain("{ attempts: 1, baseDelayMs: 1500 }");
    expect(read("convex/replicateClient.ts")).toContain("{ attempts: 1 }");
  });

  it("fails stale jobs after 12 minutes of no progress", () => {
    expect(STALE_PROGRESS_AFTER_MS).toBe(12 * 60 * 1000);
    expect(read("convex/mediaJobRecovery.ts")).toContain("STALE_PROGRESS_AFTER_MS");
    expect(read("convex/mediaInternal.ts")).toContain("job.updatedAt ?? job.createdAt");
  });

  it("does not charge when no video provider is configured", () => {
    const handler = read("convex/media.ts").slice(
      read("convex/media.ts").indexOf("export const generateVideo")
    );
    const preflight = handler.indexOf("!providers.fal && !providers.replicate");
    const charge = handler.indexOf("chargeCreditsForMedia");
    expect(preflight).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(charge);
  });

  it("uses video-specific copy when all video providers fail", () => {
    const msg = toUserMediaError(new Error("All providers failed for video"), "video");
    expect(msg).toContain("fal.ai and Replicate");
    expect(msg).not.toContain("OpenAI");
    expect(msg).not.toContain("Google AI");
  });

  it("restores the in-flight video job after refresh", () => {
    expect(read("web/hooks/useMediaVideoJob.ts")).toContain("giga3_media_video_job");
    expect(read("web/components/media/VideoGenerateForm.tsx")).toContain(
      'values.category === "social_shorts"'
    );
  });
});

describe("GigaSocial / GigaEdit audit fixes", () => {
  it("does not map private drafts to public posts", () => {
    expect(privacyToSocialVisibility("private")).toBe(null);
    const feed = read("web/components/gigasocial/GigaSocialFeedPanel.tsx");
    expect(feed).toContain("This GigaEdit draft is private");
    expect(feed).not.toContain('privacyToSocialVisibility(consumed.privacy) ?? "public"');
  });

  it("clears the publish busy lock for draft-only privacy", () => {
    const publish = read("web/components/gigaedit/PublishScreen.tsx");
    const privateIdx = publish.indexOf("Private is draft-only");
    const busyIdx = publish.indexOf("setBusy(false)", privateIdx);
    expect(privateIdx).toBeGreaterThan(-1);
    expect(busyIdx).toBeGreaterThan(privateIdx);
    expect(busyIdx - privateIdx).toBeLessThan(160);
  });

  it("shows feed filters on mobile and preserves auth return path", () => {
    const feed = read("web/components/gigasocial/GigaSocialFeedPanel.tsx");
    expect(feed).not.toContain("hidden sm:block");
    expect(feed).toContain("overflow-x-auto overscroll-x-contain");
    expect(read("web/components/gigasocial/GigaSocialClient.tsx")).toContain(
      "window.location.pathname}${window.location.search}"
    );
    expect(read("web/components/gigasocial/stories/GigaSocialStoriesViewer.tsx")).toContain(
      "85svh"
    );
    expect(read("web/components/gigasocial/stories/GigaSocialStoriesViewer.tsx")).not.toContain(
      "78dvh"
    );
  });
});

describe("Paystack / GigaLearn audit fixes", () => {
  it("adds first-purchase credits instead of wiping pack balances", () => {
    expect(read("convex/paystack.ts")).toContain("setBalance: Boolean(record.isRenewal)");
  });

  it("unlocks checkout if Paystack falls back to a full-page redirect", () => {
    const billing = read("web/hooks/useBilling.ts");
    const redirectIdx = billing.indexOf('mode === "redirect"');
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(billing.slice(redirectIdx, redirectIdx + 80)).toContain("clearCheckout()");
  });

  it("clarifies GigaLearn homework and session restore", () => {
    expect(read("web/components/gigalearn/GigaLearnHomeworkPanel.tsx")).toContain(
      "Open in chat to solve"
    );
    expect(read("web/components/gigalearn/GigaLearnClient.tsx")).toContain("Loading GigaLearn…");
    expect(formatMediaError("ConvexError: Insufficient credits (wrapped)")).toContain(
      "Insufficient credits"
    );
  });
});
