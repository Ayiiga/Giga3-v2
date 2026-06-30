import type { InitializePaymentResult } from "./types";

let paystackModulePromise: Promise<typeof import("@paystack/inline-js")> | null =
  null;
let checkoutInFlight = false;

/** Warm up Paystack Inline on billing pages for faster popup open. */
export function preloadPaystackInline(): void {
  if (typeof window === "undefined") return;
  if (!paystackModulePromise) {
    paystackModulePromise = import("@paystack/inline-js");
  }
}

async function getPaystackPop() {
  if (!paystackModulePromise) {
    paystackModulePromise = import("@paystack/inline-js");
  }
  const mod = await paystackModulePromise;
  return new mod.default();
}

export async function initializePaystackPayment(
  runAction: (args: {
    sessionToken: string;
    productId: string;
  }) => Promise<InitializePaymentResult>,
  args: { sessionToken: string; productId: string }
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
  if (!authorizationUrl?.trim()) {
    throw new Error("Paystack redirect URL missing");
  }
  window.location.href = authorizationUrl;
}

function toPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

export type OpenPaystackCheckoutOptions = {
  email: string;
  publicKey?: string | null;
  onPopupReady?: () => void;
  onSuccess: (reference: string) => void | Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
};

const POPUP_LOAD_TIMEOUT_MS = 12_000;

/**
 * Opens Paystack Inline popup when possible, with automatic redirect fallback.
 */
export async function openPaystackCheckout(
  init: InitializePaymentResult,
  options: OpenPaystackCheckoutOptions
): Promise<"popup" | "redirect"> {
  if (checkoutInFlight) {
    throw new Error("A checkout is already in progress.");
  }

  const authUrl = init.authorizationUrl?.trim();
  if (!authUrl) {
    throw new Error("Paystack checkout URL missing. Please try again.");
  }

  checkoutInFlight = true;

  const release = () => {
    checkoutInFlight = false;
  };

  const fallbackRedirect = (reason?: string) => {
    release();
    if (reason) {
      console.warn("[paystack] redirect fallback:", reason);
    }
    redirectToPaystack(authUrl);
  };

  try {
    const popup = await getPaystackPop();
    let settled = false;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (loadTimer) clearTimeout(loadTimer);
      release();
    };

    const callbacks = {
      onLoad: () => {
        if (loadTimer) clearTimeout(loadTimer);
        options.onPopupReady?.();
      },
      onSuccess: (transaction: { reference: string }) => {
        settled = true;
        finish();
        const ref = transaction.reference?.trim() || init.reference;
        void options.onSuccess(ref);
      },
      onCancel: () => {
        settled = true;
        finish();
        options.onCancel();
      },
      onError: (error: { message: string }) => {
        settled = true;
        finish();
        const msg = error.message ?? "Paystack checkout error";
        if (authUrl) {
          fallbackRedirect(msg);
          return;
        }
        options.onError(msg);
      },
    };

    loadTimer = setTimeout(() => {
      if (!settled) {
        fallbackRedirect("popup load timeout");
      }
    }, POPUP_LOAD_TIMEOUT_MS);

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

    finish();
    redirectToPaystack(authUrl);
    return "redirect";
  } catch (e) {
    release();
    if (authUrl) {
      fallbackRedirect(e instanceof Error ? e.message : "popup failed");
      return "redirect";
    }
    throw e;
  }
}

/** Reset in-flight guard (e.g. after navigation). */
export function resetPaystackCheckoutGuard(): void {
  checkoutInFlight = false;
}
