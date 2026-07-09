"use client";

import { ChatActionsMenu, type ChatActionsMenuHandle } from "@/components/chat/ChatActionsMenu";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ThemeToggle } from "@/components/chat/ThemeToggle";
import { PlatformChromeHost } from "@/components/platform/PlatformChromeHost";
import { GigaSocialChatButton } from "@/components/chat/GigaSocialChatButton";
import type { UiMessage } from "@/components/chat/MessageList";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { clearAllClientAuth } from "@/lib/auth";
import type { GigaModelId } from "@/lib/chat/gigaModels";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { signOutSupabase } from "@/lib/supabase/auth";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, type Ref } from "react";

interface ChatChromeProps {
  email: string;
  mounted: boolean;
  messages: UiMessage[];
  conversationTitle?: string;
  conversationId?: string | null;
  sharePublic?: boolean;
  shareToken?: string | null;
  isSending: boolean;
  credits: number | null;
  hasOpenAiAccess: boolean;
  isPremium?: boolean;
  freeOpenAiRemaining?: number;
  modelTier: GigaModelId;
  onModelTierChange: (id: GigaModelId) => void;
  onOpenSidebar: () => void;
  onSetPublicShare?: (
    enabled: boolean
  ) => Promise<{ shareToken: string | null; sharePublic: boolean }>;
  chatActionsRef?: Ref<ChatActionsMenuHandle>;
  searchConversations?: { id: string; title: string; mode: string }[];
}

function chromePropsEqual(prev: ChatChromeProps, next: ChatChromeProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.messages === next.messages &&
    prev.conversationTitle === next.conversationTitle &&
    prev.conversationId === next.conversationId &&
    prev.sharePublic === next.sharePublic &&
    prev.shareToken === next.shareToken &&
    prev.isSending === next.isSending &&
    prev.credits === next.credits &&
    prev.hasOpenAiAccess === next.hasOpenAiAccess &&
    prev.isPremium === next.isPremium &&
    prev.freeOpenAiRemaining === next.freeOpenAiRemaining &&
    prev.modelTier === next.modelTier &&
    prev.onModelTierChange === next.onModelTierChange &&
    prev.onOpenSidebar === next.onOpenSidebar &&
    prev.onSetPublicShare === next.onSetPublicShare &&
    prev.chatActionsRef === next.chatActionsRef &&
    prev.searchConversations === next.searchConversations
  );
}

export const ChatChrome = memo(function ChatChrome({
  email,
  messages,
  conversationTitle,
  conversationId,
  sharePublic,
  shareToken,
  isSending,
  credits,
  hasOpenAiAccess,
  isPremium = false,
  freeOpenAiRemaining = 0,
  modelTier,
  onModelTierChange,
  onOpenSidebar,
  onSetPublicShare,
  chatActionsRef,
  searchConversations,
}: ChatChromeProps) {
  useRenderDiagnostic("ChatChrome");

  const router = useRouter();

  return (
    <header className="chat-header-stable relative z-20 flex min-h-14 min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-clip border-b border-border bg-card px-2 py-2 sm:gap-3 sm:px-4">
      <button
        type="button"
        className="touch-target rounded-xl text-foreground hover:bg-accent/10 lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {conversationTitle && (
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground md:inline lg:max-w-xs">
          {conversationTitle}
        </span>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
        <ModelSelector
          value={modelTier}
          onChange={onModelTierChange}
          hasOpenAiAccess={hasOpenAiAccess}
          isPremium={isPremium}
          freeOpenAiRemaining={freeOpenAiRemaining}
          disabled={isSending}
          compact
          className="min-w-0 max-w-[7.75rem] sm:max-w-none"
        />
      </div>

      <span className="ml-auto flex min-w-0 shrink items-center gap-0.5 sm:gap-2">
        <GigaSocialChatButton />
        <PlatformChromeHost conversations={searchConversations} compact ultraCompact />
        <ThemeToggle className="hidden sm:inline-flex" />
        <ChatActionsMenu
          ref={chatActionsRef}
          messages={messages}
          conversationTitle={conversationTitle}
          conversationId={conversationId}
          sharePublic={sharePublic}
          shareToken={shareToken}
          email={email}
          disabled={isSending}
          onSetPublicShare={onSetPublicShare}
        />
        {credits != null && (
          <CreditBadge credits={credits} showLabel className="hidden sm:inline-flex" />
        )}
        {credits != null && (
          <CreditBadge
            credits={credits}
            showLabel={false}
            className="min-h-10 shrink-0 px-2 sm:hidden"
          />
        )}
      </span>

      <button
        type="button"
        onClick={() => {
          if (isSupabaseDataBackend()) {
            void signOutSupabase();
          } else {
            clearAllClientAuth();
          }
          router.push("/chat/login");
        }}
        className="hidden shrink-0 min-h-10 rounded-xl px-2 text-xs font-medium text-muted hover:bg-accent/10 hover:text-foreground min-[390px]:inline-flex sm:px-3 sm:text-sm"
      >
        <span className="sm:hidden">Out</span>
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  );
}, chromePropsEqual);
