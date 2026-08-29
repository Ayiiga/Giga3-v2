"use client";

import { ChatShell } from "@/components/chat/ChatShell";

/** Client entry for /chat — render diagnostics attach here. */
export function ChatPageRoot() {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
      <ChatShell />
    </div>
  );
}
