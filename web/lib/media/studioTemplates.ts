import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";
import type { ImageCategoryId, VideoCategoryId } from "@/lib/media/catalog";

export type MediaStudioTemplateId =
  | "ai-images"
  | "ai-videos"
  | "social-posts"
  | "thumbnails"
  | "logos"
  | "posters"
  | "ads";

export interface MediaStudioTemplate {
  id: MediaStudioTemplateId;
  title: string;
  description: string;
  icon: LucideIcon;
  tab: "image" | "video";
  category: ImageCategoryId | VideoCategoryId;
  prompt: string;
  gradient: string;
}

export const MEDIA_STUDIO_TEMPLATES: MediaStudioTemplate[] = [
  {
    id: "ai-images",
    title: "AI Images",
    description: "Illustrations, scenes, and creative art",
    icon: ImageIcon,
    tab: "image",
    category: "anime_art",
    prompt:
      "A high-quality creative image with rich detail, professional lighting, and a polished composition.",
    gradient: "from-emerald-500/20 to-teal-600/10",
  },
  {
    id: "ai-videos",
    title: "AI Videos",
    description: "Short cinematic clips and motion",
    icon: Clapperboard,
    tab: "video",
    category: "cinematic_trailers",
    prompt:
      "A cinematic 5-second scene with smooth camera motion, dramatic lighting, and professional pacing.",
    gradient: "from-rose-500/20 to-orange-600/10",
  },
  {
    id: "social-posts",
    title: "Social Posts",
    description: "Feed-ready graphics for Instagram & X",
    icon: Megaphone,
    tab: "image",
    category: "social_graphics",
    prompt:
      "Bold social media graphic with clear headline space, modern typography area, and vibrant brand-friendly colors.",
    gradient: "from-violet-500/20 to-fuchsia-600/10",
  },
  {
    id: "thumbnails",
    title: "Thumbnails",
    description: "YouTube & course cover frames",
    icon: LayoutGrid,
    tab: "image",
    category: "cinematic_posters",
    prompt:
      "Eye-catching video thumbnail with strong contrast, readable title area, and compelling focal subject.",
    gradient: "from-blue-500/20 to-indigo-600/10",
  },
  {
    id: "logos",
    title: "Logos",
    description: "Minimal marks and brand icons",
    icon: Palette,
    tab: "image",
    category: "art_3d",
    prompt:
      "Clean minimal logo concept on neutral background, vector-style, memorable shape, professional brand mark.",
    gradient: "from-cyan-500/20 to-blue-600/10",
  },
  {
    id: "posters",
    title: "Posters",
    description: "Events, films, and promo layouts",
    icon: Sparkles,
    tab: "image",
    category: "cinematic_posters",
    prompt:
      "Epic promotional poster layout with dramatic composition, title space, and premium print-ready aesthetic.",
    gradient: "from-amber-500/20 to-red-600/10",
  },
  {
    id: "ads",
    title: "Ads",
    description: "Paid social & display creatives",
    icon: Type,
    tab: "image",
    category: "social_graphics",
    prompt:
      "Conversion-focused ad creative with product focus, CTA space, and clean commercial photography style.",
    gradient: "from-pink-500/20 to-violet-600/10",
  },
];

export function getMediaStudioTemplate(id: string): MediaStudioTemplate | undefined {
  return MEDIA_STUDIO_TEMPLATES.find((t) => t.id === id);
}

export function buildMediaStudioUrl(template: MediaStudioTemplate): string {
  const params = new URLSearchParams({
    tab: template.tab,
    category: template.category,
    prompt: template.prompt,
    template: template.id,
  });
  return `/media?${params.toString()}`;
}
