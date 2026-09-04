/** Estimate reading time from plain text (words per minute). */
export function estimateReadingTime(text: string, wpm = 220): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / wpm));
  return `${minutes} min read`;
}
