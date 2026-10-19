import { siteConfig } from "@/lib/site";

/** Account destinations shown in Settings (kept out of the chat sidebar). */
export const ACCOUNT_SETTINGS_NAV = [
  { href: "/wallet/", label: "GigaWallet", description: "Balance, tips, and billing" },
  { href: "/workspace/", label: "Workspace", description: "Projects and shared work" },
  { href: "/subscribe/", label: "Subscription", description: "Plan and auto-renewal" },
  { href: "/credits/", label: "Credits", description: "Buy or review credit packs" },
  { href: siteConfig.links.home, label: "Dashboard", description: "Home overview" },
  { href: siteConfig.links.about, label: "Help Center", description: "Guides and support" },
] as const;
