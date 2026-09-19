"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { ButtonLink } from "@/components/ui/Button";
import { StableLink } from "@/components/ui/StableLink";
import { useBilling } from "@/hooks/useBilling";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AccountProfileClientInner() {
  const router = useRouter();
  const { email, usage } = useBilling();

  useEffect(() => {
    if (!email) router.replace("/chat/login/?next=/profile/");
  }, [email, router]);

  if (!email) {
    return <p className="text-center text-muted">Redirecting to sign in…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <User className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="page-title mt-4">Your profile</h1>
        <p className="mt-2 text-sm text-muted">Signed in as {email}</p>
      </header>

      {usage ? (
        <div className="flex justify-center">
          <CreditBadge credits={usage.credits} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/wallet/" variant="secondary" className="w-full">
          GigaWallet
        </ButtonLink>
        <ButtonLink href="/credits/" variant="secondary" className="w-full">
          Buy credits
        </ButtonLink>
        <ButtonLink href="/chat/" className="w-full sm:col-span-2">
          Back to chat
        </ButtonLink>
      </div>

      <p className="text-center text-xs text-muted">
        Creator profile on GigaSocial is separate — open{" "}
        <StableLink href="/gigasocial/profile/" className="text-accent underline">
          GigaSocial profile
        </StableLink>
        .
      </p>
    </div>
  );
}

export function AccountProfileClient() {
  return (
    <ConvexAppShell>
      <AccountProfileClientInner />
    </ConvexAppShell>
  );
}
