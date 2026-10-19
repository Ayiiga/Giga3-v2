"use client";

import { GoogleSignInButton, googleClientId } from "@/components/chat/GoogleSignInButton";
import { beginSocialOAuth, type SocialProvider } from "@/lib/authSocial";
import { getSessionToken } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import { useEffect, useState } from "react";

type LinkedState = {
  authenticated: boolean;
  providers: string[];
};

const OAUTH_PROVIDERS: { id: SocialProvider; label: string }[] = [
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
  { id: "github", label: "GitHub" },
];

/**
 * Explicit account-linking UI. Providers are never auto-merged by email alone.
 */
export function LinkedProvidersSettings() {
  const [linked, setLinked] = useState<LinkedState>({ authenticated: false, providers: [] });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleEnabled = Boolean(googleClientId());

  useEffect(() => {
    const token = getSessionToken();
    const convexUrl = getConvexUrl();
    if (!token || !convexUrl) return;
    void convexHttpCall<LinkedState>(
      convexUrl,
      "query",
      "socialAuth/status:listLinkedSocialProviders",
      { sessionToken: token },
      { timeoutMs: 15_000, retries: 1 }
    )
      .then(setLinked)
      .catch(() => setLinked({ authenticated: false, providers: [] }));
  }, []);

  async function linkOAuth(provider: SocialProvider) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { authorizeUrl } = await beginSocialOAuth(provider, "/settings/", true);
      window.location.assign(authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start linking.");
      setBusy(false);
    }
  }

  async function linkGoogle(idToken: string) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const convexUrl = getConvexUrl();
      const sessionToken = getSessionToken();
      if (!convexUrl || !sessionToken) throw new Error("Sign in required.");
      await convexHttpCall(
        convexUrl,
        "action",
        "googleAuthActions:linkGoogleIdentity",
        { sessionToken, idToken },
        { timeoutMs: 25_000, retries: 1 }
      );
      setInfo("Google linked to your account.");
      setLinked((prev) => ({
        ...prev,
        providers: prev.providers.includes("google")
          ? prev.providers
          : [...prev.providers, "google"],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link Google.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Linked sign-in providers</h2>
      <p className="mt-1 text-xs text-muted">
        Link Google, Apple, Microsoft, or GitHub after signing in. Matching email alone never
        merges accounts.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {info && <p className="mt-3 text-sm text-muted">{info}</p>}
      <ul className="mt-3 space-y-2">
        <li className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 text-sm">
          <span>Google {linked.providers.includes("google") ? "· linked" : ""}</span>
          {linked.providers.includes("google") ? (
            <span className="text-xs text-muted">Connected</span>
          ) : googleEnabled ? (
            <div className="max-w-[12rem]">
              <GoogleSignInButton
                mode="signin"
                disabled={busy}
                onCredential={(idToken) => void linkGoogle(idToken)}
                onError={setError}
              />
            </div>
          ) : (
            <span className="text-xs text-muted">Needs configuration</span>
          )}
        </li>
        {OAUTH_PROVIDERS.map((p) => (
          <li
            key={p.id}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 text-sm"
          >
            <span>
              {p.label} {linked.providers.includes(p.id) ? "· linked" : ""}
            </span>
            {linked.providers.includes(p.id) ? (
              <span className="text-xs text-muted">Connected</span>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void linkOAuth(p.id)}
                className="text-xs font-medium text-accent underline underline-offset-2 disabled:opacity-50"
              >
                Link
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
