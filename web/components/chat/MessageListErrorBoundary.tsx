"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type State = { error: Error | null };

/** Isolates message list / streaming failures from the full chat shell. */
export class MessageListErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[MessageListErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted">
            Part of this conversation could not be displayed. Your messages are saved — try
            refreshing or sending again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            Retry display
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
