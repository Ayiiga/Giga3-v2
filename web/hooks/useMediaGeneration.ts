"use client";

import { getUserEmail } from "@/lib/auth";
import {
  buildImagePrompt,
  buildVideoPrompt,
  friendlyMediaError,
  type ImageCategoryId,
  type VideoCategoryId,
} from "@/lib/media/catalog";
import type { MediaJob } from "@/lib/media/types";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useState } from "react";

const SESSION_JOBS_KEY = "giga3_media_recent_jobs";

function loadSessionJobs(): MediaJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MediaJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionJobs(jobs: MediaJob[]) {
  try {
    sessionStorage.setItem(SESSION_JOBS_KEY, JSON.stringify(jobs.slice(0, 20)));
  } catch {
    /* ignore quota errors */
  }
}

function newJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useMediaGeneration() {
  const email = getUserEmail();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const generateImageAction = useAction(api.media.generateImage);
  const generateVideoAction = useAction(api.media.generateVideo);

  useEffect(() => {
    setJobs(loadSessionJobs());
    setHydrated(true);
  }, []);

  const appendJob = useCallback((job: MediaJob) => {
    setJobs((prev) => {
      const next = [job, ...prev].slice(0, 20);
      saveSessionJobs(next);
      return next;
    });
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<MediaJob>) => {
    setJobs((prev) => {
      const next = prev.map((j) => (j._id === id ? { ...j, ...patch } : j));
      saveSessionJobs(next);
      return next;
    });
  }, []);

  async function createImage(category: ImageCategoryId, prompt: string) {
    if (!email) {
      const msg = "Sign in required";
      setError(msg);
      throw new Error(msg);
    }
    const trimmed = prompt.trim();
    if (!trimmed) {
      const msg = "Enter a prompt to generate an image.";
      setError(msg);
      throw new Error(msg);
    }

    const jobId = newJobId();
    appendJob({
      _id: jobId,
      mediaType: "image",
      status: "processing",
      prompt: trimmed,
    });

    setLoading(true);
    setError(null);
    try {
      const result = await generateImageAction({
        email,
        prompt: buildImagePrompt(category, trimmed),
      });
      updateJob(jobId, {
        status: "succeeded",
        outputUrl: result.imageUrl,
      });
      return result;
    } catch (e) {
      const msg = friendlyMediaError(e);
      setError(msg);
      updateJob(jobId, { status: "failed", errorMessage: msg });
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function createVideo(
    category: VideoCategoryId,
    prompt: string,
    imageUrl: string
  ) {
    if (!email) {
      const msg = "Sign in required";
      setError(msg);
      throw new Error(msg);
    }
    const trimmed = prompt.trim();
    const sourceUrl = imageUrl.trim();
    if (!trimmed) {
      const msg = "Enter a prompt to generate a video.";
      setError(msg);
      throw new Error(msg);
    }
    if (!sourceUrl) {
      const msg = "A source image URL is required for video generation.";
      setError(msg);
      throw new Error(msg);
    }

    const jobId = newJobId();
    appendJob({
      _id: jobId,
      mediaType: "video",
      status: "processing",
      prompt: trimmed,
    });

    setLoading(true);
    setError(null);
    try {
      const result = await generateVideoAction({
        email,
        prompt: buildVideoPrompt(category, trimmed),
        imageUrl: sourceUrl,
      });
      updateJob(jobId, {
        status: "succeeded",
        outputUrl: result.videoUrl,
      });
      return result;
    } catch (e) {
      const msg = friendlyMediaError(e);
      setError(msg);
      updateJob(jobId, { status: "failed", errorMessage: msg });
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    jobs,
    jobsLoading: !hydrated,
    loading,
    error,
    createImage,
    createVideo,
  };
}
