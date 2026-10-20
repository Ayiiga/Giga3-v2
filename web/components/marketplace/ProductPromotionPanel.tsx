"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { formatGhs } from "@/lib/marketplace/catalog";
import {
  buildPromotionalCaption,
  buildShareDestination,
  copyTextToClipboard,
  type ShareChannel,
} from "@/lib/marketplace/promotionalCaption";
import { marketplaceItemUrl } from "@/lib/seo/publicPaths";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  BarChart3,
  Copy,
  Download,
  Facebook,
  Linkedin,
  MessageCircle,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";

export type PromotionListing = {
  _id: Id<"marketplaceListings">;
  title: string;
  description: string;
  priceGhs: number;
  category?: string;
  productType?: string;
  coverImageUrl?: string | null;
  status: string;
  viewCount?: number;
  promoClickCount?: number;
  previewOpenCount?: number;
  purchaseCount?: number;
};

type ProductPromotionPanelProps = {
  listing: PromotionListing;
  /** Show compact analytics strip when engagement counters exist. */
  showAnalytics?: boolean;
};

const SHARE_BUTTONS: Array<{
  channel: ShareChannel;
  label: string;
  Icon: typeof MessageCircle;
}> = [
  { channel: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { channel: "facebook", label: "Facebook", Icon: Facebook },
  { channel: "telegram", label: "Telegram", Icon: Send },
  { channel: "linkedin", label: "LinkedIn", Icon: Linkedin },
];

export function ProductPromotionPanel({
  listing,
  showAnalytics = true,
}: ProductPromotionPanelProps) {
  const recordPromoClick = useMutation(api.marketplace.recordPromoClick);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  const productUrl = useMemo(() => marketplaceItemUrl(listing._id), [listing._id]);
  const baseCaption = useMemo(
    () =>
      buildPromotionalCaption({
        listingId: listing._id,
        title: listing.title,
        description: listing.description,
        priceGhs: listing.priceGhs,
        category: listing.category,
        productType: listing.productType,
      }),
    [listing]
  );

  async function track(channel: ShareChannel | "copy" | "other") {
    const sessionToken = getSessionToken() ?? undefined;
    try {
      await recordPromoClick({
        listingId: listing._id,
        channel: channel === "copy" ? "copy" : channel,
        sessionToken,
      });
    } catch {
      /* analytics must not block share UX */
    }
  }

  async function handleCopyLink() {
    setError(null);
    const ok = await copyTextToClipboard(productUrl);
    if (ok) {
      setFeedback("Product link copied.");
      void track("copy");
    } else {
      setError("Could not copy link. Long-press the link to copy manually.");
    }
  }

  async function handleCopyCaption() {
    setError(null);
    const text = caption ?? baseCaption;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setFeedback("Promotional caption copied.");
      void track("copy");
    } else {
      setError("Could not copy caption.");
    }
  }

  function handleGenerateCaption() {
    const next = buildPromotionalCaption({
      listingId: listing._id,
      title: listing.title,
      description: listing.description,
      priceGhs: listing.priceGhs,
      category: listing.category,
      productType: listing.productType,
    });
    setCaption(next);
    setFeedback("Caption generated from your product details.");
  }

  function openShare(channel: ShareChannel) {
    const text = caption ?? baseCaption;
    const dest = buildShareDestination(channel, {
      title: listing.title,
      text,
      url: productUrl,
    });
    void track(channel);
    window.open(dest, "_blank", "noopener,noreferrer");
  }

  async function handleDownloadCover() {
    if (!listing.coverImageUrl) {
      setError("No cover image available to download.");
      return;
    }
    setError(null);
    try {
      const res = await fetch(listing.coverImageUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${listing.title.replace(/[^\w.-]+/g, "-").slice(0, 60) || "cover"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setFeedback("Cover download started.");
      void track("other");
    } catch {
      // Cross-origin storage may block blob download — open in a new tab instead.
      window.open(listing.coverImageUrl, "_blank", "noopener,noreferrer");
      setFeedback("Opened cover in a new tab (direct download blocked by the host).");
    }
  }

  if (listing.status !== "published") {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted">
        Publish this listing to unlock the public product link and promotion tools.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-violet-200/70 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Promote product</h4>
          <p className="mt-0.5 text-xs text-muted">
            Share the public link. Giga3 does not post to social networks for you.
          </p>
        </div>
        <ButtonLink href={`/marketplace/item/${listing._id}/`} size="sm" variant="secondary">
          View product
        </ButtonLink>
      </div>

      <p className="break-all rounded-lg border border-border bg-card px-3 py-2 text-xs">
        {productUrl}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopyLink()}>
          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Copy link
        </Button>
        {SHARE_BUTTONS.map(({ channel, label, Icon }) => (
          <Button
            key={channel}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => openShare(channel)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void handleDownloadCover()}
          disabled={!listing.coverImageUrl}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Cover
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleGenerateCaption}>
          Generate caption
        </Button>
        {caption ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => void handleCopyCaption()}>
            Copy caption
          </Button>
        ) : null}
      </div>

      {caption ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs leading-relaxed">
          {caption}
        </pre>
      ) : null}

      {showAnalytics ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Analytics
          </span>
          <span>{listing.viewCount ?? 0} visits</span>
          <span>{listing.promoClickCount ?? 0} promo clicks</span>
          <span>{listing.previewOpenCount ?? 0} previews</span>
          <span>
            {listing.purchaseCount ?? 0} sales · {formatGhs(listing.priceGhs)} each
          </span>
        </div>
      ) : null}

      {feedback ? <p className="text-xs text-emerald-700 dark:text-emerald-400">{feedback}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
