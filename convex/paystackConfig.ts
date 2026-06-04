/** Paystack environment helpers — mode is determined by secret key prefix. */

export type PaystackMode = "live" | "test" | "missing";

export function getPaystackSecret(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || undefined;
}

export function getPaystackMode(): PaystackMode {
  const key = getPaystackSecret();
  if (!key) return "missing";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "test";
}

/** When true, block initialize if secret is test but FRONTEND_URL looks production. */
export function assertPaystackProductionReady(): void {
  const mode = getPaystackMode();
  if (mode === "missing") {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const requireLive = process.env.PAYSTACK_REQUIRE_LIVE === "true";
  const frontend = process.env.FRONTEND_URL ?? "";
  const productionHost =
    /giga3ai\.com/i.test(frontend) && !/localhost|127\.0\.0\.1/i.test(frontend);

  if (requireLive && mode !== "live") {
    throw new Error(
      "PAYSTACK_REQUIRE_LIVE is set but PAYSTACK_SECRET_KEY is not a live key (sk_live_…)"
    );
  }

  if (productionHost && mode === "test") {
    console.warn(
      "[paystack] Test secret key (sk_test_) with production FRONTEND_URL — payments are in test mode. Set sk_live_ for real charges."
    );
  }
}

export function parsePaystackAmountPesewas(paystackResponse: string): number | null {
  try {
    const parsed = JSON.parse(paystackResponse) as {
      amount?: number;
      data?: { amount?: number };
    };
    if (typeof parsed.amount === "number") return parsed.amount;
    if (typeof parsed.data?.amount === "number") return parsed.data.amount;
    return null;
  } catch {
    return null;
  }
}
