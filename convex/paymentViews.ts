import type { Doc } from "./_generated/dataModel";

/** Client-safe payment fields — excludes PII and raw Paystack payloads. */
export type ClientPaymentView = {
  reference: string;
  status: "pending" | "success" | "failed";
  type:
    | "subscription"
    | "credits"
    | "video_subscription"
    | "video_credits"
    | "marketplace"
    | "creator_gift"
    | "boost_campaign";
  amountGhs: number;
  productId: string;
  planId?: "basic" | "pro" | "premium";
  creditsGranted?: number;
  videoCreditsGranted?: number;
  videoPlanId?: string;
  marketplaceListingId?: string;
  createdAt: number;
};

export function toClientPaymentView(
  record: Doc<"payments">
): ClientPaymentView {
  return {
    reference: record.reference,
    status: record.status,
    type: record.type,
    amountGhs: record.amountGhs,
    productId: record.productId,
    planId: record.planId,
    creditsGranted: record.creditsGranted,
    videoCreditsGranted: record.videoCreditsGranted,
    videoPlanId: record.videoPlanId,
    marketplaceListingId: record.marketplaceListingId,
    createdAt: record.createdAt,
  };
}
