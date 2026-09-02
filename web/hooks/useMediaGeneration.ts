"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { formatMediaError } from "@/lib/media/errors";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";
import {
  MEDIA_IMAGE_TIMEOUT_MS,
  MEDIA_VIDEO_ENQUEUE_TIMEOUT_MS,
  withActionTimeout,
} from "@/lib/media/actionTimeout";
import { triggerMediaJobsRefresh } from "@/lib/media/jobsRefresh";
import { createSupabaseGeneration } from "@/lib/supabase/data";
import {
  generationCoordinator,
  mediaGenerationTaskId,
} from "@/lib/generation/coordinator";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";

type MediaActionResult = {
  imageUrl?: string;
  videoUrl?: string;
  outputUrl?: string;
};

/** New async video pipeline: the action returns a job to follow instead of a URL. */
export type VideoEnqueueResult = {
  jobId: Id<"mediaJobs">;
  status: "processing";
  creditsCharged: number;
  provider?: string;
};

export type ImageGenerationOptions = {
  imageSize?: "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";
  negativePrompt?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  enableSafetyChecker?: boolean;
};

export type VideoGenerationOptions = {
  negativePrompt?: string;
  seed?: number;
  duration?: number;
  resolution?: "480p" | "720p" | "1080p";
  generateAudio?: boolean;
  aspectRatio?: "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9";
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
  const [phase, setPhase] = useState<MediaGenerationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastOutputUrl, setLastOutputUrl] = useState<string | null>(null);
  const [lastMediaType, setLastMediaType] = useState<"image" | "video" | null>(null);
  const activeTaskRef = useRef<string | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateImage = useAction(api.media.generateImage);
  const generateVideo = useAction(api.media.generateVideo);

  const loading = phase === "generating";

  const clearStageTimer = useCallback(() => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const clearStatus = useCallback(() => {
    clearStageTimer();
    if (activeTaskRef.current) {
      generationCoordinator.cancel(activeTaskRef.current);
      activeTaskRef.current = null;
    }
    setError(null);
    setSuccessMessage(null);
    setPhase("idle");
  }, [clearStageTimer]);

  function requireSession(): string {
    const token = getSessionToken();
    if (!token) throw new Error("Session expired. Please sign in again.");
    return token;
  }

  const beginMediaTask = useCallback(
    (kind: "image" | "video") => {
      const nonce = Date.now();
      const taskId = mediaGenerationTaskId(kind, nonce);
      activeTaskRef.current = taskId;
      generationCoordinator.start({
        id: taskId,
        kind,
        label: kind === "image" ? "Generating image…" : "Rendering video…",
        stage: kind === "image" ? "Preparing…" : "Preparing assets…",
        state: "processing",
        progress: 8,
      });
      clearStageTimer();
      const started = Date.now();
      stageTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - started;
        const stages =
          kind === "image"
            ? [
                { atMs: 0, label: "Preparing…", progress: 8 },
                { atMs: 2500, label: "Generating image…", progress: 35 },
                { atMs: 12_000, label: "Enhancing quality…", progress: 72 },
                { atMs: 28_000, label: "Finalizing…", progress: 92 },
              ]
            : [
                { atMs: 0, label: "Preparing assets…", progress: 6 },
                { atMs: 4000, label: "Rendering…", progress: 40 },
                { atMs: 25_000, label: "Encoding…", progress: 78 },
                { atMs: 55_000, label: "Finalizing…", progress: 94 },
              ];
        let active = stages[0];
        for (const stage of stages) {
          if (elapsed >= stage.atMs) active = stage;
          else break;
        }
        generationCoordinator.updateStage(taskId, active.label, active.progress);
      }, 1200);
      return taskId;
    },
    [clearStageTimer]
  );

  const finishMediaTask = useCallback(
    (taskId: string, kind: "image" | "video", success: boolean) => {
      clearStageTimer();
      if (success) {
        generationCoordinator.complete(taskId);
      } else {
        generationCoordinator.fail(taskId);
      }
      if (activeTaskRef.current === taskId) {
        activeTaskRef.current = null;
      }
    },
    [clearStageTimer]
  );

  async function createImage(
    category: ImageCategoryId,
    prompt: string,
    sourceImageUrl?: string,
    options?: ImageGenerationOptions
  ) {
    if (!email) {
      setError("Sign in required");
      setPhase("error");
      return null;
    }
    setPhase("generating");
    setError(null);
    setSuccessMessage(null);
    setLastOutputUrl(null);
    const taskId = beginMediaTask("image");
    try {
      const sessionToken = requireSession();
      const result = (await withActionTimeout(
        generateImage({
          sessionToken,
          category,
          prompt,
          ...(sourceImageUrl?.trim() ? { sourceImageUrl: sourceImageUrl.trim() } : {}),
          ...(options ?? {}),
        }),
        MEDIA_IMAGE_TIMEOUT_MS,
        "Image generation timed out. Please try again with a shorter prompt."
      )) as MediaActionResult;
      const outputUrl = pickOutputUrl(result, "image");
      setLastOutputUrl(outputUrl);
      setLastMediaType("image");
      if (isSupabaseDataBackend()) {
        await createSupabaseGeneration({
          email,
          mediaType: "image",
          category,
          prompt,
          outputUrl,
        }).catch(() => null);
      }
      setPhase("success");
      setSuccessMessage("Image ready — saved to Recent generations.");
      finishMediaTask(taskId, "image", true);
      triggerMediaJobsRefresh();
      return result;
    } catch (e) {
      const msg = formatMediaError(e);
      setError(msg);
      setPhase("error");
      finishMediaTask(taskId, "image", false);
      return null;
    }
  }

  /**
   * Enqueue a video job. Resolves as soon as the server accepts the job; the
   * caller follows progress with `useMediaVideoJob` and calls
   * `resolveVideoJob` when the job reaches a terminal state.
   */
  async function createVideo(
    category: VideoCategoryId,
    prompt: string,
    imageUrl?: string,
    options?: VideoGenerationOptions
  ): Promise<VideoEnqueueResult | null> {
    if (!email) {
      setError("Sign in required");
      setPhase("error");
      return null;
    }
    setPhase("generating");
    setError(null);
    setSuccessMessage(null);
    setLastOutputUrl(null);
    try {
      const sessionToken = requireSession();
      const result = (await withActionTimeout(
        generateVideo({
          sessionToken,
          category,
          prompt,
          ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
          ...(options ?? {}),
        }),
        MEDIA_VIDEO_ENQUEUE_TIMEOUT_MS,
        "Could not reach the video service. Check your connection and try again."
      )) as VideoEnqueueResult;
      if (!result?.jobId) {
        throw new Error("The video service did not accept the job. Please try again.");
      }
      return result;
    } catch (e) {
      const msg = formatMediaError(e);
      setError(msg);
      setPhase("error");
      return null;
    }
  }

  /** Called by the panel once the tracked job finishes. */
  const resolveVideoJob = useCallback(
    (outcome: { status: "succeeded" | "failed"; outputUrl?: string | null; errorMessage?: string | null; prompt?: string; category?: string }) => {
      if (outcome.status === "succeeded") {
        setLastOutputUrl(outcome.outputUrl ?? null);
        setLastMediaType("video");
        setPhase("success");
        setSuccessMessage("Video ready — saved to Recent generations.");
        if (isSupabaseDataBackend() && email && outcome.outputUrl) {
          void createSupabaseGeneration({
            email,
            mediaType: "video",
            category: outcome.category ?? "anime_videos",
            prompt: outcome.prompt ?? "",
            outputUrl: outcome.outputUrl,
          }).catch(() => null);
        }
      } else {
        setError(outcome.errorMessage || "Video generation failed. Please try again.");
        setPhase("error");
      }
      triggerMediaJobsRefresh();
    },
    [email]
  );

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
    resolveVideoJob,
  };
}
