"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

interface State {
  error: Error | null;
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
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Chat could not load
          </h1>
          <p className="max-w-md text-sm text-muted">
            {this.state.error.message ||
              "A client error occurred. Try signing in again."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/chat/login"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Sign in again
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted"
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
