"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatBanners } from "@/components/chat/ChatBanners";
import { ChatChrome } from "@/components/chat/ChatChrome";
import type { ChatActionsMenuHandle } from "@/components/chat/ChatActionsMenu";
import { ChatConversationPane } from "@/components/chat/ChatConversationPane";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatOverflowProbe } from "@/components/chat/ChatOverflowProbe";
import { ChatWorkspacePanel } from "@/components/chat/ChatWorkspacePanel";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useSupabaseChatPlatform } from "@/hooks/useSupabaseChatPlatform";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { useChatShareShortcuts } from "@/hooks/useChatShareShortcuts";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  getGigaModel,
  gigaModelForMode,
  readStoredGigaModel,
  storeGigaModel,
  type GigaModelId,
} from "@/lib/chat/gigaModels";
import { findLatestImageUrlInMessages } from "@/lib/chat/parseMessageMedia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ChatShell() {
  if (isSupabaseDataBackend()) {
    return <ChatShellInner usePlatform={useSupabaseChatPlatform} />;
  }

  return (
    <ConvexAppShell>
      <ChatShellWithConvexShare usePlatform={useChatPlatform} />
    </ConvexAppShell>
  );
}

function ChatShellWithConvexShare({
  usePlatform,
}: {
  usePlatform: typeof useChatPlatform;
}) {
  const setPublicShare = useMutation(api.conversations.setPublicShare);

  return (
    <ChatShellInner
      usePlatform={usePlatform}
      makeSetPublicShare={(conversationId) => async (enabled) => {
        const token = getSessionToken();
        if (!token) throw new Error("Session expired");
        return setPublicShare({
          conversationId: conversationId as Id<"conversations">,
          sessionToken: token,
          enabled,
        });
      }}
    />
  );
}

