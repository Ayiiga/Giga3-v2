/**
 * Single source of truth for the public product map used by /features and
 * ecosystem navigation. Descriptions mirror each product page's own metadata so
 * the hub never claims something the product page does not.
 */
export type ProductGroupId = "learn" | "create" | "share" | "business";

export type ProductEntry = {
  href: string;
  name: string;
  tagline: string;
  description: string;
  group: ProductGroupId;
  /** Requires sign-in to use (marketing page is still public). */
  app?: boolean;
};

export const PRODUCT_GROUPS: readonly { id: ProductGroupId; title: string; lead: string }[] = [
  {
    id: "learn",
    title: "Learn, research and code",
    lead: "AI chat, research and study tools for students, developers and everyday work.",
  },
  {
    id: "create",
    title: "Create",
    lead: "Images, video, editing and writing tools that hand off to each other.",
  },
  {
    id: "share",
    title: "Share and sell",
    lead: "Publish to the community and sell digital products with GHS payments.",
  },
  {
    id: "business",
    title: "Teams, schools and developers",
    lead: "Workspaces, automation and a read-only API for organisations.",
  },
];

export const PRODUCT_CATALOG: readonly ProductEntry[] = [
  {
    href: "/chat",
    name: "AI Chat",
    tagline: "Fast, Smart, Vision and Creator modes",
    description:
      "Giga3 AI Chat offers Fast, Smart, Vision, and Creator modes for homework help, research, coding, writing, and everyday productivity.",
    group: "learn",
    app: true,
  },
  {
    href: "/gigalearn",
    name: "GigaLearn",
    tagline: "AI tutor and exam prep",
    description:
      "GigaLearn helps students, teachers and parents with AI homework help, BECE and WASSCE prep, practice questions, study plans and classroom tools.",
    group: "learn",
  },
  {
    href: "/prompts",
    name: "Prompt Library",
    tagline: "Curated prompts by subject",
    description:
      "Curated AI prompt library for education, coding, business, marketing, writing, design, programming, productivity, and research.",
    group: "learn",
  },
  {
    href: "/trending",
    name: "Trending",
    tagline: "What people are exploring",
    description:
      "Trending AI topics — artificial intelligence, coding, education, business, sports, technology, health, finance, entertainment, and the creator economy.",
    group: "learn",
  },
  {
    href: "/blog",
    name: "Giga3 Blog",
    tagline: "AI, education and technology in Ghana",
    description:
      "Practical guides on AI tools, BECE and WASSCE study tips, creator workflows, and digital opportunities in Ghana and across Africa.",
    group: "learn",
  },
  {
    href: "/media",
    name: "Media Studio",
    tagline: "AI image generation and editing",
    description:
      "Media Studio generates and edits images with fal.ai, Replicate, and Google AI Studio backup. Create visuals for chat, GigaEdit, and GigaSocial.",
    group: "create",
  },
  {
    href: "/video",
    name: "Video AI",
    tagline: "AI-assisted video generation",
    description:
      "Generate and explore AI-assisted video workflows. Create clips for GigaEdit editing and GigaSocial publishing.",
    group: "create",
  },
  {
    href: "/gigaedit",
    name: "GigaEdit",
    tagline: "Video and photo editor",
    description:
      "GigaEdit is a creator studio for trimming, joining, captioning, and publishing video. Import clips, add audio, and post to GigaSocial when ready.",
    group: "create",
  },
  {
    href: "/gigaedits",
    name: "GigaEdits",
    tagline: "AI creator tools",
    description:
      "GigaEdits brings creator editing tools, AI-assisted content workflows, and practical creative support into one mobile-ready space.",
    group: "create",
  },
  {
    href: "/creator-studio",
    name: "Creator Studio",
    tagline: "Writing and social drafting",
    description:
      "Creator Studio offers writing assistance, image generation shortcuts, and social media drafting for creators who publish to GigaSocial and beyond.",
    group: "create",
  },
  {
    href: "/ai-studio",
    name: "Giga3 AI Studio",
    tagline: "Creative AI workflows",
    description:
      "Giga3 AI Studio helps creators explore AI-assisted image and media workflows from one mobile-ready African AI super app.",
    group: "create",
  },
  {
    href: "/gigasocial",
    name: "GigaSocial",
    tagline: "AI-powered creator community",
    description:
      "GigaSocial is an AI-powered community for creators in Africa to connect, share posts, discover topics, and publish work from GigaEdit and Media Studio.",
    group: "share",
  },
  {
    href: "/marketplace",
    name: "Marketplace",
    tagline: "Digital products, paid in GHS",
    description:
      "Browse digital products — ebooks, templates, and educational resources from verified creators. Pay with Paystack in GHS.",
    group: "share",
  },
  {
    href: "/discover",
    name: "Discover",
    tagline: "Prompts, tools and communities",
    description:
      "Discover popular AI prompts, GigaLearn study resources, creator tools, marketplace listings, and GigaSocial communities.",
    group: "share",
  },
  {
    href: "/enterprise",
    name: "Enterprise & Education",
    tagline: "Workspaces for organisations",
    description:
      "Workspaces for schools, universities, NGOs, and businesses with role-based access control, classrooms, and organization dashboards.",
    group: "business",
  },
  {
    href: "/automation",
    name: "Automation",
    tagline: "Workflows and agents",
    description:
      "AI workflow automation, specialized agents, integrations, and platform search for teams across chat, learning, and creator tools.",
    group: "business",
  },
  {
    href: "/developers",
    name: "Developer API",
    tagline: "Read-only GigaSocial API",
    description:
      "Read-only GigaSocial developer API for feeds, posts, profiles, and comments — API key required for protected endpoints.",
    group: "business",
  },
];

export function productsInGroup(group: ProductGroupId): ProductEntry[] {
  return PRODUCT_CATALOG.filter((p) => p.group === group);
}
