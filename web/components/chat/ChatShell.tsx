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
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/chat/workspacePersist";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
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
import { ChatGuestBrowseView } from "@/components/chat/ChatGuestBrowseView";
import type { UiMessage } from "@/components/chat/MessageList";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { usePlatformProfile } from "@/hooks/usePlatformProfile";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import {
  buildLocationContextLine,
  isNewsOrWeatherIntent,
  needsLocationEnrichment,
  resolveLocalDeviceAnswer,
} from "@/lib/chat/deviceContextIntents";
import { captureCoordinates } from "@/lib/geolocation";
import {
  getDocumentTemplate,
  type DocumentTemplateId,
} from "@/lib/chat/documentTemplates";
import { resolveTemplatePlaceholders } from "@/lib/datetime";
import {
  modelTierForTemplate,
  templateInsertNotice,
  writingModeForTemplate,
} from "@/lib/chat/writingWorkflow";
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [writingNotice, setWritingNotice] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<GigaModelId>("fast");
  const [handoffAttachments, setHandoffAttachments] = useState<PreparedChatAttachment[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [localTurns, setLocalTurns] = useState<UiMessage[]>([]);
  const insertRef = useRef<((text: string) => void) | null>(null);
  const chatActionsRef = useRef<ChatActionsMenuHandle | null>(null);
  const { effectiveOnline } = useEffectiveOnline();

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
    retryOutboxSync,
    liveWebProgress,
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
      setWritingNotice(null);
    } else {
      setTemplateNotice("Could not insert template. Refresh and try again.");
    }
  }, []);

  const handleSelectDocumentTemplate = useCallback(
    (templateId: DocumentTemplateId) => {
      const template = getDocumentTemplate(templateId);
      if (!template) {
        setTemplateNotice("Template not found.");
        return;
      }

      const nextMode = writingModeForTemplate(templateId);
      if (nextMode) {
        void changeMode(nextMode);
      }

      const nextTier = modelTierForTemplate(templateId);
      if (nextTier) {
        setModelTier(nextTier);
        storeGigaModel(nextTier);
      }

      const body = resolveTemplatePlaceholders(template.body);
      if (insertRef.current) {
        insertRef.current(body);
        setTemplateNotice(null);
        setWritingNotice(templateInsertNotice(templateId));
      } else {
        setTemplateNotice("Could not insert template. Refresh and try again.");
      }
    },
    [changeMode]
  );

  useEffect(() => {
    setLocalTurns([]);
  }, [activeId]);

  const appendLocalTurn = useCallback((userText: string, assistantText: string) => {
    const now = Date.now();
    setLocalTurns((prev) => [
      ...prev,
      {
        id: `local-user-${now}`,
        role: "user",
        content: userText,
        createdAt: now,
      },
      {
        id: `local-assistant-${now}`,
        role: "assistant",
        content: assistantText,
        createdAt: now + 1,
      },
    ]);
  }, []);

  const displayMessages = useMemo(
    () => (localTurns.length ? [...messages, ...localTurns] : messages),
    [localTurns, messages]
  );

  const handleSend = useCallback(
    (
      msg: string,
      attachments?: import("@/lib/chat/multimodalAttachments").PreparedChatAttachment[]
    ) => {
      void (async () => {
        const trimmed = msg.trim();
        if (!trimmed && !attachments?.length) return;

        // Device/calendar/clock/connectivity answers use browser APIs — work offline too.
        if (trimmed && !attachments?.length) {
          const local = await resolveLocalDeviceAnswer(trimmed);
          if (local) {
            appendLocalTurn(trimmed, local.answer);
            return;
          }
        }

        if (!effectiveOnline) {
          appendLocalTurn(
            trimmed || "(attachment)",
            isNewsOrWeatherIntent(trimmed)
              ? "Live news and weather need an internet connection. You’re offline right now — I can still answer date, time, timezone, and basic device questions from this device."
              : "You’re offline. I can still answer date, time, timezone, and basic device questions locally. Reconnect to send this to Giga3 AI."
          );
          return;
        }

        let wire = trimmed;
        if (trimmed && !attachments?.length && needsLocationEnrichment(trimmed)) {
          try {
            const coords = await captureCoordinates();
            wire = `${trimmed}\n\n${buildLocationContextLine(coords.latitude, coords.longitude)}`;
          } catch {
            // Permission denied or unavailable — continue without location.
          }
        }

        void sendMessage(wire || msg, attachments, modelTier);
      })();
    },
    [appendLocalTurn, effectiveOnline, modelTier, sendMessage]
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
    setSidebarCollapsed((c) => {
      const next = !c;
      writeSidebarCollapsed(next);
      return next;
    });
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
    setDismissedError(null);
  }, [error]);

  const visibleError = error && error !== dismissedError ? error : null;

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center text-base text-muted">
        Loading chat…
      </div>
    );
  }

  if (!email) {
    return <ChatGuestBrowseView />;
  }

  return (
    <>
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 overflow-hidden bg-background">
      <ChatOverflowProbe messageCount={displayMessages.length} />
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
            messages={displayMessages}
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
            mode={mode}
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
            hasMessages={displayMessages.length > 0}
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
            hasMessages={displayMessages.length > 0}
            sourceImageUrl={latestImageUrl}
            onSelectDocumentTemplate={handleSelectDocumentTemplate}
            onInsertChatText={handleInsertDocument}
            onError={handleTemplateError}
          />

          {writingNotice && (
            <p className="border-b border-accent/20 bg-accent/10 px-4 py-2.5 text-center text-sm text-foreground">
              {writingNotice}
            </p>
          )}

          {templateNotice && (
            <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-200">
              {templateNotice}
            </p>
          )}
        </div>

        <ChatConversationPane
          messages={displayMessages}
          mode={mode}
          onModeChange={handleModeChange}
          isLoading={messagesLoading}
          isSending={isSending}
          awaitingReply={awaitingReply}
          isAcceptingMessage={isAcceptingMessage}
          isSlowNetwork={isSlowNetwork}
          onRetryOutboxSync={retryOutboxSync}
          insertRef={insertRef}
          onSend={handleSend}
          onInsertTemplate={handleInsertTemplate}
          onSelectDocumentTemplate={handleSelectDocumentTemplate}
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
          conversationId={activeId}
          online={effectiveOnline}
          liveWebProgress={liveWebProgress}
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
