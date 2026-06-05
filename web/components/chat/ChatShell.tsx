"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatBanners } from "@/components/chat/ChatBanners";
import { ChatChrome } from "@/components/chat/ChatChrome";
import { ChatConversationPane } from "@/components/chat/ChatConversationPane";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatWorkspacePanel } from "@/components/chat/ChatWorkspacePanel";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useSupabaseChatPlatform } from "@/hooks/useSupabaseChatPlatform";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ChatShell() {
  if (isSupabaseDataBackend()) {
    return <ChatShellInner usePlatform={useSupabaseChatPlatform} />;
  }

  return (
    <ConvexAppShell>
      <ChatShellInner usePlatform={useChatPlatform} />
    </ConvexAppShell>
  );
}

function ChatShellInner({
  usePlatform,
}: {
  usePlatform: typeof useChatPlatform;
}) {
  useRenderDiagnostic("ChatShellInner");

  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const insertRef = useRef<((text: string) => void) | null>(null);

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

  useEffect(() => {
    if (!email) router.replace("/chat/login");
  }, [email, router]);

  if (!email) {
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
          isSending={isSending}
          credits={credits}
          onOpenSidebar={handleOpenSidebar}
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
        />
      </div>
    </div>
  );
}
