"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
} from "./emailClient";
import { PUBLISH_CONFIRMATION_BODY } from "./marketplacePublishCopy";

function formatGhs(price: number): string {
  return `GHS ${Math.round(price)}`;
}

/** Best-effort Resend delivery — never throws into the publish path. */
export const sendPublishEmailInternal = internalAction({
  args: {
    listingId: v.id("marketplaceListings"),
    creatorEmail: v.string(),
    title: v.string(),
    priceGhs: v.number(),
    coverImageUrl: v.optional(v.string()),
    productPath: v.string(),
    promotePath: v.string(),
  },
  handler: async (_ctx, args): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (!isEmailDeliveryConfigured()) {
      return { ok: false, reason: "not_configured" };
    }

    const email = args.creatorEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, reason: "invalid_email" };
    }

    const base = getFrontendBaseUrl();
    const productUrl = `${base}${args.productPath.startsWith("/") ? "" : "/"}${args.productPath}`;
    const promoteUrl = `${base}${args.promotePath.startsWith("/") ? "" : "/"}${args.promotePath}`;
    const priceLabel = formatGhs(args.priceGhs);
    const coverHtml = args.coverImageUrl
      ? `<p><img src="${args.coverImageUrl.replace(/"/g, "&quot;")}" alt="" width="160" style="border-radius:12px;max-width:160px;height:auto;" /></p>`
      : "";

    try {
      const result = await sendEmail({
        to: email,
        subject: `Your product is live: ${args.title.slice(0, 80)}`,
        text: [
          PUBLISH_CONFIRMATION_BODY,
          "",
          `${args.title} · ${priceLabel}`,
          `View product: ${productUrl}`,
          `Promote: ${promoteUrl}`,
        ].join("\n"),
        html: `
          <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
            <p>${PUBLISH_CONFIRMATION_BODY}</p>
            ${coverHtml}
            <p><strong>${args.title.replace(/</g, "&lt;")}</strong><br/>${priceLabel}</p>
            <p>
              <a href="${productUrl}">View Product</a>
              &nbsp;·&nbsp;
              <a href="${promoteUrl}">Promote Product</a>
            </p>
          </div>
        `,
        tags: [
          { name: "kind", value: "marketplace_publish" },
          { name: "listing", value: String(args.listingId).slice(0, 40) },
        ],
      });
      return result.ok ? { ok: true } : { ok: false, reason: result.reason };
    } catch {
      return { ok: false, reason: "network_error" };
    }
  },
});
