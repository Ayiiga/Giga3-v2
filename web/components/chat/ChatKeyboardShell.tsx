"use client";

import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";
import { useEffect, useRef } from "react";

const MOBILE_MAX_WIDTH = 1023;

function keyboardInsetPx(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

function syncShellToVisualViewport(shell: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const inset = keyboardInsetPx();
  shell.style.top = `${vv.offsetTop}px`;
  shell.style.left = `${vv.offsetLeft}px`;
  shell.style.width = `${vv.width}px`;
  shell.style.height = `${vv.height}px`;
  shell.style.maxHeight = `${vv.height}px`;
  shell.style.setProperty("--chat-keyboard-inset", `${inset}px`);
}

function clearShellViewport(shell: HTMLElement) {
  shell.style.top = "";
  shell.style.left = "";
  shell.style.width = "";
  shell.style.height = "";
  shell.style.maxHeight = "";
  shell.style.removeProperty("--chat-keyboard-inset");
}

function scrollComposerIntoView() {
  const composer = document.querySelector<HTMLElement>(".chat-composer-dock");
  if (!composer) return;
  const vv = window.visualViewport;
  if (!vv) {
    composer.scrollIntoView({ block: "end", behavior: "auto" });
    return;
  }
  const rect = composer.getBoundingClientRect();
  const visibleBottom = vv.offsetTop + vv.height;
  const overflow = rect.bottom - visibleBottom + 8;
  if (overflow <= 0) return;
  const scrollRegion = document.querySelector<HTMLElement>(".chat-message-scroll-region");
  if (scrollRegion) {
    scrollRegion.scrollTop += overflow;
    return;
  }
  window.scrollBy({ top: overflow, behavior: "auto" });
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
    const isMobile = () => window.innerWidth <= MOBILE_MAX_WIDTH;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;

    if (isMobile()) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.top = "0";
    }

    let raf = 0;
    const scheduleSync = () => {
      if (!isMobile()) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        syncShellToVisualViewport(shell);
        scrollComposerIntoView();
      });
    };

    const delayedSync = () => {
      scheduleSync();
      for (const ms of [50, 120, 250, 400, 600, 900]) {
        window.setTimeout(scheduleSync, ms);
      }
    };

    const onComposerFocus = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      delayedSync();
      window.setTimeout(scrollComposerIntoView, 16);
    };

    const onComposerBlur = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (isMobileChatComposerTarget(active)) return;
        scheduleSync();
      }, 120);
    };

    if (vv) {
      vv.addEventListener("resize", scheduleSync);
      vv.addEventListener("scroll", scheduleSync);
    }
    window.addEventListener("resize", scheduleSync);
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
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", delayedSync);
      document.removeEventListener("focusin", onComposerFocus);
      document.removeEventListener("focusout", onComposerBlur);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.top = prevBodyTop;
      clearShellViewport(shell);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="chat-stable chat-keyboard-shell fixed z-0 flex w-full max-w-full flex-col overflow-x-clip overflow-y-hidden bg-background text-foreground"
    >
      <ChatBundlePrefetch />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
