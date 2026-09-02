/**
 * Media provider orchestration: fal.ai primary, Replicate fallback, Google AI Studio backup.
 */

import {
  falGenerateImage,
  falGenerateVideoV2,
  getFalApiKey,
  type FalImageSize,
  type FalVideoProgress,
} from "./falClient";
import { imageCategoryAspectRatio, videoCategoryAspectRatio } from "./mediaCatalog";
import {
  falImageSizeToAspectRatio,
  geminiImageWithFallback,
  getGeminiApiKey,
} from "./geminiImageClient";
import {
  getReplicateToken,
  replicateGenerateImage,
  replicateGenerateVideo,
} from "./replicateClient";
import { openaiGenerateImage, getOpenAiImageApiKey } from "./openaiImageClient";
import {
  isMediaProviderBillingError,
  type MediaProviderId,
  withRetries,
} from "./mediaUtils";

export type ImageGenerateParams = {
  prompt: string;
  category?: string;
  sourceImageUrl?: string;
  negativePrompt?: string;
  imageSize?: FalImageSize;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  enableSafetyChecker?: boolean;
};

export type VideoGenerateParams = {
  prompt: string;
  category?: string;
  imageUrl?: string;
  negativePrompt?: string;
  enablePromptExpansion?: boolean;
  agenticMaxIterations?: number;
  agenticSamplesPerIteration?: number;
  agenticEarlyStop?: boolean;
  imageSize?: FalImageSize;
  numFrames?: number;
  framesPerSecond?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  enableSafetyChecker?: boolean;
  syncMode?: boolean;
  duration?: number;
  resolution?: string;
  generateAudio?: boolean;
  aspectRatio?: "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9";
};

const FAL_IMAGE_FALLBACK_MODEL =
  process.env.FAL_IMAGE_FALLBACK_MODEL?.trim() || "fal-ai/flux/schnell";

function imageMaxWaitMs(): number {
  return Number(process.env.FAL_IMAGE_MAX_WAIT_MS ?? 5 * 60 * 1000);
}

function videoMaxWaitMs(): number {
  return Number(process.env.FAL_VIDEO_MAX_WAIT_MS ?? 8 * 60 * 1000);
}

async function falGenerateImageWithModel(
  modelId: string,
  input: ImageGenerateParams
): Promise<{ imageUrl: string; requestId: string }> {
  return await withRetries(
    `fal-image:${modelId}`,
    () =>
      falGenerateImage(
        {
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          image_size: input.imageSize,
          num_inference_steps: input.numInferenceSteps,
          guidance_scale: input.guidanceScale,
          seed: input.seed,
          enable_safety_checker: input.enableSafetyChecker,
        },
        { modelId, maxWaitMs: imageMaxWaitMs() }
      ),
    { attempts: 2 }
  );
}

