"use client";

import { flushOfflineProgressQueue } from "@/lib/gigalearn/offlineProgressSync";
import {
  listOfflineProgressEvents,
  type OfflineAssessmentEvent,
} from "@/lib/gigalearn/offlineProgressQueue";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type GigaLearnOfflineSyncUiState = "idle" | "pending" | "syncing" | "synced" | "failed";

export function useGigaLearnOfflineProgressSync(sessionToken: string | null) {
  const { effectiveOnline } = useEffectiveOnline();
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<GigaLearnOfflineSyncUiState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    const rows = await listOfflineProgressEvents();
    setPendingCount(rows.length);
    if (rows.length === 0) {
      setSyncState("idle");
    } else if (syncState !== "syncing") {
      setSyncState("pending");
    }
    return rows.length;
  }, [syncState]);

  const flush = useCallback(async () => {
    if (!sessionToken || syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    syncingRef.current = true;
    setSyncState("syncing");
    setLastError(null);
    try {
      const result = await flushOfflineProgressQueue(async (event: OfflineAssessmentEvent) => {
        await recordAssessment({
          sessionToken,
          topicKey: event.topicKey,
          subject: event.subject,
          curriculum: event.curriculum,
          score: event.score,
          toolId: event.toolId,
          weakness: event.weakness,
        });
      });
      await refreshPending();
      if (result.remaining > 0) {
        setSyncState("failed");
        setLastError("Some progress events could not sync yet.");
      } else if (result.synced > 0) {
        setSyncState("synced");
      } else {
        setSyncState("idle");
      }
    } catch (err) {
      setSyncState("failed");
      setLastError(err instanceof Error ? err.message : "Progress sync failed");
      await refreshPending();
    } finally {
      syncingRef.current = false;
    }
  }, [recordAssessment, refreshPending, sessionToken]);

  useEffect(() => {
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
