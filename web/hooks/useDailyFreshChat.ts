"use client";

import {
  freshChatAction,
  localDayKey,
  readChatInterfaceDay,
  watchLocalDay,
  writeChatInterfaceDay,
} from "@/lib/chat/dailyChat";
import { useEffect, useRef } from "react";

/**
 * Opens a new chat when the local calendar day changes.
 * History is left in place. A send that is still running waits until it finishes.
 */
export function useDailyFreshChat(onNewDay: () => void, busy: boolean): void {
  const onNewDayRef = useRef(onNewDay);
  onNewDayRef.current = onNewDay;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const pendingRef = useRef(false);

  useEffect(() => {
    return watchLocalDay((dayKey) => {
      const action = freshChatAction(readChatInterfaceDay(), dayKey, busyRef.current);
      if (action === "remember" || action === "same") {
        if (action === "remember") writeChatInterfaceDay(dayKey);
        pendingRef.current = false;
        return;
      }
      if (action === "wait") {
        pendingRef.current = true;
        return;
      }
      pendingRef.current = false;
      writeChatInterfaceDay(dayKey);
      onNewDayRef.current();
    });
  }, []);

  useEffect(() => {
    if (busy || !pendingRef.current) return;
    pendingRef.current = false;
    const dayKey = localDayKey();
    if (freshChatAction(readChatInterfaceDay(), dayKey, false) !== "reset") return;
    writeChatInterfaceDay(dayKey);
    onNewDayRef.current();
  }, [busy]);
}
