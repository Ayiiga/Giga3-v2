import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import dynamic from "next/dynamic";

const ChatShell = dynamic(
  () => import("@/components/chat/ChatShell").then((m) => ({ default: m.ChatShell })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] items-center justify-center text-muted">
        Loading chat…
      </div>
    ),
  }
);

export default function ChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatShell />
    </ChatErrorBoundary>
  );
}
