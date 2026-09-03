/** Map Convex/media errors to user-facing copy. */
export function formatMediaError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (!raw || raw === "[object Object]") {
    return "Something went wrong. Please try again.";
  }
  if (raw.length < 280 && !raw.includes("ConvexError")) {
    return raw;
  }
  if (/Insufficient credits/i.test(raw)) return "Insufficient credits. Buy credits or subscribe, then try again.";
  if (/Session expired|Unauthorized|sign in/i.test(raw)) {
    return "Session expired. Please sign in again.";
  }
  if (/not configured/i.test(raw)) {
    return "Learning service is not configured yet. Please try again later.";
  }
  if (/Daily GigaLearn/i.test(raw)) {
    return "Daily GigaLearn generation limit reached. Try again tomorrow.";
  }
  return "Generation failed. Please try again in a moment.";
}
