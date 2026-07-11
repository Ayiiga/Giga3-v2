import type { ComponentType } from "react";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";

type LoaderResult<P> = { default: ComponentType<P> };

/**
 * Wraps a dynamic import loader with stale-chunk recovery.
 * Use with next/dynamic — options must stay an object literal at the call site.
 */
export function withChunkRetryLoader<P = Record<string, never>>(
  loader: () => Promise<LoaderResult<P>>
): () => Promise<LoaderResult<P>> {
  return () =>
    loader().catch((err: unknown) => {
      if (isChunkLoadError(err)) {
        void recoverFromStaleChunks();
        return new Promise<LoaderResult<P>>(() => {
          /* page is reloading */
        });
      }
      throw err;
    });
}
