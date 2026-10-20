"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { clearAllClientAuth } from "@/lib/auth";
import { logClientDiagnostic } from "@/lib/errors/userMessage";
import { Component, type ReactNode } from "react";

type State = {
  error: Error | null;
  sessionExpired: boolean;
};

function isUnauthorizedMessage(message: string): boolean {
  return (
    /UnauthorizedError/i.test(message) ||
    /\bUnauthorized\b/i.test(message) ||
    /verifySessionToken|requireSession|verifyWithSecret/i.test(message)
  );
}

/**
 * Catches Convex useQuery Unauthorized throws so marketing/product shells do not
 * fall through to the generic "Something went wrong" page. Clears the bad token
 * and offers sign-in. Non-auth errors are re-thrown to the nearest parent boundary.
 */
export class SessionQueryErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, sessionExpired: false };

  static getDerivedStateFromError(error: Error): State {
    const raw = error?.message || "";
    return {
      error: error ?? new Error("Unknown error"),
      sessionExpired: isUnauthorizedMessage(raw),
    };
  }

  componentDidCatch(error: Error) {
    console.error("[SessionQueryErrorBoundary]", error);
    logClientDiagnostic("session_query_error_boundary", {
      name: error.name,
      message: error.message?.slice(0, 240),
    });
    if (isUnauthorizedMessage(error.message || "")) {
      clearAllClientAuth();
    }
  }

  render() {
    if (this.state.error && !this.state.sessionExpired) {
      throw this.state.error;
    }
    if (this.state.error && this.state.sessionExpired) {
      const next =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      const loginHref = `/chat/login/?next=${encodeURIComponent(next || "/")}`;
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">Session expired</h2>
          <p className="max-w-md text-sm text-muted">
            Your sign-in is no longer valid. Sign in again to continue — this can happen after an
            app update or if you signed out on another device.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={loginHref} variant="primary">
              Sign in again
            </ButtonLink>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearAllClientAuth();
                this.setState({ error: null, sessionExpired: false });
              }}
            >
              Continue signed out
            </Button>
            <ButtonLink href="/" variant="ghost">
              Home
            </ButtonLink>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
