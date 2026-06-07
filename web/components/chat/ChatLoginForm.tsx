"use client";

import { Button } from "@/components/ui/Button";
import { getUserEmail, isValidEmail, setUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import {
  signInWithSupabaseOtp,
  syncSupabaseAuthToLocalEmail,
} from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { siteConfig } from "@/lib/site";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function ChatLoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/chat";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const usingSupabase = isSupabaseDataBackend();

  useEffect(() => {
    if (usingSupabase && isSupabaseConfigured()) {
      void syncSupabaseAuthToLocalEmail()
        .then((syncedEmail) => {
          if (syncedEmail) router.replace(nextPath.startsWith("/") ? nextPath : "/chat");
        })
        .catch(() => null);
    }
    const existing = getUserEmail();
    if (existing) router.replace(nextPath.startsWith("/") ? nextPath : "/chat");
  }, [router, nextPath, usingSupabase]);

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
      if (usingSupabase && isSupabaseConfigured()) {
        await signInWithSupabaseOtp(
          normalized,
          `${window.location.origin}${nextPath.startsWith("/") ? nextPath : "/chat"}`
        );
        setInfo("Magic link sent. Open it to finish Supabase sign in.");
        return;
      }
      const convexUrl = getConvexUrl();
      if (convexUrl) {
        await convexHttpCall(convexUrl, "mutation", "users:createUser", {
          email: normalized,
        });
      }
      setUserEmail(normalized);
      router.push(nextPath.startsWith("/") ? nextPath : "/chat");
    } catch (err) {
      if (usingSupabase && isSupabaseConfigured()) {
        setError(err instanceof Error ? err.message : "Could not send magic link.");
        return;
      }
      setUserEmail(normalized);
      router.push(nextPath.startsWith("/") ? nextPath : "/chat");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-center gap-2">
          <BrandLogo size={40} />
          <h1 className="page-title">Sign in to Giga3 AI</h1>
        </div>
        <p className="mb-8 text-center text-base text-muted">
          Sign up or log in with your email. Chats, credits, and subscriptions sync via
          {usingSupabase ? " Supabase." : " Convex."}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
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
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          {info && <p className="text-sm font-semibold text-emerald-700">{info}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting
              ? "Signing in…"
              : usingSupabase && isSupabaseConfigured()
                ? "Send magic link"
                : "Continue"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          A product of {siteConfig.founder.organizationShort} · Founded by{" "}
          {siteConfig.founder.name}, {siteConfig.founder.location}
        </p>
        <p className="mt-6 text-center text-xs text-muted">
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
