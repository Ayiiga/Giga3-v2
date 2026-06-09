/**
 * Replicate predictions API — fallback when fal.ai fails.
 * Set REPLICATE_API_TOKEN in Convex environment.
 */

import { sleep, withRetries } from "./mediaUtils";
import {
  REPLICATE_IMAGE_EDIT_MODEL,
  REPLICATE_IMAGE_MODEL,
  REPLICATE_VIDEO_DURATION,
  REPLICATE_VIDEO_GENERATE_AUDIO,
  REPLICATE_VIDEO_MODEL,
  REPLICATE_VIDEO_RESOLUTION,
  type SeedanceAspectRatio,
} from "./mediaCatalog";

const REPLICATE_API = "https://api.replicate.com/v1";

export function getReplicateToken(): string | undefined {
  return (
    process.env.REPLICATE_API_TOKEN?.trim() ||
    process.env.REPLICATE_API_KEY?.trim() ||
    undefined
  );
}

function requireReplicateToken(): string {
  const token = getReplicateToken();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }
  return token;
}

type PredictionResponse = {
  id: string;
  status: string;
  output?: unknown;
  error?: string | null;
};

export type ReplicateVideoOptions = {
  imageUrl?: string;
  seed?: number;
  aspectRatio?: SeedanceAspectRatio;
  duration?: number;
  resolution?: string;
  generateAudio?: boolean;
};

export type ReplicateImageOptions = {
  sourceImageUrl?: string;
  seed?: number;
  aspectRatio?: SeedanceAspectRatio;
  numInferenceSteps?: number;
  enableSafetyChecker?: boolean;
};

function modelPath(modelId: string): string {
  const parts = modelId.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid Replicate model id: ${modelId}`);
  }
  return `/models/${parts[0]}/${parts[1]}/predictions`;
}

function isSeedanceModel(modelId: string): boolean {
  return modelId.startsWith("bytedance/seedance");
}

function isKontextModel(modelId: string): boolean {
  return modelId.includes("flux-kontext");
}

function buildReplicateImageInput(
  modelId: string,
  prompt: string,
  options?: ReplicateImageOptions
): Record<string, unknown> {
  if (isKontextModel(modelId)) {
    const sourceImageUrl = options?.sourceImageUrl?.trim();
    if (!sourceImageUrl) {
      throw new Error("Replicate image edit requires sourceImageUrl");
    }
    const input: Record<string, unknown> = {
      prompt,
      input_image: sourceImageUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
    };
    if (options?.seed !== undefined) {
      input.seed = options.seed;
    }
    return input;
  }

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: options?.aspectRatio ?? "1:1",
    num_outputs: 1,
    go_fast: true,
    output_format: "webp",
    output_quality: 90,
    num_inference_steps: options?.numInferenceSteps ?? 4,
  };
  if (options?.seed !== undefined) {
    input.seed = options.seed;
  }
  if (options?.enableSafetyChecker === false) {
    input.disable_safety_checker = true;
  }
  return input;
}

function replicateImageModel(options?: ReplicateImageOptions): string {
  return options?.sourceImageUrl?.trim()
    ? REPLICATE_IMAGE_EDIT_MODEL
    : REPLICATE_IMAGE_MODEL;
}

function buildReplicateVideoInput(
  modelId: string,
  prompt: string,
  options?: ReplicateVideoOptions
): Record<string, unknown> {
  if (isSeedanceModel(modelId)) {
    const input: Record<string, unknown> = {
      prompt,
      duration: options?.duration ?? REPLICATE_VIDEO_DURATION,
      resolution: options?.resolution ?? REPLICATE_VIDEO_RESOLUTION,
      aspect_ratio: options?.aspectRatio ?? "16:9",
      generate_audio: options?.generateAudio ?? REPLICATE_VIDEO_GENERATE_AUDIO,
    };
    if (options?.seed !== undefined) {
      input.seed = options.seed;
    }
    const imageUrl = options?.imageUrl?.trim();
    if (imageUrl) {
      input.image = imageUrl;
    }
    return input;
  }

  const legacy: Record<string, unknown> = { prompt };
  const imageUrl = options?.imageUrl?.trim();
  if (imageUrl) {
    legacy.image = imageUrl;
  }
  return legacy;
}

function videoMaxWaitMs(modelId: string): number {
  const configured = Number(process.env.REPLICATE_VIDEO_MAX_WAIT_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return isSeedanceModel(modelId) ? 12 * 60 * 1000 : 8 * 60 * 1000;
}

async function replicateFetch(path: string, init?: RequestInit): Promise<PredictionResponse> {
  const res = await fetch(`${REPLICATE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireReplicateToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as PredictionResponse & { detail?: string };
  if (!res.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : body.error ?? `Replicate HTTP ${res.status}`;
    throw new Error(`Replicate request failed: ${detail}`);
  }
  return body;
}

async function pollPrediction(
  id: string,
  options: { maxWaitMs: number; pollIntervalMs: number }
): Promise<PredictionResponse> {
  const deadline = Date.now() + options.maxWaitMs;
  while (Date.now() < deadline) {
    const prediction = await replicateFetch(`/predictions/${id}`);
    if (prediction.status === "succeeded") return prediction;
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error ?? `Replicate prediction ${prediction.status}`);
    }
    await sleep(options.pollIntervalMs);
  }
  throw new Error(`Replicate prediction timed out after ${options.maxWaitMs}ms`);
}

function extractUrl(output: unknown): string | undefined {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
  }
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url?: string }).url;
    if (url?.startsWith("http")) return url;
  }
  return undefined;
}

export async function replicateGenerateImage(
  prompt: string,
  options?: ReplicateImageOptions
): Promise<{ imageUrl: string; predictionId: string }> {
  const modelId = replicateImageModel(options);
  const label = isKontextModel(modelId) ? "replicate-image-edit" : "replicate-image";
  return withRetries(
    label,
    async () => {
      const input = buildReplicateImageInput(modelId, prompt, options);
      const created = await replicateFetch(modelPath(modelId), {
        method: "POST",
        body: JSON.stringify({ input }),
      });
      const done = await pollPrediction(created.id, {
        maxWaitMs: Number(process.env.REPLICATE_IMAGE_MAX_WAIT_MS ?? 5 * 60 * 1000),
        pollIntervalMs: isKontextModel(modelId) ? 3000 : 2500,
      });
      const imageUrl = extractUrl(done.output);
      if (!imageUrl) {
        throw new Error("Replicate image response missing URL");
      }
      return { imageUrl, predictionId: done.id };
    },
    { attempts: 2 }
  );
}

export async function replicateGenerateVideo(
  prompt: string,
  options?: ReplicateVideoOptions
): Promise<{ videoUrl: string; predictionId: string }> {
  const modelId = REPLICATE_VIDEO_MODEL;
  return withRetries(
    "replicate-video",
    async () => {
      const input = buildReplicateVideoInput(modelId, prompt, options);
      const created = await replicateFetch(modelPath(modelId), {
        method: "POST",
        body: JSON.stringify({ input }),
      });
      const done = await pollPrediction(created.id, {
        maxWaitMs: videoMaxWaitMs(modelId),
        pollIntervalMs: isSeedanceModel(modelId) ? 4000 : 3000,
      });
      const videoUrl = extractUrl(done.output);
      if (!videoUrl) {
        throw new Error("Replicate video response missing URL");
      }
      return { videoUrl, predictionId: done.id };
    },
    { attempts: 2 }
  );
}
