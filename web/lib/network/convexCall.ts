/** Client-side Convex HTTP calls with timeout + retry for high-latency networks. */

const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 1;

function isRetryableNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("network") ||
    msg.includes("aborted") ||
    msg.includes("timeout") ||
    msg.includes("Load failed")
  );
}

export async function convexHttpCall<T>(
  baseUrl: string,
  endpoint: "query" | "mutation" | "action",
  path: string,
  args: Record<string, unknown>,
  options?: { timeoutMs?: number; retries?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? MAX_RETRIES;
  const url = `${baseUrl.replace(/\/$/, "")}/api/${endpoint}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, args, format: "json" }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.status === "error") {
        throw new Error(data.errorMessage || "Convex request failed");
      }
      return data.value as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries && isRetryableNetworkError(err)) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      if (controller.signal.aborted) {
        throw new Error(
          "Request timed out. On slower mobile networks, wait a moment and try again — your message may still be processing."
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
