/**
 * fal.ai server-side client (Convex actions).
 * Uses REST queue API — matches @fal-ai/client subscribe/queue behavior without browser APIs.
 *
 * Env: FAL_KEY or FAL_API_KEY (required)
 *      FAL_IMAGE_MODEL (default fal-ai/nano-banana-pro)
 *      FAL_MODEL / FAL_LLM_MODEL (chat via any-llm or OpenRouter)
 */

export function getFalApiKey(): string | undefined {
  return (
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim() ||
    undefined
  );
}

function authHeaders(key: string): HeadersInit {
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type QueueSubmitResponse = {
  request_id: string;
  status_url?: string;
  response_url?: string;
};

type QueueStatusResponse = {
  status: string;
  error?: string;
  logs?: Array<{ message?: string }>;
};

/** Poll fal queue until COMPLETED; returns model output payload. */
export async function falQueueSubscribe(
  model: string,
  input: Record<string, unknown>,
  options?: { maxWaitMs?: number; pollIntervalMs?: number }
): Promise<unknown> {
  const key = getFalApiKey();
  if (!key) {
    throw new Error("FAL_KEY is not configured");
  }

  const maxWaitMs = options?.maxWaitMs ?? 300_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 2_000;

  const submitRes = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: authHeaders(key),
    body: JSON.stringify(input),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`fal queue submit HTTP ${submitRes.status}: ${text.slice(0, 400)}`);
  }

  const submitted = (await submitRes.json()) as QueueSubmitResponse;
  const requestId = submitted.request_id;
  if (!requestId) {
    throw new Error("fal queue submit missing request_id");
  }

  const statusUrl =
    submitted.status_url ??
    `https://queue.fal.run/${model}/requests/${requestId}/status`;
  const responseUrl =
    submitted.response_url ??
    `https://queue.fal.run/${model}/requests/${requestId}`;

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const statusRes = await fetch(`${statusUrl}?logs=0`, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`fal status HTTP ${statusRes.status}: ${text.slice(0, 300)}`);
    }

    const status = (await statusRes.json()) as QueueStatusResponse;

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${key}` },
      });
      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`fal result HTTP ${resultRes.status}: ${text.slice(0, 300)}`);
      }
      const body = (await resultRes.json()) as { response?: unknown };
      return body.response ?? body;
    }

    if (status.status === "FAILED" || status.status === "CANCELLED") {
      throw new Error(
        `fal request ${status.status}: ${status.error ?? "unknown error"}`
      );
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`fal queue timeout for model ${model}`);
}

export type FalImageOutput = {
  url: string;
  contentType?: string;
  fileName?: string;
};

/** Text-to-image via fal (e.g. fal-ai/nano-banana-pro). */
export async function falGenerateImage(args: {
  prompt: string;
  numImages?: number;
  aspectRatio?: string;
  outputFormat?: "png" | "jpeg" | "webp";
  resolution?: "1K" | "2K" | "4K";
  systemPrompt?: string;
  enableWebSearch?: boolean;
}): Promise<FalImageOutput> {
  const model =
    process.env.FAL_IMAGE_MODEL?.trim() ?? "fal-ai/nano-banana-pro";

  const data = (await falQueueSubscribe(model, {
    prompt: args.prompt,
    num_images: args.numImages ?? 1,
    aspect_ratio: args.aspectRatio ?? "1:1",
    output_format: args.outputFormat ?? "png",
    resolution: args.resolution ?? "1K",
    ...(args.systemPrompt ? { system_prompt: args.systemPrompt } : {}),
    ...(args.enableWebSearch ? { enable_web_search: true } : {}),
  })) as {
    images?: Array<{
      url: string;
      content_type?: string;
      file_name?: string;
    }>;
  };

  const first = data?.images?.[0];
  if (!first?.url) {
    throw new Error("fal image model returned no images");
  }

  return {
    url: first.url,
    contentType: first.content_type,
    fileName: first.file_name,
  };
}

/** Chat/text via fal-ai/any-llm (model id e.g. google/gemini-2.5-flash). */
export async function falAnyLlmComplete(
  prompt: string,
  model: string
): Promise<string> {
  const data = (await falQueueSubscribe("fal-ai/any-llm", {
    prompt,
    model,
  })) as { output?: string; text?: string };

  const text = (data?.output ?? data?.text ?? "").trim();
  if (!text) {
    throw new Error("Empty response from fal-ai/any-llm");
  }
  return text;
}

/** OpenAI-shaped chat via fal OpenRouter proxy. */
export async function falOpenRouterChatComplete(
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const key = getFalApiKey();
  if (!key) {
    throw new Error("FAL_KEY is not configured");
  }

  const res = await fetch(
    "https://fal.run/openrouter/router/openai/v1/chat/completions",
    {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    }
  );

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
