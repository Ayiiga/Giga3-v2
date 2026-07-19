import type { Metadata, Viewport } from "next";
import "@/styles/chat-bundle.css";
import { ChatKeyboardShell } from "@/components/chat/ChatKeyboardShell";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — advanced AI for learning, research, coding, creativity, and productivity",
};

/** Let the browser shrink the layout viewport when the soft keyboard opens (Android PWA). */
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatKeyboardShell>{children}</ChatKeyboardShell>;
}
