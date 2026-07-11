/** GigaSocial live streaming — client types and gift catalog. */

export type LiveStreamMode = "video" | "audio" | "screen";

export type LiveStreamStatus = "scheduled" | "live" | "ended";

export const LIVE_STREAM_MODES: { id: LiveStreamMode; label: string; description: string }[] = [
  { id: "video", label: "Live video", description: "Camera broadcast with live chat" },
  { id: "audio", label: "Live audio", description: "Voice-only room with reactions" },
  { id: "screen", label: "Screen share", description: "Share your screen with viewers" },
];

export const LIVE_REACTIONS = ["❤️", "🔥", "👏", "🎉", "💯", "🙌"] as const;

export type LiveReactionEmoji = (typeof LIVE_REACTIONS)[number];

export const LIVE_GIFTS = [
  { id: "spark", label: "Spark", emoji: "✨", credits: 5 },
  { id: "fire", label: "Fire", emoji: "🔥", credits: 10 },
  { id: "crown", label: "Crown", emoji: "👑", credits: 25 },
  { id: "rocket", label: "Rocket", emoji: "🚀", credits: 50 },
] as const;

export type LiveGiftId = (typeof LIVE_GIFTS)[number]["id"];
