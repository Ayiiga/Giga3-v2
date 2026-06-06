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
  messages,
  conversationTitle,
  isSending,
  credits,
  onOpenSidebar,
}: ChatChromeProps) {
  useRenderDiagnostic("ChatChrome");

  const router = useRouter();

  const navLink =
    "hidden rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 sm:inline-flex sm:items-center sm:gap-1.5";

  return (
    <header className="chat-header-stable flex min-h-[3.5rem] flex-wrap items-center gap-2 border-b border-zinc-200/90 bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 sm:text-base"
      >
        <BrandLogo size={28} className="!h-7 !w-7 shrink-0" />
        <span className="truncate">{siteConfig.name}</span>
      </Link>

      {conversationTitle && (
        <span className="hidden max-w-[8rem] truncate text-xs text-zinc-500 md:inline lg:max-w-xs">
          {conversationTitle}
        </span>
      )}

      <nav className="ml-1 hidden items-center gap-0.5 md:flex" aria-label="Chat navigation">
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

      <span className="ml-auto flex items-center gap-2 sm:gap-2.5">
        <ChatActionsMenu
          messages={messages}
          conversationTitle={conversationTitle}
          email={email}
          disabled={isSending}
        />
        <ChatDateTimeLabel />
        {credits != null && (
          <CreditBadge credits={credits} showLabel className="hidden sm:inline-flex" />
        )}
        {credits != null && (
          <CreditBadge credits={credits} showLabel={false} className="sm:hidden" />
        )}
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
        className="rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      >
        Sign out
      </button>
    </header>
  );
}, chromePropsEqual);
