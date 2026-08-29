"use client";

import { generationCoordinator } from "@/lib/generation/coordinator";
import type { GenerationTask, GenerationToast } from "@/lib/generation/types";
import { useEffect, useRef, useSyncExternalStore } from "react";

type DebugHypothesisId = "A" | "B" | "C";

const EMPTY_TASKS: GenerationTask[] = [];
const EMPTY_TOASTS: GenerationToast[] = [];

function logGenerationStoreDebug(
  hypothesisId: DebugHypothesisId,
  message: string,
  data: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== "development" || typeof navigator === "undefined") return;

  navigator.sendBeacon(
    "/api/debug-log",
    new Blob(
      [
        JSON.stringify({
          hypothesisId,
          location: "web/hooks/useGenerationToasts.ts",
          message,
          data,
          timestamp: Date.now(),
        }),
      ],
      { type: "application/json" }
    )
  );
}

function subscribe(listener: () => void) {
  return generationCoordinator.subscribe(listener);
}

function getTasksSnapshot(): GenerationTask[] {
  return generationCoordinator.getTasks();
}

function getToastsSnapshot(): GenerationToast[] {
  return generationCoordinator.getToasts();
}

export function useGenerationTasks(): GenerationTask[] {
  const tasks = useSyncExternalStore(subscribe, getTasksSnapshot, () => EMPTY_TASKS);
  const firstSnapshot = useRef(tasks);

  // #region agent log
  useEffect(() => {
    logGenerationStoreDebug("B", "Generation task store committed", {
      path: window.location.pathname,
      count: tasks.length,
      sameAsFirstCommit: firstSnapshot.current === tasks,
    });
  }, [tasks]);
  // #endregion

  return tasks;
}

export function useGenerationToasts(): GenerationToast[] {
  const toasts = useSyncExternalStore(subscribe, getToastsSnapshot, () => EMPTY_TOASTS);
  const firstSnapshot = useRef(toasts);

  // #region agent log
  useEffect(() => {
    logGenerationStoreDebug("A", "Generation toast store committed", {
      path: window.location.pathname,
      count: toasts.length,
      sameAsFirstCommit: firstSnapshot.current === toasts,
    });
  }, [toasts]);
  // #endregion

  // #region agent log
  useEffect(() => {
    return () => {
      logGenerationStoreDebug("C", "Generation toast store unsubscribed", {
        path: window.location.pathname,
        count: toasts.length,
      });
    };
  }, [toasts]);
  // #endregion

  return toasts;
}
