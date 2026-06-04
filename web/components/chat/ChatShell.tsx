"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatDateTimeLabel } from "@/components/chat/ChatDateTimeLabel";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { ChatWorkspacePanel } from "@/components/chat/ChatWorkspacePanel";
import { UserLearningBanner } from "@/components/chat/UserLearningBanner";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { clearUserEmail } from "@/lib/auth";
import { probeRender } from "@/lib/debug/renderProbe";
import { siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";
import { Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ChatShell() {
  return (
    <ConvexAppShell>
      <ChatShellInner />
    </ConvexAppShell>
  );
}

function ChatShellInner() {
  probeRender("ChatShellInner");

  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const insertRef = useRef<((text: string) => void) | null>(null);

  const {
    email,
    user,
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
  } = useChatPlatform();

  const credits = user?.credits ?? null;
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

  useEffect(() => {
    if (!email) router.replace("/chat/login");
  }, [email, router]);

  if (!email) {
    return (
      <div className="flex h-dvh items-center justify-center text-base text-muted">
        Redirecting…
      </div>
    );
  }

  const navLink =
    "hidden rounded-xl px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-zinc-100 sm:inline-flex sm:items-center sm:gap-1.5";

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={() => void startNewChat()}
        onDelete={(id) => void deleteConversation(id)}
        credits={credits}
        email={email}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="chat-header-stable flex min-h-[3.75rem] flex-wrap items-center gap-2 border-b border-border bg-white px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
          <button
            type="button"
            className="rounded-xl p-2.5 text-foreground hover:bg-zinc-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
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
              conversationTitle={activeConversation?.title}
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
              clearUserEmail();
              router.push("/chat/login");
            }}
            className="rounded-xl px-3 py-2 text-sm font-bold text-foreground hover:bg-zinc-100"
          >
            Sign out
          </button>
        </header>

        <SlowNetworkBanner />
        <UserLearningBanner interestProfileJson={user?.interestProfile} />
        <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />

        <ChatWorkspacePanel
          mode={mode}
          onModeChange={(m) => void changeMode(m)}
          disabled={isSending}
          hasMessages={messages.length > 0}
          onInsertDocument={handleInsertDocument}
          onError={(msg) => setTemplateNotice(msg)}
        />

        {templateNotice && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-200">
            {templateNotice}
          </p>
        )}

        {error && <ChatErrorBanner message={error} />}

        <MessageList
          messages={messages}
          isLoading={messagesLoading}
          isTyping={isSending}
          onInsertTemplate={handleInsertTemplate}
        />
        <ChatInput
          insertRef={insertRef}
          onSend={handleSend}
          disabled={isSending}
        />
      </div>
    </div>
  );
}
