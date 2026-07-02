"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { usePageVisible } from "@/hooks/usePageVisible";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Poll faster on slow links — websocket subscriptions often stall on 3G. */
const POLL_SLOW_MS = 3_000;
const POLL_NORMAL_MS = 6_000;

export type PolledMessageRow = {
  _id: string;
  role: string;
  content: string;
  createdAt?: number;
};

/**
 * HTTP fallback while awaiting an assistant reply. Convex live queries depend on
 * a healthy websocket; on flaky mobile networks the server may finish but the
 * client never receives the push update — this keeps chat from freezing on
 * "Generating response…".
 */
export function useChatReplyPolling(
  awaitingReply: boolean,
  sessionToken: string | null,
  activeId: string | null,
  mounted: boolean
): PolledMessageRow[] | undefined {
  const convex = useConvex();
  const { tier } = useConnectionQuality();
  const pageVisible = usePageVisible();
  const [polled, setPolled] = useState<PolledMessageRow[] | undefined>(undefined);
  const inFlightRef = useRef(false);
  const pollMs = tier === "slow" ? POLL_SLOW_MS : POLL_NORMAL_MS;

  const fetchMessages = useCallback(async () => {
    if (!sessionToken || !activeId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const rows = await convex.query(api.messages.listByConversation, {
        sessionToken,
        conversationId: activeId as Id<"conversations">,
      });
      setPolled(rows as PolledMessageRow[]);
    } catch {
      /* keep last good snapshot */
    } finally {
      inFlightRef.current = false;
    }
  }, [convex, sessionToken, activeId]);

  useEffect(() => {
    if (!awaitingReply) {
      setPolled(undefined);
      return;
    }
    if (!mounted || !sessionToken || !activeId || !pageVisible) return;

    void fetchMessages();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchMessages();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [awaitingReply, mounted, sessionToken, activeId, pageVisible, pollMs, fetchMessages]);

  return polled;
}
