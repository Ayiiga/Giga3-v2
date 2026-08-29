"use client";

export interface ChatOverflowReport {
  at: string;
  viewportWidth: number;
  documentOverflow: number;
  scrollRegionOverflow: number;
  offenders: Array<{
    selector: string;
    scrollWidth: number;
    clientWidth: number;
    overflow: number;
  }>;
}

declare global {
  interface Window {
    __giga3ChatOverflow?: ChatOverflowReport;
  }
}

export function isChatOverflowProbeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.search.includes("overflowProbe=1")) return true;
    if (process.env.NODE_ENV !== "production") return true;
    return window.localStorage.getItem("giga3_overflow_probe") === "1";
  } catch {
    return false;
  }
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    el instanceof HTMLElement && el.className
      ? `.${String(el.className).trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

/** Scan chat DOM for elements wider than their container (dev / ?overflowProbe=1). */
export function probeChatOverflow(root?: HTMLElement | null): ChatOverflowReport | null {
  if (!isChatOverflowProbeEnabled() || typeof document === "undefined") return null;

  const scrollRoot =
    root ??
    document.querySelector<HTMLElement>(".chat-message-scroll-region") ??
    document.querySelector<HTMLElement>(".chat-stable");

  const viewportWidth = document.documentElement.clientWidth;
  const documentOverflow = Math.max(
    0,
    document.documentElement.scrollWidth - viewportWidth
  );

  const offenders: ChatOverflowReport["offenders"] = [];
  const seen = new Set<Element>();

  function check(el: Element | null | undefined) {
    if (!el || !(el instanceof HTMLElement) || seen.has(el)) return;
    seen.add(el);
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow > 1) {
      offenders.push({
        selector: describeElement(el),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflow,
      });
    }
  }

  check(document.documentElement);
  check(document.body);
  check(scrollRoot);

  if (scrollRoot) {
    scrollRoot
      .querySelectorAll<HTMLElement>(
        ".chat-message-turn, .chat-message-bubble, .chat-message-bubble-inner, .chat-markdown, .chat-md-pre, .chat-md-table-wrap, img, video, table"
      )
      .forEach((el) => check(el));
  }

  const scrollRegionOverflow = scrollRoot
    ? Math.max(0, scrollRoot.scrollWidth - scrollRoot.clientWidth)
    : 0;

  const report: ChatOverflowReport = {
    at: new Date().toISOString(),
    viewportWidth,
    documentOverflow,
    scrollRegionOverflow,
    offenders: offenders.sort((a, b) => b.overflow - a.overflow).slice(0, 12),
  };

  window.__giga3ChatOverflow = report;

  if (documentOverflow > 1 || scrollRegionOverflow > 1 || offenders.length > 0) {
    console.warn("[giga3-chat-overflow]", report);
  }

  return report;
}
