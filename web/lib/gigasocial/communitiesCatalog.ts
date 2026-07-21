/** Client-side community catalog helpers — mirrors Convex catalog fields. */

export type CommunityFeatureId =
  | "ai-assistant"
  | "feed"
  | "announcements"
  | "live-events"
  | "polls"
  | "qa"
  | "shared-files"
  | "voice-rooms"
  | "video-rooms"
  | "calendar"
  | "tasks"
  | "moderators"
  | "admin"
  | "analytics"
  | "verification"
  | "invite-links"
  | "discovery"
  | "badges";

export const COMMUNITY_FEATURES: { id: CommunityFeatureId; label: string; emoji: string }[] = [
  { id: "ai-assistant", label: "AI Assistant", emoji: "✦" },
  { id: "feed", label: "Community Feed", emoji: "📰" },
  { id: "announcements", label: "Announcements", emoji: "📣" },
  { id: "live-events", label: "Live Events", emoji: "🔴" },
  { id: "polls", label: "Polls", emoji: "📊" },
  { id: "qa", label: "Q&A", emoji: "❓" },
  { id: "shared-files", label: "Shared Files", emoji: "📁" },
  { id: "voice-rooms", label: "Voice Rooms", emoji: "🎙" },
  { id: "video-rooms", label: "Video Rooms", emoji: "📹" },
  { id: "calendar", label: "Calendar", emoji: "🗓" },
  { id: "tasks", label: "Tasks", emoji: "✅" },
  { id: "moderators", label: "Moderators", emoji: "🛡" },
  { id: "admin", label: "Admin Dashboard", emoji: "⚙" },
  { id: "analytics", label: "Analytics", emoji: "📈" },
  { id: "verification", label: "Member Verification", emoji: "✔" },
  { id: "invite-links", label: "Invite Links", emoji: "🔗" },
  { id: "discovery", label: "Discovery", emoji: "🧭" },
  { id: "badges", label: "Community Badges", emoji: "🏅" },
];

export const COMMUNITY_TYPE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "schools", label: "Schools" },
  { id: "universities", label: "Universities" },
  { id: "churches", label: "Churches" },
  { id: "mosques", label: "Mosques" },
  { id: "businesses", label: "Business" },
  { id: "sports", label: "Sports" },
  { id: "ngos", label: "NGOs" },
  { id: "farmers", label: "Farmers" },
  { id: "creators", label: "Creators" },
  { id: "developers", label: "Developers" },
  { id: "gamers", label: "Gamers" },
  { id: "musicians", label: "Musicians" },
  { id: "teachers", label: "Teachers" },
  { id: "students", label: "Students" },
  { id: "government", label: "Government" },
  { id: "local", label: "Local" },
  { id: "family", label: "Family" },
  { id: "events", label: "Events" },
  { id: "education", label: "Education" },
  { id: "technology", label: "Technology" },
  { id: "ai", label: "AI" },
];

export function buildCommunityInviteLink(slug: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.giga3ai.com");
  return `${base.replace(/\/$/, "")}/gigasocial/?tab=communities&community=${encodeURIComponent(slug)}`;
}

export function communityMatchesType(
  community: { communityType?: string; category?: string; slug: string },
  typeId: string
): boolean {
  if (typeId === "all") return true;
  if (community.communityType === typeId) return true;
  const hay = `${community.category ?? ""} ${community.slug}`.toLowerCase();
  return hay.includes(typeId.toLowerCase());
}
