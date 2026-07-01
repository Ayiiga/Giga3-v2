import type { Metadata } from "next";
import "@/styles/chat-bundle.css";
import { ChatBundlePrefetch } from "@/components/chat/ChatBundlePrefetch";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — advanced AI for learning, research, coding, creativity, and productivity",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="chat-stable fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-background text-foreground">
      <ChatBundlePrefetch />
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
