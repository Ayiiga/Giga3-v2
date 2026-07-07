"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
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
import {
  generationCoordinator,
  mediaGenerationTaskId,
} from "@/lib/generation/coordinator";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";

type MediaActionResult = {
  imageUrl?: string;
  videoUrl?: string;
  outputUrl?: string;
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
  imageSize?: ImageGenerationOptions["imageSize"];
  negativePrompt?: string;
  numFrames?: number;
  framesPerSecond?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  duration?: number;
  resolution?: string;
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

  async function createVideo(
    category: VideoCategoryId,
    prompt: string,
    imageUrl?: string,
    options?: VideoGenerationOptions
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
    const taskId = beginMediaTask("video");
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
        MEDIA_VIDEO_TIMEOUT_MS,
        "Video generation timed out. Try a source image URL or a shorter prompt."
      )) as MediaActionResult;
      const outputUrl = pickOutputUrl(result, "video");
      setLastOutputUrl(outputUrl);
      setLastMediaType("video");
      if (isSupabaseDataBackend()) {
        await createSupabaseGeneration({
          email,
          mediaType: "video",
          category,
          prompt,
          outputUrl,
        }).catch(() => null);
      }
      setPhase("success");
      setSuccessMessage("Video ready — saved to Recent generations.");
      finishMediaTask(taskId, "video", true);
      triggerMediaJobsRefresh();
      return result;
    } catch (e) {
      const msg = formatMediaError(e);
      setError(msg);
      setPhase("error");
      finishMediaTask(taskId, "video", false);
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
