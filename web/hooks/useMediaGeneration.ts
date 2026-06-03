"use client";

import { getUserEmail } from "@/lib/auth";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

export type MediaGenerationPhase = "idle" | "generating" | "success" | "error";

export function useMediaGeneration() {
  const email = getUserEmail();
  const userId = email ?? "";
  const [phase, setPhase] = useState<MediaGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    try {
      const result = await generateImage({ userId, category, prompt });
      setPhase("success");
      setSuccessMessage("Image generation started — check Recent generations below.");
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed";
      setError(msg);
      setPhase("error");
      return null;
    }
  }

  async function createVideo(category: VideoCategoryId, prompt: string) {
    if (!userId) {
      setError("Sign in required");
      setPhase("error");
      return null;
    }
    setPhase("generating");
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await generateVideo({ userId, category, prompt });
      setPhase("success");
      setSuccessMessage("Video generation started — this may take a minute.");
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Video generation failed";
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
    clearStatus,
    createImage,
    createVideo,
  };
}
