"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatDateTimeLabel } from "@/components/chat/ChatDateTimeLabel";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { DocumentTemplatePicker } from "@/components/chat/DocumentTemplatePicker";
import { SlowNetworkBanner } from "@/components/chat/SlowNetworkBanner";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ToolSelector } from "@/components/chat/ToolSelector";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useBilling } from "@/hooks/useBilling";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { clearUserEmail } from "@/lib/auth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu } from "lucide-react";
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
      <div className="flex h-[100dvh] items-center justify-center text-muted">
        Redirecting…
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-2 text-muted">
        <p className="text-sm">Connecting to Giga3…</p>
        <p className="text-xs text-muted/80">Setting up your account</p>
      </div>
    );
  }

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
        <header className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu aria-hidden />
          </button>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <BrandLogo size={28} className="!h-7 !w-7" />
            Giga3 AI
          </Link>
          <span className="ml-auto flex items-center gap-3 text-xs text-muted">
            <ChatDateTimeLabel />
            {usage && <CreditBadge credits={usage.credits} showLabel={false} />}
            {usage?.credits ?? user?.credits ?? "—"} credits
          </span>
          <button
            type="button"
            onClick={() => {
              clearUserEmail();
              router.push("/chat/login");
            }}
            className="text-xs text-muted hover:text-foreground"
          >
            Sign out
          </button>
        </header>

        <SlowNetworkBanner />
        <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />

        <ToolSelector value={mode} onChange={(m) => void changeMode(m)} disabled={isSending} />

        <ToolSelector value={mode} onChange={(m) => void changeMode(m)} disabled={isSending} />

        <DocumentTemplatePicker
          disabled={isSending}
          compact={messages.length > 0}
          onInsert={(text) => {
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
          <p className="border-b border-border bg-red-500/10 px-4 py-2 text-center text-xs text-red-200">
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
