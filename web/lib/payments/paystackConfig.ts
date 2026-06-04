/**
 * Paystack public key for Inline JS (popup checkout).
 * Prefer NEXT_PUBLIC_* at build time; Convex getClientConfig is the runtime fallback.
 */
export function getPaystackPublicKeyFromBuild(): string | undefined {
  const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim();
  return key || undefined;
}

export type PaystackClientMode = "live" | "test" | "unknown";

export function paystackModeFromPublicKey(publicKey: string): PaystackClientMode {
  if (publicKey.startsWith("pk_live_")) return "live";
  if (publicKey.startsWith("pk_test_")) return "test";
  return "unknown";
}
