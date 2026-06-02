import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description: "Giga3 AI — ChatGPT-style assistant with specialized tools",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <div className="dark min-h-screen bg-background text-foreground">{children}</div>
    </ConvexClientProvider>
  );
}
