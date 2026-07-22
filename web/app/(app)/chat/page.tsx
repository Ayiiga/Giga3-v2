import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";

const ChatPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/chat/ChatPageRoot").then((m) => ({
      default: m.ChatPageRoot,
    }))
  ),
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
      <ChatPageRoot />
    </ChatErrorBoundary>
  );
}
