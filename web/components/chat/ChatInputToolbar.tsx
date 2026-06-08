"use client";

import { cn } from "@/lib/utils";
import { buildMediaStudioUrl, MEDIA_STUDIO_TEMPLATES } from "@/lib/media/studioTemplates";
import type { AttachmentKind } from "@/lib/chat/fileAttachments";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import {
  Camera,
  ChevronUp,
  Clapperboard,
  FolderOpen,
  ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

interface ChatInputToolbarProps {
  disabled?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPickFile: (file: File, kind: AttachmentKind) => void;
  onError: (message: string) => void;
  onVoiceTranscript?: (text: string) => void;
}

const actions: {
  kind: AttachmentKind | "media";
  label: string;
  shortLabel: string;
  icon: typeof Camera;
}[] = [
  { kind: "camera", label: "Camera", shortLabel: "Cam", icon: Camera },
  { kind: "file", label: "Upload file", shortLabel: "File", icon: FolderOpen },
  { kind: "image", label: "Image", shortLabel: "Img", icon: ImageIcon },
  { kind: "video", label: "Video", shortLabel: "Vid", icon: Clapperboard },
  {
    kind: "media",
    label: "Media Studio",
    shortLabel: "Studio",
    icon: Sparkles,
  },
];

export function ChatInputToolbar({
  disabled,
  expanded,
  onToggle,
  onPickFile,
  onError,
  onVoiceTranscript,
}: ChatInputToolbarProps) {
  const router = useRouter();
  const { supported: voiceSupported, listening, toggle: toggleVoice } =
    useVoiceDictation((text) => {
      onVoiceTranscript?.(text);
      if (expanded) onToggle();
    });
  const menuId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onPickFile(file, kind);
      onToggle();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not attach file.");
    }
  }

  function openCreateMedia() {
    if (disabled || mediaLoading) return;
    setMediaLoading(true);
    try {
      const template = MEDIA_STUDIO_TEMPLATES[0];
      if (!template) {
        onError("Media Studio is unavailable right now.");
        return;
      }
      router.push(buildMediaStudioUrl(template));
    } catch {
      onError("Could not open Media Studio. Visit /media from the menu.");
    } finally {
      window.setTimeout(() => setMediaLoading(false), 1200);
    }
  }

  function triggerInput(kind: AttachmentKind | "media") {
    if (kind === "media") {
      openCreateMedia();
      return;
    }
    const map = {
      camera: cameraRef,
      file: fileRef,
      image: imageRef,
      video: videoRef,
    } as const;
    map[kind].current?.click();
  }

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "camera")}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.yaml,.yml,.log,.rtf,.tex,.pdf,.doc,.docx,text/*,application/json,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "file")}
      />
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "image")}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "video")}
      />

      {voiceSupported && onVoiceTranscript && (
        <button
          type="button"
          disabled={disabled}
          aria-label={listening ? "Stop voice input" : "Voice input"}
          title={listening ? "Listening…" : "Voice input"}
          onClick={toggleVoice}
          className={cn(
            "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm",
            "hover:border-accent/30 hover:bg-accent/5",
            listening && "border-accent/40 bg-accent/10 text-accent",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <Mic className="h-5 w-5" aria-hidden />
        </button>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-expanded={expanded}
        aria-controls={menuId}
        aria-label={expanded ? "Close attach menu" : "Attach files or media"}
        title={expanded ? "Close" : "Attach"}
        onClick={onToggle}
        className={cn(
          "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm",
          "hover:border-accent/30 hover:bg-accent/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          expanded && "border-accent/30 bg-accent/10 text-accent",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {expanded ? (
          <ChevronUp className="h-5 w-5" aria-hidden />
        ) : (
          <Paperclip className="h-5 w-5" aria-hidden />
        )}
      </button>

      {expanded && (
        <div
          id={menuId}
          role="menu"
          aria-label="Attach files or open media"
          className="absolute bottom-full left-0 z-20 mb-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-border bg-card p-2 shadow-lg"
        >
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Attach & create
          </p>
          <div className="grid grid-cols-5 gap-1">
            {actions.map((action) => {
              const Icon = action.icon;
              const isMedia = action.kind === "media";
              const loading = isMedia && mediaLoading;
              return (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  disabled={disabled || (isMedia && mediaLoading)}
                  title={action.label}
                  aria-label={action.label}
                  onClick={() => triggerInput(action.kind)}
                  className={cn(
                    "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center",
                    "text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    isMedia && "text-violet-700 hover:bg-violet-50",
                    disabled && "pointer-events-none opacity-50"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-600" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  )}
                  <span className="text-[10px] font-semibold leading-tight sm:text-[11px]">
                    {action.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
