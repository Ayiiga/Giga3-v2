"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatTypingBar } from "@/components/chat/ChatTypingBar";
import { MessageList, type UiMessage } from "@/components/chat/MessageList";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import type { UploadUsageSnapshot } from "@/lib/chat/uploadLimits";
import { memo, type MutableRefObject } from "react";

interface ChatConversationPaneProps {
  messages: UiMessage[];
  isLoading: boolean;
  isSending: boolean;
  insertRef: MutableRefObject<((text: string) => void) | null>;
  onSend: (msg: string, attachments?: PreparedChatAttachment[]) => void;
  onInsertTemplate: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  uploadUsage?: UploadUsageSnapshot | null;
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
    prev.onRegenerate === next.onRegenerate &&
    prev.uploadUsage === next.uploadUsage &&
    prev.insertRef === next.insertRef
  );
}

/** Message list + composer — flex column with guaranteed scroll region on mobile. */
export const ChatConversationPane = memo(function ChatConversationPane({
  messages,
  isLoading,
  isSending,
  insertRef,
  onSend,
  onInsertTemplate,
  onRegenerate,
  uploadUsage,
}: ChatConversationPaneProps) {
  return (
    <div className="chat-conversation-grid min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-background">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onInsertTemplate={onInsertTemplate}
        onRegenerate={onRegenerate}
      />
      <div className="chat-composer-dock min-w-0 max-w-full border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]">
        <ChatTypingBar visible={isSending} />
        <ChatInput
          insertRef={insertRef}
          onSend={onSend}
          disabled={isSending}
          uploadUsage={uploadUsage}
        />
      </div>
    </div>
  );
}, panePropsEqual);