function ChatShellInner({
  usePlatform,
  makeSetPublicShare,
}: {
  usePlatform: typeof useChatPlatform;
  makeSetPublicShare?: (
    conversationId: string
  ) => (
    enabled: boolean
  ) => Promise<{ shareToken: string | null; sharePublic: boolean }>;
}) {
  useRenderDiagnostic("ChatShellInner");

  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<GigaModelId>("fast");
  const insertRef = useRef<((text: string) => void) | null>(null);
  const chatActionsRef = useRef<ChatActionsMenuHandle | null>(null);

  const {
    email,
    mounted,
    conversations,
    conversationsLoading,
    messagesLoading,
    activeId,
    messages,
    mode,
    isSending,
    isAcceptingMessage,
    awaitingReply,
    isSlowNetwork,
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    stopGenerating,
    regenerateMessage,
    pinConversation,
    archiveConversation,
    favoriteConversation,
    editMessage,
    chatProviderLabel,
    usedFallback,
    credits,
    hasOpenAiAccess,
    isPremium,
    freeOpenAiRemaining,
    interestProfileJson,
    uploadUsage,
  } = usePlatform();

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeId),
    [conversations, activeId]
  );

  const handleInsertTemplate = useCallback((text: string) => {
    insertRef.current?.(text);
  }, []);

  const handleInsertDocument = useCallback((text: string) => {
    if (insertRef.current) {
      insertRef.current(text);
      setTemplateNotice(null);
    } else {
      setTemplateNotice("Could not insert template. Refresh and try again.");
    }
  }, []);

  const handleSend = useCallback(
    (msg: string, attachments?: import("@/lib/chat/multimodalAttachments").PreparedChatAttachment[]) => {
      void sendMessage(msg, attachments, modelTier);
    },
    [sendMessage, modelTier]
  );

  const handleOpenSidebar = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const handleNewChat = useCallback(() => {
    void startNewChat();
  }, [startNewChat]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      void deleteConversation(id);
    },
    [deleteConversation]
  );

  const handleModeChange = useCallback(
    (m: typeof mode) => {
      void changeMode(m);
    },
    [changeMode]
  );

  const handleTemplateError = useCallback((msg: string) => {
    setTemplateNotice(msg);
  }, []);

  const onSetPublicShare = useMemo(() => {
    if (!makeSetPublicShare || !activeId) return undefined;
    return makeSetPublicShare(activeId);
  }, [makeSetPublicShare, activeId]);

  const handleShortcutCopyChat = useCallback(() => {
    void chatActionsRef.current?.copyChat();
  }, []);

  const handleShortcutShareChat = useCallback(() => {
    void chatActionsRef.current?.shareChat();
  }, []);

  useChatShareShortcuts({
    enabled: mounted && Boolean(email),
    hasMessages: messages.length > 0,
    onCopyChat: handleShortcutCopyChat,
    onShareChat: handleShortcutShareChat,
  });

  useEffect(() => {
    setModelTier(readStoredGigaModel());
  }, []);

  useEffect(() => {
    if (!hasOpenAiAccess && modelTier === "pro") {
      setModelTier("fast");
      storeGigaModel("fast");
      void changeMode(getGigaModel("fast").mode);
    }
  }, [hasOpenAiAccess, modelTier, changeMode]);

  useEffect(() => {
    if (mode) {
      setModelTier((prev) => {
        const mapped = gigaModelForMode(mode);
        return prev === mapped ? prev : mapped;
      });
    }
  }, [mode]);

  const handleModelTierChange = useCallback(
    (tier: GigaModelId) => {
      setModelTier(tier);
      storeGigaModel(tier);
      void changeMode(getGigaModel(tier).mode);
    },
    [changeMode]
  );

  const latestImageUrl = useMemo(
    () => findLatestImageUrlInMessages(messages),
    [messages]
  );

  const handleRegenerate = useCallback(
    (assistantMessageId: string) => {
      void regenerateMessage(assistantMessageId);
    },
    [regenerateMessage]
  );

  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      void editMessage(messageId, content);
    },
    [editMessage]
  );

  useEffect(() => {
    if (mounted && !email) router.replace("/chat/login");
  }, [mounted, email, router]);

  if (!mounted || !email) {
    return (
      <div className="flex h-full items-center justify-center text-base text-muted">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 overflow-hidden bg-background">
      <ChatOverflowProbe messageCount={messages.length} />
      <ChatSidebar
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onPin={(id, pinned) => void pinConversation(id, pinned)}
        onArchive={(id, archived) => void archiveConversation(id, archived)}
        onFavorite={(id, fav) => void favoriteConversation(id, fav)}
        email={email}
        mounted={mounted}
        credits={credits}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      <div className="chat-main-column relative z-0 grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <div className="shrink-0">
          <ChatChrome
            email={email}
            mounted={mounted}
            messages={messages}
            conversationTitle={activeConversation?.title}
            conversationId={activeId}
            sharePublic={activeConversation?.sharePublic}
            shareToken={activeConversation?.shareToken}
            isSending={isSending}
            credits={credits}
            hasOpenAiAccess={hasOpenAiAccess}
            isPremium={isPremium}
            freeOpenAiRemaining={freeOpenAiRemaining}
            modelTier={modelTier}
            onModelTierChange={handleModelTierChange}
            onOpenSidebar={handleOpenSidebar}
            onSetPublicShare={onSetPublicShare}
            chatActionsRef={chatActionsRef}
          />

          <ChatBanners
            email={email}
            mounted={mounted}
            hasMessages={messages.length > 0}
            chatProviderLabel={chatProviderLabel}
            usedFallback={usedFallback}
            interestProfileJson={interestProfileJson}
          />

          <ChatWorkspacePanel
            mode={mode}
            onModeChange={handleModeChange}
            disabled={isSending || awaitingReply}
            hasMessages={messages.length > 0}
            sourceImageUrl={latestImageUrl}
            onInsertDocument={handleInsertDocument}
            onError={handleTemplateError}
          />

          {templateNotice && (
            <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-200">
              {templateNotice}
            </p>
          )}

          {error && <ChatErrorBanner message={error} />}
        </div>

        <ChatConversationPane
          messages={messages}
          isLoading={messagesLoading}
          isSending={isSending}
          awaitingReply={awaitingReply}
          isAcceptingMessage={isAcceptingMessage}
          isSlowNetwork={isSlowNetwork}
          insertRef={insertRef}
          onSend={handleSend}
          onInsertTemplate={handleInsertTemplate}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onStopGenerating={() => void stopGenerating()}
          uploadUsage={uploadUsage}
        />
      </div>
    </div>
  );
}
