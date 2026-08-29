/**
 * Seller file uploads remain disabled until a storage primitive can bind an
 * uploaded object to a server-owned intent. Do not replace this gate with
 * client-side feature flags.
 */
export function marketplaceUploadsEnabled(value = process.env.MARKETPLACE_UPLOADS_ENABLED): boolean {
  return value === "true";
}

export function assertMarketplaceUploadsEnabled(): void {
  if (!marketplaceUploadsEnabled()) {
    throw new Error(
      "Seller file uploads are not available yet. Existing Marketplace purchases and downloads are unchanged."
    );
  }
}

/** Contract for the future server-owned prepare → upload → finalize boundary. */
export interface MarketplaceUploadIntent {
  ownerId: string;
  listingId?: string;
  purpose: "product_file" | "cover_image";
  allowedContentTypes: readonly string[];
  maxBytes: number;
  expiresAt: number;
  status: "pending" | "uploaded" | "quarantined" | "scanning" | "approved" | "rejected";
}
