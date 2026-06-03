import {
  REPLICATE_IMAGE_MODEL,
  REPLICATE_VIDEO_MODEL,
} from "./mediaCatalog";

/** Replicate `Prefer: wait=N` only accepts 1–60 seconds. */
const REPLICATE_PREFER_WAIT_MAX = 60;

function getReplicateToken(): string | undefined {
  const token =
    process.env.REPLICATE_API_TOKEN?.trim() ||
    process.env.REPLICATE_API?.trim() ||
    undefined;
  return token || undefined;
}

export function hasReplicateToken(): boolean {
  return Boolean(getReplicateToken());
}

function requireReplicateToken(): string {
  const token = getReplicateToken();
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not configured in Convex environment",
    );
  }
  return token;
}

type ReplicatePrediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string;
};

function extractOutputUrl(output: unknown, mediaType: "image" | "video"): string {
  if (typeof output === "string" && output.startsWith("http")) {
    return output;
  }
  if (Array.isArray(output)) {
    const first = output.find(
      (item) => typeof item === "string" && item.startsWith("http"),
    );
    if (typeof first === "string") return first;
  }
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    const candidate =
      record.url ?? record.video ?? record.image ?? record.output;
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
  }
  throw new Error(
    `Replicate returned no ${mediaType} URL (output: ${JSON.stringify(output)?.slice(0, 200)})`,
  );
}

async function fetchPrediction(id: string): Promise<ReplicatePrediction> {
  const token = requireReplicateToken();
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as ReplicatePrediction & { detail?: string };
  if (!res.ok) {
    throw new Error(body.detail ?? body.error ?? `Replicate HTTP ${res.status}`);
  }
  return body;
}

async function pollPrediction(
  predictionId: string,
  maxWaitMs: number,
): Promise<ReplicatePrediction> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const body = await fetchPrediction(predictionId);
    if (body.status === "succeeded") return body;
    if (body.status === "failed" || body.status === "canceled") {
      throw new Error(body.error ?? "Replicate prediction failed");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Replicate prediction timed out after ${maxWaitMs}ms`);
}

async function createModelPrediction(
  model: string,
  input: Record<string, unknown>,
  totalWaitSeconds = 120,
): Promise<ReplicatePrediction> {
  const token = requireReplicateToken();
  const preferWait = Math.min(
    REPLICATE_PREFER_WAIT_MAX,
    Math.max(1, totalWaitSeconds),
  );

  const res = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `wait=${preferWait}`,
      },
      body: JSON.stringify({ input }),
    },
  );

  const body = (await res.json()) as ReplicatePrediction & {
    detail?: string;
  };

  if (!res.ok) {
    throw new Error(
      body.detail ?? body.error ?? `Replicate HTTP ${res.status}`,
    );
  }

  if (body.status === "failed" || body.status === "canceled") {
    throw new Error(body.error ?? "Replicate prediction failed");
  }

  if (body.status === "succeeded") {
    return body;
  }

  if (body.id) {
    const remainingMs = Math.max(0, totalWaitSeconds - preferWait) * 1000;
    return pollPrediction(body.id, remainingMs + 30_000);
  }

  return body;
}

export async function replicateGenerateImage(prompt: string): Promise<{
  outputUrl: string;
  predictionId?: string;
}> {
  const prediction = await createModelPrediction(REPLICATE_IMAGE_MODEL, {
    prompt,
  });
  return {
    outputUrl: extractOutputUrl(prediction.output, "image"),
    predictionId: prediction.id,
  };
}

export async function replicateGenerateVideo(prompt: string): Promise<{
  outputUrl: string;
  predictionId?: string;
}> {
  const prediction = await createModelPrediction(
    REPLICATE_VIDEO_MODEL,
    { prompt },
    180,
  );
  return {
    outputUrl: extractOutputUrl(prediction.output, "video"),
    predictionId: prediction.id,
  };
}
