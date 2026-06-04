/** Maps Paystack / network errors to short, user-friendly copy. */
export function friendlyPaystackError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  const lower = raw.toLowerCase();

  if (!raw) return "Payment could not be started. Please try again.";
  if (lower.includes("sign in")) return raw;
  if (lower.includes("paystack_secret") || lower.includes("not configured")) {
    return "Payments are temporarily unavailable. Please try again later.";
  }
  if (lower.includes("unknown product")) {
    return "This product is not available. Refresh the page and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  if (lower.includes("cancel")) return "Payment cancelled.";
  if (lower.includes("duplicate") || lower.includes("reference")) {
    return "Please wait a moment and try again.";
  }

  return raw.length > 120 ? "Payment failed. Please try again." : raw;
}
