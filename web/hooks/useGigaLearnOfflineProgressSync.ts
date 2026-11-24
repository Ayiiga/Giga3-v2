"use client";

import { flushOfflineProgressQueue } from "@/lib/gigalearn/offlineProgressSync";
import {
  listOfflineProgressEvents,
  type OfflineAssessmentEvent,
} from "@/lib/gigalearn/offlineProgressQueue";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { offlineProgressOwner } from "@/lib/gigalearn/offlineProgressOwner";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type GigaLearnOfflineSyncUiState = "idle" | "pending" | "syncing" | "synced" | "failed";

export function useGigaLearnOfflineProgressSync(sessionToken: string | null) {
  const { effectiveOnline } = useEffectiveOnline();
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<GigaLearnOfflineSyncUiState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const owner = useMemo(() => offlineProgressOwner(sessionToken), [sessionToken]);
  const currentToken = useRef(sessionToken);
  currentToken.current = sessionToken;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const syncingRef = useRef(new Set<string>());

  const refreshPending = useCallback(async () => {
    const count = owner ? (await listOfflineProgressEvents(owner)).length : 0;
    if (currentToken.current === sessionToken) {
      setPendingCount(count);
      setSyncState((state) => {
        if (state === "syncing") return state;
        if (count === 0) return "idle";
        return state === "failed" ? state : "pending";
      });
    }
    return count;
  }, [owner, sessionToken]);

  const flush = useCallback(async () => {
    if (!sessionToken || !owner || sessionToken !== currentToken.current || syncingRef.current.has(owner)) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    syncingRef.current.add(owner);
    setSyncState("syncing");
    setLastError(null);
    try {
      const result = await flushOfflineProgressQueue(owner, async (event: OfflineAssessmentEvent) => {
        await recordAssessment({
          sessionToken,
          topicKey: event.topicKey,
          subject: event.subject,
          curriculum: event.curriculum,
          score: event.score,
          toolId: event.toolId,
          weakness: event.weakness,
          clientCreatedAt: event.createdAt,
        });
      });
      if (currentOwner.current !== owner) return;
      setPendingCount(result.remaining);
      if (result.deadLettered > 0) {
        setSyncState("failed");
        setLastError(
          result.deadLettered === 1
            ? "One progress event could not sync after multiple attempts."
            : `${result.deadLettered} progress events could not sync after multiple attempts.`
        );
      } else if (result.remaining > 0) {
        setSyncState("failed");
        setLastError("Some progress events could not sync yet.");
      } else if (result.synced > 0) {
        setSyncState("synced");
      } else {
        setSyncState("idle");
      }
    } catch (err) {
      if (currentOwner.current !== owner) return;
      setSyncState("failed");
      setLastError(err instanceof Error ? err.message : "Progress sync failed");
      await refreshPending();
    } finally {
      syncingRef.current.delete(owner);
    }
  }, [owner, recordAssessment, refreshPending, sessionToken]);

  useEffect(() => {
    setPendingCount(0);
    setSyncState("idle");
    setLastError(null);
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (!effectiveOnline || !sessionToken) return;
    void flush();
  }, [effectiveOnline, flush, sessionToken]);

  useEffect(() => {
    const onOnline = () => {
      if (sessionToken) void flush();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush, sessionToken]);

  return {
    pendingCount,
    syncState,
    lastError,
    retrySync: flush,
    refreshPending,
  };
}
