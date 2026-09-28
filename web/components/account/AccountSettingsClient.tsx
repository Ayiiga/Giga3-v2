"use client";

import { ThemeToggle } from "@/components/chat/ThemeToggle";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { StableLink } from "@/components/ui/StableLink";
import { clearAllClientAuth, getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { safeNavigate } from "@/lib/navigation/safeNavigate";
import { signOutSupabase } from "@/lib/supabase/auth";
import { LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function AccountSettingsClientInner() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const current = getUserEmail();
    setEmail(current);
    if (!current) router.replace("/chat/login/?next=/settings/");
  }, [router]);

  function signOut() {
    try {
      if (isSupabaseDataBackend()) {
        void signOutSupabase();
      } else {
        clearAllClientAuth();
      }
    } catch {
      clearAllClientAuth();
    }
    safeNavigate("/chat/login/");
  }

  if (!email) {
    return <p className="text-center text-muted">Redirecting to sign in…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-sm text-muted">Account preferences for {email}</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-muted">Light or dark appearance</p>
          </div>
          <ThemeToggle variant="toolbar" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <StableLink href="/wallet/" className="text-accent underline underline-offset-2">
              Billing &amp; wallet
            </StableLink>
          </li>
          <li>
            <StableLink
              href="/chat/login/reset/"
              className="text-accent underline underline-offset-2"
            >
              Reset password
            </StableLink>
          </li>
          <li>
            <StableLink href="/legal/privacy/" className="text-accent underline underline-offset-2">
              <Shield className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Privacy &amp; terms
            </StableLink>
          </li>
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <ButtonLink href="/chat/" variant="secondary">
          Back to chat
        </ButtonLink>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted hover:bg-accent/10 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AccountSettingsClient() {
  return (
    <ConvexAppShell>
      <AccountSettingsClientInner />
    </ConvexAppShell>
  );
}
