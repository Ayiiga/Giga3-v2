"use client";

import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";
import { memo } from "react";

interface ScrollToLatestButtonProps {
  visible: boolean;
  onClick: () => void;
}

export const ScrollToLatestButton = memo(function ScrollToLatestButton({
  visible,
  onClick,
}: ScrollToLatestButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest messages"
      className={cn(
        // Sit just above the composer stack; keep z below sticky dialogs.
        "absolute bottom-3 left-0 right-0 z-10 mx-auto w-max",
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5",
        "text-sm font-medium text-foreground shadow-md backdrop-blur-sm",
        "hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "chat-scroll-fab"
      )}
    >
      <ArrowDown className="h-4 w-4" aria-hidden />
      Latest
    </button>
  );
});
