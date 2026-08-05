/** Remix metadata encoded in post body — no schema migration required. */

const REMIX_MARKER = /\[giga-remix:([a-z0-9]+)(?::([a-z0-9_-]+))?\]\s*$/i;

export type GigaRemixModeId =
  | "classic"
  | "split-view"
  | "reaction"
  | "voice-over"
  | "continue-story"
  | "green-screen"
  | "sound-reuse"
  | "trend-template"
  | "clip-reply"
  | "ai-subtitles";

export type RemixMeta = {
  sourcePostId: string;
  mode?: GigaRemixModeId;
  sourceAuthorHandle?: string;
  sourceAuthorName?: string;
};

export const GIGA_REMIX_MODES: {
  id: GigaRemixModeId;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    id: "classic",
    label: "Classic Remix",
    description: "Build on this post with your own take",
    emoji: "🎬",
  },
  {
    id: "split-view",
    label: "Split View",
    description: "Side-by-side collaboration — original Giga style",
    emoji: "⬌",
  },
  {
    id: "reaction",
    label: "Reaction",
    description: "Respond with video or audio energy",
    emoji: "🔥",
  },
  {
    id: "voice-over",
    label: "Voice-over",
    description: "Narrate over the moment",
    emoji: "🎙️",
  },
  {
    id: "continue-story",
    label: "Continue Story",
    description: "Pick up the story where they left off",
    emoji: "📖",
  },
  {
    id: "green-screen",
    label: "Green Screen",
    description: "Place yourself into their scene",
    emoji: "🟩",
  },
  {
    id: "sound-reuse",
    label: "Use Their Sound",
    description: "Remix with attribution on the audio",
    emoji: "🎵",
  },
  {
    id: "trend-template",
    label: "Trend Template",
    description: "Recreate the format with your flair",
    emoji: "✨",
  },
  {
    id: "clip-reply",
    label: "Clip Reply",
    description: "Answer with a short public clip",
    emoji: "✂️",
  },
  {
    id: "ai-subtitles",
    label: "AI Subtitles",
    description: "Remix with auto captions in GigaEdit",
    emoji: "💬",
  },
];

export function remixModeLabel(mode?: GigaRemixModeId): string {
  return GIGA_REMIX_MODES.find((m) => m.id === mode)?.label ?? "Remix";
}

export function buildRemixBodyPrefix(meta: RemixMeta): string {
  const handle = meta.sourceAuthorHandle
    ? `@${meta.sourceAuthorHandle}`
    : meta.sourceAuthorName ?? "creator";
  const mode = remixModeLabel(meta.mode);
  if (meta.mode && meta.mode !== "classic") {
    return `🎬 Giga Remix · ${mode} with ${handle}\n\n`;
  }
  return `🎬 Remixing ${handle}\n\n`;
}

export function appendRemixMarker(
  body: string,
  sourcePostId: string,
  mode: GigaRemixModeId = "classic"
): string {
  const trimmed = body.replace(REMIX_MARKER, "").trimEnd();
  const modeSuffix = mode && mode !== "classic" ? `:${mode}` : "";
  return `${trimmed}\n[giga-remix:${sourcePostId}${modeSuffix}]`;
}

export function parseRemixMeta(body: string): RemixMeta | null {
  const match = body.match(REMIX_MARKER);
  if (!match?.[1]) return null;
  const modeRaw = match[2]?.toLowerCase() as GigaRemixModeId | undefined;
  const mode = GIGA_REMIX_MODES.some((m) => m.id === modeRaw) ? modeRaw : "classic";
  return { sourcePostId: match[1], mode };
}

export function stripRemixMarker(body: string): string {
  return body.replace(REMIX_MARKER, "").trimEnd();
}
