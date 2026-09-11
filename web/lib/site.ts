import { buildHomepagePricingTeasers } from "@/lib/payments/marketingPricing";
import { GIGA3_VISION } from "@/lib/vision";

export const siteConfig = {
  name: "Giga3 AI",
  tagline: GIGA3_VISION.tagline,
  description:
    "Giga3 AI is an advanced artificial intelligence platform from Ghana for learning, research, coding, creativity, productivity, content creation, and problem-solving.",
  url: "https://www.giga3ai.com",
  founder: {
    name: "Ayiiga Benard Issaka",
    alias: "Young Anointed",
    location: "Ghana",
    role: "Basic school educationist",
    organization: "Intelligence Global Arena (GIGA)",
    organizationShort: "GIGA",
  },
  links: {
    login: "/chat/login",
    dashboard: "/chat",
    home: "/home",
    about: "/about",
    install: "/install",
    pricing: "/pricing",
    wallet: "/wallet",
    subscribe: "/subscribe",
    credits: "/credits",
    media: "/media",
    creatorStudio: "/creator-studio",
    gigaedit: "/gigaedit",
    gigalearn: "/gigalearn",
    gigasocial: "/gigasocial/",
    developers: "/developers",
    enterprise: "/enterprise",
    workspace: "/workspace",
    automation: "/automation",
    trending: "/trending",
    discover: "/discover",
    prompts: "/prompts",
    video: "/video",
    marketplace: "/marketplace",
    blog: "/blog",
    github: "https://github.com/Ayiiga/Giga3-v2",
  },
  contact: {
    email: "hello@giga3ai.com",
  },
} as const;

export const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/discover", label: "Discover" },
  { href: "/trending", label: "Trending" },
  { href: "/#multi-chat", label: "Multi-AI" },
  { href: "/pricing", label: "Pricing" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/gigaedits", label: "GigaEdits" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/automation", label: "Automation" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/ai-studio", label: "Giga3 AI Studio" },
  { href: "/video", label: "Video AI" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/blog", label: "Blog" },
  { href: "/chat/login", label: "Chat" },
  { href: "/#contact", label: "Contact" },
] as const;

export const heroStats = [
  { label: "AI failover paths", value: "7+" },
  { label: "Chat modes", value: "6" },
  { label: "Deploy stack", value: "PWA" },
] as const;

export const features = [
  {
    title: "Multi-provider AI failover",
    description:
      "If the primary model fails, Giga3 automatically tries backup models, compact retries, and an optional secondary API key—so chat keeps working.",
    icon: "layers" as const,
  },
  {
    title: "Multiple conversations",
    description:
      "Run parallel chats with modes for general, writing, research, and more—each with its own history on Convex.",
    icon: "messages" as const,
  },
  {
    title: "Lightning-fast responses",
    description:
      "Optimized server-side inference with credit-based usage and clear provider status in the UI.",
    icon: "zap" as const,
  },
  {
    title: "Credit-based billing",
    description:
      "Transparent usage in Ghana Cedis—subscriptions and top-up packs via Paystack.",
    icon: "coins" as const,
  },
  {
    title: "Secure by design",
    description:
      "API keys stay server-side. Your data never touches the client bundle.",
    icon: "shield" as const,
  },
  {
    title: "Mobile-first PWA",
    description:
      "Glassmorphism UI tuned for phones and tablets with installable app support.",
    icon: "smartphone" as const,
  },
] as const;

/** Marketing teaser plans — derived from subscriptionCatalog; full catalog at /pricing */
export const pricingPlans = buildHomepagePricingTeasers();

/**
 * Factual, repeatable positioning sentence used verbatim in the footer and About
 * page so answer engines (ChatGPT, Gemini, Perplexity) pick up one consistent description.
 */
export const GEO_POSITIONING_STATEMENT =
  "Giga3 AI is a Ghana-built AI platform that brings chat, learning, research, coding, creativity, and creator tools together in one account — including GigaLearn, Media Studio, GigaEdit, GigaSocial, and Marketplace, with GHS billing via Paystack.";
