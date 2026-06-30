"use client";

import { Button } from "@/components/ui/Button";
import { getSessionToken, getUserEmail, isValidEmail, setAuthSession } from "@/lib/auth";
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
        const result = await convexHttpCall<{ sessionToken?: string }>(
          convexUrl,
          "mutation",
          "users:createUser",
          { email: normalized }
        );
        if (result?.sessionToken) {
          setAuthSession(normalized, result.sessionToken);
        } else {
          setAuthSession(normalized, "");
        }
      } else {
        setAuthSession(normalized, "");
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/chat");
    } catch (err) {
      if (usingSupabase && isSupabaseConfigured()) {
        setError(err instanceof Error ? err.message : "Could not send magic link.");
        return;
      }
      setAuthSession(normalized, getSessionToken() ?? "");
      router.push(nextPath.startsWith("/") ? nextPath : "/chat");
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
              Premium AI for learning, research, creativity, and productivity
            </p>
          </div>
        </div>
        <p className="mb-8 text-center text-base leading-[1.7] text-muted">
          Sign in with your email. Chats, credits, and subscriptions sync via
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
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          {info && <p className="text-sm font-medium text-emerald-700">{info}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting
              ? "Signing in…"
              : usingSupabase && isSupabaseConfigured()
                ? "Send magic link"
                : "Continue"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs leading-[1.7] text-muted">
          A product of {siteConfig.founder.organizationShort} · Founded by{" "}
          {siteConfig.founder.name} ({siteConfig.founder.alias}),{" "}
          {siteConfig.founder.location}
        </p>
        <p className="mt-6 text-center text-sm text-muted">
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
