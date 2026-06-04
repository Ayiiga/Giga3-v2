import type { InitializePaymentResult } from "./types";

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
  runAction: (args: { reference: string }) => Promise<unknown>,
  reference: string
) {
  return runAction({ reference });
}

export function redirectToPaystack(authorizationUrl: string): void {
  window.location.href = authorizationUrl;
}

function toPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

export type OpenPaystackCheckoutOptions = {
  email: string;
  publicKey?: string | null;
  onSuccess: (reference: string) => void | Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
};

/**
 * Opens Paystack Inline popup when possible (access_code or public key),
 * otherwise falls back to full-page redirect.
 */
export async function openPaystackCheckout(
  init: InitializePaymentResult,
  options: OpenPaystackCheckoutOptions
): Promise<"popup" | "redirect"> {
  const { default: PaystackPop } = await import("@paystack/inline-js");
  const popup = new PaystackPop();

  const callbacks = {
    onSuccess: (transaction: { reference: string }) => {
      void options.onSuccess(transaction.reference);
    },
    onCancel: () => options.onCancel(),
    onError: (error: { message: string }) =>
      options.onError(error.message ?? "Paystack checkout error"),
  };

  if (init.accessCode?.trim()) {
    popup.resumeTransaction(init.accessCode.trim(), callbacks);
    return "popup";
  }

  const key = options.publicKey?.trim();
  if (key) {
    popup.newTransaction({
      key,
      email: options.email,
      amount: toPesewas(init.amountGhs),
      currency: "GHS",
      reference: init.reference,
      ...callbacks,
    });
    return "popup";
  }

  redirectToPaystack(init.authorizationUrl);
  return "redirect";
}
