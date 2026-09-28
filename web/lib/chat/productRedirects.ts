import {
  findGiga3ChatProductByHref,
  GIGA3_CHAT_PRODUCTS,
  type Giga3ChatProduct,
} from "../../../convex/giga3Products";

export type ProductRedirectKind = "navigate" | "suggest";

export type ProductRedirectMatch = {
  product: Giga3ChatProduct;
  kind: ProductRedirectKind;
};

const MAX_INTENT_LENGTH = 160;

const NAVIGATE_PREFIX =
  /^(please\s+)?((can|could|would)\s+you\s+)?(open|launch|visit|go\s+to|take\s+me\s+to|redirect(\s+me)?\s+to|switch\s+to|show\s+me)\s+/i;

const SUGGEST_PREFIX =
  /^(where\s+(is|can\s+i\s+find)|how\s+(do|can)\s+i\s+(open|get\s+to|access|find)|i\s+(want|need|would\s+like)\s+to\s+(open|use|go\s+to))\s+/i;

const COMPLEX_TASK =
  /\b(and then|also write|draft|essay|code|explain how|help me (write|solve|draft|plan)|step by step)\b/i;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.!?…]+$/g, "").trim();
}

function findProductByAlias(text: string): Giga3ChatProduct | null {
  let best: Giga3ChatProduct | null = null;
  let bestLen = 0;
  for (const product of GIGA3_CHAT_PRODUCTS) {
    for (const alias of product.aliases) {
      if (alias.length > bestLen && text.includes(alias)) {
        best = product;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

function isBareProductName(text: string): Giga3ChatProduct | null {
  for (const product of GIGA3_CHAT_PRODUCTS) {
    for (const alias of product.aliases) {
      if (text === alias) return product;
    }
  }
  return null;
}

function matchTaskShortcut(text: string): Giga3ChatProduct | null {
  if (
    /\b(generate|create|make)\b/.test(text) &&
    /\b(an? )?(image|photo|picture|poster|thumbnail|logo)\b/.test(text)
  ) {
    return GIGA3_CHAT_PRODUCTS.find((p) => p.id === "media") ?? null;
  }
  if (
    /\b(generate|create|make)\b/.test(text) &&
    /\b(an? )?(video|clip|reel)\b/.test(text)
  ) {
    return GIGA3_CHAT_PRODUCTS.find((p) => p.id === "video") ?? null;
  }
  if (/\b(edit|trim|join|caption)\b/.test(text) && /\b(video|photo|clip)\b/.test(text)) {
    return GIGA3_CHAT_PRODUCTS.find((p) => p.id === "gigaedit") ?? null;
  }
  if (
    /\b(post|share|publish)\b/.test(text) &&
    /\b(on|to)\b/.test(text) &&
    /\b(giga\s*social|social(\s+(hub|feed|app))?)\b/.test(text)
  ) {
    return GIGA3_CHAT_PRODUCTS.find((p) => p.id === "gigasocial") ?? null;
  }
  return null;
}

/** True when the message is primarily asking to open another Giga3 app. */
export function matchProductRedirectIntent(raw: string): ProductRedirectMatch | null {
  const text = normalize(raw);
  if (!text || text.length > MAX_INTENT_LENGTH) return null;
  if (COMPLEX_TASK.test(text)) return null;

  const cleaned = stripTrailingPunctuation(text);

  const navigateRest = cleaned.match(NAVIGATE_PREFIX);
  if (navigateRest) {
    const rest = cleaned.slice(navigateRest[0].length).trim();
    const product = findProductByAlias(rest) ?? isBareProductName(rest);
    if (product) return { product, kind: "navigate" };
  }

  const suggestRest = cleaned.match(SUGGEST_PREFIX);
  if (suggestRest) {
    const rest = cleaned.slice(suggestRest[0].length).trim();
    const product = findProductByAlias(rest) ?? isBareProductName(rest);
    if (product) return { product, kind: "suggest" };
  }

  const bare = isBareProductName(cleaned);
  if (bare) return { product: bare, kind: "navigate" };

  const task = matchTaskShortcut(cleaned);
  if (task) return { product: task, kind: "suggest" };

  return null;
}

export function buildProductRedirectAnswer(match: ProductRedirectMatch): string {
  const { product, kind } = match;
  const link = `[Open ${product.label}](${product.href})`;
  if (kind === "navigate") {
    return `Opening **${product.label}** — ${product.hint}\n\n${link}`;
  }
  return `**${product.label}** is the right place for that. ${product.hint}\n\n${link}`;
}

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Unique products linked in an assistant reply (markdown or bare paths). */
export function extractProductRedirectsFromText(content: string): Giga3ChatProduct[] {
  if (!content) return [];
  const found = new Map<string, Giga3ChatProduct>();

  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const product = findGiga3ChatProductByHref(match[2]);
    if (product) found.set(product.id, product);
  }

  for (const product of GIGA3_CHAT_PRODUCTS) {
    const path = product.href;
    const bare = path.replace(/\/$/, "");
    if (content.includes(path) || content.includes(bare)) {
      found.set(product.id, product);
    }
  }

  return GIGA3_CHAT_PRODUCTS.filter((product) => found.has(product.id));
}

export function isInternalGiga3Href(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("/")) return true;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    return host === "giga3ai.com";
  } catch {
    return false;
  }
}
