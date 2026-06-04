export function hasOpenAiImageKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

const OPENAI_IMAGE_MODELS = ["gpt-image-1", "dall-e-3", "dall-e-2"] as const;

async function openaiGenerateImageWithModel(
  apiKey: string,
  prompt: string,
  model: (typeof OPENAI_IMAGE_MODELS)[number],
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: model === "dall-e-2" ? "512x512" : "1024x1024",
    }),
  });

  const body = (await res.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? `OpenAI images HTTP ${res.status}`);
  }

  const item = body.data?.[0];
  if (item?.url) return item.url;
  if (item?.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  throw new Error("OpenAI returned no image URL");
}

export async function openaiGenerateImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in Convex environment");
  }

  let lastError: Error | undefined;
  for (const model of OPENAI_IMAGE_MODELS) {
    try {
      return await openaiGenerateImageWithModel(apiKey, prompt, model);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const tryNext =
        msg.includes("does not exist") ||
        msg.includes("not found") ||
        msg.includes("unknown model");
      if (!tryNext) throw lastError;
    }
  }

  throw lastError ?? new Error("OpenAI image generation failed");
}
