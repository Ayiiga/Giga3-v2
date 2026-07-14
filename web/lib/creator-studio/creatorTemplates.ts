import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Church,
  Clapperboard,
  Film,
  GraduationCap,
  ImageIcon,
  Landmark,
  Megaphone,
  Music2,
  Newspaper,
  Plane,
  Quote,
  Shirt,
  Smartphone,
  Sparkles,
  Trophy,
  Utensils,
  Cpu,
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
  | "social-reel"
  | "social-short"
  | "photo-music-story"
  | "landscape-presentation"
  | "church"
  | "entertainment"
  | "politics"
  | "real-estate"
  | "travel"
  | "fashion"
  | "food"
  | "technology"
  | "ai-presentation"
  | "advertisement";

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
    title: "Motivation",
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
    title: "Education",
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
    title: "Product Promotion",
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
    id: "social-reel",
    title: "Reels",
    description: "Instagram-style reel with bold captions",
    icon: Clapperboard,
    aspectRatio: "9:16",
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "Social reel with punchy hook, beat-synced cuts, animated captions, and vertical mobile framing.",
    transitions: "beat-sync",
    typography: "caption-sans",
  },
  {
    id: "social-short",
    title: "Shorts",
    description: "YouTube Shorts-style vertical clip",
    icon: Smartphone,
    aspectRatio: "9:16",
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "Short-form vertical video with bold title card, fast pacing, and thumb-stopping first frame.",
    transitions: "jump-cut",
    typography: "bold-display",
  },
  {
    id: "photo-music-story",
    title: "Photo + Music",
    description: "Slideshow with soundtrack and motion",
    icon: Music2,
    aspectRatio: "9:16",
    tab: "video",
    category: "music_videos",
    prompt:
      "Photo slideshow with music sync, Ken Burns motion, smooth crossfades, and social-ready pacing.",
    transitions: "crossfade",
    typography: "minimal",
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
  {
    id: "church",
    title: "Church",
    description: "Worship and ministry announcements with reverent typography",
    icon: Church,
    aspectRatio: "16:9",
    tab: "writing",
    prompt: "Create an uplifting church announcement with scripture reference, event details, and welcoming tone.",
    transitions: "dissolve",
    typography: "serif-display",
  },
  {
    id: "entertainment",
    title: "Entertainment",
    description: "Show promos and entertainment highlights",
    icon: Sparkles,
    aspectRatio: "9:16",
    tab: "video",
    category: "cinematic_trailers",
    prompt: "Entertainment promo with dynamic cuts, bold titles, and energetic motion graphics.",
    transitions: "whip-pan",
    typography: "display-bold",
  },
  {
    id: "politics",
    title: "Politics",
    description: "News-style political updates and commentary",
    icon: Landmark,
    aspectRatio: "16:9",
    tab: "writing",
    prompt: "Balanced political update with headline, key points, and neutral professional tone.",
    transitions: "slide",
    typography: "news-sans",
  },
  {
    id: "real-estate",
    title: "Real Estate",
    description: "Property showcases with listing highlights",
    icon: Building2,
    aspectRatio: "16:9",
    tab: "image",
    category: "social_graphics",
    prompt: "Real estate listing graphic with property highlights, location, price area, and professional photography style.",
    transitions: "ken-burns",
    typography: "clean-sans",
  },
  {
    id: "travel",
    title: "Travel",
    description: "Destination reels and travel stories",
    icon: Plane,
    aspectRatio: "9:16",
    tab: "video",
    category: "cinematic_trailers",
    prompt: "Cinematic travel reel with scenic transitions, location titles, and wanderlust mood.",
    transitions: "crossfade",
    typography: "travel-serif",
  },
  {
    id: "fashion",
    title: "Fashion",
    description: "Lookbook and style showcase layouts",
    icon: Shirt,
    aspectRatio: "4:5",
    tab: "image",
    category: "social_graphics",
    prompt: "High-fashion lookbook layout with editorial typography and premium studio lighting.",
    transitions: "fade",
    typography: "editorial-serif",
  },
  {
    id: "food",
    title: "Food",
    description: "Recipe and restaurant promo visuals",
    icon: Utensils,
    aspectRatio: "1:1",
    tab: "image",
    category: "social_graphics",
    prompt: "Appetizing food photography with recipe title space, warm tones, and clean menu styling.",
    transitions: "zoom",
    typography: "rounded-sans",
  },
  {
    id: "technology",
    title: "Technology",
    description: "Product demos and tech explainers",
    icon: Cpu,
    aspectRatio: "16:9",
    tab: "writing",
    prompt: "Technology product update with features, benefits, and modern professional tone.",
    transitions: "slide-up",
    typography: "tech-sans",
  },
  {
    id: "ai-presentation",
    title: "AI Presentation",
    description: "AI-assisted slide decks and explainers",
    icon: Cpu,
    aspectRatio: "16:9",
    tab: "image",
    category: "infographics",
    prompt: "AI presentation slide with diagram space, modern gradients, and clear information hierarchy.",
    transitions: "push",
    typography: "presentation-sans",
  },
  {
    id: "advertisement",
    title: "Advertisement",
    description: "Paid social and display ad creatives",
    icon: Megaphone,
    aspectRatio: "1:1",
    tab: "image",
    category: "social_graphics",
    prompt: "High-converting advertisement with product focus, benefit bullets, and bold CTA area.",
    transitions: "zoom",
    typography: "commercial-sans",
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
