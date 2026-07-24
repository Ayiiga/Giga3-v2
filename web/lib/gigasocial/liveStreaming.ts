/** GigaSocial live streaming — client types and gift catalog. */

import {
  isLikelyMobileLiveDevice,
  supportsOsDisplayCapture,
} from "@/lib/gigasocial/liveScreenShare";

export type LiveStreamMode = "video" | "audio" | "screen";

export type LiveStreamStatus = "scheduled" | "live" | "ended";

export const LIVE_STREAM_MODES: { id: LiveStreamMode; label: string; description: string }[] = [
  { id: "video", label: "Live video", description: "Vertical 9:16 camera broadcast" },
  { id: "audio", label: "Live audio", description: "Voice-only room with reactions" },
  {
    id: "screen",
    label: "Screen share",
    description: "Share your screen, a recording, or show a screen with camera",
  },
];

/** Preferred capture shape for portrait live video (9:16). */
export const LIVE_VIDEO_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1080 },
  height: { ideal: 1920 },
  aspectRatio: { ideal: 9 / 16 },
};

/**
 * Screen share is available when OS capture exists (desktop) OR when the
 * phone fallbacks (gallery file / rear camera) can run via getUserMedia.
 */
export function supportsLiveScreenShare(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (supportsOsDisplayCapture()) return true;
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

export function supportsLiveCameraMic(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

export const LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE =
  "Screen share is unavailable in this browser. Try Chrome/Edge on desktop, or use Live video.";

export const LIVE_SCREEN_SHARE_MOBILE_HINT =
  "On phones, share a screen recording/video from your gallery, or use the rear camera to show a screen.";

/** Map capture failures to host-facing copy (never expose raw "is not a function"). */
export function getLiveMediaErrorMessage(error: unknown, mode: LiveStreamMode): string {
  if (error instanceof TypeError) {
    if (mode === "screen") {
      return isLikelyMobileLiveDevice()
        ? LIVE_SCREEN_SHARE_MOBILE_HINT
        : LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE;
    }
    return "Camera or microphone is not supported in this browser.";
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return mode === "screen"
        ? "Screen share was cancelled or blocked. Tap Share screen again, or pick a video from your gallery."
        : "Camera or microphone access was blocked. Allow access in browser settings, then retry.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return mode === "screen"
        ? "No screen source was available. On a phone, pick a video/recording or use the rear camera."
        : "No camera or microphone was found on this device.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Capture device is in use by another app. Close it and retry.";
    }
    if (error.name === "SecurityError") {
      return "Media capture requires a secure connection (HTTPS).";
    }
    if (error.name === "InvalidStateError" && mode === "screen") {
      return "Tap Share screen once more to start (screen capture needs a tap).";
    }
  }
  if (error instanceof Error) {
    const msg = error.message || "";
    if (/getDisplayMedia/i.test(msg) || /is not a function/i.test(msg)) {
      return isLikelyMobileLiveDevice()
        ? LIVE_SCREEN_SHARE_MOBILE_HINT
        : LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE;
    }
    if (msg) return msg;
  }
  return mode === "screen"
    ? isLikelyMobileLiveDevice()
      ? LIVE_SCREEN_SHARE_MOBILE_HINT
      : LIVE_SCREEN_SHARE_UNSUPPORTED_MESSAGE
    : "Could not access camera or microphone.";
}

export const LIVE_REACTIONS = ["❤️", "🔥", "👏", "🎉", "💯", "🙌"] as const;

export type LiveReactionEmoji = (typeof LIVE_REACTIONS)[number];

export const LIVE_GIFTS = [
  { id: "spark", label: "Spark", emoji: "✨", credits: 5 },
  { id: "fire", label: "Fire", emoji: "🔥", credits: 10 },
  { id: "crown", label: "Crown", emoji: "👑", credits: 25 },
  { id: "rocket", label: "Rocket", emoji: "🚀", credits: 50 },
] as const;

export type LiveReactionCount = { emoji: string; count: number };

export function getLiveReactionCount(
  counts: LiveReactionCount[] | undefined,
  emoji: string
): number {
  return counts?.find((entry) => entry.emoji === emoji)?.count ?? 0;
}

export type LiveGiftId = (typeof LIVE_GIFTS)[number]["id"];
