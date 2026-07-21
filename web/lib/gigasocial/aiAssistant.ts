import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

const HASHTAG_POOLS: Record<string, string[]> = {
  education: ["GigaLearn", "AfricaEd", "StudyWithAI", "LearnDaily"],
  sports: ["AfricanSports", "Football", "AFCON", "GameDay"],
  business: ["AfricanBusiness", "StartupAfrica", "Entrepreneur", "Giga3AI"],
  entertainment: ["Viral", "CreatorLife", "Entertainment", "Trending"],
  creator: ["CreatorZone", "ContentCreator", "GigaCreate", "BuildInPublic"],
  ai: ["AIforAfrica", "Giga3AI", "FutureTech", "Innovation"],
  default: ["GigaSocial", "Giga3AI", "Africa", "Community"],
};

const TRANSLATIONS: Record<string, { label: string; prefix: string }> = {
  en: { label: "English", prefix: "" },
  fr: { label: "French", prefix: "[FR] " },
  sw: { label: "Swahili", prefix: "[SW] " },
  ha: { label: "Hausa", prefix: "[HA] " },
  yo: { label: "Yoruba", prefix: "[YO] " },
  pt: { label: "Portuguese", prefix: "[PT] " },
};

export type PostAIActionId =
  | "improve-caption"
  | "rewrite-caption"
  | "generate-hashtags"
  | "translate"
  | "generate-thumbnail"
  | "generate-cover"
  | "engagement-prediction"
  | "reply-with-ai"
  | "best-time"
  | "suggest-music"
  | "generate-short-clip";

export type PostAIActionDef = {
  id: PostAIActionId;
  label: string;
  description: string;
  /** When true, opens Media/Video studio deep link instead of inline text. */
  navigates?: boolean;
};

export const POST_AI_ACTIONS: PostAIActionDef[] = [
  {
    id: "improve-caption",
    label: "Improve Caption",
    description: "Polish clarity and hook — suggestion only",
  },
  {
    id: "rewrite-caption",
    label: "Rewrite Caption",
    description: "Fresh wording with the same meaning",
  },
  {
    id: "generate-hashtags",
    label: "Generate Hashtags",
    description: "Discoverability tags for Africa + global",
  },
  {
    id: "translate",
    label: "Translate",
    description: "Suggest translations for wider reach",
  },
  {
    id: "generate-thumbnail",
    label: "Generate Thumbnail",
    description: "Open Image Studio for a thumbnail",
    navigates: true,
  },
  {
    id: "generate-cover",
    label: "Generate Cover Image",
    description: "Open Image Studio for a cover",
    navigates: true,
  },
  {
    id: "engagement-prediction",
    label: "AI Engagement Prediction",
    description: "Estimate how this post may perform",
  },
  {
    id: "reply-with-ai",
    label: "Reply with AI",
    description: "Draft a warm reply for comments",
  },
  {
    id: "best-time",
    label: "Best Time to Post",
    description: "Suggest peak windows for your audience",
  },
  {
    id: "suggest-music",
    label: "Suggest Music",
    description: "Mood-matched track ideas",
  },
  {
    id: "generate-short-clip",
    label: "Generate Short Clip",
    description: "Open Video AI for a short cut",
    navigates: true,
  },
];

export function detectContentCategory(text: string): SocialPostTypeId {
  const lower = text.toLowerCase();
  if (/\b(learn|study|lesson|tutorial|class|exam)\b/.test(lower)) return "education";
  if (/\b(startup|business|sales|market|profit)\b/.test(lower)) return "creator";
  if (/\b(ai|gpt|model|prompt|automation)\b/.test(lower)) return "ai";
  if (/\b(video|reel|clip|footage)\b/.test(lower)) return "video";
  if (/\b(photo|image|picture|shot)\b/.test(lower)) return "image";
  return "text";
}

export function suggestHashtags(text: string, postType: SocialPostTypeId, limit = 5): string[] {
  const pool = HASHTAG_POOLS[postType] ?? HASHTAG_POOLS.default;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const fromText = [...new Set(words)]
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return [...new Set([...fromText, ...pool])].slice(0, limit);
}

export function improveCaption(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length < 40) {
    return `${trimmed}\n\nShared on GigaSocial — create, learn, and grow with Giga3 AI.`;
  }
  if (!/[.!?]$/.test(trimmed)) {
    return `${trimmed}.`;
  }
  return trimmed;
}

export function rewriteCaption(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const firstSentence = trimmed.split(/[.!?\n]/)[0]?.trim() || trimmed;
  return `🔥 ${firstSentence}\n\nWhat do you think? Drop a comment and share with someone who needs this.\n\n— via GigaSocial`;
}

export function translateCaption(
  text: string,
  lang: keyof typeof TRANSLATIONS = "fr"
): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const meta = TRANSLATIONS[lang] ?? TRANSLATIONS.fr;
  return `${meta.prefix}${trimmed}\n\n(Suggested ${meta.label} version — review before posting.)`;
}

