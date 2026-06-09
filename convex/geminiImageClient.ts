/**
 * Google AI Studio (Gemini API) — backup image generation (Imagen) and editing (Gemini).
 * Uses GEMINI_API_KEY from Convex environment (same key as chat failover).
 */

import type { FalImageSize } from "./falClient";
import { GEMINI_IMAGE_EDIT_MODEL, GEMINI_IMAGE_MODEL } from "./mediaCatalog";
import { sleep, withRetries } from "./mediaUtils";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return key;
}

function imageMaxWaitMs(): number {
  return Number(process.env.GEMINI_IMAGE_MAX_WAIT_MS ?? 5 * 60 * 1000);
}

export function falImageSizeToAspectRatio(
  imageSize?: FalImageSize
): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
  if (!imageSize || typeof imageSize === "string") {
    switch (imageSize) {
      case "portrait_4_3":
        return "3:4";
      case "portrait_16_9":
        return "9:16";
      case "landscape_4_3":
        return "4:3";
      case "landscape_16_9":
        return "16:9";
      default:
        return "1:1";
    }
  }
  const { width, height } = imageSize;
  const ratio = width / height;
  if (ratio > 1.5) return "16:9";
  if (ratio > 1.1) return "4:3";
  if (ratio < 0.65) return "9:16";
  if (ratio < 0.9) return "3:4";
  return "1:1";
}

type GeminiImageResult = {
  dataUrl: string;
  mimeType: string;
  requestId: string;
};

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function extractInlineImagePart(
  parts: Array<Record<string, unknown>> | undefined
): { mimeType: string; data: string } | null {
  if (!parts?.length) return null;
  for (const part of parts) {
    const inline =
      (part.inlineData as { mimeType?: string; data?: string } | undefined) ??
      (part.inline_data as { mime_type?: string; data?: string } | undefined);
    if (!inline) continue;
    const mimeType =
      (inline as { mimeType?: string }).mimeType ??
      (inline as { mime_type?: string }).mime_type ??
      "image/png";
    const data = inline.data;
    if (typeof data === "string" && data.length > 0) {
      return { mimeType, data };
    }
  }
  return null;
}

async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ mimeType: string; data: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(imageUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch source image (${res.status})`);
    }
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 15 * 1024 * 1024) {
      throw new Error("Source image is too large (max 15MB)");
    }
    return { mimeType, data: buffer.toString("base64") };
  } finally {
    clearTimeout(timer);
  }
}

async function geminiGenerateImageViaGenerateContent(
  prompt: string,
  model: string
): Promise<GeminiImageResult> {
  const apiKey = requireGeminiApiKey();
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), imageMaxWaitMs());
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini image generation timed out after ${imageMaxWaitMs()}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini image generation HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<Record<string, unknown>> };
    }>;
  };
  const inline = extractInlineImagePart(data.candidates?.[0]?.content?.parts);
  if (!inline) {
    throw new Error("Gemini image generation response missing image data");
  }
  return {
    dataUrl: toDataUrl(inline.mimeType, inline.data),
    mimeType: inline.mimeType,
    requestId: `gemini-gen-${Date.now()}`,
  };
}

/** Text-to-image via Imagen (Google AI Studio), with Gemini native model fallback. */
export async function geminiGenerateImage(
  prompt: string,
  options?: { aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9"; seed?: number }
): Promise<GeminiImageResult> {
  return withRetries(
    "gemini-imagen",
    async () => {
      const apiKey = requireGeminiApiKey();
      const model = GEMINI_IMAGE_MODEL;
      const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:predict`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), imageMaxWaitMs());
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: options?.aspectRatio ?? "1:1",
              ...(options?.seed !== undefined ? { seed: options.seed } : {}),
            },
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`Gemini Imagen timed out after ${imageMaxWaitMs()}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Imagen HTTP ${res.status}: ${errText.slice(0, 400)}`);
      }

      const data = (await res.json()) as {
        predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
      };
      const prediction = data.predictions?.[0];
      const base64 = prediction?.bytesBase64Encoded;
      if (!base64) {
        throw new Error("Gemini Imagen response missing image bytes");
      }
      const mimeType = prediction?.mimeType ?? "image/png";
      return {
        dataUrl: toDataUrl(mimeType, base64),
        mimeType,
        requestId: `imagen-${Date.now()}`,
      };
    },
    { attempts: 2 }
  ).catch(async (imagenErr) => {
    console.warn("[media] Imagen failed, trying Gemini native image model:", imagenErr);
    return withRetries(
      "gemini-native-image",
      () => geminiGenerateImageViaGenerateContent(prompt, GEMINI_IMAGE_EDIT_MODEL),
      { attempts: 2 }
    );
  });
}

/** Text-and-image-to-image via Gemini (editing, style, background removal prompts). */
export async function geminiEditImage(
  prompt: string,
  sourceImageUrl: string
): Promise<GeminiImageResult> {
  return withRetries(
    "gemini-image-edit",
    async () => {
      const apiKey = requireGeminiApiKey();
      const model = GEMINI_IMAGE_EDIT_MODEL;
      const source = await fetchImageAsBase64(sourceImageUrl);
      const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), imageMaxWaitMs());
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: source.mimeType,
                      data: source.data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          throw new Error(`Gemini image edit timed out after ${imageMaxWaitMs()}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini image edit HTTP ${res.status}: ${errText.slice(0, 400)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<Record<string, unknown>> };
        }>;
      };
      const inline = extractInlineImagePart(data.candidates?.[0]?.content?.parts);
      if (!inline) {
        throw new Error("Gemini image edit response missing image data");
      }
      return {
        dataUrl: toDataUrl(inline.mimeType, inline.data),
        mimeType: inline.mimeType,
        requestId: `gemini-edit-${Date.now()}`,
      };
    },
    { attempts: 2 }
  );
}

/** Backup: generate from text, or edit when a source image URL is provided. */
export async function geminiImageWithFallback(
  prompt: string,
  options?: {
    sourceImageUrl?: string;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    seed?: number;
  }
): Promise<GeminiImageResult> {
  const source = options?.sourceImageUrl?.trim();
  if (source) {
    try {
      return await geminiEditImage(prompt, source);
    } catch (editErr) {
      console.warn("[media] Gemini image edit failed, falling back to Imagen:", editErr);
    }
  }
  return geminiGenerateImage(prompt, {
    aspectRatio: options?.aspectRatio,
    seed: options?.seed,
  });
}
