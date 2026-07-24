"use client";

import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";
import { CHAT_VIEWPORT_SYNC_EVENT, type ChatViewportSyncDetail } from "@/lib/chat/chatViewportEvents";
import {
  COMPOSER_VISIBILITY_MAX_FRAMES,
  DEFAULT_COMPOSER_DOCK_HEIGHT_PX,
  applyChatKeyboardCssVars,
  buildShellViewportStyles,
  clearChatKeyboardCssVars,
  isComposerDockClipped,
  isKeyboardLikelyOpen,
  isMobileChatWidth,
  measureComposerVisibility,
  measureKeyboardInset,
  readVisualViewportRect,
  resolveComposerBottomInset,
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

function readComposerDockHeight(): number {
  const dock = document.querySelector<HTMLElement>(".chat-composer-dock");
  if (!dock) return DEFAULT_COMPOSER_DOCK_HEIGHT_PX;
  const height = dock.getBoundingClientRect().height;
  return height > 0 ? Math.ceil(height) : DEFAULT_COMPOSER_DOCK_HEIGHT_PX;
}

function scrollComposerIntoView(): void {
  const textarea = document.querySelector<HTMLElement>(".chat-composer-textarea");
  if (!textarea) return;
  try {
    textarea.scrollIntoView({ block: "end", behavior: "instant" });
  } catch {
    textarea.scrollIntoView(false);
  }
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

type KeyboardLayoutState = {
  keyboardOpen: boolean;
  insetPx: number;
};

function readKeyboardLayoutState(baselineHeight: number): KeyboardLayoutState {
  const vv = window.visualViewport;
  const viewport = vv ? readVisualViewportRect(vv) : null;
  const innerHeight = window.innerHeight;
  const layoutHeight = document.documentElement.clientHeight;
  const measuredInset = measureKeyboardInset(
    innerHeight,
    viewport,
    layoutHeight,
    baselineHeight > 0 ? baselineHeight : undefined
  );
  const composerFocused = Boolean(document.activeElement?.closest(".chat-composer"));
  const keyboardOpen =
    measuredInset >= 80 ||
    isKeyboardLikelyOpen(innerHeight, viewport, 80, baselineHeight > 0 ? baselineHeight : undefined) ||
    composerFocused;

  // Fixed composer bottom offset: full inset when layout still overlays the keyboard;
  // 0 when resizes-content already shrunk the layout to the visual viewport.
  const insetPx = keyboardOpen
    ? resolveComposerBottomInset(measuredInset, layoutHeight, viewport)
    : 0;

  return { keyboardOpen, insetPx };
}

function applyKeyboardLayout(
  shell: HTMLElement,
  html: HTMLElement,
  baselineHeight: number
): KeyboardLayoutState {
  const { keyboardOpen, insetPx } = readKeyboardLayoutState(baselineHeight);
  const composerHeight = readComposerDockHeight();

  applyChatKeyboardCssVars(html, insetPx, composerHeight);
  html.classList.toggle("chat-keyboard-open", keyboardOpen);

  if (isMobileChatWidth(window.innerWidth)) {
    applyShellViewport(shell);
  }

  return { keyboardOpen, insetPx };
}

function clearKeyboardLayout(shell: HTMLElement, html: HTMLElement) {
  html.classList.remove("chat-keyboard-open");
  clearChatKeyboardCssVars(html);
  clearShellViewport(shell);
}

/**
 * Pins the chat shell to window.visualViewport on mobile and lifts the composer
 * above the soft keyboard via CSS vars + fixed dock positioning.
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
    let focusBaselineHeight = 0;

    html.classList.add("chat-route");

    // Chat must resize the layout so the composer is not trapped under the keyboard.
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewportMeta?.getAttribute("content") ?? "";
    if (viewportMeta) {
      const next = previousViewport.includes("interactive-widget=")
        ? previousViewport.replace(
            /interactive-widget=\S+/g,
            "interactive-widget=resizes-content"
          )
        : `${previousViewport}, interactive-widget=resizes-content`.replace(/^,\s*/, "");
      viewportMeta.setAttribute("content", next);
    }

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
        clearKeyboardLayout(shell, html);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        applyKeyboardLayout(shell, html, focusBaselineHeight);
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
        const { keyboardOpen } = applyKeyboardLayout(shell, html, focusBaselineHeight);
        scrollComposerIntoView();
        nudgeMessageListForClippedComposer();
        chaseFrames += 1;

        const stillClipped = isComposerClippedNow();
        if (
          chaseFrames >= COMPOSER_VISIBILITY_MAX_FRAMES ||
          (!stillClipped && keyboardOpen)
        ) {
          cancelChase();
          return;
        }
        if (chaseFrames >= COMPOSER_VISIBILITY_MAX_FRAMES && !keyboardOpen) {
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
      focusBaselineHeight = Math.max(
        window.innerHeight,
        window.visualViewport?.height ?? 0,
        document.documentElement.clientHeight
      );
      lockPageScroll();
      chaseComposerVisibility();
    };

    const onComposerBlur = (e: FocusEvent) => {
      if (!isMobile() || !isMobileChatComposerTarget(e.target)) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (isMobileChatComposerTarget(active)) return;
        focusBaselineHeight = 0;
        html.classList.remove("chat-keyboard-open");
        clearChatKeyboardCssVars(html);
        scheduleSync(false);
      }, 160);
    };

    const onWindowResize = () => {
      if (!isMobile()) {
        clearKeyboardLayout(shell, html);
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
      html.classList.remove("chat-route", "chat-keyboard-open");
      clearChatKeyboardCssVars(html);
      unlockPageScroll();
      clearShellViewport(shell);
      if (viewportMeta) {
        viewportMeta.setAttribute("content", previousViewport);
      }
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
