"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { useEffect } from "react";

function GigaEditAutoChunkRecovery({ error }: { error: Error }) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    void recoverFromStaleChunks();
  }, [error]);

  return null;
}

export default function GigaEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  return (
    <>
      {chunkError ? <GigaEditAutoChunkRecovery error={error} /> : null}
      <div className="marketing-stable section-padding">
        <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">GigaEdit couldn&apos;t load</h1>
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
            <ButtonLink href="/gigaedit/" variant="outline">
              Reload GigaEdit
            </ButtonLink>
            <ButtonLink href="/gigaedits/" variant="ghost">
              About GigaEdit
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  );
}
