import {
  COPY_SUCCESS,
  formatMessageForCopy,
  messageHasCopyableContent,
} from "@/lib/chat/chatContentFormat";

export {
  COPY_SUCCESS,
  EXPORT_SUCCESS,
  SHARE_SUCCESS,
  buildPublicShareUrl,
  conversationExportFilename,
  formatConversationForShare,
  formatConversationMarkdown,
  formatMessageForCopy,
  formatMessageForShare,
  messageHasCopyableContent,
} from "@/lib/chat/chatContentFormat";

/** @deprecated Use formatMessageForCopy from chatContentFormat */
export function messagePlainText(
  role: "user" | "assistant",
  content: string,
  options?: { includeRoleLabel?: boolean }
): string {
  return formatMessageForCopy(role, content, {
    includeRoleHeader: options?.includeRoleLabel !== false,
  });
}

export function isMessageCopyable(content: string): boolean {
  return messageHasCopyableContent(content);
}
