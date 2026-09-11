"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { Component, type ReactNode, useEffect } from "react";

function GigaEditAutoChunkRecovery({ error }: { error: Error }) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    void recoverFromStaleChunks();
  }, [error]);

  return null;
}

export class GigaEditShellBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[GigaEditShellBoundary]", error);
  }

  render() {
    if (this.state.error) {
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <>
          {chunkError ? <GigaEditAutoChunkRecovery error={this.state.error} /> : null}
          <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">GigaEdit couldn&apos;t load</h2>
            <p className="mt-2 text-sm text-muted">{toUserFacingError(this.state.error)}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {chunkError ? (
                <Button type="button" onClick={() => void recoverFromStaleChunks()}>
                  Refresh app
                </Button>
              ) : (
                <Button type="button" onClick={() => this.setState({ error: null })}>
                  Try again
                </Button>
              )}
              <ButtonLink href="/gigaedit/" variant="outline">
                Reload GigaEdit
              </ButtonLink>
              <ButtonLink href="/gigasocial/" variant="ghost">
                Open GigaSocial
              </ButtonLink>
            </div>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}
