"use client";

import { Component, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

interface State {
  error: Error | null;
}

function friendlyMessage(message: string): string {
  if (
    /Loading chunk [\d]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  ) {
    return (
      "The app was updated in the background. Please refresh the page to load the latest version. " +
      "If this continues, clear your browser cache or reinstall the PWA."
    );
  }
  if (message.includes("is not defined") || message.includes("ReferenceError")) {
    return (
      "Chat hit a temporary loading error. Please refresh the page. " +
      "If this continues, clear your browser cache or reinstall the PWA."
    );
  }
  if (message.includes("Could not find public function")) {
    return (
      "The chat backend is still updating. This usually means the latest Convex deploy " +
      "has not finished yet. Wait a minute, refresh, or sign in again. If it persists, " +
      "confirm GitHub Actions “Deploy Convex backend” succeeded."
    );
  }
  if (
    message.includes("exceeded the free plan limits") ||
    message.includes("deployments have been disabled")
  ) {
    return (
      "Giga3 is running on Supabase for chat history and profile data. AI replies may be " +
      "limited until Convex billing is restored. Refresh the page — chat should still open."
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
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-6 text-center">
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