export function predictEngagement(args: {
  body: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
  hashtags?: string[];
}): string {
  const length = args.body.trim().length;
  const tags = args.hashtags?.length ?? 0;
  const base =
    (args.likeCount ?? 0) * 3 +
    (args.commentCount ?? 0) * 4 +
    (args.shareCount ?? 0) * 5 +
    (args.viewCount ?? 0) * 0.05;
  let score = Math.min(95, Math.round(35 + Math.log10(base + 1) * 18));
  if (length >= 40 && length <= 220) score += 6;
  if (tags >= 3 && tags <= 8) score += 4;
  if (/\?|!/.test(args.body)) score += 3;
  score = Math.min(98, score);
  const band = score >= 75 ? "strong" : score >= 55 ? "solid" : "building";
  return `Predicted engagement: ${score}/100 (${band}). ${
    score < 60
      ? "Add a clear hook in the first line and 3–5 relevant hashtags."
      : "Keep momentum with a question CTA and a follow-up Story within 24h."
  }`;
}

export function suggestBestPostTime(now = new Date()): string {
  const hour = now.getHours();
  const evening = hour >= 17 && hour <= 21;
  if (evening) {
    return "You're in a peak window (roughly 6–9 PM local). Post now or schedule a follow-up tomorrow 7–8 AM.";
  }
  if (hour >= 6 && hour <= 9) {
    return "Morning commute window is strong. Also try posting between 6 PM and 8 PM for peak engagement.";
  }
  return "Best windows for many African audiences: 7–9 AM and 6–8 PM local time. Avoid late-night midweek drops unless your niche is nightlife.";
}

export function suggestReply(body: string): string {
  const topic = body.trim().slice(0, 80) || "your post";
  return `Thanks for engaging! Glad this resonated — what part of “${topic}${
    body.trim().length > 80 ? "…" : ""
  }” should we dive into next?`;
}

export function suggestMusic(body: string): string {
  const lower = body.toLowerCase();
  if (/\b(football|sport|match|game)\b/.test(lower)) {
    return "Try an upbeat Afrobeat or stadium chant bed — energetic, 95–110 BPM.";
  }
  if (/\b(learn|study|lesson|education)\b/.test(lower)) {
    return "Soft lo-fi or calm highlife instrumental keeps focus without overpowering voiceover.";
  }
  if (/\b(business|startup|money)\b/.test(lower)) {
    return "Clean corporate Afro-fusion or light amapiano instrumental works well for business clips.";
  }
  return "Suggest: warm Afro-soul or light amapiano (no vocals) so captions stay readable.";
}

export function buildThumbnailPrompt(body: string): string {
  const hook = body.trim().slice(0, 120) || "African creator content";
  return `Bold social thumbnail for: ${hook}. High contrast, readable text space, mobile-first, no logos.`;
}

export function buildCreatorInsight(
  posts: { postType: string; likeCount: number; createdAt: number }[]
): string {
  if (!posts.length) {
    return "Post consistently to unlock personalized growth insights.";
  }
  const education = posts.filter((p) => p.postType === "education");
  const creator = posts.filter((p) => p.postType === "creator" || p.postType === "video");
  if (education.length > creator.length) {
    return "Your educational posts resonate well — try sharing more learning content in the evening.";
  }
  if (creator.length > 0) {
    return "Video and creator posts drive strong engagement — keep building your Creator Zone presence.";
  }
  const avgLikes =
    posts.reduce((sum, p) => sum + (p.likeCount ?? 0), 0) / Math.max(1, posts.length);
  if (avgLikes >= 5) {
    return "Your audience is engaging — experiment with remixes and polls to grow faster.";
  }
  return "Add hashtags and clear hooks to your captions to boost discoverability across Africa.";
}

export function runPostAIAction(
  action: PostAIActionId,
  args: {
    body: string;
    postType?: SocialPostTypeId;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
    hashtags?: string[];
  }
): string {
  const postType = args.postType ?? detectContentCategory(args.body);
  switch (action) {
    case "improve-caption":
      return improveCaption(args.body);
    case "rewrite-caption":
      return rewriteCaption(args.body);
    case "generate-hashtags":
      return suggestHashtags(args.body, postType)
        .map((t) => `#${t}`)
        .join(" ");
    case "translate":
      return translateCaption(args.body, "fr");
    case "engagement-prediction":
      return predictEngagement(args);
    case "reply-with-ai":
      return suggestReply(args.body);
    case "best-time":
      return suggestBestPostTime();
    case "suggest-music":
      return suggestMusic(args.body);
    case "generate-thumbnail":
    case "generate-cover":
      return buildThumbnailPrompt(args.body);
    case "generate-short-clip":
      return `Short clip brief: ${args.body.trim().slice(0, 160) || "creator moment"}`;
    default:
      return args.body;
  }
}
