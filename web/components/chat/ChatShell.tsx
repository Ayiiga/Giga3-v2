"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatSegmentNotice } from "@/components/chat/ChatSegmentNotice";
import { ChatBanners } from "@/components/chat/ChatBanners";
import { ChatChrome } from "@/components/chat/ChatChrome";
import type { ChatActionsMenuHandle } from "@/components/chat/ChatActionsMenu";
import { ChatConversationPane } from "@/components/chat/ChatConversationPane";
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
import { consumeGigaLearnChatHandoff } from "@/lib/gigalearn/chatHandoff";
import { consumePromptChatHandoff } from "@/lib/chat/promptHandoff";
import { OPEN_SIDEBAR_EVENT } from "@/lib/chat/workspaceNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ChatShell() {
  if (isSupabaseDataBackend()) {
    return (
      <ConvexAppShell>
        <ChatShellInner usePlatform={useSupabaseChatPlatform} />
      </ConvexAppShell>
    );
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
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<GigaModelId>("fast");
  const [handoffAttachments, setHandoffAttachments] = useState<PreparedChatAttachment[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
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
    deleteMessage,
    renameConversation,
    chatProviderLabel,
    usedFallback,
    segmentNotice,
    credits,
    hasOpenAiAccess,
    isPremium,
    subscriptionActive,
    freeOpenAiRemaining,
    interestProfileJson,
    uploadUsage,
  } = usePlatform();

  const { needsOnboarding, completeOnboarding, trackDailyActivity } = usePlatformProfile();
  const { isEnabled } = useRemoteConfig();
  const syncAchievements = useMutation(api.platformGrowth.syncAchievements);

  useEffect(() => {
    const token = getSessionToken();
    if (!token || isSupabaseDataBackend()) return;
    void trackDailyActivity();
    void syncAchievements({ sessionToken: token }).catch(() => undefined);
  }, [trackDailyActivity, syncAchievements]);

  const searchConversations = useMemo(
    () =>
      conversations.map((c) => ({
        id: c._id,
        title: c.title,
        mode: c.mode,
      })),
    [conversations]
  );

  const showOnboarding =
    isEnabled("onboarding.enabled") && needsOnboarding && !onboardingDismissed;

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

  const handleSuggestVisionTier = useCallback(() => {
    if (modelTier !== "vision") {
      setModelTier("vision");
      storeGigaModel("vision");
    }
  }, [modelTier]);

  const handleAttachmentsChange = useCallback(
    (attachments: import("@/lib/chat/multimodalAttachments").PreparedChatAttachment[]) => {
      const hasVisual =
        attachments.some((a) => a.kind === "image" || a.kind === "pdf") ||
        attachments.length > 0;
      if (hasVisual && modelTier !== "vision" && modelTier !== "pro") {
        setModelTier("vision");
        storeGigaModel("vision");
      }
    },
    [modelTier]
  );

  const handleOpenSidebar = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onOpenSidebar() {
      setMobileOpen(true);
    }
    window.addEventListener(OPEN_SIDEBAR_EVENT, onOpenSidebar);
    return () => window.removeEventListener(OPEN_SIDEBAR_EVENT, onOpenSidebar);
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
    if (!mounted || !email) return;
    const handoff = consumeGigaLearnChatHandoff();
    if (!handoff) return;

    void changeMode("gigalearn");
    setModelTier("vision");
    storeGigaModel("vision");

    if (handoff.attachment) {
      setHandoffAttachments([handoff.attachment]);
    }

    const applyPrompt = () => {
      if (handoff.prompt) {
        insertRef.current?.(handoff.prompt);
      }
    };

    if (insertRef.current) {
      applyPrompt();
    } else {
      const timer = window.setTimeout(applyPrompt, 120);
      return () => window.clearTimeout(timer);
    }
  }, [mounted, email, changeMode]);

  useEffect(() => {
    if (!mounted || !email) return;
    const handoff = consumePromptChatHandoff();
    if (!handoff?.prompt) return;

    const applyPrompt = () => {
      insertRef.current?.(handoff.prompt);
    };

    if (insertRef.current) {
      applyPrompt();
    } else {
      const timer = window.setTimeout(applyPrompt, 120);
      return () => window.clearTimeout(timer);
    }
  }, [mounted, email]);

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

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      void deleteMessage(messageId);
    },
    [deleteMessage]
  );

  const handleRenameConversation = useCallback(
    (conversationId: string, title: string) => {
      void renameConversation(conversationId, title);
    },
    [renameConversation]
  );

  useEffect(() => {
    if (mounted && !email) router.replace("/chat/login");
  }, [mounted, email, router]);

  useEffect(() => {
    setDismissedError(null);
  }, [error]);

  const visibleError = error && error !== dismissedError ? error : null;

  if (!mounted || !email) {
    return (
      <div className="flex h-full items-center justify-center text-base text-muted">
        Redirecting…
      </div>
    );
  }

  return (
    <>
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
        onRename={(id, title) => handleRenameConversation(id, title)}
        email={email}
        mounted={mounted}
        credits={credits}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
        onInsertPrompt={handleInsertTemplate}
        search={conversationSearch}
        onSearchChange={setConversationSearch}
      />

      <div className="chat-main-column relative z-0 grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <div className="chat-header-band min-w-0 max-w-full shrink-0 overflow-x-clip">
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
            subscriptionActive={subscriptionActive}
            freeOpenAiRemaining={freeOpenAiRemaining}
            modelTier={modelTier}
            onModelTierChange={handleModelTierChange}
            onOpenSidebar={handleOpenSidebar}
            onSetPublicShare={onSetPublicShare}
            chatActionsRef={chatActionsRef}
            searchConversations={searchConversations}
            conversationSearch={conversationSearch}
            onConversationSearchChange={setConversationSearch}
            conversations={conversations}
            activeConversationId={activeId}
            onSelectConversation={(id) => {
              selectConversation(id);
              handleCloseMobile();
            }}
          />

          <ChatBanners
            email={email}
            mounted={mounted}
            hasMessages={messages.length > 0}
            chatProviderLabel={chatProviderLabel}
            usedFallback={usedFallback}
            interestProfileJson={interestProfileJson}
            credits={credits}
            subscriptionActive={subscriptionActive}
          />

          <ChatSegmentNotice message={segmentNotice ?? null} />

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
        </div>

        <ChatConversationPane
          messages={messages}
          mode={mode}
          onModeChange={handleModeChange}
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
          onDeleteMessage={handleDeleteMessage}
          onStopGenerating={() => void stopGenerating()}
          uploadUsage={uploadUsage}
          credits={credits}
          subscriptionActive={subscriptionActive}
          error={visibleError}
          onDismissError={() => setDismissedError(error)}
          onAttachmentsChange={handleAttachmentsChange}
          onSuggestVisionTier={handleSuggestVisionTier}
          initialAttachments={handoffAttachments}
        />
      </div>
    </div>

    {showOnboarding && (
      <OnboardingWizard
        onComplete={(role, stepsSeen) => {
          void completeOnboarding(role, stepsSeen);
        }}
        onDismiss={() => setOnboardingDismissed(true)}
      />
    )}
    </>
  );
}
