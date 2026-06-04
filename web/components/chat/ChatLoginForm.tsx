"use client";

import { Button } from "@/components/ui/Button";
import { getUserEmail, isValidEmail, setUserEmail } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { sanitizeLoginRedirect } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function ChatLoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = sanitizeLoginRedirect(params.get("next"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const createUser = useMutation(api.users.createUser);

  useEffect(() => {
    const existing = getUserEmail();
    if (existing) router.replace(nextPath);
  }, [router, nextPath]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const normalized = email.trim().toLowerCase();
    try {
      await createUser({ email: normalized });
      setUserEmail(normalized);
      router.push(nextPath);
    } catch {
      setUserEmail(normalized);
      router.push(nextPath);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-center gap-2">
          <BrandLogo size={40} />
          <h1 className="text-2xl font-bold text-foreground">Sign in to Giga3 AI</h1>
        </div>
        <p className="mb-8 text-center text-base font-medium text-foreground">
          Sign up or log in with your email. Chats, credits, and subscriptions sync via
          Convex.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-foreground">
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
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Continue"}
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
