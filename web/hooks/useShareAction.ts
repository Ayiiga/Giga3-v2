"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShareResult } from "@/lib/share/clientShare";

export type ShareFeedback = {
  kind: "success" | "error";
  message: string;
} | null;

const CANCEL_REASONS = new Set(["Share cancelled", "Save cancelled"]);

export function useShareAction() {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<ShareFeedback>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clearFeedback = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    setFeedback(null);
  }, []);

  const showFeedback = useCallback((kind: "success" | "error", message: string) => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    setFeedback({ kind, message });
    timerRef.current = window.setTimeout(() => setFeedback(null), 2800);
  }, []);

  const runAction = useCallback(
    async (
      action: () => Promise<ShareResult>,
      successMessage: string
    ): Promise<ShareResult | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      try {
        const result = await action();
        if (result.ok) {
          showFeedback("success", successMessage);
        } else if (!CANCEL_REASONS.has(result.reason)) {
          showFeedback("error", result.reason);
        }
        return result;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [showFeedback]
  );

  return { feedback, runAction, clearFeedback, busy };
}
