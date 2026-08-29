"use client";

import { generationCoordinator } from "@/lib/generation/coordinator";
import type { GenerationTask, GenerationToast } from "@/lib/generation/types";
import { useSyncExternalStore } from "react";

const EMPTY_TASKS: GenerationTask[] = [];
const EMPTY_TOASTS: GenerationToast[] = [];

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
  return useSyncExternalStore(subscribe, getTasksSnapshot, () => EMPTY_TASKS);
}

export function useGenerationToasts(): GenerationToast[] {
  return useSyncExternalStore(subscribe, getToastsSnapshot, () => EMPTY_TOASTS);
}
