import type { InitializePaymentResult, VerifyPaymentResult } from "./types";

/**
 * Client-side payment orchestration — delegates to Convex actions.
 * Keeps Paystack secrets off the browser.
 */
export async function initializePaystackPayment(
  runAction: (args: {
    userId: string;
    email: string;
    productId: string;
  }) => Promise<InitializePaymentResult>,
  args: { userId: string; email: string; productId: string }
): Promise<InitializePaymentResult> {
  return runAction(args);
}

export async function verifyPaystackPayment(
  runAction: (args: { reference: string }) => Promise<VerifyPaymentResult>,
  reference: string
): Promise<VerifyPaymentResult> {
  return runAction({ reference });
}

export function redirectToPaystack(authorizationUrl: string): void {
  window.location.href = authorizationUrl;
}
