"use client";

import { ChatGigaSocialStoryRings } from "@/components/chat/ChatGigaSocialStoryRings";
import { cn } from "@/lib/utils";

type GigaSocialChatButtonProps = {
  className?: string;
  variant?: "prominent" | "toolbar";
};

/** @deprecated Prefer ChatGigaSocialStoryRings — kept for backward compatibility. */
export function GigaSocialChatButton({
  className,
  variant = "prominent",
}: GigaSocialChatButtonProps) {
  return (
    <ChatGigaSocialStoryRings
      className={cn(variant === "toolbar" && "scale-90", className)}
      compact
    />
  );
}
