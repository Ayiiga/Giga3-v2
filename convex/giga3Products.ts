/**
 * Giga3 apps the chat assistant can open or point to.
 * Paths must stay same-origin and match web/lib/site.ts + trailingSlash.
 * Keep this file Convex-safe (no React / lucide imports).
 *
 * Phase 2: Media Studio / Video AI / GigaEdits are not dedicated products.
 * Aliases still match legacy user phrasing and route to retained experiences.
 */

export type Giga3ChatProductId =
  | "gigasocial"
  | "gigaedit"
  | "gigalearn"
  | "academy"
  | "exam-practice"
  | "tech-hub"
  | "media"
  | "video"
  | "marketplace"
  | "creator-studio"
  | "discover"
  | "pricing"
  | "wallet"
  | "enterprise"
  | "prompts"
  | "automation"
  | "chat";

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
    id: "chat",
    label: "AI Assistant",
    href: "/chat/",
    hint: "Chat, writing, research, coding, and in-chat image help.",
    aliases: ["ai assistant", "assistant", "giga3 chat", "chat"],
  },
  {
    id: "academy",
    label: "GigaLearn Academy",
    href: "/gigalearn/academy/",
    hint: "Courses, enrolments, tutoring, assessments, and certificates.",
    aliases: ["gigalearn academy", "academy", "giga academy"],
  },
  {
    id: "exam-practice",
    label: "Exam Practice",
    href: "/gigalearn/exam/",
    hint: "BECE, Teacher Promotion, and subject practice.",
    aliases: ["exam practice", "bece practice", "teacher promotion"],
  },
  {
    id: "tech-hub",
    label: "Technology Learning Hub",
    href: "/gigalearn/academy/tech/",
    hint: "Interactive technology practice banks.",
    aliases: [
      "technology learning hub",
      "tech learning hub",
      "technology hub",
      "tech hub",
    ],
  },
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
    label: "GigaSocial",
    href: "/gigasocial/",
    hint: "GigaEdits is retired as a dedicated product — publish and share on GigaSocial.",
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
    label: "AI Assistant",
    href: "/chat/",
    hint: "Media Studio is retired as a dedicated product — generate and edit images in the AI Assistant.",
    aliases: ["media studio", "image studio", "image generator"],
  },
  {
    id: "video",
    label: "AI Assistant",
    href: "/chat/",
    hint: "Standalone Video AI is retired — ask the AI Assistant, or publish your own media on GigaSocial.",
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
- AI Assistant (chat, writing, research, coding, in-chat images): [Open AI Assistant](/chat/)
- GigaLearn Academy (courses, tutoring, certificates): [Open GigaLearn Academy](/gigalearn/academy/)
- Exam Practice (BECE, Teacher Promotion): [Open Exam Practice](/gigalearn/exam/)
- Technology Learning Hub: [Open Technology Learning Hub](/gigalearn/academy/tech/)
- GigaLearn (tutor, homework): [Open GigaLearn](/gigalearn/)
- GigaSocial (feed, stories, posts): [Open GigaSocial](/gigasocial/)
- Marketplace: [Open Marketplace](/marketplace/)
- Creator Studio (writing drafts): [Open Creator Studio](/creator-studio/)
- Discover: [Open Discover](/discover/)
- Pricing: [Open Pricing](/pricing/)
- Wallet: [Open GigaWallet](/wallet/)
- Prompt Library: [Open Prompt Library](/prompts/)
- Enterprise: [Open Enterprise](/enterprise/)
- Automation: [Open Automation](/automation/)
Do not route users to Media Studio, Video AI, GigaEdit, GigaEdits, or AI Studio as dedicated products — those entry points are retired. For image generation, keep the user in the AI Assistant. For publishing, use GigaSocial.
Do not claim you already opened the app. Keep a navigation-only reply to one short sentence plus the link.`;

export function findGiga3ChatProductByHref(
  rawHref: string
): Giga3ChatProduct | null {
  const path = normalizeProductPath(rawHref);
  if (!path) return null;
  // Legacy paths still resolve for markdown extraction from older replies.
  if (path === "/media/" || path.startsWith("/media/")) {
    return GIGA3_CHAT_PRODUCTS.find((product) => product.id === "media") ?? null;
  }
  if (path === "/video/" || path.startsWith("/video/")) {
    return GIGA3_CHAT_PRODUCTS.find((product) => product.id === "video") ?? null;
  }
  if (
    path === "/gigaedits/" ||
    path.startsWith("/gigaedits/") ||
    path === "/gigaedit/" ||
    path.startsWith("/gigaedit/")
  ) {
    return GIGA3_CHAT_PRODUCTS.find((product) => product.id === "gigaedit") ?? null;
  }
  if (path === "/ai-studio/" || path.startsWith("/ai-studio/")) {
    return GIGA3_CHAT_PRODUCTS.find((product) => product.id === "chat") ?? null;
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
