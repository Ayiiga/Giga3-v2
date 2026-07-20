"use client";

import { listOutbox } from "@/lib/chat/offlineOutbox";
import {
  OUTBOX_STATUS_EVENT,
  type OutboxStatusDetail,
} from "@/lib/chat/outboxEvents";
import { useCallback, useEffect, useState } from "react";

export function useOutboxStatus() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const rows = await listOutbox();
    setCount(rows.length);
    return rows.length;
  }, []);

  useEffect(() => {
    void refreshCount();
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<OutboxStatusDetail>).detail;
      if (!detail) return;
      setCount(detail.count);
      setSyncing(detail.syncing);
    };
    window.addEventListener(OUTBOX_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(OUTBOX_STATUS_EVENT, onStatus);
  }, [refreshCount]);

  return { count, syncing, refreshCount };
}
