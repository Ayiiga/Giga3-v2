import type { UiMessage } from "@/components/chat/MessageList";

export type MessageDateGroup = {
  label: string;
  messages: UiMessage[];
};

function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupLabel(ts: number, now = Date.now()): string {
  const day = dayStart(ts);
  const today = dayStart(now);
  const yesterday = today - 86_400_000;
  if (day >= today) return "Today";
  if (day >= yesterday) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: new Date(ts).getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  });
}

export function groupMessagesByDate(messages: UiMessage[]): MessageDateGroup[] {
  const groups: MessageDateGroup[] = [];
  for (const message of messages) {
    const ts = message.createdAt ?? Date.now();
    const label = groupLabel(ts);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.messages.push(message);
    } else {
      groups.push({ label, messages: [message] });
    }
  }
  return groups;
}

export function formatMessageTime(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
