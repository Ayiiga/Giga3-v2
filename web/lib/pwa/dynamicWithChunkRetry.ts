import type { ComponentType, ReactNode } from "react";
import dynamic, { type DynamicOptionsLoadingProps } from "next/dynamic";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";

type LoaderResult<P> = { default: ComponentType<P> };

/**
 * next/dynamic wrapper that auto-recovers when a stale JS chunk fails after deploy.
 */
export function dynamicWithChunkRetry<P = Record<string, never>>(
  loader: () => Promise<LoaderResult<P>>,
  options?: {
    ssr?: boolean;
    loading?: (props: DynamicOptionsLoadingProps) => ReactNode;
  }
) {
  return dynamic(
    () =>
      loader().catch((err: unknown) => {
        if (isChunkLoadError(err)) {
          void recoverFromStaleChunks();
          return new Promise<LoaderResult<P>>(() => {
            /* page is reloading */
          });
        }
        throw err;
      }),
    options
  );
}
