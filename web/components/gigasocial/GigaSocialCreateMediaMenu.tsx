"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { FileStack, ImageIcon, Images, Music2, Sparkles, Video, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export type CreateMediaAction =
  | "media"
  | "photo"
  | "photos"
  | "video"
  | "music"
  | "templates";

interface GigaSocialCreateMediaMenuProps {
  disabled?: boolean;
  busy?: boolean;
  canAddMusic: boolean;
  onAction: (action: CreateMediaAction) => void;
  className?: string;
}

const MENU_ITEMS: {
  id: CreateMediaAction;
  label: string;
  emoji: string;
  icon: typeof ImageIcon;
  description: string;
}[] = [
  {
    id: "media",
    label: "Media",
    emoji: "📎",
    icon: FileStack,
    description: "Photos, video, camera, music, and files",
  },
  { id: "photo", label: "Photo", emoji: "📷", icon: ImageIcon, description: "Single image or camera" },
  { id: "photos", label: "Photos", emoji: "🖼", icon: Images, description: "Gallery or slideshow" },
  { id: "video", label: "Video", emoji: "🎥", icon: Video, description: "Clip Studio · 40s max" },
  { id: "music", label: "Add Music", emoji: "🎵", icon: Music2, description: "Soundtrack for photos" },
  { id: "templates", label: "Templates", emoji: "✨", icon: Sparkles, description: "Creator presets" },
];

export const GigaSocialCreateMediaMenu = memo(function GigaSocialCreateMediaMenu({
  disabled,
  busy,
  canAddMusic,
  onAction,
  className,
}: GigaSocialCreateMediaMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  function handleSelect(action: CreateMediaAction) {
    if (action === "music" && !canAddMusic) return;
    onAction(action);
    close();
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      aria-label="Add media — photos, video, music, or files"
        className="min-h-10 gap-1.5"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Media
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Media create options"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-lg"
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const itemDisabled = item.id === "music" && !canAddMusic;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={itemDisabled}
                onClick={() => handleSelect(item.id)}
                className={cn(
                  "flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  itemDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none"
                )}
              >
                <span className="text-base" aria-hidden>
                  {item.emoji}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    {item.label}
                  </span>
                  <span className="text-xs text-muted">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});
