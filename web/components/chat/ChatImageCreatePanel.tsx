"use client";

import {
  buildChatImageGenerationMessage,
  type ChatImageAspectRatio,
  type ChatImageQuality,
} from "@/lib/chat/chatImageCreate";
import { cn } from "@/lib/utils";
import { ImageIcon, X } from "lucide-react";
import { memo, useState } from "react";

const ASPECT_OPTIONS: { id: ChatImageAspectRatio; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "1:1", label: "1:1" },
  { id: "4:5", label: "4:5" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
];

export const ChatImageCreatePanel = memo(function ChatImageCreatePanel({
  disabled,
  onGenerate,
  onClose,
}: {
  disabled?: boolean;
  onGenerate: (message: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<ChatImageAspectRatio>("auto");
  const [quality, setQuality] = useState<ChatImageQuality>("standard");

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || disabled) return;
    onGenerate(buildChatImageGenerationMessage(trimmed, { aspectRatio, quality }));
    setPrompt("");
    onClose();
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-3 shadow-sm"
      role="region"
      aria-label="Create image"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ImageIcon className="h-4 w-4 text-accent" aria-hidden />
          Create an image
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-muted/40"
          aria-label="Close image mode"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <label className="sr-only" htmlFor="chat-image-prompt">Image description</label>
      <textarea
        id="chat-image-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="Describe what you want…"
        className="input-surface w-full resize-none rounded-xl px-3 py-2 text-sm"
      />

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Aspect ratio</p>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={aspectRatio === option.id}
              onClick={() => setAspectRatio(option.id)}
              className={cn(
                "min-h-9 rounded-full border px-2.5 text-xs font-medium",
                aspectRatio === option.id
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-card text-muted hover:border-accent/25"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Quality</p>
        <div className="flex flex-wrap gap-1.5">
          {(["standard", "high"] as ChatImageQuality[]).map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={quality === option}
              onClick={() => setQuality(option)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-medium capitalize",
                quality === option
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-card text-muted hover:border-accent/25"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || !prompt.trim()}
        onClick={handleSubmit}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        Generate
      </button>
    </div>
  );
});
