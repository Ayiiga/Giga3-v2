/**
 * OpenAI Images API — final fallback when fal / Replicate / Google are unavailable.
 * Uses OPENAI_API_KEY (or OPENAI_FALLBACK_API_KEY) from Convex environment.
 */

import type { FalImageSize } from "./falClient";
import { falImageSizeToAspectRatio } from "./geminiImageClient";
import { withRetries } from "./mediaUtils";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

/** Max source bytes for OpenAI image edits (cost / abuse control). */
const MAX_EDIT_SOURCE_BYTES = 15 * 1024 * 1024;

export function getOpenAiImageApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_FALLBACK_API_KEY?.trim() ||
    undefined
  );
}

function openAiImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
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

function parseOpenAiImageBody(body: {
  error?: { message?: string };
  data?: Array<{ b64_json?: string; url?: string }>;
}, status: number): { dataUrl: string; requestId: string } {
  if (status < 200 || status >= 300) {
    const detail = body.error?.message ?? `HTTP ${status}`;
    throw new Error(`OpenAI image HTTP ${status}: ${detail}`);
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
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function loadImageBlob(sourceImageUrl: string): Promise<Blob> {
  const src = sourceImageUrl.trim();
  if (src.startsWith("data:image/")) {
    const comma = src.indexOf(",");
    if (comma < 0) throw new Error("Invalid image data URL");
    const header = src.slice(0, comma);
    const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64$/i.exec(header);
    const mime = mimeMatch?.[1] ?? "image/png";
    const b64 = src.slice(comma + 1);
    const binary = base64ToUint8Array(b64);
    if (binary.byteLength > MAX_EDIT_SOURCE_BYTES) {
      throw new Error("Image is too large to edit (max 15 MB)");
    }
    return new Blob([binary], { type: mime });
  }
  if (!/^https?:\/\//i.test(src)) {
    throw new Error("Image edit source must be an https or data URL");
  }
  const res = await fetch(src);
  if (!res.ok) {
    throw new Error(`Could not fetch source image (HTTP ${res.status})`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  if (!mime.startsWith("image/")) {
    throw new Error(`Unsupported source MIME type: ${mime}`);
  }
  const buffer = new Uint8Array(await res.arrayBuffer());
  if (buffer.byteLength > MAX_EDIT_SOURCE_BYTES) {
    throw new Error("Image is too large to edit (max 15 MB)");
  }
  return new Blob([buffer], { type: mime });
}

export async function openaiGenerateImage(
  prompt: string,
  options?: { imageSize?: FalImageSize }
): Promise<{ dataUrl: string; requestId: string }> {
  const apiKey = getOpenAiImageApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = openAiImageModel();

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
      return parseOpenAiImageBody(body, res.status);
    },
    { attempts: 2, baseDelayMs: 1200 }
  );
}

/**
 * OpenAI Images edits API — used for chat image editing when the account
 * supports the configured OPENAI_IMAGE_MODEL (default gpt-image-1).
 */
export async function openaiEditImage(
  prompt: string,
  sourceImageUrl: string,
  options?: { imageSize?: FalImageSize }
): Promise<{ dataUrl: string; requestId: string }> {
  const apiKey = getOpenAiImageApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = openAiImageModel();
  const imageBlob = await loadImageBlob(sourceImageUrl);

  return withRetries(
    "openai-image-edit",
    async () => {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.OPENAI_IMAGE_MAX_WAIT_MS ?? 90_000);
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt.slice(0, 32000));
      form.append("n", "1");
      form.append("size", openAiImageSize(options?.imageSize));
      form.append("image", imageBlob, "source.png");

      let res: Response;
      try {
        res = await fetch(OPENAI_IMAGE_EDITS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: form,
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`OpenAI image edit timed out after ${timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      const body = (await res.json()) as {
        error?: { message?: string };
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      return parseOpenAiImageBody(body, res.status);
    },
    { attempts: 2, baseDelayMs: 1200 }
  );
}
