import { readGenerationBrowserNotifyEnabled } from "@/lib/generation/preferences";
import type { GenerationKind } from "@/lib/generation/types";

function defaultTitle(kind: GenerationKind): string {
  switch (kind) {
    case "image":
      return "Your image is ready";
    case "video":
      return "Your video is ready";
    case "document":
      return "Document created successfully";
    case "audio":
      return "Audio generation complete";
    case "code":
      return "Code generation complete";
    case "analysis":
      return "Analysis complete";
    case "chat":
    default:
      return "Generation complete";
  }
}

export async function requestGenerationBrowserPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notifyGenerationCompleteIfHidden(options: {
  kind: GenerationKind;
  title?: string;
  body?: string;
}): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (!readGenerationBrowserNotifyEnabled()) return false;
  if (document.visibilityState === "visible") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const title = options.title ?? defaultTitle(options.kind);
  try {
    new Notification(title, {
      body: options.body,
      icon: "/icons/icon-192.png",
      tag: `giga3-gen-${options.kind}`,
      renotify: false,
    });
    return true;
  } catch {
    return false;
  }
}
