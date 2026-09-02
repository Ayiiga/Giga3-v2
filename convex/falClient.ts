/**
 * fal.ai queue API (https://fal.ai/docs/model-endpoints/queue).
 * Uses FAL_KEY or FAL_API_KEY from Convex environment.
 */

import {
  buildFalVideoPayload,
  describeFalQueueStatus,
  extractFalVideoUrl,
  resolveFalVideoModel,
  type SimpleVideoRequest,
} from "./falVideoModels";

const FAL_QUEUE_BASE = "https://queue.fal.run";

export function getFalApiKey(): string | undefined {
  return (
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim() ||
    undefined
  );
}

function getFalKey(): string {
  const key = getFalApiKey();
  if (!key) {
    throw new Error("FAL_KEY is not configured in Convex environment");
  }
  return key;
}

export type FalImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9"
  | { width: number; height: number };

export type FalVideoInput = {
  prompt: string;
  image_url: string;
  negative_prompt?: string;
  enable_prompt_expansion?: boolean;
  agentic_max_iterations?: number;
  agentic_samples_per_iteration?: number;
  agentic_early_stop?: boolean;
  image_size?: FalImageSize;
  num_frames?: number;
  frames_per_second?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  enable_safety_checker?: boolean;
  sync_mode?: boolean;
};

export type FalImageInput = {
  prompt: string;
  negative_prompt?: string;
  image_size?: FalImageSize;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  enable_safety_checker?: boolean;
};

type QueueStatusResponse = {
  status: string;
  response_url?: string;
  logs?: Array<{ message: string }>;
};

type FalVideoResult = {
  video: { url: string; content_type?: string };
  seed: number;
};

type FalImageResult = {
  images?: Array<{ url: string }>;
  image?: { url: string };
};

async function falQueueSubmit(modelId: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal submit failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const body = (await res.json()) as { request_id?: string };
  if (!body.request_id) {
    throw new Error("fal submit did not return request_id");
  }
  return body.request_id;
}

