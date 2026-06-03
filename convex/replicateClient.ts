import {
  REPLICATE_IMAGE_MODEL,
  REPLICATE_VIDEO_MODEL,
} from "./mediaCatalog";

function getReplicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
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

async function createModelPrediction(
  model: string,
  input: Record<string, unknown>,
  waitSeconds = 120,
): Promise<ReplicatePrediction> {
  const token = getReplicateToken();
  const res = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `wait=${waitSeconds}`,
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

  if (body.status === "failed") {
    throw new Error(body.error ?? "Replicate prediction failed");
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
