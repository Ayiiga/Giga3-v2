/** Map Convex/media errors to user-facing copy. */
export function formatMediaError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (!raw || raw === "[object Object]") {
    return "Something went wrong. Please try again.";
  }
  if (raw.length < 280 && !raw.includes("ConvexError")) {
    return raw;
  }
  if (/Insufficient credits/i.test(raw)) return raw;
  return "Generation failed. Please try again in a moment.";
}
