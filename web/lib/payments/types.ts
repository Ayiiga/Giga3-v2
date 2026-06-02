export type SubscriptionPlanId = "free" | "basic" | "pro" | "premium";

export interface PaymentProduct {
  id: string;
  label: string;
  description: string;
  amountGhs: number;
  type: "subscription" | "credits";
  credits?: number;
  planId?: SubscriptionPlanId;
  highlighted?: boolean;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  amountGhs: number;
  label: string;
}

export interface VerifyPaymentResult {
  status: "success";
  type?: "subscription" | "credits";
  planId?: string;
  creditsGranted?: number;
}
