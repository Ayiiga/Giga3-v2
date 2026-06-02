"use client";

import { getUserEmail } from "@/lib/auth";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";
import { api } from "../../convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";

export function useMediaGeneration() {
  const email = getUserEmail();
  const userId = email ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobs = useQuery(api.media.listJobs, userId ? { userId } : "skip");
  const generateImage = useAction(api.media.generateImage);
  const generateVideo = useAction(api.media.generateVideo);

  async function createImage(category: ImageCategoryId, prompt: string) {
    if (!userId) throw new Error("Sign in required");
    setLoading(true);
    setError(null);
    try {
      return await generateImage({ userId, category, prompt });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function createVideo(category: VideoCategoryId, prompt: string) {
    if (!userId) throw new Error("Sign in required");
    setLoading(true);
    setError(null);
    try {
      return await generateVideo({ userId, category, prompt });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Video failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { email, jobs: jobs ?? [], loading, error, createImage, createVideo };
}
