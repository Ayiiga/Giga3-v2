import type { Metadata, Viewport } from "next";
import "@/styles/chat-bundle.css";
import { ChatKeyboardShell } from "@/components/chat/ChatKeyboardShell";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — advanced AI for learning, research, coding, creativity, and productivity",
};

/**
 * Soft keyboard overlays the layout; ChatKeyboardShell + visualViewport chase
 * keep the composer above the keyboard without dual layout resize shake.
 */
export const viewport: Viewport = {
  interactiveWidget: "overlays-content",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatKeyboardShell>{children}</ChatKeyboardShell>;
}
