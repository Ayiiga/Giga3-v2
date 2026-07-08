import type { ConversationItem } from "@/components/chat/ChatSidebar";

export function conversationsEqual(
  a: ConversationItem[],
  b: ConversationItem[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]._id !== b[i]._id ||
      a[i].title !== b[i].title ||
      a[i].mode !== b[i].mode ||
      a[i].updatedAt !== b[i].updatedAt ||
      a[i].convexConversationId !== b[i].convexConversationId ||
      a[i].sharePublic !== b[i].sharePublic ||
      a[i].shareToken !== b[i].shareToken ||
      a[i].pinned !== b[i].pinned ||
      a[i].archived !== b[i].archived ||
      a[i].isFavorite !== b[i].isFavorite
    ) {
      return false;
    }
  }
  return true;
}
