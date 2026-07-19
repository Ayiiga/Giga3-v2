/** GigaSocial live streaming — client types and gift catalog. */

export type LiveStreamMode = "video" | "audio" | "screen";

export type LiveStreamStatus = "scheduled" | "live" | "ended";

export const LIVE_STREAM_MODES: { id: LiveStreamMode; label: string; description: string }[] = [
  { id: "video", label: "Live video", description: "Vertical 9:16 camera broadcast" },
  { id: "audio", label: "Live audio", description: "Voice-only room with reactions" },
  { id: "screen", label: "Screen share", description: "Share your screen with viewers" },
];

/** Preferred capture shape for portrait live video (9:16). */
export const LIVE_VIDEO_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1080 },
  height: { ideal: 1920 },
  aspectRatio: { ideal: 9 / 16 },
};

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
