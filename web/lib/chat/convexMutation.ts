/**
 * HTTP Convex mutations with client-side timeout — reliable on 2G/3G where
 * websocket mutations often never ack.
 */

import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";

export function withClientTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function convexMutationWithTimeout<T>(
  path: string,
  args: Record<string, unknown>,
  options: { timeoutMs: number; timeoutMessage?: string }
): Promise<T> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    throw new Error("Chat backend is not configured.");
  }
  const msg =
    options.timeoutMessage ??
    "Could not reach the server on this connection. Check your signal and try again.";
  return withClientTimeout(
    convexHttpCall<T>(convexUrl, "mutation", path, args, {
      timeoutMs: options.timeoutMs,
      retries: 0,
    }),
    options.timeoutMs,
    msg
  );
}
