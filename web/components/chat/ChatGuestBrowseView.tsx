"use client";

import { GigaSocialAuthPrompt } from "@/components/gigasocial/ux/GigaSocialAuthPrompt";
import { ProductRedirectCards } from "@/components/chat/ProductRedirectCards";
import { ButtonLink } from "@/components/ui/Button";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import {
  buildProductRedirectAnswer,
  matchProductRedirectIntent,
} from "@/lib/chat/productRedirects";
import { CHAT_WORKSPACE_PRIMARY_APPS } from "@/lib/chat/workspaceApps";
import { MessageSquare, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState, type FormEvent } from "react";

/**
 * Frontend-only guest shell for AI Chat: interface is visible, send requires sign-in.
 * Product-open requests (GigaSocial, GigaEdits, GigaLearn, Media Studio, …) still redirect.
 */
export const ChatGuestBrowseView = memo(function ChatGuestBrowseView() {
  const { effectiveOnline } = useEffectiveOnline();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggest, setSuggest] = useState<{
    user: string;
    answer: string;
    products: ReturnType<typeof matchProductRedirectIntent>;
  } | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const match = matchProductRedirectIntent(trimmed);
    if (match) {
      setDraft("");
      if (match.kind === "navigate") {
        router.push(match.product.href);
        return;
      }
      setSuggest({
        user: trimmed,
        answer: buildProductRedirectAnswer(match),
        products: match,
      });
      return;
    }

    setAuthOpen(true);
  }

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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-10 text-center">
        <p className="max-w-md text-sm text-muted">
          Ask to open GigaSocial, GigaEdits, GigaLearn, Media Studio, or another Giga3 app.
          Sending AI prompts requires an account.
        </p>
        <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
          {CHAT_WORKSPACE_PRIMARY_APPS.map((app) => (
            <ButtonLink
              key={app.id}
              href={app.href}
              variant="outline"
              className="min-h-11"
            >
              Open {app.label}
            </ButtonLink>
          ))}
        </div>

        {suggest ? (
          <div className="mt-2 w-full max-w-md text-left">
            <p className="mb-2 text-sm text-muted">You: {suggest.user}</p>
            <p className="text-sm text-foreground">
              {suggest.products
                ? `Open ${suggest.products.product.label} — ${suggest.products.product.hint}`
                : suggest.answer}
            </p>
            {suggest.products ? (
              <ProductRedirectCards products={[suggest.products.product]} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="guest-chat-open-app">
            Ask to open a Giga3 app, or sign in to chat
          </label>
          <input
            id="guest-chat-open-app"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Try “Open GigaSocial” or sign in to chat…"
            className="flex w-full min-h-12 items-center rounded-2xl border border-border bg-muted/20 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
        </form>
        <button
          type="button"
          className="mt-2 w-full min-h-11 text-sm font-medium text-accent"
          onClick={() => setAuthOpen(true)}
        >
          Sign in to chat with Giga3
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
