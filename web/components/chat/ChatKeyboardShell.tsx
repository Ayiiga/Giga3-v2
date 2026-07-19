"use client";

import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";
import { CHAT_VIEWPORT_SYNC_EVENT, type ChatViewportSyncDetail } from "@/lib/chat/chatViewportEvents";
import {
  COMPOSER_VISIBILITY_MAX_FRAMES,
  buildShellViewportStyles,
  isComposerDockClipped,
  isMobileChatWidth,
  measureComposerVisibility,
  readVisualViewportRect,
} from "@/lib/chat/keyboardViewport";
import { useEffect, useRef } from "react";

function isMobileChatComposerTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.closest(".chat-composer"));
}

function applyShellViewport(shell: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const styles = buildShellViewportStyles(readVisualViewportRect(vv));
  shell.style.position = styles.position;
  shell.style.top = styles.top;
  shell.style.left = styles.left;
  shell.style.width = styles.width;
  shell.style.height = styles.height;
  shell.style.maxHeight = styles.maxHeight;
}

function clearShellViewport(shell: HTMLElement) {
  shell.style.position = "";
  shell.style.top = "";
  shell.style.left = "";
  shell.style.width = "";
  shell.style.height = "";
  shell.style.maxHeight = "";
}

function nudgeMessageListForClippedComposer(): boolean {
  const composer = document.querySelector<HTMLElement>(".chat-composer-dock");
  const vv = window.visualViewport;
  if (!composer || !vv) return false;

  const viewport = readVisualViewportRect(vv);
  const rect = composer.getBoundingClientRect();
  const { clipped, overflowPx } = measureComposerVisibility(rect.bottom, viewport);
  if (!clipped || overflowPx <= 0) return false;

  const scrollRegion = document.querySelector<HTMLElement>(".chat-message-scroll-region");
  if (scrollRegion) {
    scrollRegion.scrollTop += overflowPx;
  }
  return true;
}

function isComposerClippedNow(): boolean {
  const composer = document.querySelector<HTMLElement>(".chat-composer-dock");
  const vv = window.visualViewport;
  if (!composer || !vv) return false;
  const rect = composer.getBoundingClientRect();
  return isComposerDockClipped(rect.bottom, readVisualViewportRect(vv));
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

    html.classList.add("chat-route");

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
    let chaseRaf = 0;
    let chaseFrames = 0;

    const cancelChase = () => {
      cancelAnimationFrame(chaseRaf);
      chaseRaf = 0;
      chaseFrames = 0;
    };

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

    const chaseComposerVisibility = () => {
      if (!isMobile()) return;
      cancelChase();
      chaseFrames = 0;

      const step = () => {
        if (!isMobile()) {
          cancelChase();
          return;
        }
        applyShellViewport(shell);
        nudgeMessageListForClippedComposer();
        chaseFrames += 1;

        if (chaseFrames >= COMPOSER_VISIBILITY_MAX_FRAMES || !isComposerClippedNow()) {
          cancelChase();
          return;
        }
        chaseRaf = requestAnimationFrame(step);
      };

      chaseRaf = requestAnimationFrame(step);
    };

    const onViewportChange = () => {
      scheduleSync(true);
    };

    const onComposerFocus = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      lockPageScroll();
      chaseComposerVisibility();
    };

    const onComposerBlur = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (isMobileChatComposerTarget(active)) return;
        scheduleSync(false);
      }, 160);
    };

    const onWindowResize = () => {
      if (!isMobile()) {
        clearShellViewport(shell);
        unlockPageScroll();
        return;
      }
      scheduleSync(true);
    };

    const onViewportSyncRequest = () => {
      if (!isMobile()) return;
      chaseComposerVisibility();
    };

    const onViewportSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<ChatViewportSyncDetail>).detail;
      if (detail?.reason === "blur") {
        scheduleSync(false);
        return;
      }
      onViewportSyncRequest();
    };

    scheduleSync(false);

    if (vv) {
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
    }
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onViewportSyncRequest);
    document.addEventListener("focusin", onComposerFocus);
    document.addEventListener("focusout", onComposerBlur);
    document.addEventListener(CHAT_VIEWPORT_SYNC_EVENT, onViewportSyncEvent);

    return () => {
      cancelAnimationFrame(raf);
      cancelChase();
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onViewportSyncRequest);
      document.removeEventListener("focusin", onComposerFocus);
      document.removeEventListener("focusout", onComposerBlur);
      document.removeEventListener(CHAT_VIEWPORT_SYNC_EVENT, onViewportSyncEvent);
      html.classList.remove("chat-route");
      unlockPageScroll();
      clearShellViewport(shell);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="chat-stable chat-keyboard-shell flex h-full w-full max-w-full flex-col overflow-x-clip overflow-y-hidden bg-background text-foreground max-lg:fixed max-lg:inset-0 max-lg:z-[1] lg:static lg:z-auto"
    >
      <ChatBundlePrefetch />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
