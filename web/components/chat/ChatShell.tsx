"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ToolSelector } from "@/components/chat/ToolSelector";
import { useChatPlatform } from "@/hooks/useChatPlatform";
import { useBilling } from "@/hooks/useBilling";
import { CreditBadge } from "@/components/billing/CreditBadge";
import { clearUserEmail } from "@/lib/auth";
import { Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ChatShell() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <ConvexAppShell>
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
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            Giga3 AI
          </Link>
          <span className="ml-auto flex items-center gap-2 text-xs text-muted">
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

        <ToolSelector value={mode} onChange={(m) => void changeMode(m)} disabled={isSending} />

        {error && (
          <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <MessageList messages={messages} isTyping={isSending} />
        <ChatInput onSend={(msg) => void sendMessage(msg)} disabled={isSending} />
      </div>
    </div>
    </ConvexAppShell>
  );
}
