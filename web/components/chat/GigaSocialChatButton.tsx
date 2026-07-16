"use client";

import { ChatGigaSocialStoryRingsSafe } from "@/components/chat/ChatGigaSocialStoryRingsSafe";
import { cn } from "@/lib/utils";

type GigaSocialChatButtonProps = {
  className?: string;
  variant?: "prominent" | "toolbar";
};

/** @deprecated Prefer ChatGigaSocialStoryRingsSafe — kept for backward compatibility. */
export function GigaSocialChatButton({
  className,
  variant = "prominent",
}: GigaSocialChatButtonProps) {
  return (
    <ChatGigaSocialStoryRingsSafe
      className={cn(variant === "toolbar" && "scale-90", className)}
      compact
    />
  );
}
