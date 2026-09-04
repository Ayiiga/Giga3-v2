/**
 * fal.ai video model adapter — pure functions (no Convex imports) so the
 * request shapes can be unit-tested. Different fal endpoints expect different
 * field names/enums; we normalise our simple request into each family's schema
 * so switching FAL_TEXT_VIDEO_MODEL / FAL_IMAGE_VIDEO_MODEL never breaks the UI.
 */

import { MEDIA_VIDEO_MAX_DURATION_SEC } from "./mediaVideoLimits";

export const DEFAULT_FAL_TEXT_VIDEO_MODEL = "fal-ai/bytedance/seedance/v1/lite/text-to-video";
export const DEFAULT_FAL_IMAGE_VIDEO_MODEL = "fal-ai/bytedance/seedance/v1/lite/image-to-video";

export type VideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
export type VideoResolution = "480p" | "720p" | "1080p";

export type SimpleVideoRequest = {
  prompt: string;
  imageUrl?: string;
  durationSec?: number;
  aspectRatio?: VideoAspectRatio;
  resolution?: VideoResolution | string;
  negativePrompt?: string;
  seed?: number;
  generateAudio?: boolean;
};

export type FalModelFamily =
  | "seedance"
  | "kling"
  | "wan"
  | "veo"
  | "minimax"
  | "ltx"
  | "cosmos"
  | "generic";

export function detectFalModelFamily(modelId: string): FalModelFamily {
  const id = modelId.toLowerCase();
  if (id.includes("seedance")) return "seedance";
  if (id.includes("kling")) return "kling";
  if (id.includes("/wan/") || id.includes("wan-")) return "wan";
  if (id.includes("veo")) return "veo";
  if (id.includes("minimax") || id.includes("hailuo")) return "minimax";
  if (id.includes("ltx")) return "ltx";
  if (id.includes("cosmos")) return "cosmos";
  return "generic";
}

/** Whether the endpoint animates a first frame (needs image_url) or is text-only. */
export function falModelExpectsImage(modelId: string): boolean {
  return /image-to-video|img2vid|i2v/i.test(modelId);
}

