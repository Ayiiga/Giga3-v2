/** Shared helpers for media generation reliability. */

export type MediaProviderId = "fal" | "replicate" | "gemini" | "openai";

/** Provider account out of credits / quota — skip sibling retries on the same vendor. */
export function isMediaProviderBillingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /exhausted balance|insufficient credit|user is locked|quota exceeded|only available on paid plans|billing details|402|429.*quota/i.test(
    msg
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientHttpError(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 800;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof Error &&
        (/timed out|fetch failed|ECONNRESET|network|429|502|503|504/i.test(err.message) ||
          err.message.includes("fal status failed") ||
          err.message.includes("fal submit failed"));
      if (!retryable || i === attempts - 1) break;
      console.warn(`[media] ${label} attempt ${i + 1}/${attempts} failed, retrying…`, err);
      await sleep(baseDelayMs * (i + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

export function toUserMediaError(err: unknown, mediaType: "image" | "video"): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/FAL_KEY|not configured/i.test(raw)) {
    return "Media service is not configured yet. Please try again later.";
  }
  if (/REPLICATE_API_TOKEN|Replicate is not configured/i.test(raw)) {
    return "Backup media provider is not configured. We're retrying with our primary provider.";
  }
  if (/GEMINI_API_KEY|Gemini Imagen|Gemini image edit/i.test(raw)) {
    return "Google AI Studio backup is not configured. Please try again shortly.";
  }
  if (/Insufficient credits|Insufficient tokens/i.test(raw)) {
    return raw;
  }
  if (/timed out/i.test(raw)) {
    return `${mediaType === "video" ? "Video" : "Image"} generation took too long. Please try a shorter prompt or try again.`;
  }
  if (/User not found/i.test(raw)) {
    return "Account not found. Sign out and sign in again.";
  }
  if (/image_url|imageUrl|image url/i.test(raw)) {
    return "Video generation needs a source image. Add an image in Media Studio or use image mode first.";
  }
  if (/All providers failed/i.test(raw)) {
    if (isMediaProviderBillingError({ message: raw })) {
      return `We couldn't generate your ${mediaType} right now. Our image providers (fal.ai, Replicate, Google AI) need billing top-up — OpenAI backup was attempted automatically. Try again in a minute or contact support if this persists.`;
    }
    return `We couldn't generate your ${mediaType} right now. All providers were busy or unavailable — please try again in a minute.`;
  }

  console.error(`[media] ${mediaType} error:`, raw);
  return `We couldn't generate your ${mediaType} right now. Please try again.`;
}
