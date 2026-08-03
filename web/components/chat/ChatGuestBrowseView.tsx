"use client";

import { GigaSocialAuthPrompt } from "@/components/gigasocial/ux/GigaSocialAuthPrompt";
import { ButtonLink } from "@/components/ui/Button";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { siteConfig } from "@/lib/site";
import { MessageSquare, WifiOff } from "lucide-react";
import { memo, useState } from "react";

/**
 * Frontend-only guest shell for AI Chat: interface is visible, send requires sign-in.
 * Does not alter auth/session hooks or backend messaging.
 */
export const ChatGuestBrowseView = memo(function ChatGuestBrowseView() {
  const { effectiveOnline } = useEffectiveOnline();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {!effectiveOnline ? (
        <div
          className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100"
          role="status"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <p>Offline Mode — browsing cached content when available.</p>
        </div>
      ) : null}

      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">Giga3 AI Chat</h1>
            <p className="truncate text-xs text-muted">Guest browse — sign in to send prompts</p>
          </div>
        </div>
        <ButtonLink href="/chat/login?next=%2Fchat" size="sm" className="min-h-11 shrink-0">
          Sign in
        </ButtonLink>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="max-w-md text-sm text-muted">
          Browse the chat interface as a guest. Sending messages, using AI models, wallet, and
          marketplace actions require an account.
        </p>
        <ButtonLink href={siteConfig.links.gigasocial} variant="outline" className="min-h-11">
          Browse GigaSocial
        </ButtonLink>
      </div>

      <div className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="flex w-full min-h-12 items-center rounded-2xl border border-border bg-muted/20 px-4 text-left text-sm text-muted"
          onClick={() => setAuthOpen(true)}
          aria-label="Sign in to send a message"
        >
          Sign in to chat with Giga3…
        </button>
      </div>

      {authOpen ? (
        <GigaSocialAuthPrompt
          variant="modal"
          nextPath="/chat"
          title="Sign in to chat"
          description="Create an account or sign in to send AI prompts and sync your conversations."
          onDismiss={() => setAuthOpen(false)}
        />
      ) : null}
    </div>
  );
});
