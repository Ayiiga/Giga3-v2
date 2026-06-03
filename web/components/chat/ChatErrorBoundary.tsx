"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

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
    return { error };
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
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Try again
            </button>
            <Link
              href="/chat/login"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Sign in again
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
