/**
 * GigaSocial creative template engine — pure analysis + permission checks.
 * Shared by Convex queries and unit tests.
 */

import type { SocialPostMediaItem } from "./gigaSocialViews";

const REMIX_MARKER = /\[giga-remix:([a-z0-9]+)(?::([a-z0-9_-]+))?\]\s*$/i;

function stripRemixMarker(body: string): string {
  return body.replace(REMIX_MARKER, "").trimEnd();
}

export const GIGA_TEMPLATE_MODES = [
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
    description: "Audio rhythm and mood as reference for a new sound or voice experience.",
  },
  {
    id: "full",
    label: "Full Creative Template",
    emoji: "✨",
    description: "Combine eligible image, video, sound, text, and style into one workflow.",
  },
] as const;

export type GigaTemplateModeId = (typeof GIGA_TEMPLATE_MODES)[number]["id"];

export type GigaTemplatePolicy = "off" | "fans" | "public" | "owner";

export type GigaTemplateAnalysis = {
  templateId: string;
  sourcePostId: string;
  creatorId: string;
  creatorHandle: string;
  permissionStatus: GigaTemplatePolicy;
  mediaTypes: Array<"image" | "video" | "audio" | "text">;
  durationSec?: number;
  aspectRatio: "9:16" | "16:9" | "1:1" | "unknown";
  sceneStructure: string[];
  visualStyle: string;
  captionStructure: string;
  hashtagTags: string[];
  audioCharacteristics?: string;
  transitionHints: string[];
  generationConstraints: string[];
  categories: string[];
  attributionLine: string;
};

export type TemplateEligibility = {
  eligible: boolean;
  reason?: string;
  policy: GigaTemplatePolicy;
  isOwner: boolean;
  availableModes: GigaTemplateModeId[];
  attributionLine: string;
};

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  comedy: /\b(comedy|funny|joke|skit|lol)\b/i,
  motivation: /\b(motivat|inspir|mindset|grind)\b/i,
  education: /\b(educat|learn|study|lesson|tutorial)\b/i,
  news: /\b(news|breaking|headline|report)\b/i,
  business: /\b(business|startup|entrepreneur|brand)\b/i,
  relationships: /\b(relationship|couple|dating|love|marriage)\b/i,
  faith: /\b(faith|church|gospel|prayer|worship)\b/i,
  fashion: /\b(fashion|style|outfit|wear)\b/i,
  music: /\b(music|song|beat|afrobeats|dance)\b/i,
  cinematic: /\b(cinematic|film|trailer|epic)\b/i,
  reels: /\b(reels?|tiktok|shorts?|vertical)\b/i,
  ghana: /\b(ghana|accra|kumasi|ghanaian|africa|african)\b/i,
};

