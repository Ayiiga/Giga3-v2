"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatTypingBar } from "@/components/chat/ChatTypingBar";
import { MessageList, type UiMessage } from "@/components/chat/MessageList";
import { memo, type MutableRefObject } from "react";

interface ChatConversationPaneProps {
  messages: UiMessage[];
  isLoading: boolean;
  isSending: boolean;
  insertRef: MutableRefObject<((text: string) => void) | null>;
  onSend: (msg: string) => void;
  onInsertTemplate: (text: string) => void;
}

function panePropsEqual(
  prev: ChatConversationPaneProps,
  next: ChatConversationPaneProps
): boolean {
  return (
    prev.isLoading === next.isLoading &&
    prev.isSending === next.isSending &&
    prev.messages === next.messages &&
    prev.onSend === next.onSend &&
    prev.onInsertTemplate === next.onInsertTemplate &&
    prev.insertRef === next.insertRef
  );
}

/** Message list + typing + composer — isolated from header/sidebar Convex churn. */
export const ChatConversationPane = memo(function ChatConversationPane({
  messages,
  isLoading,
  isSending,
  insertRef,
  onSend,
  onInsertTemplate,
}: ChatConversationPaneProps) {
  return (
    <>
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onInsertTemplate={onInsertTemplate}
      />
      <ChatTypingBar visible={isSending} />
      <ChatInput insertRef={insertRef} onSend={onSend} disabled={isSending} />
    </>
  );
}, panePropsEqual);
