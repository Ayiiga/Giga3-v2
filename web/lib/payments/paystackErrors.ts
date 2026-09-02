/**
 * Convex wraps thrown server errors as
 * "[CONVEX A(paystack:initializePayment)] [Request ID: …] Server Error\nUncaught Error: <msg>\n  at …".
 * Pull out <msg> so users see the real reason instead of a generic fallback.
 */
export function unwrapConvexErrorMessage(raw: string): string {
  const uncaught = raw.match(/Uncaught (?:Error|ConvexError): ([^\n]+)/);
  if (uncaught?.[1]) return uncaught[1].trim();

  const stripped = raw
    .replace(/\[CONVEX [^\]]*\]\s*/g, "")
    .replace(/\[Request ID: [^\]]*\]\s*/g, "")
    .replace(/^Server Error\s*/i, "")
    .split("\n")[0]
    .trim();
  return stripped || raw;
}

/** Maps Paystack / network errors to short, user-friendly copy. */
export function friendlyPaystackError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!raw) return "Payment could not be started. Please try again.";

  const message = unwrapConvexErrorMessage(raw);
  const lower = message.toLowerCase();

  if (lower.includes("sign in")) return message;
  if (lower.includes("paystack_secret") || lower.includes("not configured")) {
    return "Payments are temporarily unavailable. Please try again later.";
  }
  if (lower.includes("unknown product")) {
    return "This product is not available. Refresh the page and try again.";
  }
  if (lower.includes("valid email")) {
    return "Add a valid email to your account before checking out.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  if (lower.includes("cancel")) return "Payment cancelled.";
  if (lower.includes("duplicate") || lower.includes("reference")) {
    return "Please wait a moment and try again.";
  }

  return message.length > 160 ? "Payment failed. Please try again." : message;
}
