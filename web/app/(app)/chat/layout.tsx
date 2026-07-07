import type { Metadata } from "next";
import "@/styles/chat-bundle.css";
import { ChatKeyboardShell } from "@/components/chat/ChatKeyboardShell";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — advanced AI for learning, research, coding, creativity, and productivity",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatKeyboardShell>{children}</ChatKeyboardShell>;
}
