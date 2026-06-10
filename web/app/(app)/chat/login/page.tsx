import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ChatLoginPageClient = dynamic(
  () =>
    import("@/components/chat/ChatLoginPageClient").then((m) => ({
      default: m.ChatLoginPageClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-muted">
        Loading sign-in…
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Giga3 AI with your email",
};

export default function ChatLoginPage() {
  return <ChatLoginPageClient />;
}
