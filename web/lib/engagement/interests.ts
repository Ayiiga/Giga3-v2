/** Client mirror of engagement interest + checklist catalogs. */

export const ENGAGEMENT_INTERESTS = [
  { id: "learning", label: "Learning and education" },
  { id: "ai_tools", label: "AI tools and productivity" },
  { id: "content_creation", label: "Content creation" },
  { id: "social", label: "Social networking" },
  { id: "business", label: "Business and entrepreneurship" },
  { id: "video_creative", label: "Video editing and creative tools" },
  { id: "marketplace", label: "Marketplace" },
  { id: "teaching", label: "Teaching and learning" },
] as const;

export const ENGAGEMENT_CHECKLIST = [
  {
    id: "complete_profile",
    label: "Complete your profile",
    href: "/gigasocial/?tab=profile",
  },
  {
    id: "explore_feed",
    label: "Explore the Feed",
    href: "/gigasocial/?tab=feed",
  },
  {
    id: "follow_creators",
    label: "Follow creators",
    href: "/gigasocial/?tab=discover",
  },
  {
    id: "try_ai_tool",
    label: "Try an AI tool",
    href: "/chat/",
  },
  {
    id: "visit_gigalearn",
    label: "Visit GigaLearn",
    href: "/gigalearn/",
  },
  {
    id: "explore_creator",
    label: "Explore Creator tools",
    href: "/creator-studio/",
  },
  {
    id: "notification_prefs",
    label: "Configure notification preferences",
    href: "/settings/",
  },
] as const;
