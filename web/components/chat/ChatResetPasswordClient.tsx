"use client";

import { Button } from "@/components/ui/Button";
import { isValidEmail } from "@/lib/auth";
import { resetPasswordWithToken } from "@/lib/authPassword";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const emailParam = params.get("email") ?? "";
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Use the link from your email.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPasswordWithToken(email.trim().toLowerCase(), token, password);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="premium-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo size={48} className="shadow-none ring-0" />
          <h1 className="text-2xl font-semibold text-foreground">Set new password</h1>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-surface"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-surface"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-surface"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Update password"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/chat/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ChatResetPasswordClient() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
