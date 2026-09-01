import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Shared chat",
  description: "View a shared Giga3 AI conversation.",
  robots: { index: false, follow: false },
};

export default function ChatSharePage() {
  return (
    <ChatErrorBoundary>
      <ChatPublicShareRoot />
    </ChatErrorBoundary>
  );
}
