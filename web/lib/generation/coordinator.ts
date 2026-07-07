import { notifyGenerationCompleteIfHidden } from "@/lib/generation/browserNotify";
import { playGenerationCompleteSound } from "@/lib/generation/sound";
import {
  flashGenerationTabComplete,
  markGenerationTabActive,
  markGenerationTabIdle,
} from "@/lib/generation/tabTitle";
import type {
  GenerationKind,
  GenerationState,
  GenerationTask,
  GenerationToast,
} from "@/lib/generation/types";

type Listener = () => void;

type StartTaskInput = {
  id: string;
  kind: GenerationKind;
  label: string;
  state?: GenerationState;
  stage?: string;
  progress?: number;
};

type CompleteInput = {
  title?: string;
  body?: string;
  emoji?: string;
};

const TOAST_TTL_MS = 5200;

function defaultCompleteToast(kind: GenerationKind): Pick<GenerationToast, "title" | "emoji"> {
  switch (kind) {
    case "image":
      return { title: "Your image is ready", emoji: "🎉" };
    case "video":
      return { title: "Your video is ready", emoji: "🎬" };
    case "document":
      return { title: "Document created successfully", emoji: "📄" };
    case "audio":
      return { title: "Audio generation complete", emoji: "🔊" };
    case "code":
      return { title: "Code generation complete", emoji: "💻" };
    case "analysis":
      return { title: "Analysis complete", emoji: "📊" };
    case "chat":
    default:
      return { title: "Generation complete", emoji: "✅" };
  }
}

class GenerationCoordinator {
  private tasks = new Map<string, GenerationTask>();
  private toasts: GenerationToast[] = [];
  private listeners = new Set<Listener>();
  private tabActiveIds = new Set<string>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  getTasks(): GenerationTask[] {
    return [...this.tasks.values()].sort((a, b) => b.startedAt - a.startedAt);
  }

  getToasts(): GenerationToast[] {
    return [...this.toasts];
  }

  dismissToast(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  start(input: StartTaskInput): void {
    const existing = this.tasks.get(input.id);
    if (existing && (existing.state === "processing" || existing.state === "queued")) {
      return;
    }
    const task: GenerationTask = {
      id: input.id,
      kind: input.kind,
      label: input.label,
      state: input.state ?? "processing",
      stage: input.stage,
      progress: input.progress,
      startedAt: Date.now(),
    };
    this.tasks.set(input.id, task);
    if (!this.tabActiveIds.has(input.id)) {
      this.tabActiveIds.add(input.id);
      markGenerationTabActive();
    }
    this.emit();
  }

  updateStage(id: string, stage: string, progress?: number): void {
    const task = this.tasks.get(id);
    if (!task || task.state === "completed" || task.state === "failed" || task.state === "cancelled") {
      return;
    }
    this.tasks.set(id, {
      ...task,
      state: "processing",
      stage,
      progress,
    });
    this.emit();
  }

  complete(id: string, toast?: CompleteInput): void {
    const task = this.tasks.get(id);
    if (!task) return;
    if (task.notified) return;

    const defaults = defaultCompleteToast(task.kind);
    const next: GenerationTask = {
      ...task,
      state: "completed",
      completedAt: Date.now(),
      notified: true,
    };
    this.tasks.set(id, next);
    this.releaseTab(id);

    const toastId = `${id}:complete:${next.completedAt}`;
    if (!this.toasts.some((t) => t.id === toastId)) {
      this.toasts = [
        ...this.toasts,
        {
          id: toastId,
          kind: task.kind,
          title: toast?.title ?? defaults.title,
          body: toast?.body,
          emoji: toast?.emoji ?? defaults.emoji,
          createdAt: Date.now(),
        },
      ].slice(-4);
    }

    playGenerationCompleteSound();
    flashGenerationTabComplete();
    notifyGenerationCompleteIfHidden({
      kind: task.kind,
      title: toast?.title ?? defaults.title,
      body: toast?.body,
    });

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== toastId);
        this.emit();
      }, TOAST_TTL_MS);
    }

    this.emit();
  }

  fail(id: string, _message?: string): void {
    const task = this.tasks.get(id);
    if (!task || task.state === "completed") return;
    this.tasks.set(id, {
      ...task,
      state: "failed",
      completedAt: Date.now(),
    });
    this.releaseTab(id);
    this.emit();
  }

  cancel(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    this.tasks.set(id, {
      ...task,
      state: "cancelled",
      completedAt: Date.now(),
    });
    this.releaseTab(id);
    this.emit();
  }

  private releaseTab(id: string): void {
    if (this.tabActiveIds.delete(id)) {
      markGenerationTabIdle();
    }
  }
}

export const generationCoordinator = new GenerationCoordinator();

export function chatGenerationTaskId(conversationId: string, waitToken: number): string {
  return `chat:${conversationId}:${waitToken}`;
}

export function mediaGenerationTaskId(kind: "image" | "video", nonce: number): string {
  return `media:${kind}:${nonce}`;
}
