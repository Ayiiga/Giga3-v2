export const siteConfig = {
  name: "Giga3 AI",
  tagline: "Intelligent conversations at scale",
  description:
    "Giga3 AI is a modern AI SaaS platform for fast, secure, and delightful chat experiences—built for teams and creators.",
  url: "https://www.giga3ai.com",
  links: {
    login: "/chat/login",
    dashboard: "/chat",
    pricing: "/pricing",
    subscribe: "/subscribe",
    credits: "/credits",
    media: "/media",
    github: "https://github.com/Ayiiga/Giga3-v2",
  },
  contact: {
    email: "hello@giga3ai.com",
  },
} as const;

export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/media", label: "Media" },
  { href: "/chat/login", label: "Chat" },
  { href: "#contact", label: "Contact" },
] as const;

export const features = [
  {
    title: "Lightning-fast responses",
    description:
      "Powered by optimized inference pipelines so your users get answers in seconds, not minutes.",
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
    title: "Mobile-first UX",
    description:
      "Glassmorphism UI tuned for phones and tablets with installable PWA support.",
    icon: "smartphone" as const,
  },
  {
    title: "Real-time chat history",
    description:
      "Persistent conversations synced through a reliable Convex backend.",
    icon: "messages" as const,
  },
  {
    title: "Paystack checkout",
    description:
      "Subscribe or buy credits in GHS with hosted Paystack and instant activation.",
    icon: "credit-card" as const,
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
    description: "500 monthly credits for daily creators and power users.",
    features: [
      "500 credits / month",
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
    href: "#contact",
    highlighted: false,
  },
] as const;
