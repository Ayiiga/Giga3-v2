"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { isProductionFlagEnabled } from "@/lib/productionFlags";

/**
 * App-shell error boundary for authenticated surfaces (chat, wallet, etc.).
 * Mirrors marketing error UX — no layout shift, no sensitive detail leakage.
 */
export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);
  const showOfflineHint =
    isProductionFlagEnabled("offlineRecoveryHints") &&
    typeof navigator !== "undefined" &&
    !navigator.onLine;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        {toUserFacingError(error)}
      </p>
      {showOfflineHint ? (
        <p className="max-w-md text-xs text-muted">
          You appear to be offline. Reconnect and try again — your local data is preserved.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {chunkError ? (
          <Button type="button" onClick={() => void recoverFromStaleChunks()}>
            Refresh app
          </Button>
        ) : (
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        )}
        <ButtonLink href="/" variant="ghost">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
