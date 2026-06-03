"use client";

import { ChatLoginForm } from "@/components/chat/ChatLoginForm";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

export function ChatLoginPageClient() {
  return (
    <ConvexAppShell>
      <ChatLoginForm />
    </ConvexAppShell>
  );
}
