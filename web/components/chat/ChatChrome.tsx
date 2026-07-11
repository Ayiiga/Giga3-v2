"use client";

import { ChatActionsMenu, type ChatActionsMenuHandle } from "@/components/chat/ChatActionsMenu";
import { ChatConversationSearch } from "@/components/chat/ChatConversationSearch";
import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ThemeToggle } from "@/components/chat/ThemeToggle";
import { PlatformChromeHost } from "@/components/platform/PlatformChromeHost";
import { GigaSocialChatButton } from "@/components/chat/GigaSocialChatButton";
import type { UiMessage } from "@/components/chat/MessageList";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { clearAllClientAuth } from "@/lib/auth";
import type { GigaModelId } from "@/lib/chat/gigaModels";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { branding } from "@/lib/branding";
import { signOutSupabase } from "@/lib/supabase/auth";
import { Menu } from "lucide-react";
import Link from "next/link";
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
  conversationSearch: string;
  onConversationSearchChange: (value: string) => void;
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
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
    prev.searchConversations === next.searchConversations &&
    prev.conversationSearch === next.conversationSearch &&
    prev.onConversationSearchChange === next.onConversationSearchChange &&
    prev.conversations === next.conversations &&
    prev.activeConversationId === next.activeConversationId &&
    prev.onSelectConversation === next.onSelectConversation
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
  conversationSearch,
  onConversationSearchChange,
  conversations,
  activeConversationId,
  onSelectConversation,
}: ChatChromeProps) {
  useRenderDiagnostic("ChatChrome");

  const router = useRouter();

  return (
    <header className="chat-header-stable chat-header-bar border-b border-border bg-card">
      <div className="chat-header-row flex min-h-14 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <div className="chat-header-brand flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-accent/10 hover:text-foreground lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-lg pr-1 hover:opacity-90"
            aria-label={`${branding.name} home`}
          >
            <BrandLogo size={28} className="shrink-0 shadow-none ring-0" />
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">
              {branding.shortName}
            </span>
          </Link>

          {conversationTitle ? (
            <span className="hidden min-w-0 truncate text-sm text-muted lg:inline">
              <span aria-hidden className="px-1">
                /
              </span>
              {conversationTitle}
            </span>
          ) : null}
        </div>

        <div className="chat-header-actions ml-auto flex shrink-0 items-center gap-2">
          {credits != null ? (
            <CreditBadge
              credits={credits}
              showLabel={false}
              className="min-h-9 shrink-0 px-2.5 text-xs sm:px-3"
            />
          ) : null}

          <GigaSocialChatButton variant="prominent" />

          <div
            className="chat-header-toolbar flex items-center gap-0.5 rounded-xl border border-border bg-muted/15 p-0.5"
            role="toolbar"
            aria-label="Chat tools"
          >
            <PlatformChromeHost
              conversations={searchConversations}
              compact
              ultraCompact
              hideSearch
            />
            <ThemeToggle variant="toolbar" />
            <ChatActionsMenu
              ref={chatActionsRef}
              messages={messages}
              conversationTitle={conversationTitle}
              conversationId={conversationId}
              sharePublic={sharePublic}
              shareToken={shareToken}
              email={email}
              disabled={isSending}
              variant="toolbar"
              onSetPublicShare={onSetPublicShare}
            />
          </div>

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
            className="hidden min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-accent/10 hover:text-foreground md:inline-flex lg:px-3 lg:text-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="chat-header-combo border-t border-border/70 px-3 py-2 sm:px-4">
        <div className="chat-header-combo-inner flex min-w-0 items-stretch overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ModelSelector
            value={modelTier}
            onChange={onModelTierChange}
            hasOpenAiAccess={hasOpenAiAccess}
            isPremium={isPremium}
            freeOpenAiRemaining={freeOpenAiRemaining}
            disabled={isSending}
            compact
            embedded
            className="shrink-0"
          />
          <ChatConversationSearch
            value={conversationSearch}
            onChange={onConversationSearchChange}
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={onSelectConversation}
            embedded
            className="min-w-0 flex-1"
          />
        </div>
      </div>
    </header>
  );
}, chromePropsEqual);