export function inferTemplateCategories(
  hashtags: string[],
  body: string,
  postType?: string
): string[] {
  const haystack = `${body} ${hashtags.map((t) => `#${t}`).join(" ")}`.toLowerCase();
  const categories = new Set<string>();
  for (const [id, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (re.test(haystack)) categories.add(id);
  }
  if (postType === "education") categories.add("education");
  if (postType === "creator") categories.add("business");
  if (!categories.size) categories.add("trending");
  return [...categories];
}

export function inferAspectRatio(args: {
  videoDurationSec?: number;
  mediaType?: string;
  postType?: string;
}): GigaTemplateAnalysis["aspectRatio"] {
  if (args.mediaType === "video" || args.postType === "video") return "9:16";
  if (args.mediaType === "gallery") return "1:1";
  return "9:16";
}

export function analyzePostForTemplate(args: {
  postId: string;
  authorId: string;
  authorHandle: string;
  body: string;
  hashtags?: string[];
  mediaItems?: SocialPostMediaItem[];
  mediaType?: string;
  postType?: string;
  videoDurationSec?: number;
  templatePolicy: GigaTemplatePolicy;
}): GigaTemplateAnalysis {
  const cleanBody = stripRemixMarker(args.body).trim();
  const mediaItems = args.mediaItems ?? [];
  const hashtags = args.hashtags ?? [];
  const hasImage = mediaItems.some((m) => m.type === "image") || args.mediaType === "image";
  const hasVideo = mediaItems.some((m) => m.type === "video") || args.mediaType === "video";
  const hasAudio = mediaItems.some((m) => m.type === "audio");
  const mediaTypes: GigaTemplateAnalysis["mediaTypes"] = [];
  if (hasImage) mediaTypes.push("image");
  if (hasVideo) mediaTypes.push("video");
  if (hasAudio) mediaTypes.push("audio");
  if (cleanBody) mediaTypes.push("text");

  const sceneStructure: string[] = [];
  if (hasVideo) {
    sceneStructure.push("Hook opening", "Main beat", "Payoff / outro");
    if (args.videoDurationSec && args.videoDurationSec <= 15) {
      sceneStructure.unshift("Fast vertical short-form pacing");
    }
  } else if (hasImage) {
    sceneStructure.push("Hero subject", "Supporting context", "Caption overlay zone");
  }

  const captionStructure =
    cleanBody.length > 120
      ? "Long-form caption with hook + body + CTA"
      : cleanBody.includes("?")
        ? "Question-led hook caption"
        : "Short punchy caption";

  const visualStyle = hasVideo
    ? "Vertical social video — dynamic cuts, on-screen text friendly"
    : hasImage
      ? "Static visual with bold subject and social-safe margins"
      : "Text-first creative post";

  const audioCharacteristics = hasAudio
    ? "Attached audio track — reuse mood/rhythm only with creator permission; do not copy recordings verbatim."
    : hasVideo
      ? "Video may include embedded audio — reference pacing and energy, not copyrighted recordings."
      : undefined;

  const categories = inferTemplateCategories(hashtags, cleanBody, args.postType);

  return {
    templateId: `tpl_${args.postId}`,
    sourcePostId: args.postId,
    creatorId: args.authorId,
    creatorHandle: args.authorHandle,
    permissionStatus: args.templatePolicy,
    mediaTypes,
    durationSec: args.videoDurationSec ?? mediaItems.find((m) => m.durationSec)?.durationSec,
    aspectRatio: inferAspectRatio(args),
    sceneStructure,
    visualStyle,
    captionStructure,
    hashtagTags: hashtags.slice(0, 12),
    audioCharacteristics,
    transitionHints: hasVideo ? ["Quick cut", "Match-on-action", "Caption beat sync"] : [],
    generationConstraints: [
      "Create original content inspired by structure/style — never duplicate the source media.",
      "Do not remove watermarks or impersonate the original creator.",
      "Use licensed or Giga3-generated alternatives for music when rights are unclear.",
    ],
    categories,
    attributionLine: `Inspired by a GigaSocial template by @${args.authorHandle}.`,
  };
}

export function availableTemplateModes(analysis: GigaTemplateAnalysis): GigaTemplateModeId[] {
  const modes: GigaTemplateModeId[] = [];
  const hasImage = analysis.mediaTypes.includes("image");
  const hasVideo = analysis.mediaTypes.includes("video");
  const hasAudio = analysis.mediaTypes.includes("audio");

  if (hasImage || analysis.mediaTypes.includes("text")) modes.push("image");
  if (hasVideo) modes.push("video");
  if (hasAudio || hasVideo) modes.push("sound");
  if (modes.length >= 2 || (hasVideo && hasImage)) modes.push("full");
  if (!modes.length) modes.push("image");
  return [...new Set(modes)];
}

export function checkTemplateEligibility(args: {
  policy: GigaTemplatePolicy;
  viewerId: string | null;
  authorId: string;
  isFan: boolean;
  visibility: "public" | "followers" | undefined;
  deletedAt?: number;
  analysis: GigaTemplateAnalysis;
}): TemplateEligibility {
  const isOwner = Boolean(args.viewerId && args.viewerId === args.authorId);
  const attributionLine = args.analysis.attributionLine;

  if (args.deletedAt) {
    return {
      eligible: false,
      reason: "This post is no longer available.",
      policy: args.policy,
      isOwner,
      availableModes: [],
      attributionLine,
    };
  }

  if (args.visibility === "followers" && !isOwner && !args.isFan) {
    return {
      eligible: false,
      reason: "This post is only visible to fans of the creator.",
      policy: args.policy,
      isOwner,
      availableModes: [],
      attributionLine,
    };
  }

  if (isOwner) {
    return {
      eligible: true,
      policy: args.policy,
      isOwner: true,
      availableModes: availableTemplateModes(args.analysis),
      attributionLine,
    };
  }

  if (args.policy === "off") {
    return {
      eligible: false,
      reason: "The creator has not enabled templates for this post.",
      policy: args.policy,
      isOwner: false,
      availableModes: [],
      attributionLine,
    };
  }

  if (args.policy === "owner") {
    return {
      eligible: false,
      reason: "This template is only available to the creator.",
      policy: args.policy,
      isOwner: false,
      availableModes: [],
      attributionLine,
    };
  }

  if (args.policy === "fans" && !args.isFan) {
    return {
      eligible: false,
      reason: "Become a fan of this creator to use their post as a template.",
      policy: args.policy,
      isOwner: false,
      availableModes: [],
      attributionLine,
    };
  }

  return {
    eligible: true,
    policy: args.policy,
    isOwner: false,
    availableModes: availableTemplateModes(args.analysis),
    attributionLine,
  };
}
