/**
 * Shared timeout / retry / in-flight dedupe helpers for flaky mobile networks.
 * Does not change existing Convex call paths — opt-in from new callers.
 */

export type SafeAsyncOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** Return true to retry this error (default: network-ish failures). */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
};

export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function isRetryableTransientError(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("network") ||
    msg.includes("aborted") ||
    msg.includes("timeout") ||
    msg.includes("Load failed") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("429")
  );
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Run an async fn with timeout and exponential backoff retries. */
export async function withSafeAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: SafeAsyncOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const retries = Math.max(0, options.retries ?? 1);
  const baseDelay = options.retryDelayMs ?? 600;
  const shouldRetry = options.shouldRetry ?? isRetryableTransientError;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onOuterAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new TimeoutError()), timeoutMs);

    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = err instanceof DOMException && err.name === "AbortError"
        ? new TimeoutError()
        : err;
      const canRetry = attempt < retries && shouldRetry(lastError, attempt);
      if (!canRetry) throw lastError;
      await delay(baseDelay * (attempt + 1), options.signal);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onOuterAbort);
    }
  }
  throw lastError;
}

/** Prevent duplicate in-flight work for the same key (e.g. double-tap submit). */
export function createInFlightDeduper<T>() {
  const inflight = new Map<string, Promise<T>>();

  return {
    run(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key);
      if (existing) return existing;
      const promise = fn().finally(() => {
        if (inflight.get(key) === promise) inflight.delete(key);
      });
      inflight.set(key, promise);
      return promise;
    },
    has(key: string): boolean {
      return inflight.has(key);
    },
    clear(): void {
      inflight.clear();
    },
  };
}
