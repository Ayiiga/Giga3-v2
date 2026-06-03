"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class MediaErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Media Studio]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="glass mx-auto max-w-lg rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">Media Studio unavailable</h2>
          <p className="mt-3 text-sm text-muted">
            Something went wrong loading this page. Your chat and other features are
            unaffected.
          </p>
          <p className="mt-4 rounded-lg bg-black/40 px-3 py-2 text-left text-xs text-red-300">
            {this.state.error.message || "Unknown error"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-white/5"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <ButtonLink href="/chat" variant="secondary" size="sm">
              Back to chat
            </ButtonLink>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
