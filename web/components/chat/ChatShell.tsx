"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatBanners } from "@/components/chat/ChatBanners";
import { ChatChrome } from "@/components/chat/ChatChrome";
import type { ChatActionsMenuHandle } from "@/components/chat/ChatActionsMenu";
import { ChatConversationPane } from "@/components/chat/ChatConversationPane";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatWorkspacePanel } from "@/components/chat/ChatWorkspacePanel";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useSupabaseChatPlatform } from "@/hooks/useSupabaseChatPlatform";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { useChatShareShortcuts } from "@/hooks/useChatShareShortcuts";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
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
      makeSetPublicShare={(conversationId, email) => async (enabled) =>
        setPublicShare({
          conversationId: conversationId as Id<"conversations">,
          userId: email,
          enabled,
        })
      }
    />
  );
}

function ChatShellInner({
  usePlatform,
  makeSetPublicShare,
}: {
  usePlatform: typeof useChatPlatform;
  makeSetPublicShare?: (
    conversationId: string,
    email: string
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
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    chatProviderLabel,
    usedFallback,
    credits,
    interestProfileJson,
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
    (msg: string) => {
      void sendMessage(msg);
    },
    [sendMessage]
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
    if (!makeSetPublicShare || !activeId || !email) return undefined;
    return makeSetPublicShare(activeId, email);
  }, [makeSetPublicShare, activeId, email]);

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

  const handleRegenerate = useCallback(
    (assistantMessageId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx < 0) return;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user" && messages[i].id !== "pending-user") {
          void sendMessage(messages[i].content);
          return;
        }
      }
    },
    [messages, sendMessage]
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
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        email={email}
        mounted={mounted}
        credits={credits}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          modelTier={modelTier}
          onModelTierChange={handleModelTierChange}
          onOpenSidebar={handleOpenSidebar}
          onSetPublicShare={onSetPublicShare}
          chatActionsRef={chatActionsRef}
        />

        <ChatBanners
          email={email}
          mounted={mounted}
          chatProviderLabel={chatProviderLabel}
          usedFallback={usedFallback}
          interestProfileJson={interestProfileJson}
        />

        <ChatWorkspacePanel
          mode={mode}
          onModeChange={handleModeChange}
          disabled={isSending}
          hasMessages={messages.length > 0}
          onInsertDocument={handleInsertDocument}
          onError={handleTemplateError}
        />

        {templateNotice && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-200">
            {templateNotice}
          </p>
        )}

        {error && <ChatErrorBanner message={error} />}

        <ChatConversationPane
          messages={messages}
          isLoading={messagesLoading}
          isSending={isSending}
          insertRef={insertRef}
          onSend={handleSend}
          onInsertTemplate={handleInsertTemplate}
          onRegenerate={handleRegenerate}
        />
      </div>
    </div>
  );
}
