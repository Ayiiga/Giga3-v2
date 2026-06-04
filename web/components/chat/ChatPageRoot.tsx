"use client";

import { ChatShell } from "@/components/chat/ChatShell";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";

/** Client entry for /chat — render diagnostics attach here. */
export function ChatPageRoot() {
  useRenderDiagnostic("ChatPage");
  return <ChatShell />;
}
