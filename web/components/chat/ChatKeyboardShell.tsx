"use client";

import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";
import { useEffect, useRef } from "react";

const MOBILE_MAX_WIDTH = 1023;

function syncShellToVisualViewport(shell: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  shell.style.top = `${vv.offsetTop}px`;
  shell.style.left = `${vv.offsetLeft}px`;
  shell.style.width = `${vv.width}px`;
  shell.style.height = `${vv.height}px`;
  shell.style.maxHeight = `${vv.height}px`;
}

function clearShellViewport(shell: HTMLElement) {
  shell.style.top = "";
  shell.style.left = "";
  shell.style.width = "";
  shell.style.height = "";
  shell.style.maxHeight = "";
}

function setViewportResizesContent(meta: HTMLMetaElement, enable: boolean, original: string) {
  const current = meta.getAttribute("content") ?? "";
  if (enable) {
    const next = current.includes("interactive-widget=")
      ? current.replace(/interactive-widget=\S+/g, "interactive-widget=resizes-content")
      : `${current}, interactive-widget=resizes-content`.replace(/^,\s*/, "");
    if (next !== current) meta.setAttribute("content", next);
    return;
  }
  meta.setAttribute("content", original);
}

function isMobileChatComposerTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.closest(".chat-composer"));
}

/**
 * Pins the chat shell to window.visualViewport so the composer stays above the
 * soft keyboard when interactive-widget=overlays-content is active.
 */
export function ChatKeyboardShell({ children }: { children: React.ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof window === "undefined") return;

    const vv = window.visualViewport;
    const meta = document.querySelector('meta[name="viewport"]');
    const originalViewport = meta?.getAttribute("content") ?? "";
    let composerFocused = false;

    let raf = 0;
    const scheduleSync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => syncShellToVisualViewport(shell));
    };

    const delayedSync = () => {
      scheduleSync();
      for (const ms of [50, 120, 250, 400]) {
        window.setTimeout(scheduleSync, ms);
      }
    };

    const onComposerFocus = (e: FocusEvent) => {
      if (!isMobileChatComposerTarget(e.target)) return;
      composerFocused = true;
      if (meta && window.innerWidth <= MOBILE_MAX_WIDTH) {
        setViewportResizesContent(meta, true, originalViewport);
      }
      delayedSync();
    };

    const onComposerBlur = (e: FocusEvent) => {
      if (!isMobileChatComposerTarget(e.target)) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (isMobileChatComposerTarget(active)) return;
        composerFocused = false;
        if (meta) setViewportResizesContent(meta, false, originalViewport);
        scheduleSync();
      }, 120);
    };

    if (vv) {
      vv.addEventListener("resize", scheduleSync);
      vv.addEventListener("scroll", scheduleSync);
    }
    window.addEventListener("orientationchange", delayedSync);
    document.addEventListener("focusin", onComposerFocus);
    document.addEventListener("focusout", onComposerBlur);
    scheduleSync();

    return () => {
      cancelAnimationFrame(raf);
      if (vv) {
        vv.removeEventListener("resize", scheduleSync);
        vv.removeEventListener("scroll", scheduleSync);
      }
      window.removeEventListener("orientationchange", delayedSync);
      document.removeEventListener("focusin", onComposerFocus);
      document.removeEventListener("focusout", onComposerBlur);
      if (meta && composerFocused) {
        setViewportResizesContent(meta, false, originalViewport);
      }
      clearShellViewport(shell);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="chat-stable fixed z-0 flex w-full max-w-full flex-col overflow-hidden bg-background text-foreground"
    >
      <ChatBundlePrefetch />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
