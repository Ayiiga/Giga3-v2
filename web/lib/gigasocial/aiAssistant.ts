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

export function detectContentCategory(text: string): SocialPostTypeId {
  const lower = text.toLowerCase();
  if (/\b(learn|study|lesson|tutorial|class|exam)\b/.test(lower)) return "education";
  if (/\b(startup|business|sales|market|profit)\b/.test(lower)) return "creator";
  if (/\b(ai|gpt|model|prompt|automation)\b/.test(lower)) return "ai";
  if (/\b(video|reel|clip|footage)\b/.test(lower)) return "video";
  if (/\b(photo|image|picture|shot)\b/.test(lower)) return "image";
  return "text";
}

export function suggestHashtags(text: string, postType: SocialPostTypeId, limit = 8): string[] {
  const pool = HASHTAG_POOLS[postType] ?? HASHTAG_POOLS.default;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const fromText = [...new Set(words)]
    .slice(0, 4)
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

export function buildCreatorInsight(posts: { postType: string; likeCount: number; createdAt: number }[]): string {
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
