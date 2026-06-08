import type { Metadata } from "next";

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
    <div className="chat-stable fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
