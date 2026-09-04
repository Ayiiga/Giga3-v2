/**
 * Image-first pipeline for video prompts that need readable English text/logos/UI.
 * Video models garble typography; a still frame from an image model animates more faithfully.
 */

import type { ActionCtx } from "./_generated/server";
import type { FalImageSize } from "./falClient";
import { buildImagePrompt } from "./mediaCatalog";
import { generateImageWithFallback } from "./mediaEngine";
import { persistImageUrlIfNeeded } from "./mediaStorage";
import {
  defaultVideoNegativePrompt,
  motionOnlyVideoPromptFromImage,
  refineVideoPromptForGeneration,
  videoPromptNeedsTextGuard,
} from "./mediaVideoPrompt";

export function videoAspectToFalImageSize(
  aspect?: "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9"
): FalImageSize {
  switch (aspect) {
    case "9:16":
    case "3:4":
      return "portrait_16_9";
    case "4:3":
      return "landscape_4_3";
    case "16:9":
    case "21:9":
      return "landscape_16_9";
    default:
      return "square_hd";
  }
}

export function buildReadableTextImagePrompt(userPrompt: string, category?: string): string {
  const base = buildImagePrompt(category ?? "marketing_assets", userPrompt);
  return `${base} CRITICAL: All visible text must use correct English words in the Latin alphabet only — sharp, legible typography. No gibberish, no Cyrillic, Greek, Arabic, or alien symbols. No mirrored, melted, or misspelled letters.`;
}

export type ResolveVideoTextPipelineArgs = {
  userPrompt: string;
  builtPrompt: string;
  category: string;
  imageUrl?: string;
  aspectRatio?: "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9";
  negativePrompt?: string;
};

export type ResolveVideoTextPipelineResult = {
  imageUrl?: string;
  videoPrompt: string;
  negativePrompt?: string;
  usedImageFirst: boolean;
};

export async function resolveVideoTextPipeline(
  ctx: ActionCtx,
  args: ResolveVideoTextPipelineArgs,
  onProgress?: (label: string) => void | Promise<void>
): Promise<ResolveVideoTextPipelineResult> {
  const userPrompt = args.userPrompt.trim();
  const imageUrl = args.imageUrl?.trim() || undefined;
  const negativePrompt = defaultVideoNegativePrompt(userPrompt, args.negativePrompt);

  if (!imageUrl && videoPromptNeedsTextGuard(userPrompt)) {
    await onProgress?.("Creating readable English text frame…");
    const imageResult = await generateImageWithFallback(
      {
        prompt: buildReadableTextImagePrompt(userPrompt, args.category),
        category: args.category,
        imageSize: videoAspectToFalImageSize(args.aspectRatio),
        numInferenceSteps: 28,
        guidanceScale: 7.5,
        enableSafetyChecker: true,
      },
      { allowOpenAi: true }
    );
    const persisted = await persistImageUrlIfNeeded(ctx, imageResult.imageUrl);
    const videoPrompt = refineVideoPromptForGeneration(
      motionOnlyVideoPromptFromImage(userPrompt),
      true
    );
    return {
      imageUrl: persisted,
      videoPrompt,
      negativePrompt,
      usedImageFirst: true,
    };
  }

  return {
    imageUrl,
    videoPrompt: refineVideoPromptForGeneration(args.builtPrompt, Boolean(imageUrl)),
    negativePrompt,
    usedImageFirst: false,
  };
}
