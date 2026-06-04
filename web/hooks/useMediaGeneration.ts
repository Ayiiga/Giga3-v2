"use client";

import { getUserEmail } from "@/lib/auth";
import { formatMediaError } from "@/lib/media/errors";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";
import {
  MEDIA_IMAGE_TIMEOUT_MS,
  MEDIA_VIDEO_TIMEOUT_MS,
  withActionTimeout,
} from "@/lib/media/actionTimeout";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const jobs = useQuery(
    api.media.listJobs,
    mounted && userId ? { userId } : "skip"
  );
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
      setLastOutputUrl(pickOutputUrl(result, "image"));
      setLastMediaType("image");
      setPhase("success");
      setSuccessMessage("Image ready — saved to Recent generations.");
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
      setLastOutputUrl(pickOutputUrl(result, "video"));
      setLastMediaType("video");
      setPhase("success");
      setSuccessMessage("Video ready — saved to Recent generations.");
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
    jobs: jobs ?? [],
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
