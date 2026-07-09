/** Retry with exponential backoff for network operations. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseMs?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseMs = options?.baseMs ?? 400;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

/** Prefetch a route for faster navigation. */
export function prefetchRoute(href: string): void {
  if (typeof window === "undefined") return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}
