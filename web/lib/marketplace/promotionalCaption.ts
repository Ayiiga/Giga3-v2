import { marketplaceItemUrl } from "@/lib/seo/publicPaths";
import { formatGhs } from "@/lib/marketplace/catalog";

export type PromoCaptionInput = {
  listingId: string;
  title: string;
  description: string;
  priceGhs: number;
  category?: string;
  productType?: string;
};

/**
 * Deterministic promotional caption from real product fields.
 * Includes the canonical public product URL. Not a social-network publish API.
 */
export function buildPromotionalCaption(input: PromoCaptionInput): string {
  const url = marketplaceItemUrl(input.listingId);
  const blurb = input.description.replace(/\s+/g, " ").trim().slice(0, 160);
  const typeLabel = (input.productType ?? "digital product").replace(/_/g, " ");
  const category = input.category?.trim();
  const lines = [
    `Now on Giga3 AI Marketplace: ${input.title}`,
    category ? `${category} · ${typeLabel}` : typeLabel,
    `${formatGhs(input.priceGhs)} — secure Paystack checkout in GHS.`,
    blurb,
    url,
  ];
  return lines.filter(Boolean).join("\n");
}

export type ShareChannel = "whatsapp" | "facebook" | "telegram" | "linkedin";

/** Build share destination URLs with correctly encoded title/text/url. */
export function buildShareDestination(
  channel: ShareChannel,
  input: { title: string; text: string; url: string }
): string {
  const { title, text, url } = input;
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    default:
      return url;
  }
}

/** Clipboard helper that works on HTTPS and common mobile browsers. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
