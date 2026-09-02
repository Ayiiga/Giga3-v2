import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFalVideoPayload,
  DEFAULT_FAL_IMAGE_VIDEO_MODEL,
  DEFAULT_FAL_TEXT_VIDEO_MODEL,
  describeFalQueueStatus,
  detectFalModelFamily,
  extractFalVideoUrl,
  falModelExpectsImage,
  resolveFalVideoModel,
} from "../../convex/falVideoModels";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("fal video model resolution", () => {
  it("defaults to Seedance Lite for text and image and honours env overrides", () => {
    expect(resolveFalVideoModel(false, {})).toBe(DEFAULT_FAL_TEXT_VIDEO_MODEL);
    expect(resolveFalVideoModel(true, {})).toBe(DEFAULT_FAL_IMAGE_VIDEO_MODEL);
    expect(resolveFalVideoModel(false, { FAL_TEXT_VIDEO_MODEL: "fal-ai/wan/v2.2-a14b/text-to-video" })).toBe(
      "fal-ai/wan/v2.2-a14b/text-to-video"
    );
    // Legacy FAL_VIDEO_MODEL still applies to image-to-video only.
    expect(resolveFalVideoModel(true, { FAL_VIDEO_MODEL: "nvidia/cosmos-3-super/image-to-video" })).toBe( // pragma: allowlist secret
      "nvidia/cosmos-3-super/image-to-video" // pragma: allowlist secret
    );
    expect(resolveFalVideoModel(false, { FAL_VIDEO_MODEL: "nvidia/cosmos-3-super/image-to-video" })).toBe( // pragma: allowlist secret
      DEFAULT_FAL_TEXT_VIDEO_MODEL
    );
  });

  it("detects families and image requirements", () => {
    expect(detectFalModelFamily(DEFAULT_FAL_TEXT_VIDEO_MODEL)).toBe("seedance");
    expect(detectFalModelFamily("fal-ai/kling-video/v2.1/standard/image-to-video")).toBe("kling");
    expect(detectFalModelFamily("fal-ai/veo3/fast")).toBe("veo"); // pragma: allowlist secret
    expect(detectFalModelFamily("fal-ai/minimax/hailuo-02/standard/text-to-video")).toBe("minimax");
    expect(detectFalModelFamily("nvidia/cosmos-3-super/image-to-video")).toBe("cosmos"); // pragma: allowlist secret
    expect(falModelExpectsImage(DEFAULT_FAL_IMAGE_VIDEO_MODEL)).toBe(true);
    expect(falModelExpectsImage(DEFAULT_FAL_TEXT_VIDEO_MODEL)).toBe(false);
  });
});

describe("buildFalVideoPayload", () => {
  it("maps our simple request onto the Seedance schema (duration/resolution/aspect as enums)", () => {
    const p = buildFalVideoPayload(DEFAULT_FAL_TEXT_VIDEO_MODEL, {
      prompt: "A market in Accra",
      durationSec: 8,
      aspectRatio: "9:16",
      resolution: "1080p",
      seed: 7,
    });
    expect(p).toEqual({
      prompt: "A market in Accra",
      duration: "8",
      resolution: "1080p",
      aspect_ratio: "9:16",
      seed: 7,
      enable_safety_checker: true,
    });
  });

  it("clamps duration and defaults aspect to auto for Seedance image-to-video", () => {
    const p = buildFalVideoPayload(DEFAULT_FAL_IMAGE_VIDEO_MODEL, {
      prompt: "animate",
      imageUrl: "https://example.com/a.png",
      durationSec: 30,
    });
    expect(p.image_url).toBe("https://example.com/a.png");
    expect(p.duration).toBe("12");
    expect(p.aspect_ratio).toBe("auto");
    expect(p.resolution).toBe("720p");
  });

  it("throws (so the engine falls back) when an image-to-video model gets no image", () => {
    expect(() => buildFalVideoPayload(DEFAULT_FAL_IMAGE_VIDEO_MODEL, { prompt: "x" })).toThrow(
      /requires a source image_url/
    );
  });

  it("adapts to other families without leaking unsupported fields", () => {
    const kling = buildFalVideoPayload("fal-ai/kling-video/v2.1/standard/image-to-video", {
      prompt: "x",
      imageUrl: "https://e.com/i.jpg",
      durationSec: 7,
      aspectRatio: "9:16",
      resolution: "1080p",
    });
    expect(kling.duration).toBe("5");
    expect(kling).not.toHaveProperty("resolution");
    expect(kling).not.toHaveProperty("aspect_ratio");

    const veo = buildFalVideoPayload("fal-ai/veo3/fast", { // pragma: allowlist secret
      prompt: "x",
      durationSec: 6,
      aspectRatio: "1:1",
      generateAudio: false,
    });
    expect(veo.duration).toBe("6s");
    expect(veo.aspect_ratio).toBe("16:9");
    expect(veo.generate_audio).toBe(false);

    const wan = buildFalVideoPayload("fal-ai/wan/v2.2-a14b/text-to-video", {
      prompt: "x",
      resolution: "1080p",
    });
    expect(wan.resolution).toBe("720p");

    const cosmos = buildFalVideoPayload("nvidia/cosmos-3-super/image-to-video", { // pragma: allowlist secret
      prompt: "x",
      imageUrl: "https://e.com/i.jpg",
      durationSec: 5,
      aspectRatio: "9:16",
    });
    expect(cosmos.num_frames).toBe(120);
    expect(cosmos.image_size).toEqual({ width: 480, height: 832 });
  });
});

