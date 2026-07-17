import {
  BarChart3,
  Bell,
  Compass,
  LayoutGrid,
  MessageCircle,
  Radio,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GigaSocialSection =
  | "feed"
  | "discover"
  | "communities"
  | "live"
  | "creator"
  | "profile"
  | "notifications";

export interface GigaSocialSectionDefinition {
  id: GigaSocialSection;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GIGASOCIAL_SECTIONS: GigaSocialSectionDefinition[] = [
  {
    id: "feed",
    label: "Feed",
    description: "Posts from the Giga3 community",
    icon: LayoutGrid,
  },
  {
    id: "live",
    label: "Live",
    description: "Live video, audio, screen share, and replays",
    icon: Radio,
  },
  {
    id: "discover",
    label: "Discover",
    description: "Trending, creators, and educational content",
    icon: Compass,
  },
  {
    id: "communities",
    label: "Communities",
    description: "Join topic groups across Africa",
    icon: Users,
  },
  {
    id: "creator",
    label: "Creator",
    description: "Dashboard, gifts, affiliate, and boost campaigns",
    icon: BarChart3,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Bio, skills, achievements, and your posts",
    icon: User,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Likes, comments, and community updates",
    icon: Bell,
  },
];

export const POST_TYPE_OPTIONS = [
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "ai", label: "AI" },
  { id: "education", label: "Education" },
  { id: "creator", label: "Creator" },
] as const;

export type SocialPostTypeId = (typeof POST_TYPE_OPTIONS)[number]["id"];

export const DISCOVER_FILTERS = [
  { id: "trending", label: "Trending" },
  { id: "recent", label: "Recent" },
  { id: "video", label: "Videos" },
  { id: "photo", label: "Photos" },
  { id: "music", label: "Music" },
  { id: "education", label: "Education" },
  { id: "creator", label: "Creators" },
  { id: "ai", label: "AI" },
] as const;

export type DiscoverFilterId = (typeof DISCOVER_FILTERS)[number]["id"];

export const BADGE_LABELS: Record<string, string> = {
  first_steps: "First steps",
  community_member: "Community member",
  streak_3: "3-day streak",
};
