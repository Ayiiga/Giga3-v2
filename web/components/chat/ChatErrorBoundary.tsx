"use client";

import { clearAllClientAuth } from "@/lib/auth";
import {
  logClientDiagnostic,
  toUserFacingError,
} from "@/lib/errors/userMessage";
import { Component, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

interface State {
  error: Error | null;
  sessionExpired: boolean;
}

function isUnauthorizedMessage(message: string): boolean {
  return (
    /UnauthorizedError/i.test(message) ||
    /\bUnauthorized\b/i.test(message) ||
    (/users:getChatCredits/i.test(message) && /Unauthorized/i.test(message)) ||
    /verifySessionToken|requireSession|verifyWithSecret/i.test(message)
  );
}

function friendlyMessage(message: string): string {
  if (isUnauthorizedMessage(message)) {
    return (
      "Your session expired or is no longer valid. Sign in again to continue chatting. " +
      "This can happen after an app update or if you have been signed out on another device."
    );
  }
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
    return "Chat is updating. Wait a moment, then refresh or sign in again.";
  }
  if (
    message.includes("exceeded the free plan limits") ||
    message.includes("deployments have been disabled")
  ) {
    return "Chat is temporarily limited. Refresh the page and try again shortly.";
  }
  if (message.includes("NEXT_PUBLIC_CONVEX_URL")) {
    return "Chat is temporarily unavailable. Please refresh and try again.";
  }
  return toUserFacingError(message);
}

export class ChatErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null, sessionExpired: false };

  static getDerivedStateFromError(error: Error): State {
    const raw = error?.message || "";
    return {
      error: error ?? new Error("Unknown error"),
      sessionExpired: isUnauthorizedMessage(raw),
    };
  }

  componentDidCatch(error: Error) {
    // Keep stacks / Request IDs in developer logs only — never in the UI.
    console.error("[ChatErrorBoundary]", error);
    logClientDiagnostic("chat_error_boundary", {
      name: error.name,
      message: error.message?.slice(0, 240),
    });
    if (isUnauthorizedMessage(error.message || "")) {
      clearAllClientAuth();
    }
  }

  render() {
    if (this.state.error) {
      const raw = this.state.error.message || "";
      const display = friendlyMessage(raw);
      const loginHref = "/chat/login/?next=/chat/";

      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {this.state.sessionExpired ? "Session expired" : "Chat could not load"}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted">{display}</p>
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3">
            {this.state.sessionExpired ? (
              <ButtonLink href={loginHref} variant="primary" size="md" className="w-full sm:col-span-2">
                Sign in again
              </ButtonLink>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => this.setState({ error: null, sessionExpired: false })}
              >
                Try again
              </Button>
            )}
            {!this.state.sessionExpired && (
              <ButtonLink href={loginHref} variant="outline" size="md" className="w-full">
                Sign in again
              </ButtonLink>
            )}
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