describe("fal response helpers", () => {
  it("extracts video urls from the common response shapes", () => {
    expect(extractFalVideoUrl({ video: { url: "https://v/1.mp4", content_type: "video/mp4" } })).toEqual({
      url: "https://v/1.mp4",
      contentType: "video/mp4",
    });
    expect(extractFalVideoUrl({ videos: [{ url: "https://v/2.mp4" }] })?.url).toBe("https://v/2.mp4");
    expect(extractFalVideoUrl({ output: "https://v/3.mp4" })?.url).toBe("https://v/3.mp4");
    expect(extractFalVideoUrl({ seed: 1 })).toBeNull();
  });

  it("describes queue states for the progress strip", () => {
    expect(describeFalQueueStatus("IN_QUEUE", 3)).toBe("Queued (3 ahead)");
    expect(describeFalQueueStatus("IN_PROGRESS")).toBe("Generating video…");
    expect(describeFalQueueStatus("COMPLETED")).toBe("Finishing up…");
  });
});

describe("Media Studio async video pipeline — wiring", () => {
  it("uses fal for text AND image, then Replicate, and forwards duration/aspect/resolution", () => {
    const engine = read("convex/mediaEngine.ts");
    expect(engine).toContain("falGenerateVideoV2(");
    expect(engine).not.toMatch(/getFalApiKey\(\) && imageUrl/);
    expect(engine).toContain("durationSec: input.duration");
    expect(engine).toContain("replicateGenerateVideo(input.prompt");
  });

  it("enqueues a job, reserves credits, schedules the worker and returns immediately", () => {
    const media = read("convex/media.ts");
    expect(media).toContain("internal.mediaVideoWorker.processJob");
    expect(media).toContain("chargeCreditsForMedia(ctx, args.sessionToken, \"video\", String(jobId))");
    expect(media).toContain('status: "processing" as const');
    expect(media).not.toContain("await generateVideoWithFallback(");
  });

  it("worker refunds reserved credits on failure and writes provider progress", () => {
    const worker = read("convex/mediaVideoWorker.ts");
    expect(worker).toContain("internal.mediaInternal.refundMediaJobCredits");
    expect(worker).toContain("internal.mediaInternal.updateMediaJobProgress");
    expect(worker).toContain("persistVideoUrlIfPossible(");
    expect(read("convex/mediaInternal.ts")).toContain('action: "refund"');
  });

  it("recovers stuck jobs on a cron and indexes jobs by status", () => {
    expect(read("convex/crons.ts")).toContain("internal.mediaJobRecovery.recoverStuckJobs");
    const schema = read("convex/schema.ts");
    expect(schema).toMatch(/mediaJobs: defineTable[\s\S]*?\.index\("by_status_created", \["status", "createdAt"\]\)/);
    expect(schema).toMatch(/videoJobs: defineTable[\s\S]*?\.index\("by_status_created", \["status", "createdAt"\]\)/);
    expect(schema).toContain('v.literal("refund")');
  });

  it("client enqueues then follows the job instead of blocking for 13 minutes", () => {
    const hook = read("web/hooks/useMediaGeneration.ts");
    expect(hook).toContain("MEDIA_VIDEO_ENQUEUE_TIMEOUT_MS");
    expect(hook).not.toContain("MEDIA_VIDEO_TIMEOUT_MS,");
    expect(read("web/hooks/useMediaVideoJob.ts")).toContain("api.mediaQueries.getJob");
    const form = read("web/components/media/VideoGenerateForm.tsx");
    expect(form).toContain("refunded\n          automatically if it fails");
    expect(form).toContain("Try again");
    expect(form).not.toMatch(/talking-avatar|story-to-video/);
    const panel = read("web/components/media/MediaGeneratePanel.tsx");
    expect(panel).toContain("<VideoGenerateForm");
    expect(panel).not.toContain("Premium subscription and credits are required");
  });

  it("polls the status_url/response_url fal returns (nested model ids 404 on rebuilt URLs)", () => {
    const client = read("convex/falClient.ts");
    expect(client).toContain("falQueueSubmitDetailed(");
    expect(client).toContain("statusUrl: submission.statusUrl");
    expect(client).toContain("body.status_url ??");
    // The old URL construction from the full model id must be gone.
    expect(client).not.toMatch(/\$\{FAL_QUEUE_BASE\}\/\$\{modelId\}\/requests\//);
    expect(client).toContain('modelId.split("/").slice(0, 2).join("/")');
  });

  it("CI provisions Seedance Lite models on fal for both modes", () => {
    const ci = read(".github/workflows/convex-deploy.yml");
    expect(ci).toContain("FAL_TEXT_VIDEO_MODEL");
    expect(ci).toContain("fal-ai/bytedance/seedance/v1/lite/text-to-video");
    expect(ci).toContain("fal-ai/bytedance/seedance/v1/lite/image-to-video");
  });
});
