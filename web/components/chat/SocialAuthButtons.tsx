"use client";

import { beginSocialOAuth, type SocialProvider } from "@/lib/authSocial";
import { useState } from "react";

const PROVIDERS: { id: SocialProvider; label: string }[] = [
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
  { id: "github", label: "GitHub" },
];

type SocialAuthButtonsProps = {
  mode: "signin" | "signup";
  disabled?: boolean;
  returnPath?: string;
  onError: (message: string) => void;
};

/**
 * Redirect-based social login buttons (Apple / Microsoft / GitHub).
 * Google remains on Google Identity Services (separate component).
 */
export function SocialAuthButtons({
  mode,
  disabled = false,
  returnPath = "/chat/",
  onError,
}: SocialAuthButtonsProps) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  async function start(provider: SocialProvider) {
    if (disabled || busy) return;
    setBusy(provider);
    try {
      const { authorizeUrl } = await beginSocialOAuth(provider, returnPath, false);
      if (!authorizeUrl) {
        onError(`${provider} sign-in is not available right now.`);
        return;
      }
      window.location.assign(authorizeUrl);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : `${provider} sign-in failed. Use email and password.`
      );
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-2" data-social-auth={mode}>
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void start(p.id)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent/5 disabled:opacity-60"
        >
          {busy === p.id
            ? "Redirecting…"
            : mode === "signup"
              ? `Sign up with ${p.label}`
              : `Continue with ${p.label}`}
        </button>
      ))}
    </div>
  );
}
