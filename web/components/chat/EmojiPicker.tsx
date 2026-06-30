"use client";

import { cn } from "@/lib/utils";
import { memo, useEffect, useRef } from "react";

const EMOJI_GRID = [
  "😀", "😊", "🙂", "😉", "😍", "🤔", "😅", "👍",
  "🎉", "✨", "🔥", "💡", "📎", "📷", "🎬", "📝",
  "✅", "❤️", "🙏", "👋", "💬", "🚀", "⭐", "🧠",
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  className?: string;
}

export const EmojiPicker = memo(function EmojiPicker({
  open,
  onClose,
  onPick,
  className,
}: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Emoji picker"
      className={cn(
        "absolute bottom-full left-0 z-30 mb-2 grid w-[min(100vw-2rem,16rem)] grid-cols-8 gap-0.5 rounded-2xl border border-border bg-card p-2 shadow-xl",
        className
      )}
    >
      {EMOJI_GRID.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="option"
          aria-label={`Insert ${emoji}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-accent/10"
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
});
