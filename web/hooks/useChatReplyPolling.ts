"use client";

import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  CHAT_REPLY_POLL_NORMAL_MS,
  CHAT_REPLY_POLL_SLOW_MS,
} from "@/lib/chat/chatNetwork";
import { logChatClient } from "@/lib/chat/chatLog";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import { useCallback, useEffect, useRef, useState } from "react";

/** Poll faster on slow links — websocket subscriptions often stall on 3G. */
const POLL_SLOW_MS = CHAT_REPLY_POLL_SLOW_MS;
const POLL_NORMAL_MS = CHAT_REPLY_POLL_NORMAL_MS;

/** Burst schedule for the first ~30s on slow networks, then steady polling. */
const SLOW_BURST_DELAYS_MS = [0, 700, 1400, 2200, 3200, 4500, 6000, 8000, 10_000, 13_000, 17_000, 22_000, 28_000];

/** Surface a user-visible hint when HTTP polling fails repeatedly. */
export const POLL_FAIL_HINT_THRESHOLD = 4;

export type PolledMessageRow = {
  _id: string;
  role: string;
  content: string;
  createdAt?: number;
};

type ReplyStatusSnapshot =
  | { active: false }
  | { active: true; status: string; createdAt: number; cancelled: boolean };

export type ChatReplyPollSnapshot = {
  messages: PolledMessageRow[] | undefined;
  replyActive: boolean | undefined;
  pollFailures: number;
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
): ChatReplyPollSnapshot {
  const { tier } = useConnectionQuality();
  const pageVisible = usePageVisible();
  const [polled, setPolled] = useState<PolledMessageRow[] | undefined>(undefined);
  const [replyActive, setReplyActive] = useState<boolean | undefined>(undefined);
  const [pollFailures, setPollFailures] = useState(0);
  const inFlightRef = useRef(false);
  const pollMs = tier === "slow" ? POLL_SLOW_MS : POLL_NORMAL_MS;

  const fetchSnapshot = useCallback(async () => {
    const convexUrl = getConvexUrl();
    if (!convexUrl || !sessionToken || !conversationId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const httpOpts = {
        timeoutMs: tier === "slow" ? 30_000 : 20_000,
        retries: tier === "slow" ? 2 : 1,
      };
      const [rows, status] = await Promise.all([
        convexHttpCall<PolledMessageRow[]>(
          convexUrl,
          "query",
          "messages:listByConversation",
          { sessionToken, conversationId },
          httpOpts
        ),
        convexHttpCall<ReplyStatusSnapshot>(
          convexUrl,
          "query",
          "chatMessaging:getReplyStatus",
          { sessionToken, conversationId },
          httpOpts
        ),
      ]);
      if (!Array.isArray(rows)) {
        throw new Error("Invalid messages response");
      }
      setPolled(rows);
      setReplyActive(status.active);
      setPollFailures(0);
      logChatClient("poll_ok", {
        conversationId,
        messageCount: rows.length,
        replyActive: status.active,
      });
    } catch (err) {
      setPollFailures((n) => {
        const next = n + 1;
        logChatClient("poll_fail", {
          conversationId,
          attempt: next,
          error: err instanceof Error ? err.message : String(err),
        });
        return next;
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [sessionToken, conversationId, tier]);

  useEffect(() => {
    if (!active) {
      setPolled(undefined);
      setReplyActive(undefined);
      setPollFailures(0);
      return;
    }
    if (!mounted || !sessionToken || !conversationId || !pageVisible) return;

    void fetchSnapshot();

    if (tier === "slow") {
      const burstTimers = SLOW_BURST_DELAYS_MS.map((delay) =>
        window.setTimeout(() => {
          if (document.visibilityState !== "visible") return;
          void fetchSnapshot();
        }, delay)
      );
      const steady = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void fetchSnapshot();
      }, pollMs);
      return () => {
        burstTimers.forEach(clearTimeout);
        clearInterval(steady);
      };
    }

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchSnapshot();
    }, pollMs);
    return () => clearInterval(id);
  }, [active, mounted, sessionToken, conversationId, pageVisible, pollMs, fetchSnapshot, tier]);

  return { messages: polled, replyActive, pollFailures };
}