export async function generateImageWithFallback(
  input: ImageGenerateParams,
  options?: { allowOpenAi?: boolean }
): Promise<{ imageUrl: string; provider: MediaProviderId; externalId: string }> {
  const errors: string[] = [];
  const allowOpenAi = options?.allowOpenAi !== false;

  // OpenAI first when allowed (Premium subscription on server); other providers are failover.
  if (allowOpenAi && getOpenAiImageApiKey() && !input.sourceImageUrl?.trim()) {
    try {
      const result = await openaiGenerateImage(input.prompt, {
        imageSize: input.imageSize,
      });
      return {
        imageUrl: result.dataUrl,
        provider: "openai",
        externalId: result.requestId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (getFalApiKey()) {
    const primaryModel = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/nano-banana-pro";
    try {
      const result = await falGenerateImageWithModel(primaryModel, input);
      return { imageUrl: result.imageUrl, provider: "fal", externalId: result.requestId };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      if (
        !isMediaProviderBillingError(err) &&
        FAL_IMAGE_FALLBACK_MODEL !== primaryModel
      ) {
        try {
          const fallback = await falGenerateImageWithModel(FAL_IMAGE_FALLBACK_MODEL, input);
          return {
            imageUrl: fallback.imageUrl,
            provider: "fal",
            externalId: fallback.requestId,
          };
        } catch (err2) {
          errors.push(err2 instanceof Error ? err2.message : String(err2));
        }
      }
    }
  }

  if (getReplicateToken()) {
    try {
      const result = await replicateGenerateImage(input.prompt, {
        sourceImageUrl: input.sourceImageUrl,
        seed: input.seed,
        aspectRatio: imageCategoryAspectRatio(input.category ?? "anime_art"),
        numInferenceSteps: input.numInferenceSteps,
        enableSafetyChecker: input.enableSafetyChecker,
      });
      return {
        imageUrl: result.imageUrl,
        provider: "replicate",
        externalId: result.predictionId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (getGeminiApiKey()) {
    try {
      const result = await geminiImageWithFallback(input.prompt, {
        sourceImageUrl: input.sourceImageUrl,
        aspectRatio: falImageSizeToAspectRatio(input.imageSize),
        seed: input.seed,
      });
      return {
        imageUrl: result.dataUrl,
        provider: "gemini",
        externalId: result.requestId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(`All providers failed for image: ${errors.join(" | ") || "no providers configured"}`);
}

/** Free-tier chat image generation — fal / Replicate / Gemini only (no OpenAI). */
export async function generateFreeImageForChat(
  prompt: string
): Promise<{ imageUrl: string; provider: MediaProviderId; externalId: string }> {
  const errors: string[] = [];

  if (getFalApiKey()) {
    const primaryModel = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/flux/schnell";
    try {
      const result = await falGenerateImageWithModel(primaryModel, { prompt });
      return { imageUrl: result.imageUrl, provider: "fal", externalId: result.requestId };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      if (FAL_IMAGE_FALLBACK_MODEL !== primaryModel) {
        try {
          const fallback = await falGenerateImageWithModel(FAL_IMAGE_FALLBACK_MODEL, { prompt });
          return {
            imageUrl: fallback.imageUrl,
            provider: "fal",
            externalId: fallback.requestId,
          };
        } catch (err2) {
          errors.push(err2 instanceof Error ? err2.message : String(err2));
        }
      }
    }
  }

  if (getReplicateToken()) {
    try {
      const result = await replicateGenerateImage(prompt, {
        aspectRatio: imageCategoryAspectRatio("anime_art"),
      });
      return {
        imageUrl: result.imageUrl,
        provider: "replicate",
        externalId: result.predictionId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (getGeminiApiKey()) {
    try {
      const result = await geminiImageWithFallback(prompt, {});
      return {
        imageUrl: result.dataUrl,
        provider: "gemini",
        externalId: result.requestId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    `Free image generation unavailable: ${errors.join(" | ") || "no providers configured"}`
  );
}

export type VideoProgressEvent = {
  provider: MediaProviderId;
  stage: "queued" | "generating" | "finishing";
  label: string;
  externalId?: string;
  modelId?: string;
};

export type VideoGenerateHooks = {
  onProgress?: (event: VideoProgressEvent) => void | Promise<void>;
};

/** Which video providers are configured — lets the UI say what will actually run. */
export function videoProviderAvailability(): { fal: boolean; replicate: boolean } {
  return { fal: Boolean(getFalApiKey()), replicate: Boolean(getReplicateToken()) };
}

/**
 * fal.ai first for BOTH text-to-video and image-to-video (model chosen per
 * FAL_TEXT_VIDEO_MODEL / FAL_IMAGE_VIDEO_MODEL), Replicate Seedance as backup.
 * Duration, aspect ratio and resolution are forwarded to every provider.
 */
export async function generateVideoWithFallback(
  input: VideoGenerateParams,
  hooks?: VideoGenerateHooks
): Promise<{
  videoUrl: string;
  contentType?: string;
  seed?: number;
  provider: MediaProviderId;
  externalId: string;
  modelId?: string;
}> {
  const errors: string[] = [];
  const imageUrl = input.imageUrl?.trim() || undefined;
  const aspectRatio =
    input.aspectRatio ?? videoCategoryAspectRatio(input.category ?? "anime_videos");

  if (getFalApiKey()) {
    try {
      const result = await withRetries(
        "fal-video",
        () =>
          falGenerateVideoV2(
            {
              prompt: input.prompt,
              imageUrl,
              durationSec: input.duration,
              aspectRatio,
              resolution: input.resolution,
              negativePrompt: input.negativePrompt,
              seed: input.seed,
              generateAudio: input.generateAudio,
            },
            {
              maxWaitMs: videoMaxWaitMs(),
              onProgress: (p: FalVideoProgress) =>
                hooks?.onProgress?.({
                  provider: "fal",
                  stage: p.stage,
                  label: p.label,
                  externalId: p.requestId,
                  modelId: p.modelId,
                }),
            }
          ),
        { attempts: 2, baseDelayMs: 1500 }
      );
      return {
        videoUrl: result.videoUrl,
        contentType: result.contentType,
        seed: result.seed,
        provider: "fal",
        externalId: result.requestId,
        modelId: result.modelId,
      };
    } catch (err) {
      errors.push(`fal: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (getReplicateToken()) {
    try {
      await hooks?.onProgress?.({
        provider: "replicate",
        stage: "queued",
        label: errors.length ? "Retrying with backup provider…" : "Queued at Replicate",
      });
      const result = await replicateGenerateVideo(input.prompt, {
        imageUrl,
        seed: input.seed,
        aspectRatio,
        duration: input.duration,
        resolution: input.resolution,
        generateAudio: input.generateAudio,
      });
      return {
        videoUrl: result.videoUrl,
        provider: "replicate",
        externalId: result.predictionId,
      };
    } catch (err) {
      errors.push(`replicate: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `All providers failed for video: ${errors.join(" | ") || "no video providers configured"}`
  );
}
