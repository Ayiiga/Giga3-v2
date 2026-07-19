"use client";

import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";
import {
  buildShellViewportStyles,
  composerScrollOverflowPx,
  isComposerDockClipped,
  isMobileChatWidth,
} from "@/lib/chat/keyboardViewport";
import { useEffect, useRef } from "react";

const FOCUS_SYNC_DELAYS_MS = [50, 180, 400] as const;

function isMobileChatComposerTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.closest(".chat-composer"));
}

function applyShellViewport(shell: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const styles = buildShellViewportStyles({
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  });
  shell.style.top = styles.top;
  shell.style.left = styles.left;
  shell.style.width = styles.width;
  shell.style.height = styles.height;
  shell.style.maxHeight = styles.maxHeight;
}

function clearShellViewport(shell: HTMLElement) {
  shell.style.top = "";
  shell.style.left = "";
  shell.style.width = "";
  shell.style.height = "";
  shell.style.maxHeight = "";
}

function nudgeMessageListForClippedComposer() {
  const composer = document.querySelector<HTMLElement>(".chat-composer-dock");
  const vv = window.visualViewport;
  if (!composer || !vv) return;

  const viewport = {
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  };
  const rect = composer.getBoundingClientRect();
  if (!isComposerDockClipped(rect.bottom, viewport)) return;

  const overflow = composerScrollOverflowPx(rect.bottom, viewport);
  const scrollRegion = document.querySelector<HTMLElement>(".chat-message-scroll-region");
  if (scrollRegion) {
    scrollRegion.scrollTop += overflow;
  }
}

/**
 * Pins the chat shell to window.visualViewport on mobile so the composer stays
 * above the soft keyboard when interactive-widget=overlays-content is active.
 * Desktop uses normal document flow (no fixed shell / viewport listeners).
 */
export function ChatKeyboardShell({ children }: { children: React.ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof window === "undefined") return;

    const vv = window.visualViewport;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    const isMobile = () => isMobileChatWidth(window.innerWidth);

    const lockPageScroll = () => {
      if (!isMobile()) return;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    };

    const unlockPageScroll = () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };

    let raf = 0;
    const focusTimeouts: number[] = [];

    const scheduleSync = (adjustScroll = false) => {
      if (!isMobile()) {
        clearShellViewport(shell);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        applyShellViewport(shell);
        if (adjustScroll) {
          nudgeMessageListForClippedComposer();
        }
      });
    };

    const scheduleFocusSync = () => {
      scheduleSync(true);
      for (const ms of FOCUS_SYNC_DELAYS_MS) {
        focusTimeouts.push(
          window.setTimeout(() => scheduleSync(true), ms)
        );
      }
    };

    const onViewportChange = () => {
      scheduleSync(true);
    };

    const onComposerFocus = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      lockPageScroll();
      scheduleFocusSync();
    };

    const onComposerBlur = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (isMobileChatComposerTarget(active)) return;
        scheduleSync(false);
      }, 120);
    };

    const onWindowResize = () => {
      if (!isMobile()) {
        clearShellViewport(shell);
        return;
      }
      scheduleSync(true);
    };

    lockPageScroll();
    scheduleSync(false);

    if (vv) {
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
    }
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", scheduleFocusSync);
    document.addEventListener("focusin", onComposerFocus);
    document.addEventListener("focusout", onComposerBlur);

    return () => {
      cancelAnimationFrame(raf);
      for (const id of focusTimeouts) window.clearTimeout(id);
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", scheduleFocusSync);
      document.removeEventListener("focusin", onComposerFocus);
      document.removeEventListener("focusout", onComposerBlur);
      unlockPageScroll();
      clearShellViewport(shell);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="chat-stable chat-keyboard-shell flex h-full w-full max-w-full flex-col overflow-x-clip overflow-y-hidden bg-background text-foreground max-lg:fixed max-lg:z-0 lg:static lg:z-auto"
    >
      <ChatBundlePrefetch />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
