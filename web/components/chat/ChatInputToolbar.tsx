"use client";

import { cn } from "@/lib/utils";
import { buildMediaStudioUrl, MEDIA_STUDIO_TEMPLATES } from "@/lib/media/studioTemplates";
import type { AttachmentKind } from "@/lib/chat/fileAttachments";
import {
  Camera,
  Clapperboard,
  FolderOpen,
  ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface ChatInputToolbarProps {
  disabled?: boolean;
  onPickFile: (file: File, kind: AttachmentKind) => void;
  onError: (message: string) => void;
}

const actions: {
  kind: AttachmentKind | "media";
  label: string;
  icon: typeof Camera;
  color: string;
  gradient: string;
}[] = [
  {
    kind: "camera",
    label: "Camera",
    icon: Camera,
    color: "text-sky-300",
    gradient: "from-sky-500/30 to-blue-600/20",
  },
  {
    kind: "file",
    label: "Upload",
    icon: FolderOpen,
    color: "text-amber-300",
    gradient: "from-amber-500/30 to-orange-600/20",
  },
  {
    kind: "image",
    label: "Image",
    icon: ImageIcon,
    color: "text-emerald-300",
    gradient: "from-emerald-500/30 to-teal-600/20",
  },
  {
    kind: "video",
    label: "Video",
    icon: Clapperboard,
    color: "text-rose-300",
    gradient: "from-rose-500/30 to-red-600/20",
  },
  {
    kind: "media",
    label: "Create Media",
    icon: Sparkles,
    color: "text-violet-300",
    gradient: "from-violet-500/40 to-fuchsia-600/25",
  },
];

export function ChatInputToolbar({
  disabled,
  onPickFile,
  onError,
}: ChatInputToolbarProps) {
  const router = useRouter();
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
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not attach file.");
    }
  }

  function openCreateMedia() {
    if (disabled || mediaLoading) return;
    setMediaLoading(true);
    try {
      const template = MEDIA_STUDIO_TEMPLATES[0];
      router.push(buildMediaStudioUrl(template));
    } catch {
      onError("Could not open Media Studio. Visit /media from the menu.");
      setMediaLoading(false);
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
    <div
      className="rounded-2xl border border-border/80 bg-gradient-to-r from-violet-950/40 via-black/30 to-blue-950/30 p-2.5 shadow-lg shadow-black/20 sm:p-3"
      role="toolbar"
      aria-label="Message attachments and media"
    >
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

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          const isMedia = action.kind === "media";
          const loading = isMedia && mediaLoading;
          return (
            <button
              key={action.label}
              type="button"
              disabled={disabled || (isMedia && mediaLoading)}
              title={action.label}
              aria-label={action.label}
              onClick={() => triggerInput(action.kind)}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 py-2.5 transition-all",
                "bg-gradient-to-br shadow-md hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]",
                action.gradient,
                isMedia && "ring-1 ring-violet-400/40",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-violet-200" aria-hidden />
              ) : (
                <Icon className={cn("h-8 w-8", action.color)} aria-hidden />
              )}
              <span className="text-xs font-bold text-foreground sm:text-sm">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
