import dynamic from "next/dynamic";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";

const ChatPublicShareRoot = dynamic(
  () =>
    import("@/components/chat/ChatPublicShareClient").then((m) => ({
      default: m.ChatPublicShareRoot,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted">
        Loading shared chat…
      </div>
    ),
  }
);

export default function ChatSharePage() {
  return (
    <ChatErrorBoundary>
      <ChatPublicShareRoot />
    </ChatErrorBoundary>
  );
}
