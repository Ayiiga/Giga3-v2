"use client";

import { useChatOverflowProbe } from "@/hooks/useChatOverflowProbe";

/** Attaches dev overflow scanning to the chat shell (no UI). */
export function ChatOverflowProbe({ messageCount }: { messageCount: number }) {
  useChatOverflowProbe([messageCount]);
  return null;
}
