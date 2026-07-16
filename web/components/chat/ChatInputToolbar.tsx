"use client";

import { ChatCreateHub } from "@/components/chat/ChatCreateHub";
import { cn } from "@/lib/utils";
import type { ChatCreateActionId } from "@/lib/chat/chatCreateMenu";
import {
  CHAT_UNIFIED_MEDIA_ACCEPT,
  classifyChatMediaFiles,
} from "@/lib/chat/chatMediaPicker";
import type { AttachmentKind } from "@/lib/chat/multimodalAttachments";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { ChevronUp, Mic, Plus } from "lucide-react";
import { useId, useRef } from "react";

interface ChatInputToolbarProps {
  disabled?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPickFiles: (files: File[], kind: AttachmentKind) => void;
  onInsertTemplate: (text: string) => void;
  onError: (message: string) => void;
  onVoiceTranscript?: (text: string) => void;
}

export function ChatInputToolbar({
  disabled,
  expanded,
  onToggle,
  onPickFiles,
  onInsertTemplate,
  onError,
  onVoiceTranscript,
}: ChatInputToolbarProps) {
  const { supported: voiceSupported, listening, toggle: toggleVoice } =
    useVoiceDictation((text) => {
      onVoiceTranscript?.(text);
      if (expanded) onToggle();
    });
  const menuId = useId();
  const unifiedRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind
  ) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    try {
      onPickFiles(files, kind);
      onToggle();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not attach file.");
    }
  }

  function handleUnifiedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const intent = classifyChatMediaFiles(files);
    if (intent.kind === "unsupported") {
      onError(intent.reason);
      return;
    }
    try {
      onPickFiles(intent.files, intent.kind);
      onToggle();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not attach file.");
    }
  }

  function triggerMediaAction(action: ChatCreateActionId) {
    const map: Partial<Record<ChatCreateActionId, () => void>> = {
      "media-unified": () => unifiedRef.current?.click(),
      "media-camera": () => cameraRef.current?.click(),
      "media-photos": () => imageRef.current?.click(),
      "media-video": () => videoRef.current?.click(),
      "media-audio": () => audioRef.current?.click(),
    };
    map[action]?.();
  }

  return (
    <>
      <input
        ref={unifiedRef}
        type="file"
        accept={CHAT_UNIFIED_MEDIA_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleUnifiedChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "camera")}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.yaml,.yml,.log,.rtf,.tex,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,text/*,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "file")}
      />
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "image")}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "video")}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => handleChange(e, "file")}
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
        aria-label={expanded ? "Close create menu" : "Open create menu"}
        title={expanded ? "Close" : "Create"}
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
          <Plus className="h-5 w-5" aria-hidden />
        )}
      </button>

      {expanded ? (
        <ChatCreateHub
          menuId={menuId}
          disabled={disabled}
          onMediaAction={triggerMediaAction}
          onInsertTemplate={onInsertTemplate}
          onError={onError}
          onClose={onToggle}
        />
      ) : null}
    </>
  );
}
