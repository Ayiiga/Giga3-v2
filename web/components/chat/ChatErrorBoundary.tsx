"use client";

import { Component, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

interface State {
  error: Error | null;
}

function friendlyMessage(message: string): string {
  if (message.includes("Could not find public function")) {
    return (
      "The chat backend is still updating. This usually means the latest Convex deploy " +
      "has not finished yet. Wait a minute, refresh, or sign in again. If it persists, " +
      "confirm GitHub Actions “Deploy Convex backend” succeeded."
    );
  }
  if (message.includes("NEXT_PUBLIC_CONVEX_URL")) {
    return "Chat is misconfigured: missing NEXT_PUBLIC_CONVEX_URL at build time. Rebuild with GitHub Actions or Cloudflare env set.";
  }
  return message;
}

export class ChatErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error ?? new Error("Unknown error") };
  }

  componentDidCatch(error: Error) {
    console.error("[ChatErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      const raw = this.state.error.message || "";
      const display = friendlyMessage(raw);

      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Chat could not load
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted">{display}</p>
          {raw && raw !== display && (
            <p className="max-w-md truncate text-xs text-muted/70" title={raw}>
              {raw.slice(0, 120)}
              {raw.length > 120 ? "…" : ""}
            </p>
          )}
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
            <Button type="button" variant="primary" size="md" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <ButtonLink href="/chat/login" variant="outline" size="md" className="w-full">
              Sign in again
            </ButtonLink>
            <ButtonLink href="/" variant="ghost" size="md" className="w-full">
              Home
            </ButtonLink>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
