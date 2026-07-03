"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatErrorBanner } from "@/components/chat/ChatErrorBanner";
import { ChatTypingBar } from "@/components/chat/ChatTypingBar";
import { MessageList, type UiMessage } from "@/components/chat/MessageList";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import type { UploadUsageSnapshot } from "@/lib/chat/uploadLimits";
import { memo, type MutableRefObject } from "react";

interface ChatConversationPaneProps {
  messages: UiMessage[];
  isLoading: boolean;
  isSending: boolean;
  awaitingReply?: boolean;
  isAcceptingMessage?: boolean;
  isSlowNetwork?: boolean;
  insertRef: MutableRefObject<((text: string) => void) | null>;
  onSend: (msg: string, attachments?: PreparedChatAttachment[]) => void;
  onInsertTemplate: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onStopGenerating?: () => void;
  uploadUsage?: UploadUsageSnapshot | null;
  error?: string | null;
  onDismissError?: () => void;
}

function panePropsEqual(
  prev: ChatConversationPaneProps,
  next: ChatConversationPaneProps
): boolean {
  return (
    prev.isLoading === next.isLoading &&
    prev.isSending === next.isSending &&
    prev.awaitingReply === next.awaitingReply &&
    prev.isAcceptingMessage === next.isAcceptingMessage &&
    prev.isSlowNetwork === next.isSlowNetwork &&
    prev.messages === next.messages &&
    prev.onSend === next.onSend &&
    prev.onInsertTemplate === next.onInsertTemplate &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEditMessage === next.onEditMessage &&
    prev.onStopGenerating === next.onStopGenerating &&
    prev.uploadUsage === next.uploadUsage &&
    prev.error === next.error &&
    prev.onDismissError === next.onDismissError &&
    prev.insertRef === next.insertRef
  );
}

/** Message list + composer — flex column with guaranteed scroll region on mobile. */
export const ChatConversationPane = memo(function ChatConversationPane({
  messages,
  isLoading,
  isSending,
  awaitingReply = false,
  isAcceptingMessage,
  isSlowNetwork,
  insertRef,
  onSend,
  onInsertTemplate,
  onRegenerate,
  onEditMessage,
  onStopGenerating,
  uploadUsage,
  error,
  onDismissError,
}: ChatConversationPaneProps) {
  const showTyping = awaitingReply || isSending;
  const typingPhase = awaitingReply ? "replying" : "sending";

  return (
    <div className="chat-conversation-grid min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-background">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isSending={isSending}
        isAcceptingMessage={false}
        awaitingReply={awaitingReply}
        onInsertTemplate={onInsertTemplate}
        onRegenerate={onRegenerate}
        onEditMessage={onEditMessage}
      />
      <div className="chat-composer-dock min-w-0 max-w-full border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]">
        {error && (
          <ChatErrorBanner message={error} onDismiss={onDismissError} />
        )}
        <ChatTypingBar
          visible={showTyping}
          slowNetwork={isSlowNetwork}
          phase={typingPhase}
          onStop={awaitingReply ? onStopGenerating : undefined}
        />
        <ChatInput
          insertRef={insertRef}
          onSend={onSend}
          disabled={isSending || awaitingReply}
          uploadUsage={uploadUsage}
        />
      </div>
    </div>
  );
}, panePropsEqual);
