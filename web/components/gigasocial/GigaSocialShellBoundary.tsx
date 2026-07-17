"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { Component, type ReactNode, useEffect } from "react";

function GigaSocialAutoChunkRecovery({ error }: { error: Error }) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    void recoverFromStaleChunks();
  }, [error]);

  return null;
}

export class GigaSocialShellBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[GigaSocialShellBoundary]", error);
  }

  render() {
    if (this.state.error) {
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <>
          {chunkError ? <GigaSocialAutoChunkRecovery error={this.state.error} /> : null}
          <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">GigaSocial couldn&apos;t load</h2>
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
    return this.props.children;
  }
}
