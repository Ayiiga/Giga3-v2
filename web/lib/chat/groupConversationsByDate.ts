import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { getModeDefinition, isValidMode } from "@/lib/aiRouter";

export interface ConversationDateGroup {
  label: string;
  conversations: ConversationItem[];
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupLabel(updatedAt: number, now = Date.now()): string {
  const day = startOfDay(updatedAt);
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  if (day >= today) return "Today";
  if (day >= yesterday) return "Yesterday";
  if (day >= weekAgo) return "Previous 7 days";
  return "Older";
}

export function groupConversationsByDate(
  conversations: ConversationItem[]
): ConversationDateGroup[] {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const map = new Map<string, ConversationItem[]>();

  for (const c of sorted) {
    const label = groupLabel(c.updatedAt);
    const list = map.get(label) ?? [];
    list.push(c);
    map.set(label, list);
  }

  const order = ["Today", "Yesterday", "Previous 7 days", "Older"];
  return order
    .filter((label) => map.has(label))
    .map((label) => ({ label, conversations: map.get(label)! }));
}

export function filterConversations(
  conversations: ConversationItem[],
  query: string
): ConversationItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter((c) => {
    const title = (c.title || "Untitled").toLowerCase();
    const modeId = c.mode.toLowerCase();
    const modeLabel = isValidMode(c.mode)
      ? getModeDefinition(c.mode).label.toLowerCase()
      : modeId;
    return title.includes(q) || modeId.includes(q) || modeLabel.includes(q);
  });
}
