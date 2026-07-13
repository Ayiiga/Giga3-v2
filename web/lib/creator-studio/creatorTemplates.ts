import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  Film,
  GraduationCap,
  ImageIcon,
  Megaphone,
  Music2,
  Newspaper,
  Quote,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";

export type CreatorTemplateId =
  | "photo-slideshow"
  | "music-video"
  | "motivational-quote"
  | "news-update"
  | "sports-highlight"
  | "educational-lesson"
  | "product-ad"
  | "business-promo"
  | "event-announcement"
  | "social-story"
  | "vertical-short"
  | "landscape-presentation";

export interface CreatorTemplate {
  id: CreatorTemplateId;
  title: string;
  description: string;
  icon: LucideIcon;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  prompt: string;
  tab: "image" | "video" | "writing" | "social";
  category?: string;
  transitions: string;
  typography: string;
}

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: "photo-slideshow",
    title: "Photo Slideshow",
    description: "Smooth crossfade transitions between photos with optional music",
    icon: ImageIcon,
    aspectRatio: "16:9",
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "Create a photo slideshow with smooth crossfade transitions, gentle Ken Burns motion, and professional pacing.",
    transitions: "crossfade",
    typography: "minimal",
  },
  {
    id: "music-video",
    title: "Music Video",
    description: "Beat-synced visuals with cinematic motion effects",
    icon: Music2,
    aspectRatio: "9:16",
    tab: "video",
    category: "music_videos",
    prompt:
      "Music video with beat-synced cuts, dynamic camera motion, vibrant lighting, and rhythmic visual flow.",
    transitions: "beat-sync",
    typography: "bold-display",
  },
  {
    id: "motivational-quote",
    title: "Motivational Quote",
    description: "Typography-focused quote video with motion effects",
    icon: Quote,
    aspectRatio: "9:16",
    tab: "video",
    category: "social_graphics",
    prompt:
      "Motivational quote video with elegant kinetic typography, smooth fade transitions, and inspiring background visuals.",
    transitions: "fade",
    typography: "kinetic-serif",
  },
  {
    id: "news-update",
    title: "News Update",
    description: "Professional news-style lower thirds and layouts",
    icon: Newspaper,
    aspectRatio: "16:9",
    tab: "writing",
    prompt:
      "Write a concise news update with headline, key facts, and a clear call-to-action for social sharing.",
    transitions: "slide",
    typography: "news-sans",
  },
  {
    id: "sports-highlight",
    title: "Sports Highlight",
    description: "High-energy sports reel with dynamic transitions",
    icon: Trophy,
    aspectRatio: "16:9",
    tab: "video",
    category: "sports_highlights",
    prompt:
      "Sports highlight reel with fast cuts, energetic motion graphics, score overlays, and crowd atmosphere.",
    transitions: "whip-pan",
    typography: "athletic-bold",
  },
  {
    id: "educational-lesson",
    title: "Educational Lesson",
    description: "Structured lesson layout with clear sections",
    icon: GraduationCap,
    aspectRatio: "16:9",
    tab: "writing",
    prompt:
      "Create an educational lesson outline with learning objectives, key concepts, examples, and a summary.",
    transitions: "dissolve",
    typography: "readable-sans",
  },
  {
    id: "product-ad",
    title: "Product Advertisement",
    description: "Conversion-focused product showcase",
    icon: Megaphone,
    aspectRatio: "1:1",
    tab: "image",
    category: "social_graphics",
    prompt:
      "Product advertisement with hero product shot, benefit highlights, CTA space, and premium commercial styling.",
    transitions: "zoom",
    typography: "commercial-sans",
  },
  {
    id: "business-promo",
    title: "Business Promotion",
    description: "Professional brand promotion layout",
    icon: Sparkles,
    aspectRatio: "16:9",
    tab: "image",
    category: "flyers",
    prompt:
      "Business promotion creative with brand colors, service highlights, trust signals, and professional layout.",
    transitions: "fade",
    typography: "corporate-sans",
  },
  {
    id: "event-announcement",
    title: "Event Announcement",
    description: "Event poster with date, venue, and details",
    icon: Megaphone,
    aspectRatio: "4:5",
    tab: "image",
    category: "posters",
    prompt:
      "Event announcement poster with date, venue, headline, and RSVP call-to-action in a polished layout.",
    transitions: "slide-up",
    typography: "event-display",
  },
  {
    id: "social-story",
    title: "Social Story",
    description: "Vertical story format for Instagram & WhatsApp",
    icon: Smartphone,
    aspectRatio: "9:16",
    tab: "video",
    category: "social_graphics",
    prompt:
      "Vertical social story with bold text overlays, swipe-up CTA area, and mobile-first composition.",
    transitions: "swipe",
    typography: "story-bold",
  },
  {
    id: "vertical-short",
    title: "Vertical Short Video",
    description: "TikTok/Reels-ready short-form video",
    icon: Clapperboard,
    aspectRatio: "9:16",
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "Vertical short video with hook in first 2 seconds, fast pacing, captions area, and engaging motion.",
    transitions: "jump-cut",
    typography: "caption-sans",
  },
  {
    id: "landscape-presentation",
    title: "Landscape Presentation",
    description: "Widescreen presentation slides with motion",
    icon: Film,
    aspectRatio: "16:9",
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "Landscape presentation video with slide transitions, professional typography, and clean corporate motion.",
    transitions: "push",
    typography: "presentation-sans",
  },
];

export function getCreatorTemplate(id: string): CreatorTemplate | undefined {
  return CREATOR_TEMPLATES.find((t) => t.id === id);
}

export function buildCreatorTemplateUrl(template: CreatorTemplate): string {
  const params = new URLSearchParams({ tab: template.tab, template: template.id });
  if (template.category) params.set("category", template.category);
  if (template.prompt) params.set("prompt", template.prompt);
  if (template.aspectRatio) params.set("aspect", template.aspectRatio);
  return `/creator-studio?${params.toString()}`;
}
