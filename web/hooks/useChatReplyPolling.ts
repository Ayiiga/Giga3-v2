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

/**
 * Only every Nth poll re-downloads the message list while the reply is still
 * pending; the tiny status query runs on every tick. On 3G the full thread
 * (with Live Web metadata) each second was itself congesting the connection.
 */
const FULL_FETCH_EVERY_N_POLLS = 6;

export type PolledMessageRow = {
  _id: string;
  role: string;
  content: string;
  createdAt?: number;
  metadataJson?: string;
};

type ReplyStatusSnapshot =
  | { active: false }
  | {
      active: true;
      status: string;
      createdAt: number;
      cancelled: boolean;
      liveWebProgress?: string;
    };

export type ChatReplyPollSnapshot = {
  messages: PolledMessageRow[] | undefined;
  replyActive: boolean | undefined;
  pollFailures: number;
  liveWebProgress?: string;
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
  const [liveWebProgress, setLiveWebProgress] = useState<string | undefined>(undefined);
  const inFlightRef = useRef(false);
  const tickRef = useRef(0);
  const lastActiveRef = useRef<boolean | undefined>(undefined);
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
      const tick = tickRef.current++;
      const status = await convexHttpCall<ReplyStatusSnapshot>(
        convexUrl,
        "query",
        "chatMessaging:getReplyStatus",
        { sessionToken, conversationId },
        httpOpts
      );
      // Fetch the thread when the reply just landed (active → inactive), on the
      // first tick, or periodically as a safety net — not on every status poll.
      const justFinished = lastActiveRef.current === true && status.active === false;
      lastActiveRef.current = status.active;
      const wantRows = justFinished || tick === 0 || tick % FULL_FETCH_EVERY_N_POLLS === 0;
      let rows: PolledMessageRow[] | undefined;
      if (wantRows) {
        rows = await convexHttpCall<PolledMessageRow[]>(
          convexUrl,
          "query",
          "messages:listByConversation",
          { sessionToken, conversationId },
          httpOpts
        );
        if (!Array.isArray(rows)) {
          throw new Error("Invalid messages response");
        }
        setPolled(rows);
      }
      setReplyActive(status.active);
      setLiveWebProgress(status.active ? status.liveWebProgress : undefined);
      setPollFailures(0);
      logChatClient("poll_ok", {
        conversationId,
        messageCount: rows?.length,
        replyActive: status.active,
        fetchedRows: wantRows,
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
      tickRef.current = 0;
      lastActiveRef.current = undefined;
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

  return { messages: polled, replyActive, pollFailures, liveWebProgress };
}
