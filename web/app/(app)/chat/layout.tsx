import type { Metadata, Viewport } from "next";
import "@/styles/chat-bundle.css";
import { ChatKeyboardShell } from "@/components/chat/ChatKeyboardShell";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — advanced AI for learning, research, coding, creativity, and productivity",
};

/**
 * Soft keyboard should resize the layout on chat so the composer stays visible
 * (Android/iOS PWA). ChatKeyboardShell still pins to visualViewport and lifts
 * the dock when the layout does not shrink.
 */
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
