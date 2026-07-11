"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface State {
  error: Error | null;
}

export class GigaSocialPanelErrorBoundary extends Component<
  { children: ReactNode; panelName?: string },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error: error ?? new Error("GigaSocial panel failed to load") };
  }

  componentDidCatch(error: Error) {
    console.error("[GigaSocialPanelErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      const label = this.props.panelName ?? "This section";
      return (
        <div className="saas-card rounded-2xl border border-border p-6 text-center">
          <h3 className="text-base font-semibold text-foreground">{label} unavailable</h3>
          <p className="mt-2 text-sm text-muted">
            Something went wrong loading this panel. Other GigaSocial tabs should still work.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-11"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
