import type { CREDIT_COSTS } from "@/lib/credits/constants";

export type ClientPaymentView = {
  reference: string;
  status: "pending" | "success" | "failed";
  type:
    | "subscription"
    | "credits"
    | "video_subscription"
    | "video_credits"
    | "marketplace";
  amountGhs: number;
  productId: string;
  planId?: "basic" | "pro" | "premium";
  creditsGranted?: number;
  videoCreditsGranted?: number;
  videoPlanId?: string;
  marketplaceListingId?: string;
  createdAt: number;
};

export type WalletBalances = {
  chatCredits: number;
  videoCredits: number;
  rewardPoints: number;
  rewardLevel: number;
  creatorEarningsGhs: number;
  creatorPendingPayoutGhs: number;
};

export type WalletSubscription = {
  planId: "free" | "basic" | "pro" | "premium";
  active: boolean;
  expiresAt: number | null;
  recordPlanId: string | null;
  starterCredits: number;
  dailyFreeCredits: number;
};

export type WalletVideoSubscription = {
  planId: string | null;
  active: boolean;
  expiresAt: number | null;
};

export type WalletCreatorSummary = {
  verified: boolean;
  verificationStatus: "none" | "pending" | "approved" | "rejected";
  recentSalesCount: number;
  withdrawalsEnabled: boolean;
};

export type WalletDashboard = {
  balances: WalletBalances;
  subscription: WalletSubscription;
  videoSubscription: WalletVideoSubscription;
  creditCosts: typeof CREDIT_COSTS;
  creator: WalletCreatorSummary | null;
  paymentProvider: "paystack";
};

export type WalletTransaction = {
  id: string;
  createdAt: number;
  category: "chat_credits" | "video_credits" | "payment";
  type: string;
  amount: number;
  amountUnit: "credits" | "ghs" | "video_credits";
  status: "completed" | "pending" | "failed";
  description: string;
  referenceId?: string;
  balanceAfter?: number;
};

export type WalletTab = "overview" | "subscription" | "billing" | "usage";
