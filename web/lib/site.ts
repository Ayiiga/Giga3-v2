export const siteConfig = {
  name: "Giga3 AI",
  tagline: "Intelligent conversations at scale",
  description:
    "Giga3 AI is a modern AI SaaS platform for fast, secure, and delightful chat experiences—built for teams and creators.",
  url: "https://www.giga3ai.com",
  links: {
    login: "https://www.giga3ai.com/login.html",
    dashboard: "https://www.giga3ai.com/dashboard.html",
    pricing: "https://www.giga3ai.com/pricing.html",
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
  { href: "/chat", label: "Chat" },
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
    title: "Token-based billing",
    description:
      "Transparent usage with flexible token packs—pay only for what you use.",
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
    title: "Stripe checkout",
    description:
      "Upgrade in one click with hosted payments and instant token credit.",
    icon: "credit-card" as const,
  },
] as const;

export const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Try Giga3 with 12 tokens to explore the product.",
    features: ["12 free tokens", "GPT-4o mini model", "Chat history", "Email login"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/ pack",
    description: "Best for regular users who need more capacity.",
    features: [
      "50 tokens per pack",
      "Priority responses",
      "Stripe checkout",
      "PWA install",
    ],
    cta: "Buy tokens",
    highlighted: true,
  },
  {
    name: "Team",
    price: "Custom",
    period: "",
    description: "Volume pricing and dedicated support for organizations.",
    features: [
      "Custom token pools",
      "SLA options",
      "Dedicated onboarding",
      "Invoice billing",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
] as const;