async function falQueuePoll<T>(
  modelId: string,
  requestId: string,
  options: { maxWaitMs: number; pollIntervalMs: number },
): Promise<T> {
  const deadline = Date.now() + options.maxWaitMs;
  const statusUrl = `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status`;

  while (Date.now() < deadline) {
    const res = await fetch(statusUrl, {
      headers: { Authorization: `Key ${getFalKey()}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`fal status failed (${res.status}): ${text.slice(0, 500)}`);
    }
    const status = (await res.json()) as QueueStatusResponse;

    if (status.status === "COMPLETED") {
      const resultUrl =
        status.response_url ??
        `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${getFalKey()}` },
      });
      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`fal result failed (${resultRes.status}): ${text.slice(0, 500)}`);
      }
      return (await resultRes.json()) as T;
    }

    if (status.status === "FAILED" || status.status === "CANCELLED") {
      throw new Error(`fal request ${status.status}`);
    }

    await new Promise((r) => setTimeout(r, options.pollIntervalMs));
  }

  throw new Error(`fal request timed out after ${options.maxWaitMs}ms`);
}

function defaultVideoInput(input: FalVideoInput): Record<string, unknown> {
  return {
    prompt: input.prompt,
    image_url: input.image_url,
    ...(input.negative_prompt !== undefined && { negative_prompt: input.negative_prompt }),
    ...(input.enable_prompt_expansion !== undefined && {
      enable_prompt_expansion: input.enable_prompt_expansion,
    }),
    ...(input.agentic_max_iterations !== undefined && {
      agentic_max_iterations: input.agentic_max_iterations,
    }),
    ...(input.agentic_samples_per_iteration !== undefined && {
      agentic_samples_per_iteration: input.agentic_samples_per_iteration,
    }),
    ...(input.agentic_early_stop !== undefined && { agentic_early_stop: input.agentic_early_stop }),
    image_size: input.image_size ?? { width: 832, height: 480 },
    num_frames: input.num_frames ?? 189,
    frames_per_second: input.frames_per_second ?? 24,
    num_inference_steps: input.num_inference_steps ?? 28,
    guidance_scale: input.guidance_scale ?? 6,
    ...(input.seed !== undefined && { seed: input.seed }),
    enable_safety_checker: input.enable_safety_checker ?? true,
    ...(input.sync_mode !== undefined && { sync_mode: input.sync_mode }),
  };
}

export type FalPollOptions = { maxWaitMs?: number; pollIntervalMs?: number };

export async function falGenerateVideo(
  input: FalVideoInput,
  options?: FalPollOptions
): Promise<{
  videoUrl: string;
  contentType?: string;
  seed: number;
  requestId: string;
}> {
  const modelId =
    process.env.FAL_VIDEO_MODEL?.trim() || "nvidia/cosmos-3-super/image-to-video";
  const payload = defaultVideoInput(input);
  const requestId = await falQueueSubmit(modelId, payload);
  const result = await falQueuePoll<FalVideoResult>(modelId, requestId, {
    maxWaitMs: options?.maxWaitMs ?? 20 * 60 * 1000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
  });
  if (!result.video?.url) {
    throw new Error("fal video response missing video.url");
  }
  return {
    videoUrl: result.video.url,
    contentType: result.video.content_type,
    seed: result.seed,
    requestId,
  };
}

export type FalVideoProgress = {
  stage: "queued" | "generating" | "finishing";
  label: string;
  queuePosition?: number;
  modelId: string;
  requestId: string;
};

export type FalVideoV2Options = FalPollOptions & {
  onProgress?: (progress: FalVideoProgress) => void | Promise<void>;
  modelId?: string;
};

const FAL_MAX_TRANSIENT_STATUS_ERRORS = 5;

/**
 * Submit-and-poll with progress callbacks and tolerance for transient status
 * failures (network blips / 5xx) so a long render is not abandoned needlessly.
 */
async function falQueuePollWithProgress<T>(
  modelId: string,
  requestId: string,
  options: {
    maxWaitMs: number;
    pollIntervalMs: number;
    onProgress?: FalVideoV2Options["onProgress"];
  }
): Promise<T> {
  const deadline = Date.now() + options.maxWaitMs;
  const statusUrl = `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status?logs=0`;
  let transientErrors = 0;
  let lastLabel = "";

  while (Date.now() < deadline) {
    let status: QueueStatusResponse & { queue_position?: number };
    try {
      const res = await fetch(statusUrl, { headers: { Authorization: `Key ${getFalKey()}` } });
      if (res.status === 429 || res.status >= 500) {
        transientErrors += 1;
        if (transientErrors > FAL_MAX_TRANSIENT_STATUS_ERRORS) {
          throw new Error(`fal status failed repeatedly (${res.status})`);
        }
        await new Promise((r) => setTimeout(r, options.pollIntervalMs * 2));
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`fal status failed (${res.status}): ${text.slice(0, 300)}`);
      }
      status = (await res.json()) as typeof status;
      transientErrors = 0;
    } catch (err) {
      if (err instanceof Error && /fal status failed/.test(err.message)) throw err;
      transientErrors += 1;
      if (transientErrors > FAL_MAX_TRANSIENT_STATUS_ERRORS) throw err;
      await new Promise((r) => setTimeout(r, options.pollIntervalMs * 2));
      continue;
    }

    const stage: FalVideoProgress["stage"] =
      status.status === "COMPLETED"
        ? "finishing"
        : status.status === "IN_PROGRESS"
          ? "generating"
          : "queued";
    const label = describeFalQueueStatus(status.status, status.queue_position);
    if (label !== lastLabel && options.onProgress) {
      lastLabel = label;
      await options.onProgress({
        stage,
        label,
        queuePosition: status.queue_position,
        modelId,
        requestId,
      });
    }

    if (status.status === "COMPLETED") {
      const resultUrl =
        status.response_url ?? `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;
      const resultRes = await fetch(resultUrl, { headers: { Authorization: `Key ${getFalKey()}` } });
      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`fal result failed (${resultRes.status}): ${text.slice(0, 300)}`);
      }
      return (await resultRes.json()) as T;
    }
    if (status.status === "FAILED" || status.status === "CANCELLED") {
      throw new Error(`fal request ${status.status}`);
    }
    await new Promise((r) => setTimeout(r, options.pollIntervalMs));
  }
  throw new Error(`fal request timed out after ${Math.round(options.maxWaitMs / 1000)}s`);
}

