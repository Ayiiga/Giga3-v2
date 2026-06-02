export type PaymentProductType = "subscription" | "credits";

export interface PaymentProduct {
  id: string;
  label: string;
  description: string;
  amountGhs: number;
  type: PaymentProductType;
  credits?: number;
  highlighted?: boolean;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  amountGhs: number;
  label: string;
}

export interface VerifyPaymentResult {
  status: "success" | "failed";
  type?: PaymentProductType;
  creditsGranted?: number;
}
