"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  CHAT_REPLY_POLL_NORMAL_MS,
  CHAT_REPLY_POLL_SLOW_MS,
} from "@/lib/chat/chatNetwork";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import { useCallback, useEffect, useRef, useState } from "react";

/** Poll faster on slow links — websocket subscriptions often stall on 3G. */
const POLL_SLOW_MS = CHAT_REPLY_POLL_SLOW_MS;
const POLL_NORMAL_MS = CHAT_REPLY_POLL_NORMAL_MS;

export type PolledMessageRow = {
  _id: string;
  role: string;
  content: string;
  createdAt?: number;
};

/**
 * HTTP fallback while sending or awaiting a reply. Convex live queries and
 * websocket mutations stall on real 2G/3G; one-shot HTTP fetches still work.
 */
export function useChatReplyPolling(
  active: boolean,
  sessionToken: string | null,
  conversationId: string | null,
  mounted: boolean
): PolledMessageRow[] | undefined {
  const { tier } = useConnectionQuality();
  const pageVisible = usePageVisible();
  const [polled, setPolled] = useState<PolledMessageRow[] | undefined>(undefined);
  const inFlightRef = useRef(false);
  const pollMs = tier === "slow" ? POLL_SLOW_MS : POLL_NORMAL_MS;

  const fetchMessages = useCallback(async () => {
    const convexUrl = getConvexUrl();
    if (!convexUrl || !sessionToken || !conversationId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const rows = await convexHttpCall<PolledMessageRow[]>(
        convexUrl,
        "query",
        "messages:listByConversation",
        { sessionToken, conversationId },
        { timeoutMs: tier === "slow" ? 30_000 : 20_000, retries: tier === "slow" ? 2 : 1 }
      );
      setPolled(rows);
    } catch {
      /* keep last good snapshot */
    } finally {
      inFlightRef.current = false;
    }
  }, [sessionToken, conversationId, tier]);

  useEffect(() => {
    if (!active) {
      setPolled(undefined);
      return;
    }
    if (!mounted || !sessionToken || !conversationId || !pageVisible) return;

    void fetchMessages();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchMessages();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [active, mounted, sessionToken, conversationId, pageVisible, pollMs, fetchMessages]);

  return polled;
}
