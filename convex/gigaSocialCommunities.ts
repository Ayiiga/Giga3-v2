/** Static community catalog — expandable without schema changes (slug-keyed memberships). */

export type SocialCommunityDefinition = {
  slug: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
};

export const SOCIAL_COMMUNITIES: SocialCommunityDefinition[] = [
  {
    slug: "education",
    name: "Education",
    category: "Education",
    description: "Teachers, students, and parents sharing learning resources across Africa.",
    emoji: "📚",
  },
  {
    slug: "technology",
    name: "Technology",
    category: "Technology",
    description: "Gadgets, software, and digital skills for the next generation.",
    emoji: "💻",
  },
  {
    slug: "business",
    name: "Business",
    category: "Business",
    description: "Entrepreneurship, SMEs, and professional growth.",
    emoji: "💼",
  },
  {
    slug: "ai",
    name: "AI",
    category: "AI",
    description: "Artificial intelligence tips, prompts, and responsible use.",
    emoji: "🤖",
  },
  {
    slug: "coding",
    name: "Coding",
    category: "Coding",
    description: "Programming, debugging, and project showcases.",
    emoji: "⌨️",
  },
  {
    slug: "agriculture",
    name: "Agriculture",
    category: "Agriculture",
    description: "Farming, agribusiness, and sustainable food systems.",
    emoji: "🌾",
  },
  {
    slug: "health",
    name: "Health",
    category: "Health",
    description: "Wellness, public health awareness, and healthy living.",
    emoji: "❤️",
  },
  {
    slug: "entrepreneurship",
    name: "Entrepreneurship",
    category: "Entrepreneurship",
    description: "Startups, side hustles, and creator economy journeys.",
    emoji: "🚀",
  },
];

export function getCommunityBySlug(slug: string): SocialCommunityDefinition | undefined {
  return SOCIAL_COMMUNITIES.find((c) => c.slug === slug);
}
