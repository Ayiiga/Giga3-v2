"use client";

import { Button } from "@/components/ui/Button";
import { getUserEmail, isValidEmail } from "@/lib/auth";
import { publicAuthErrorMessage } from "@/lib/auth/publicAuthError";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import {
  passwordRequirementsHint,
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/authPassword";
import { signInWithGoogle } from "@/lib/authGoogle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GoogleSignInButton, googleClientId } from "@/components/chat/GoogleSignInButton";
import { PasswordField } from "@/components/chat/PasswordField";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { siteConfig } from "@/lib/site";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

type AuthMode = "signin" | "signup" | "forgot";

function ChatLoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/chat";
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoringSession] = useState(() => hasPersistedAuth());
  const googleEnabled = Boolean(googleClientId());

  useEffect(() => {
    if (!hasPersistedAuth() && !getUserEmail()) return;
    router.replace(nextPath.startsWith("/") ? nextPath : "/chat");
  }, [router, nextPath]);

  if (restoringSession) {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 px-6 text-center">
        <BrandLogo size={40} />
        <p className="text-sm text-muted">Restoring your session…</p>
      </div>
    );
  }

  function goNext() {
    router.push(nextPath.startsWith("/") ? nextPath : "/chat");
  }

  async function handleGoogle(idToken: string) {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(idToken);
      goNext();
    } catch (err) {
      setError(publicAuthErrorMessage(err, "Google sign-in failed."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const normalized = email.trim().toLowerCase();

    try {
      if (mode === "forgot") {
        const resetBase = `${window.location.origin}/chat/login/reset`;
        const result = await requestPasswordReset(normalized, resetBase);
        if (result.deliveryConfigured === false) {
          setError(
            "We could not send email right now. Please try again later or contact support."
          );
        } else {
          setInfo(
            "If an account exists for this email, a reset link has been sent. Check inbox and spam. The link expires in 1 hour."
          );
        }
        return;
      }

      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        await signUpWithPassword(normalized, password);
      } else {
        await signInWithPassword(normalized, password);
      }

      goNext();
    } catch (err) {
      setError(publicAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="premium-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <BrandLogo size={48} className="shadow-none ring-0" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome to Giga3 AI
            </h1>
            <p className="mt-2 text-sm text-muted">
              {googleEnabled
                ? "Continue with Google, or use your email and password"
                : "Sign in or create an account with email and password"}
            </p>
            <VisionTagline className="mt-3" variant="subtle" />
          </div>
        </div>

        <div className="mb-6 flex rounded-xl border border-border bg-muted/30 p-1">
          {(
            [
              ["signin", "Sign in"],
              ["signup", "Sign up"],
              ["forgot", "Forgot password"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium sm:text-sm ${
                mode === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {googleEnabled && mode !== "forgot" && (
          <div className="mb-5">
            <GoogleSignInButton
              mode={mode}
              disabled={submitting}
              onCredential={(idToken) => void handleGoogle(idToken)}
              onError={(message) => setError(message)}
            />
            <div className="relative my-5 text-center">
              <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              <span className="relative bg-card px-2 text-xs text-muted">or</span>
            </div>
          </div>
        )}

        <form method="post" onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-surface"
              placeholder="you@example.com"
            />
          </div>

          {mode === "forgot" && (
            <p className="text-sm text-muted">
              Enter the email on your account. We will send a secure one-hour reset
              link to that address if the account exists.
            </p>
          )}

          {mode !== "forgot" && (
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="e.g. creat3more"
            />
          )}

          {mode === "signup" && (
            <p className="-mt-3 text-xs text-muted">{passwordRequirementsHint()}</p>
          )}

          {mode === "signup" && (
            <PasswordField
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              placeholder="Repeat password"
              toggleName="confirm password"
            />
          )}

          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          {info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-[1.7] text-muted">
          A product of {siteConfig.founder.organizationShort} · Founded by{" "}
          {siteConfig.founder.name}
        </p>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/pricing" className="text-accent hover:underline">
            View pricing
          </Link>
          {" · "}
          <Link href="/" className="text-accent hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ChatLoginForm() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <ChatLoginFormInner />
    </Suspense>
  );
}
