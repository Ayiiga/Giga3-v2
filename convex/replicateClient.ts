/**
 * Replicate predictions API — fallback when fal.ai fails.
 * Set REPLICATE_API_TOKEN in Convex environment.
 */

import { sleep, withRetries } from "./mediaUtils";
import { REPLICATE_IMAGE_MODEL, REPLICATE_VIDEO_MODEL } from "./mediaCatalog";

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

function modelPath(modelId: string): string {
  const parts = modelId.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid Replicate model id: ${modelId}`);
  }
  return `/models/${parts[0]}/${parts[1]}/predictions`;
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

export async function replicateGenerateImage(prompt: string): Promise<{
  imageUrl: string;
  predictionId: string;
}> {
  return withRetries(
    "replicate-image",
    async () => {
      const created = await replicateFetch(modelPath(REPLICATE_IMAGE_MODEL), {
        method: "POST",
        body: JSON.stringify({ input: { prompt } }),
      });
      const done = await pollPrediction(created.id, {
        maxWaitMs: Number(process.env.REPLICATE_IMAGE_MAX_WAIT_MS ?? 5 * 60 * 1000),
        pollIntervalMs: 2500,
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
  imageUrl?: string
): Promise<{ videoUrl: string; predictionId: string }> {
  return withRetries(
    "replicate-video",
    async () => {
      const input: Record<string, unknown> = { prompt };
      if (imageUrl) input.image = imageUrl;

      const created = await replicateFetch(modelPath(REPLICATE_VIDEO_MODEL), {
        method: "POST",
        body: JSON.stringify({ input }),
      });
      const done = await pollPrediction(created.id, {
        maxWaitMs: Number(process.env.REPLICATE_VIDEO_MAX_WAIT_MS ?? 8 * 60 * 1000),
        pollIntervalMs: 3000,
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
