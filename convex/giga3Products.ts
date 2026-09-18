/**
 * Giga3 apps the chat assistant can open or point to.
 * Paths must stay same-origin and match web/lib/site.ts + trailingSlash.
 * Keep this file Convex-safe (no React / lucide imports).
 */

export type Giga3ChatProductId =
  | "gigasocial"
  | "gigaedit"
  | "gigalearn"
  | "media"
  | "video"
  | "marketplace"
  | "creator-studio"
  | "discover"
  | "pricing"
  | "wallet"
  | "enterprise"
  | "prompts"
  | "automation";

export type Giga3ChatProduct = {
  id: Giga3ChatProductId;
  label: string;
  href: string;
  hint: string;
  /** Lowercase names users type. Longer aliases first when matching. */
  aliases: readonly string[];
};

export const GIGA3_CHAT_PRODUCTS: readonly Giga3ChatProduct[] = [
  {
    id: "gigasocial",
    label: "GigaSocial",
    href: "/gigasocial/",
    hint: "Feed, stories, and creator tools.",
    aliases: [
      "giga social",
      "gigasocial",
      "social hub",
      "social feed",
      "the feed",
      "creator feed",
    ],
  },
  {
    id: "gigaedit",
    label: "GigaEdits",
    href: "/gigaedit/",
    hint: "Video, photo, teleprompter, and offline edits.",
    aliases: [
      "giga edits",
      "gigaedits",
      "giga edit",
      "gigaedit",
      "video editor",
      "photo editor",
    ],
  },
  {
    id: "gigalearn",
    label: "GigaLearn",
    href: "/gigalearn/",
    hint: "Homework help, quizzes, lesson notes, and study plans.",
    aliases: ["giga learn", "gigalearn", "learning studio", "ai tutor"],
  },
  {
    id: "media",
    label: "Media Studio",
    href: "/media/",
    hint: "Generate and edit images and video.",
    aliases: ["media studio", "image studio", "image generator"],
  },
  {
    id: "video",
    label: "Video AI",
    href: "/video/",
    hint: "AI-assisted video generation.",
    aliases: ["video ai", "video studio", "video generator"],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    href: "/marketplace/",
    hint: "Digital products paid in GHS.",
    aliases: ["marketplace", "giga marketplace"],
  },
  {
    id: "creator-studio",
    label: "Creator Studio",
    href: "/creator-studio/",
    hint: "Writing, image shortcuts, and social drafts.",
    aliases: ["creator studio"],
  },
  {
    id: "discover",
    label: "Discover",
    href: "/discover/",
    hint: "Prompts, tools, and communities.",
    aliases: ["discover"],
  },
  {
    id: "pricing",
    label: "Pricing",
    href: "/pricing/",
    hint: "Plans and credit packs in GHS.",
    aliases: ["pricing", "plans", "subscription plans"],
  },
  {
    id: "wallet",
    label: "GigaWallet",
    href: "/wallet/",
    hint: "Credits, purchases, and billing.",
    aliases: ["gigawallet", "giga wallet", "wallet"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    href: "/enterprise/",
    hint: "Workspaces for schools and organisations.",
    aliases: ["enterprise"],
  },
  {
    id: "prompts",
    label: "Prompt Library",
    href: "/prompts/",
    hint: "Curated prompts by subject.",
    aliases: ["prompt library", "prompts"],
  },
  {
    id: "automation",
    label: "Automation",
    href: "/automation/",
    hint: "Workflows and agents.",
    aliases: ["automation"],
  },
] as const;

/** Compact system-prompt block — included on every chat turn. */
export const GIGA3_PRODUCT_ROUTING_RULES = `Giga3 product routing:
When the user asks to open, go to, use, or be taken to another Giga3 app, include a same-origin markdown link to the exact path (never invent URLs):
- GigaSocial (feed, stories, posts): [Open GigaSocial](/gigasocial/)
- GigaEdits / GigaEdit (video/photo editor): [Open GigaEdits](/gigaedit/)
- GigaLearn (tutor, homework, exams): [Open GigaLearn](/gigalearn/)
- Media Studio (images): [Open Media Studio](/media/)
- Video AI: [Open Video AI](/video/)
- Marketplace: [Open Marketplace](/marketplace/)
- Creator Studio: [Open Creator Studio](/creator-studio/)
- Discover: [Open Discover](/discover/)
- Pricing: [Open Pricing](/pricing/)
- Wallet: [Open GigaWallet](/wallet/)
- Prompt Library: [Open Prompt Library](/prompts/)
- Enterprise: [Open Enterprise](/enterprise/)
- Automation: [Open Automation](/automation/)
Do not claim you already opened the app. Keep a navigation-only reply to one short sentence plus the link.`;

export function findGiga3ChatProductByHref(
  rawHref: string
): Giga3ChatProduct | null {
  const path = normalizeProductPath(rawHref);
  if (!path) return null;
  if (path === "/gigaedits/" || path.startsWith("/gigaedits/")) {
    return GIGA3_CHAT_PRODUCTS.find((product) => product.id === "gigaedit") ?? null;
  }
  for (const product of GIGA3_CHAT_PRODUCTS) {
    const base = normalizeProductPath(product.href);
    if (!base || base === "/") continue;
    if (path === base || path.startsWith(base)) {
      return product;
    }
  }
  return null;
}

export function normalizeProductPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed, "https://www.giga3ai.com");
    const host = url.hostname.replace(/^www\./, "");
    if (host && host !== "giga3ai.com") return null;
    let path = url.pathname || "/";
    if (!path.endsWith("/")) path += "/";
    return path;
  } catch {
    return null;
  }
}
