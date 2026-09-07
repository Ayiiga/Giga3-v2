/** GigaSocial creative template metadata — client-side mirrors server engine. */

export const GIGA_TEMPLATE_MARKER =
  /\[giga-template:([a-z0-9]+):?(image|video|sound|full)?\]\s*$/i;

export type GigaTemplateModeId = "image" | "video" | "sound" | "full";

export type GigaTemplatePolicy = "off" | "fans" | "public" | "owner";

export const GIGA_TEMPLATE_MODES: {
  id: GigaTemplateModeId;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    id: "image",
    label: "Image Template",
    emoji: "🖼️",
    description: "Visual structure, composition, style, and text placement for a new image.",
  },
  {
    id: "video",
    label: "Video Template",
    emoji: "🎬",
    description: "Pacing, scene sequence, captions, and visual style for a new video.",
  },
  {
    id: "sound",
    label: "Sound Template",
    emoji: "🔊",
    description: "Audio rhythm and mood as reference for a new sound experience.",
  },
  {
    id: "full",
    label: "Full Creative Template",
    emoji: "✨",
    description: "Combine eligible image, video, sound, text, and style in one workflow.",
  },
];

export const TEMPLATE_POLICY_OPTIONS: {
  id: GigaTemplatePolicy;
  label: string;
  description: string;
}[] = [
  {
    id: "off",
    label: "Do not allow templates",
    description: "Others cannot use this post as a creative template.",
  },
  {
    id: "fans",
    label: "Allow fans to use as template",
    description: "Only your fans can remix the structure of this post.",
  },
  {
    id: "public",
    label: "Allow anyone to use as template",
    description: "Any Giga3 user can use this as a creative starting point.",
  },
  {
    id: "owner",
    label: "Allow only me",
    description: "Only you can use this post as your own template.",
  },
];

export const TEMPLATE_DISCOVER_CATEGORIES = [
  { id: "trending", label: "Trending" },
  { id: "comedy", label: "Comedy" },
  { id: "motivation", label: "Motivation" },
  { id: "education", label: "Education" },
  { id: "news", label: "News" },
  { id: "business", label: "Business" },
  { id: "relationships", label: "Relationships" },
  { id: "faith", label: "Faith" },
  { id: "fashion", label: "Fashion" },
  { id: "music", label: "Music" },
  { id: "cinematic", label: "Cinematic" },
  { id: "reels", label: "TikTok / Reels" },
  { id: "ghana", label: "Ghana / Africa" },
] as const;

export function templateModeLabel(mode?: GigaTemplateModeId): string {
  return GIGA_TEMPLATE_MODES.find((m) => m.id === mode)?.label ?? "Template";
}

export function buildTemplateAttributionLine(creatorHandle: string): string {
  return `Inspired by a GigaSocial template by @${creatorHandle}.`;
}

export function appendTemplateMarker(
  body: string,
  sourcePostId: string,
  mode: GigaTemplateModeId
): string {
  const trimmed = body.replace(GIGA_TEMPLATE_MARKER, "").trimEnd();
  return `${trimmed}\n[giga-template:${sourcePostId}:${mode}]`;
}

export function parseTemplateMeta(body: string): {
  sourcePostId: string;
  mode?: GigaTemplateModeId;
} | null {
  const match = body.match(GIGA_TEMPLATE_MARKER);
  if (!match?.[1]) return null;
  const modeRaw = match[2] as GigaTemplateModeId | undefined;
  const mode = GIGA_TEMPLATE_MODES.some((m) => m.id === modeRaw) ? modeRaw : undefined;
  return { sourcePostId: match[1], mode };
}

export function stripTemplateMarker(body: string): string {
  return body.replace(GIGA_TEMPLATE_MARKER, "").trimEnd();
}
