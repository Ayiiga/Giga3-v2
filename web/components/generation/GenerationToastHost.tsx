"use client";

import { generationCoordinator } from "@/lib/generation/coordinator";
import { useGenerationToasts } from "@/hooks/useGenerationToasts";
import { cn } from "@/lib/utils";

export function GenerationToastHost() {
  const toasts = useGenerationToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      className="generation-toast-host pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-[90] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "generation-toast pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg",
            "dark:border-border dark:bg-card"
          )}
        >
          {toast.emoji ? (
            <span className="text-xl leading-none" aria-hidden>
              {toast.emoji}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{toast.title}</p>
            {toast.body ? (
              <p className="mt-0.5 text-xs text-muted">{toast.body}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted hover:bg-accent/10 hover:text-foreground"
            onClick={() => generationCoordinator.dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
