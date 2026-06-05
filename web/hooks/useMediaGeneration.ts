"use client";

import { getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { formatMediaError } from "@/lib/media/errors";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";
import {
  MEDIA_IMAGE_TIMEOUT_MS,
  MEDIA_VIDEO_TIMEOUT_MS,
  withActionTimeout,
} from "@/lib/media/actionTimeout";
import { triggerMediaJobsRefresh } from "@/lib/media/jobsRefresh";
import { createSupabaseGeneration } from "@/lib/supabase/data";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";

type MediaActionResult = {
  imageUrl?: string;
  videoUrl?: string;
  outputUrl?: string;
};

function pickOutputUrl(result: MediaActionResult, kind: "image" | "video"): string | null {
  if (kind === "image") {
    return result.imageUrl ?? result.outputUrl ?? null;
  }
  return result.videoUrl ?? result.outputUrl ?? null;
}

export type MediaGenerationPhase = "idle" | "generating" | "success" | "error";

export function useMediaGeneration() {
  const email = getUserEmail();
  const userId = email ?? "";
  const [phase, setPhase] = useState<MediaGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastOutputUrl, setLastOutputUrl] = useState<string | null>(null);
  const [lastMediaType, setLastMediaType] = useState<"image" | "video" | null>(null);

  const generateImage = useAction(api.media.generateImage);
  const generateVideo = useAction(api.media.generateVideo);

  const loading = phase === "generating";

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setPhase("idle");
  }, []);

  async function createImage(category: ImageCategoryId, prompt: string) {
    if (!userId) {
      setError("Sign in required");
      setPhase("error");
      return null;
    }
    setPhase("generating");
    setError(null);
    setSuccessMessage(null);
    setLastOutputUrl(null);
    try {
      const result = (await withActionTimeout(
        generateImage({ userId, category, prompt }),
        MEDIA_IMAGE_TIMEOUT_MS,
        "Image generation timed out. Please try again with a shorter prompt."
      )) as MediaActionResult;
      const outputUrl = pickOutputUrl(result, "image");
      setLastOutputUrl(outputUrl);
      setLastMediaType("image");
      if (isSupabaseDataBackend()) {
        await createSupabaseGeneration({
          email: userId,
          mediaType: "image",
          category,
          prompt,
          outputUrl,
        }).catch(() => null);
      }
      setPhase("success");
      setSuccessMessage("Image ready — saved to Recent generations.");
      triggerMediaJobsRefresh();
      return result;
    } catch (e) {
      const msg = formatMediaError(e);
      setError(msg);
      setPhase("error");
      return null;
    }
  }

  async function createVideo(
    category: VideoCategoryId,
    prompt: string,
    imageUrl?: string
  ) {
    if (!userId) {
      setError("Sign in required");
      setPhase("error");
      return null;
    }
    setPhase("generating");
    setError(null);
    setSuccessMessage(null);
    setLastOutputUrl(null);
    try {
      const result = (await withActionTimeout(
        generateVideo({
          userId,
          category,
          prompt,
          ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
        }),
        MEDIA_VIDEO_TIMEOUT_MS,
        "Video generation timed out. Try a source image URL or a shorter prompt."
      )) as MediaActionResult;
      const outputUrl = pickOutputUrl(result, "video");
      setLastOutputUrl(outputUrl);
      setLastMediaType("video");
      if (isSupabaseDataBackend()) {
        await createSupabaseGeneration({
          email: userId,
          mediaType: "video",
          category,
          prompt,
          outputUrl,
        }).catch(() => null);
      }
      setPhase("success");
      setSuccessMessage("Video ready — saved to Recent generations.");
      triggerMediaJobsRefresh();
      return result;
    } catch (e) {
      const msg = formatMediaError(e);
      setError(msg);
      setPhase("error");
      return null;
    }
  }

  return {
    email,
    loading,
    phase,
    error,
    successMessage,
    lastOutputUrl,
    lastMediaType,
    clearStatus,
    createImage,
    createVideo,
  };
}
