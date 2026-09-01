import type { Metadata, Viewport } from "next";
import "@/styles/chat-bundle.css";
import { ChatKeyboardShell } from "@/components/chat/ChatKeyboardShell";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata: Metadata = publicMetadata({
  path: "/chat",
  title: "Giga3 AI Chat — Learning, Research, and Creativity",
  description:
    "Giga3 AI Chat offers Fast, Smart, Vision, and Creator modes for homework help, research, coding, writing, and everyday productivity. Sign in to start a conversation.",
  index: true,
});

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
