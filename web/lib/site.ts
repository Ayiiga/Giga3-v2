export const siteConfig = {
  name: "Giga3 AI",
  tagline: "Intelligent conversations at scale",
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
    gigalearn: "/gigalearn",
    gigasocial: "/gigasocial",
    enterprise: "/enterprise",
    workspace: "/workspace",
    automation: "/automation",
    video: "/video",
    marketplace: "/marketplace",
    github: "https://github.com/Ayiiga/Giga3-v2",
  },
  contact: {
    email: "hello@giga3ai.com",
  },
} as const;

export const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#multi-chat", label: "Multi-AI" },
  { href: "/pricing", label: "Pricing" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/automation", label: "Automation" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/media", label: "Media" },
  { href: "/video", label: "Video AI" },
  { href: "/marketplace", label: "Marketplace" },
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

/** Marketing teaser plans — full catalog at /pricing */
export const pricingPlans = [
  {
    name: "Free",
    price: "GHS 0",
    period: "",
    description: "25 starter credits to explore chat, writing, and media.",
    features: [
      "25 starter credits",
      "Chat & research modes",
      "Image & video studio",
      "Email sign-in",
    ],
    cta: "Get started",
    href: "/chat/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "GHS 150",
    period: "/ month",
    description: "150 monthly credits (150 GHS) for daily creators.",
    features: [
      "150 credits / month",
      "Paystack billing",
      "Media studio",
      "PWA install",
    ],
    cta: "View plans",
    href: "/pricing",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Volume pricing and dedicated support for organizations.",
    features: [
      "Custom credit pools",
      "SLA options",
      "Dedicated onboarding",
      "Invoice billing",
    ],
    cta: "Contact sales",
    href: "/#contact",
    highlighted: false,
  },
] as const;