/**
 * Text- or image-to-video on fal.ai. Model chosen per FAL_TEXT_VIDEO_MODEL /
 * FAL_IMAGE_VIDEO_MODEL (Seedance Lite by default); payload adapted per model
 * family so duration/aspect/resolution always reach the provider correctly.
 */
export async function falGenerateVideoV2(
  request: SimpleVideoRequest,
  options?: FalVideoV2Options
): Promise<{
  videoUrl: string;
  contentType?: string;
  seed?: number;
  requestId: string;
  modelId: string;
}> {
  const modelId = options?.modelId ?? resolveFalVideoModel(Boolean(request.imageUrl?.trim()));
  const payload = buildFalVideoPayload(modelId, request);
  const requestId = await falQueueSubmit(modelId, payload);
  await options?.onProgress?.({
    stage: "queued",
    label: "Queued at fal.ai",
    modelId,
    requestId,
  });
  const result = await falQueuePollWithProgress<Record<string, unknown>>(modelId, requestId, {
    maxWaitMs: options?.maxWaitMs ?? 8 * 60 * 1000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
    onProgress: options?.onProgress,
  });
  const video = extractFalVideoUrl(result);
  if (!video) throw new Error("fal video response missing video url");
  const seed = typeof result.seed === "number" ? result.seed : undefined;
  return { videoUrl: video.url, contentType: video.contentType, seed, requestId, modelId };
}

export async function falGenerateImage(
  input: FalImageInput,
  options?: FalPollOptions & { modelId?: string }
): Promise<{
  imageUrl: string;
  requestId: string;
}> {
  const modelId =
    options?.modelId?.trim() ||
    process.env.FAL_IMAGE_MODEL?.trim() ||
    "fal-ai/nano-banana-pro";
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    ...(input.negative_prompt !== undefined && { negative_prompt: input.negative_prompt }),
    ...(input.image_size !== undefined && { image_size: input.image_size }),
    ...(input.num_inference_steps !== undefined && {
      num_inference_steps: input.num_inference_steps,
    }),
    ...(input.guidance_scale !== undefined && { guidance_scale: input.guidance_scale }),
    ...(input.seed !== undefined && { seed: input.seed }),
    enable_safety_checker: input.enable_safety_checker ?? true,
  };
  const requestId = await falQueueSubmit(modelId, payload);
  const result = await falQueuePoll<FalImageResult>(modelId, requestId, {
    maxWaitMs: options?.maxWaitMs ?? 5 * 60 * 1000,
    pollIntervalMs: options?.pollIntervalMs ?? 2000,
  });
  const imageUrl =
    result.images?.[0]?.url ?? result.image?.url;
  if (!imageUrl) {
    throw new Error("fal image response missing image URL");
  }
  return { imageUrl, requestId };
}


function authHeaders(key: string): HeadersInit {
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

/** OpenAI-shaped chat via fal OpenRouter proxy (sync — keep timeout low for chat). */
export async function falOpenRouterChatComplete(
  model: string,
  messages: Array<{ role: string; content: string }>,
  timeoutMs = 12_000,
  maxTokens = 1024
): Promise<string> {
  const key = getFalApiKey();
  if (!key) {
    throw new Error("FAL_KEY is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(
      "https://fal.run/openrouter/router/openai/v1/chat/completions",
      {
        method: "POST",
        headers: authHeaders(key),
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      }
    );
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`fal OpenRouter timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty response from fal OpenRouter");
  }
  return content;
}
