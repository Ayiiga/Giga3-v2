"use client";

import { useEffect } from "react";

/** Clears chat keyboard-shell body locks so marketing pages scroll normally. */
export function MarketingBodyScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;

    if (body.style.position === "fixed") {
      body.style.position = "";
      body.style.width = "";
      body.style.top = "";
      body.style.left = "";
    }
    if (html.style.overflow === "hidden") {
      html.style.overflow = "";
    }
    if (body.style.overflow === "hidden") {
      body.style.overflow = "";
    }

    const chatShell = document.querySelector<HTMLElement>(".chat-keyboard-shell");
    if (chatShell) {
      chatShell.style.position = "";
      chatShell.style.top = "";
      chatShell.style.left = "";
      chatShell.style.width = "";
      chatShell.style.height = "";
      chatShell.style.maxHeight = "";
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
    };
  }, []);

  return null;
}
