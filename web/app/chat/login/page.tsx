"use client";

import { Button } from "@/components/ui/Button";
import { getUserEmail, isValidEmail, setUserEmail } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ChatLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const existing = getUserEmail();
    if (existing) router.replace("/chat");
  }, [router]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setUserEmail(email);
    router.push("/chat");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          <h1 className="text-xl font-bold">Sign in to Giga3 AI</h1>
        </div>
        <p className="mb-6 text-center text-sm text-muted">
          Email-based access for this MVP. Your chats sync via Convex.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm outline-none ring-accent focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Continue to chat
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="text-accent hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
