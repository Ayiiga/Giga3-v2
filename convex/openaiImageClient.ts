/**
 * OpenAI Images API — final fallback when fal / Replicate / Google are unavailable.
 * Uses OPENAI_API_KEY (or OPENAI_FALLBACK_API_KEY) from Convex environment.
 */

import type { FalImageSize } from "./falClient";
import { falImageSizeToAspectRatio } from "./geminiImageClient";
import { withRetries } from "./mediaUtils";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export function getOpenAiImageApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_FALLBACK_API_KEY?.trim() ||
    undefined
  );
}

function openAiImageSize(imageSize?: FalImageSize): "1024x1024" | "1024x1536" | "1536x1024" {
  const ratio = falImageSizeToAspectRatio(imageSize);
  switch (ratio) {
    case "9:16":
    case "3:4":
      return "1024x1536";
    case "16:9":
    case "4:3":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

export async function openaiGenerateImage(
  prompt: string,
  options?: { imageSize?: FalImageSize }
): Promise<{ dataUrl: string; requestId: string }> {
  const apiKey = getOpenAiImageApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

  return withRetries(
    "openai-image",
    async () => {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.OPENAI_IMAGE_MAX_WAIT_MS ?? 90_000);
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(OPENAI_IMAGES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt,
            size: openAiImageSize(options?.imageSize),
            n: 1,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`OpenAI image generation timed out after ${timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      const body = (await res.json()) as {
        error?: { message?: string };
        data?: Array<{ b64_json?: string; url?: string }>;
      };

      if (!res.ok) {
        const detail = body.error?.message ?? `HTTP ${res.status}`;
        throw new Error(`OpenAI image HTTP ${res.status}: ${detail}`);
      }

      const item = body.data?.[0];
      if (item?.url) {
        return { dataUrl: item.url, requestId: `openai-${Date.now()}` };
      }

      const b64 = item?.b64_json;
      if (!b64) {
        throw new Error("OpenAI image response missing image data");
      }

      return {
        dataUrl: `data:image/png;base64,${b64}`,
        requestId: `openai-${Date.now()}`,
      };
    },
    { attempts: 2, baseDelayMs: 1200 }
  );
}
