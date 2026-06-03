"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatDateTimeLabel } from "@/components/chat/ChatDateTimeLabel";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { ChatWorkspacePanel } from "@/components/chat/ChatWorkspacePanel";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useBilling } from "@/hooks/useBilling";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { clearUserEmail } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function ChatShell() {
  return (
    <ConvexAppShell>
      <ChatShellInner />
    </ConvexAppShell>
  );
}

function ChatShellInner() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const insertRef = useRef<((text: string) => void) | null>(null);

  const {
    email,
    user,
    conversations,
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
  const { usage } = useBilling();

  useEffect(() => {
    if (!email) router.replace("/chat/login");
  }, [email, router]);

  if (!email) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-base text-muted">
        Redirecting…
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 text-muted">
        <p className="text-base font-medium">Connecting to Giga3…</p>
        <p className="text-sm text-muted/80">Setting up your account</p>
      </div>
    );
  }

  const navLink =
    "hidden rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={() => void startNewChat()}
        onDelete={(id) => void deleteConversation(id)}
        credits={usage?.credits ?? user?.credits ?? null}
        email={email}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-black/30 px-3 py-3 backdrop-blur-md sm:gap-3 sm:px-5 sm:py-3.5">
          <button
            type="button"
            className="rounded-xl p-2.5 text-muted hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <Link href="/" className="flex items-center gap-2.5 text-base font-bold sm:text-lg">
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
            <ChatDateTimeLabel />
            {usage && <CreditBadge credits={usage.credits} showLabel={false} />}
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-200 ring-1 ring-violet-500/30">
              {usage?.credits ?? user?.credits ?? "—"} credits
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              clearUserEmail();
              router.push("/chat/login");
            }}
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground"
          >
            Sign out
          </button>
        </header>

        <SlowNetworkBanner />
        <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />

        <ChatWorkspacePanel
          mode={mode}
          onModeChange={(m) => void changeMode(m)}
          disabled={isSending}
          hasMessages={messages.length > 0}
          onInsertDocument={(text) => {
            if (insertRef.current) {
              insertRef.current(text);
              setTemplateNotice(null);
            } else {
              setTemplateNotice("Could not insert template. Refresh and try again.");
            }
          }}
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
          isTyping={isSending}
          onInsertTemplate={(text) => insertRef.current?.(text)}
        />
        <ChatInput
          insertRef={insertRef}
          onSend={(msg) => void sendMessage(msg)}
          disabled={isSending}
        />
      </div>
    </div>
  );
}
