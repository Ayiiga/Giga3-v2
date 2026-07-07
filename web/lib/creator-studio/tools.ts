import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Hash,
  Lightbulb,
  Mail,
  Megaphone,
  MessageSquare,
  PenLine,
  RefreshCw,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";

export type CreatorStudioSection = "writing" | "image" | "social" | "workspace";

export type SocialPlatformId =
  | "facebook"
  | "tiktok"
  | "instagram"
  | "youtube-shorts"
  | "whatsapp-status";

export interface CreatorToolDefinition {
  id: string;
  section: Exclude<CreatorStudioSection, "workspace" | "image">;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  creditCost: number;
}

export const SOCIAL_PLATFORMS: Array<{
  id: SocialPlatformId;
  label: string;
  emoji: string;
}> = [
  { id: "facebook", label: "Facebook", emoji: "📘" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube-shorts", label: "YouTube Shorts", emoji: "▶️" },
  { id: "whatsapp-status", label: "WhatsApp Status", emoji: "💬" },
];

export const WRITING_TOOLS: CreatorToolDefinition[] = [
  {
    id: "caption-generator",
    section: "writing",
    label: "Caption generator",
    description: "Engaging captions for posts and reels",
    icon: Type,
    placeholder: "Describe your post topic, audience, and tone…",
    creditCost: 2,
  },
  {
    id: "social-post",
    section: "writing",
    label: "Social post",
    description: "Complete post ready to publish",
    icon: Megaphone,
    placeholder: "What is the post about? Include key points or offer…",
    creditCost: 2,
  },
  {
    id: "content-ideas",
    section: "writing",
    label: "Content ideas",
    description: "Brainstorm topics and angles",
    icon: Lightbulb,
    placeholder: "Your niche, audience, and goals (e.g. Ghanaian tech education)…",
    creditCost: 2,
  },
  {
    id: "blog-article",
    section: "writing",
    label: "Blog / article",
    description: "Structured article draft",
    icon: FileText,
    placeholder: "Article topic, target reader, and key points to cover…",
    creditCost: 2,
  },
  {
    id: "story-creator",
    section: "writing",
    label: "Story creator",
    description: "Short fiction and narratives",
    icon: PenLine,
    placeholder: "Genre, characters, setting, and plot idea…",
    creditCost: 2,
  },
  {
    id: "speech-writer",
    section: "writing",
    label: "Speech writer",
    description: "Speeches for events and presentations",
    icon: MessageSquare,
    placeholder: "Occasion, audience, duration, and main message…",
    creditCost: 2,
  },
  {
    id: "email-assistant",
    section: "writing",
    label: "Email assistant",
    description: "Professional emails",
    icon: Mail,
    placeholder: "Purpose, recipient, and key points to include…",
    creditCost: 2,
  },
  {
    id: "resume-cv",
    section: "writing",
    label: "Resume / CV",
    description: "ATS-friendly CV content",
    icon: FileText,
    placeholder: "Target role, experience summary, and skills…",
    creditCost: 2,
  },
];

export const SOCIAL_TOOLS: CreatorToolDefinition[] = [
  {
    id: "viral-caption",
    section: "social",
    label: "Viral captions",
    description: "Multiple hook-driven caption options",
    icon: Sparkles,
    placeholder: "Describe your video or image and target audience…",
    creditCost: 2,
  },
  {
    id: "hook-generator",
    section: "social",
    label: "Hook generator",
    description: "Scroll-stopping opening lines",
    icon: Wand2,
    placeholder: "Topic, platform, and style (funny, educational, bold)…",
    creditCost: 2,
  },
  {
    id: "hashtag-suggestions",
    section: "social",
    label: "Hashtags",
    description: "Relevant hashtag groups",
    icon: Hash,
    placeholder: "Post topic, niche, and location (optional)…",
    creditCost: 2,
  },
  {
    id: "content-improver",
    section: "social",
    label: "Content improver",
    description: "Polish and strengthen drafts",
    icon: PenLine,
    placeholder: "Paste your draft post or caption here…",
    creditCost: 2,
  },
  {
    id: "post-rewriter",
    section: "social",
    label: "Post rewriter",
    description: "Alternative versions of your post",
    icon: RefreshCw,
    placeholder: "Paste the post you want rewritten…",
    creditCost: 2,
  },
];

export const ALL_CREATOR_TOOLS = [...WRITING_TOOLS, ...SOCIAL_TOOLS];

export function getCreatorTool(id: string): CreatorToolDefinition | undefined {
  return ALL_CREATOR_TOOLS.find((t) => t.id === id);
}

export const IMAGE_STYLES = [
  { id: "social_graphics", label: "Social graphic" },
  { id: "flyers", label: "Poster / flyer" },
  { id: "marketing_assets", label: "Logo / marketing" },
  { id: "study_visuals", label: "Educational visual" },
  { id: "cinematic_posters", label: "Cinematic poster" },
  { id: "infographics", label: "Infographic" },
  { id: "anime_art", label: "Anime art" },
] as const;

export const IMAGE_ASPECT_RATIOS = [
  { id: "square_hd", label: "Square (1:1)" },
  { id: "portrait_16_9", label: "Portrait (9:16)" },
  { id: "landscape_16_9", label: "Landscape (16:9)" },
  { id: "portrait_4_3", label: "Portrait (4:3)" },
] as const;
