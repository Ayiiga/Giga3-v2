"use client";

import { useChatBundlePrefetch } from "@/hooks/useChatBundlePrefetch";

export function ChatBundlePrefetch() {
  useChatBundlePrefetch(true);
  return null;
}
