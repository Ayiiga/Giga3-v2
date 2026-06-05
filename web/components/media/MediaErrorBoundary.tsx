"use client";

import { Component, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

interface State {
  error: Error | null;
}

export class MediaErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error ?? new Error("Media Studio failed to load") };
  }

  componentDidCatch(error: Error) {
    console.error("[MediaErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="saas-card mx-auto max-w-lg p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">Media Studio unavailable</h2>
          <p className="mt-3 text-base text-muted">
            Something went wrong loading the studio. Your credits and chat are safe — try again or
            return to chat.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="rounded-xl bg-btn-primary px-6 py-3 text-base font-semibold text-white shadow-btn-primary"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <ButtonLink href="/chat" variant="outline" size="md">
              Back to chat
            </ButtonLink>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
