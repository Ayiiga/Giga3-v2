"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { useEffect } from "react";

function GigaSocialAutoChunkRecovery({ error }: { error: Error }) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    void recoverFromStaleChunks();
  }, [error]);

  return null;
}

export default function GigaSocialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  return (
    <>
      {chunkError ? <GigaSocialAutoChunkRecovery error={error} /> : null}
      <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">GigaSocial couldn&apos;t load</h2>
        <p className="mt-2 text-sm text-muted">{toUserFacingError(error)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {chunkError ? (
            <Button type="button" onClick={() => void recoverFromStaleChunks()}>
              Refresh app
            </Button>
          ) : (
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
          )}
          <ButtonLink href="/gigasocial/" variant="outline">
            Reload GigaSocial
          </ButtonLink>
          <ButtonLink href="/chat/" variant="ghost">
            Back to chat
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
