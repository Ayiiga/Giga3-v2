"use client";

import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";
import { ChatDateTimeLabel } from "@/components/chat/ChatDateTimeLabel";
import type { UiMessage } from "@/components/chat/MessageList";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { clearUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { signOutSupabase } from "@/lib/supabase/auth";
import { siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";

interface ChatChromeProps {
  email: string;
  mounted: boolean;
  messages: UiMessage[];
  conversationTitle?: string;
  isSending: boolean;
  credits: number | null;
  onOpenSidebar: () => void;
}

function chromePropsEqual(prev: ChatChromeProps, next: ChatChromeProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.messages === next.messages &&
    prev.conversationTitle === next.conversationTitle &&
    prev.isSending === next.isSending &&
    prev.credits === next.credits &&
    prev.onOpenSidebar === next.onOpenSidebar
  );
}

/** Header + credits — subscribes to getChatCredits only (not interestProfile). */
export const ChatChrome = memo(function ChatChrome({
  email,
  mounted,
  messages,
  conversationTitle,
  isSending,
  credits,
  onOpenSidebar,
}: ChatChromeProps) {
  useRenderDiagnostic("ChatChrome");

  const router = useRouter();

  const navLink =
    "hidden rounded-xl px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-zinc-100 sm:inline-flex sm:items-center sm:gap-1.5";

  return (
    <header className="chat-header-stable flex min-h-[3.75rem] flex-wrap items-center gap-2 border-b border-border bg-white px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
      <button
        type="button"
        className="rounded-xl p-2.5 text-foreground hover:bg-zinc-100 lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" aria-hidden />
      </button>
      <Link href="/" className="flex items-center gap-2.5 text-base font-bold text-foreground sm:text-lg">
        <BrandLogo size={32} className="!h-8 !w-8" />
        {siteConfig.name}
      </Link>

      <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Chat navigation">
        <Link href="/media" className={navLink}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Media
        </Link>
        <Link href="/pricing" className={navLink}>
          Pricing
        </Link>
        <Link href="/credits" className={navLink}>
          Credits
        </Link>
      </nav>

      <span className="ml-auto flex items-center gap-2 sm:gap-3">
        <ChatActionsMenu
          messages={messages}
          conversationTitle={conversationTitle}
          email={email}
          disabled={isSending}
        />
        <ChatDateTimeLabel />
        {credits != null && <CreditBadge credits={credits} showLabel={false} />}
        <span className="inline-flex min-w-[5.5rem] justify-center rounded-full bg-violet-100 px-3 py-1 text-sm font-bold tabular-nums text-violet-900 ring-1 ring-violet-300">
          {credits ?? "—"} credits
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          if (isSupabaseDataBackend()) {
            void signOutSupabase();
          } else {
            clearUserEmail();
          }
          router.push("/chat/login");
        }}
        className="rounded-xl px-3 py-2 text-sm font-bold text-foreground hover:bg-zinc-100"
      >
        Sign out
      </button>
    </header>
  );
}, chromePropsEqual);
