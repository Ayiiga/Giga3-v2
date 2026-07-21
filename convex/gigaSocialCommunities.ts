/** Static community catalog — expandable without schema changes (slug-keyed memberships). */

export type SocialCommunityTypeId =
  | "schools"
  | "universities"
  | "churches"
  | "mosques"
  | "businesses"
  | "sports"
  | "ngos"
  | "farmers"
  | "creators"
  | "developers"
  | "gamers"
  | "musicians"
  | "teachers"
  | "students"
  | "government"
  | "local"
  | "family"
  | "events"
  | "education"
  | "technology"
  | "ai"
  | "health"
  | "entrepreneurship";

export type SocialCommunityDefinition = {
  slug: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  /** Phase 3 type tag — additive; older clients ignore unknown fields. */
  communityType?: SocialCommunityTypeId;
};

/**
 * Keep legacy slugs stable for existing memberships.
 * New Phase 3 communities are additive only.
 */
export const SOCIAL_COMMUNITIES: SocialCommunityDefinition[] = [
  {
    slug: "education",
    name: "Education",
    category: "Education",
    description: "Teachers, students, and parents sharing learning resources across Africa.",
    emoji: "📚",
    communityType: "education",
  },
  {
    slug: "technology",
    name: "Technology",
    category: "Technology",
    description: "Gadgets, software, and digital skills for the next generation.",
    emoji: "💻",
    communityType: "technology",
  },
  {
    slug: "business",
    name: "Business",
    category: "Business",
    description: "Entrepreneurship, SMEs, and professional growth.",
    emoji: "💼",
    communityType: "businesses",
  },
  {
    slug: "ai",
    name: "AI",
    category: "AI",
    description: "Artificial intelligence tips, prompts, and responsible use.",
    emoji: "🤖",
    communityType: "ai",
  },
  {
    slug: "coding",
    name: "Coding",
    category: "Coding",
    description: "Programming, debugging, and project showcases.",
    emoji: "⌨️",
    communityType: "developers",
  },
  {
    slug: "agriculture",
    name: "Agriculture",
    category: "Agriculture",
    description: "Farming, agribusiness, and sustainable food systems.",
    emoji: "🌾",
    communityType: "farmers",
  },
  {
    slug: "health",
    name: "Health",
    category: "Health",
    description: "Wellness, public health awareness, and healthy living.",
    emoji: "❤️",
    communityType: "health",
  },
  {
    slug: "entrepreneurship",
    name: "Entrepreneurship",
    category: "Entrepreneurship",
    description: "Startups, side hustles, and creator economy journeys.",
    emoji: "🚀",
    communityType: "entrepreneurship",
  },
  // Phase 3 expanded types (additive slugs)
  {
    slug: "schools",
    name: "Schools",
    category: "Schools",
    description: "Primary and secondary school communities for classes, PTAs, and campus life.",
    emoji: "🏫",
    communityType: "schools",
  },
  {
    slug: "universities",
    name: "Universities",
    category: "Universities",
    description: "Campus groups, lecture clubs, and student societies.",
    emoji: "🎓",
    communityType: "universities",
  },
  {
    slug: "churches",
    name: "Churches",
    category: "Churches",
    description: "Faith communities sharing sermons, worship, and fellowship.",
    emoji: "⛪",
    communityType: "churches",
  },
  {
    slug: "mosques",
    name: "Mosques",
    category: "Mosques",
    description: "Islamic community spaces for learning, events, and support.",
    emoji: "🕌",
    communityType: "mosques",
  },
  {
    slug: "sports-clubs",
    name: "Sports Clubs",
    category: "Sports",
    description: "Football clubs, athletics teams, and match-day fan spaces.",
    emoji: "⚽",
    communityType: "sports",
  },
  {
    slug: "ngos",
    name: "NGOs",
    category: "NGOs",
    description: "Non-profits coordinating impact projects and volunteers.",
    emoji: "🤝",
    communityType: "ngos",
  },
  {
    slug: "creators",
    name: "Creators",
    category: "Creators",
    description: "Content creators collaborating on ideas, collabs, and growth.",
    emoji: "✨",
    communityType: "creators",
  },
  {
    slug: "developers",
    name: "Developers",
    category: "Developers",
    description: "Builders shipping apps, APIs, and open-source for Africa.",
    emoji: "🛠️",
    communityType: "developers",
  },
  {
    slug: "gamers",
    name: "Gamers",
    category: "Gaming",
    description: "Esports squads, mobile gaming clans, and tournament updates.",
    emoji: "🎮",
    communityType: "gamers",
  },
  {
    slug: "musicians",
    name: "Musicians",
    category: "Music",
    description: "Artists, producers, and choirs sharing tracks and sessions.",
    emoji: "🎵",
    communityType: "musicians",
  },
  {
    slug: "teachers",
    name: "Teachers",
    category: "Teachers",
    description: "Educators sharing lesson plans, tips, and peer support.",
    emoji: "🍎",
    communityType: "teachers",
  },
  {
    slug: "students",
    name: "Students",
    category: "Students",
    description: "Study groups, exam prep, and campus announcements.",
    emoji: "📝",
    communityType: "students",
  },
  {
    slug: "government",
    name: "Government Groups",
    category: "Government",
    description: "Civic updates, public services, and community programs.",
    emoji: "🏛",
    communityType: "government",
  },
  {
    slug: "local-communities",
    name: "Local Communities",
    category: "Local",
    description: "Neighborhood groups for markets, safety, and local news.",
    emoji: "📍",
    communityType: "local",
  },
  {
    slug: "family-groups",
    name: "Family Groups",
    category: "Family",
    description: "Private-minded family circles for updates and celebrations.",
    emoji: "👨‍👩‍👧",
    communityType: "family",
  },
  {
    slug: "event-communities",
    name: "Event Communities",
    category: "Events",
    description: "Festival crews, conferences, and pop-up event coordination.",
    emoji: "📅",
    communityType: "events",
  },
];

export function getCommunityBySlug(slug: string): SocialCommunityDefinition | undefined {
  return SOCIAL_COMMUNITIES.find((c) => c.slug === slug);
}
