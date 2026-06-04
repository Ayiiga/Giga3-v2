import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import dynamic from "next/dynamic";

const ChatShell = dynamic(
  () => import("@/components/chat/ChatShell").then((m) => ({ default: m.ChatShell })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted">
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
