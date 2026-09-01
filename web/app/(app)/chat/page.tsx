import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { ProductSeoNoscript } from "@/components/seo/ProductSeoNoscript";
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
      <ProductSeoNoscript
        title="Giga3 AI Chat"
        description="Advanced AI chat for learning, research, coding, creativity, and productivity — with education, vision, and creator modes."
        detail="Sign in to save conversations, use credits, and access GigaLearn homework help, Media Studio image links, and workspace tools."
      />
      <ChatPageRoot />
    </ChatErrorBoundary>
  );
}