export function resolveFalVideoModel(
  hasImage: boolean,
  env: Record<string, string | undefined> = process.env
): string {
  const text = env.FAL_TEXT_VIDEO_MODEL?.trim();
  const image = env.FAL_IMAGE_VIDEO_MODEL?.trim() || env.FAL_VIDEO_MODEL?.trim();
  if (hasImage) return image || DEFAULT_FAL_IMAGE_VIDEO_MODEL;
  return text || DEFAULT_FAL_TEXT_VIDEO_MODEL;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function pickEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function nearestDuration(sec: number | undefined, allowed: readonly number[], fallback: number): number {
  if (!sec || !Number.isFinite(sec)) return fallback;
  return allowed.reduce((best, cur) => (Math.abs(cur - sec) < Math.abs(best - sec) ? cur : best), allowed[0]);
}

function normalizeResolution(value: string | undefined, allowed: readonly string[], fallback: string): string {
  const v = (value ?? "").toLowerCase();
  if (allowed.includes(v)) return v;
  if (v === "1080p" && allowed.includes("720p")) return "720p";
  if (v === "480p" && allowed.includes("720p")) return "720p";
  return fallback;
}

/**
 * Build the fal request body for a given model id. Throws when the model
 * requires a source image and none was provided (caller falls back).
 */
export function buildFalVideoPayload(
  modelId: string,
  req: SimpleVideoRequest
): Record<string, unknown> {
  const family = detectFalModelFamily(modelId);
  const image = req.imageUrl?.trim();
  if (falModelExpectsImage(modelId) && !image) {
    throw new Error(`fal model ${modelId} requires a source image_url`);
  }
  const base: Record<string, unknown> = { prompt: req.prompt };
  if (image) base.image_url = image;

  switch (family) {
    case "seedance": {
      const aspectAllowed = image
        ? (["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "auto"] as const)
        : (["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "9:21"] as const);
      return {
        ...base,
        duration: String(clamp(req.durationSec ?? 5, 4, 15)),
        resolution: normalizeResolution(req.resolution, ["480p", "720p", "1080p"], "720p"),
        aspect_ratio: pickEnum(req.aspectRatio, aspectAllowed, image ? "auto" : "16:9"),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
        enable_safety_checker: true,
      };
    }
    case "kling":
      return {
        ...base,
        duration: String(nearestDuration(req.durationSec, [5, 10], 5)),
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(!image && req.aspectRatio
          ? { aspect_ratio: pickEnum(req.aspectRatio, ["16:9", "9:16", "1:1"] as const, "16:9") }
          : {}),
      };
    case "wan":
      return {
        ...base,
        aspect_ratio: pickEnum(req.aspectRatio, ["16:9", "9:16", "1:1"] as const, "16:9"),
        resolution: normalizeResolution(req.resolution, ["480p", "580p", "720p"], "720p"),
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
        enable_safety_checker: true,
      };
    case "veo":
      return {
        ...base,
        duration: `${nearestDuration(req.durationSec, [4, 6, 8], 8)}s`,
        aspect_ratio: pickEnum(req.aspectRatio, ["16:9", "9:16"] as const, "16:9"),
        resolution: normalizeResolution(req.resolution, ["720p", "1080p"], "720p"),
        generate_audio: req.generateAudio !== false,
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      };
    case "minimax":
      return {
        ...base,
        duration: String(nearestDuration(req.durationSec, [6, 10], 6)),
        prompt_optimizer: true,
      };
    case "ltx":
      return {
        ...base,
        aspect_ratio: pickEnum(req.aspectRatio, ["9:16", "1:1", "16:9"] as const, "16:9"),
        resolution: normalizeResolution(req.resolution, ["480p", "720p"], "720p"),
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
        enable_safety_checker: true,
      };
    case "cosmos": {
      const fps = 24;
      const frames = clamp((req.durationSec ?? 8) * fps, 49, 189);
      const portrait = req.aspectRatio === "9:16" || req.aspectRatio === "3:4";
      return {
        ...base,
        image_size: portrait ? { width: 480, height: 832 } : { width: 832, height: 480 },
        num_frames: frames,
        frames_per_second: fps,
        num_inference_steps: 28,
        guidance_scale: 6,
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
        enable_safety_checker: true,
      };
    }
    default:
      return {
        ...base,
        ...(req.aspectRatio ? { aspect_ratio: req.aspectRatio } : {}),
        ...(req.durationSec
          ? { duration: String(clamp(req.durationSec, 4, MEDIA_VIDEO_MAX_DURATION_SEC)) }
          : {}),
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      };
  }
}

/** Human-friendly labels for fal queue states, used for job progress. */
export function describeFalQueueStatus(status: string, queuePosition?: number): string {
  switch (status) {
    case "IN_QUEUE":
      return queuePosition !== undefined && queuePosition > 0
        ? `Queued (${queuePosition} ahead)`
        : "Queued at fal.ai";
    case "IN_PROGRESS":
      return "Generating video…";
    case "COMPLETED":
      return "Finishing up…";
    default:
      return "Working…";
  }
}

/** Extract a video URL from the assorted fal response shapes. */
export function extractFalVideoUrl(result: unknown): { url: string; contentType?: string } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as {
    video?: { url?: string; content_type?: string } | string;
    videos?: Array<{ url?: string; content_type?: string }>;
    output?: { url?: string } | string;
    url?: string;
  };
  if (typeof r.video === "string") return { url: r.video };
  if (r.video?.url) return { url: r.video.url, contentType: r.video.content_type };
  if (r.videos?.[0]?.url) return { url: r.videos[0].url!, contentType: r.videos[0].content_type };
  if (typeof r.output === "string") return { url: r.output };
  if (r.output && typeof r.output === "object" && r.output.url) return { url: r.output.url };
  if (r.url) return { url: r.url };
  return null;
}
