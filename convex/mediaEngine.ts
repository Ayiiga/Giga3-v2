/**
 * Media provider orchestration: fal.ai primary, Replicate fallback, Google AI Studio backup.
 */

import { falGenerateImage, falGenerateVideo, getFalApiKey, type FalImageSize } from "./falClient";
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
import { type MediaProviderId, withRetries } from "./mediaUtils";

export type ImageGenerateParams = {
  prompt: string;
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
  input: ImageGenerateParams
): Promise<{ imageUrl: string; provider: MediaProviderId; externalId: string }> {
  const errors: string[] = [];

  if (getFalApiKey()) {
    const primaryModel = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/nano-banana-pro";
    try {
      const result = await falGenerateImageWithModel(primaryModel, input);
      return { imageUrl: result.imageUrl, provider: "fal", externalId: result.requestId };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      if (FAL_IMAGE_FALLBACK_MODEL !== primaryModel) {
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
      const result = await replicateGenerateImage(input.prompt);
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

export async function generateVideoWithFallback(
  input: VideoGenerateParams
): Promise<{
  videoUrl: string;
  contentType?: string;
  seed?: number;
  provider: MediaProviderId;
  externalId: string;
}> {
  const errors: string[] = [];
  const imageUrl = input.imageUrl?.trim();

  if (getFalApiKey() && imageUrl) {
    try {
      const result = await withRetries(
        "fal-video",
        () =>
          falGenerateVideo(
            {
              prompt: input.prompt,
              image_url: imageUrl,
              negative_prompt: input.negativePrompt,
              enable_prompt_expansion: input.enablePromptExpansion,
              agentic_max_iterations: input.agenticMaxIterations,
              agentic_samples_per_iteration: input.agenticSamplesPerIteration,
              agentic_early_stop: input.agenticEarlyStop,
              image_size: input.imageSize,
              num_frames: input.numFrames,
              frames_per_second: input.framesPerSecond,
              num_inference_steps: input.numInferenceSteps,
              guidance_scale: input.guidanceScale,
              seed: input.seed,
              enable_safety_checker: input.enableSafetyChecker,
              sync_mode: input.syncMode,
            },
            { maxWaitMs: videoMaxWaitMs() }
          ),
        { attempts: 2 }
      );
      return {
        videoUrl: result.videoUrl,
        contentType: result.contentType,
        seed: result.seed,
        provider: "fal",
        externalId: result.requestId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (getReplicateToken()) {
    try {
      const result = await replicateGenerateVideo(input.prompt, imageUrl);
      return {
        videoUrl: result.videoUrl,
        provider: "replicate",
        externalId: result.predictionId,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (!imageUrl && getFalApiKey()) {
    errors.push("fal video requires a source image_url");
  }

  throw new Error(`All providers failed for video: ${errors.join(" | ") || "no providers configured"}`);
}
