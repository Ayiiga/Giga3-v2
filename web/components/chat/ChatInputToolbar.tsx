"use client";

import { cn } from "@/lib/utils";
import {
  Camera,
  Clapperboard,
  FolderOpen,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { AttachmentKind } from "@/lib/chat/fileAttachments";

interface ChatInputToolbarProps {
  disabled?: boolean;
  onPickFile: (file: File, kind: AttachmentKind) => void;
  onError: (message: string) => void;
}

const toolbarBtn =
  "inline-flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-2 py-2 text-[10px] font-medium text-muted transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 sm:min-w-[4.5rem] sm:px-3 sm:text-xs";

export function ChatInputToolbar({
  disabled,
  onPickFile,
  onError,
}: ChatInputToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label="Message attachments"
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

      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled}
        title="Take a photo with your camera"
        aria-label="Camera"
        onClick={() => cameraRef.current?.click()}
      >
        <Camera className="h-6 w-6 text-sky-400" aria-hidden />
        <span>Camera</span>
      </button>

      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled}
        title="Upload a document or text file"
        aria-label="Upload file"
        onClick={() => fileRef.current?.click()}
      >
        <FolderOpen className="h-6 w-6 text-amber-400" aria-hidden />
        <span>Upload</span>
      </button>

      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled}
        title="Attach an image file"
        aria-label="Image"
        onClick={() => imageRef.current?.click()}
      >
        <ImageIcon className="h-6 w-6 text-emerald-400" aria-hidden />
        <span>Image</span>
      </button>

      <button
        type="button"
        className={toolbarBtn}
        disabled={disabled}
        title="Attach a video file"
        aria-label="Video"
        onClick={() => videoRef.current?.click()}
      >
        <Clapperboard className="h-6 w-6 text-rose-400" aria-hidden />
        <span>Video</span>
      </button>

      <Link
        href="/media"
        className={cn(toolbarBtn, disabled && "pointer-events-none opacity-50")}
        title="Open Media Studio for AI image and video generation"
        aria-label="Media Studio"
      >
        <Sparkles className="h-6 w-6 text-violet-400" aria-hidden />
        <span>Media</span>
      </Link>
    </div>
  );
}
