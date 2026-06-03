import dynamic from "next/dynamic";

const ChatShell = dynamic(
  () => import("@/components/chat/ChatShell").then((m) => ({ default: m.ChatShell })),
  { ssr: false, loading: () => <p className="p-6 text-center text-muted">Loading chat…</p> }
);

export default function ChatPage() {
  return <ChatShell />;
}
