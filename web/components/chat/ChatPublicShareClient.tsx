"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { siteConfig } from "@/lib/site";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function PublicShareInner() {
  const params = useSearchParams();
  const token = params.get("t")?.trim() ?? "";

  const meta = useQuery(
    api.conversations.getPublicByShareToken,
    token ? { token } : "skip"
  );
  const rows = useQuery(
    api.messages.listPublicByShareToken,
    token ? { token } : "skip"
  );

  const messages = useMemo(() => {
    if (!rows) return [];
    return rows.map((m: NonNullable<typeof rows>[number]) => ({
      id: String(m._id),
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }, [rows]);

  if (!token) {
    return (
      <ShareState
        title="Missing share link"
        body="This URL is incomplete. Ask the sender for a valid Giga3 AI share link."
      />
    );
  }

  if (meta === undefined || rows === undefined) {
    return (
      <ShareState
        title="Loading shared chat…"
        body="Please wait while we load this conversation."
      />
    );
  }

  if (meta === null) {
    return (
      <ShareState
        title="Link unavailable"
        body="This share link is disabled or no longer exists."
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      <header className="flex min-h-14 items-center gap-3 border-b border-border bg-white px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <BrandLogo size={28} className="!h-7 !w-7" />
          {siteConfig.name}
        </Link>
        <span className="truncate text-sm text-muted">{meta.title}</span>
        <Link
          href="/chat/login"
          className="ml-auto min-h-11 rounded-lg px-3 text-sm font-medium text-accent hover:bg-accent/5"
        >
          Open Giga3 AI
        </Link>
      </header>
      <div className="chat-message-scroll-region flex-1 px-4 py-6 sm:px-6">
        <p className="mb-6 text-center text-sm text-muted">
          Read-only shared conversation · Powered by Giga3 AI
        </p>
        <div className="chat-thread chat-message-stack flex flex-col gap-6">
          {messages.map((m: { id: string; role: "user" | "assistant"; content: string }) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted">{body}</p>
      <Link
        href="/chat/login"
        className="mt-2 min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
      >
        Start chatting
      </Link>
    </div>
  );
}

export function ChatPublicShareRoot() {
  return (
    <ConvexAppShell>
      <Suspense
        fallback={
          <ShareState title="Loading…" body="Preparing shared conversation." />
        }
      >
        <PublicShareInner />
      </Suspense>
    </ConvexAppShell>
  );
}
