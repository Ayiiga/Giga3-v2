"use client";

import { useEffect } from "react";
import { getScheduledChatBackground } from "@/lib/chat/scheduledChatBackground";

export function ScheduledChatBackground() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".chat-keyboard-shell");
    if (!shell) return;

    const update = () => {
      const image = getScheduledChatBackground(new Date());
      if (image) {
        shell.style.setProperty("--chat-scheduled-background", `url("${image}")`);
        shell.classList.add("chat-scheduled-background");
      } else {
        shell.style.removeProperty("--chat-scheduled-background");
        shell.classList.remove("chat-scheduled-background");
      }
    };

    update();
    const interval = window.setInterval(update, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisibility);
      shell.style.removeProperty("--chat-scheduled-background");
      shell.classList.remove("chat-scheduled-background");
    };
  }, []);

  return null;
}
