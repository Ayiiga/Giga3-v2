"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("textarea, input, select, [contenteditable='true']")
  );
}

/** Conversation-level shortcuts — ignored while typing in chat input. */
export function useChatShareShortcuts(options: {
  enabled: boolean;
  hasMessages: boolean;
  onCopyChat: () => void;
  onShareChat: () => void;
}) {
  const { enabled, hasMessages, onCopyChat, onShareChat } = options;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!hasMessages) return;
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        onCopyChat();
      } else if (key === "s") {
        e.preventDefault();
        onShareChat();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, hasMessages, onCopyChat, onShareChat]);
}
