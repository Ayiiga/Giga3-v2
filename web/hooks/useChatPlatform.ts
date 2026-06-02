"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { getUserEmail } from "@/lib/auth";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

function toUiMessages(
  rows: { _id: string; role: string; content: string }[]
): UiMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r._id,
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
}

export function useChatPlatform() {
  const email = getUserEmail();
  const [activeId, setActiveId] = useState<Id<"conversations"> | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = useQuery(
    api.users.getUser,
    mounted && email ? { email } : "skip"
  );
  const conversationsRaw = useQuery(
    api.conversations.list,
    mounted && email ? { userId: email } : "skip"
  );
  const messagesRaw = useQuery(
    api.messages.listByConversation,
    mounted && email && activeId
      ? { conversationId: activeId, userId: email }
      : "skip"
  );

  const createConversation = useMutation(api.conversations.create);
  const removeConversation = useMutation(api.conversations.remove);
  const setConversationMode = useMutation(api.conversations.setMode);
  const sendMessageAction = useAction(api.platform.sendMessage);
  const createUser = useMutation(api.users.createUser);

  const conversations: ConversationItem[] = useMemo(
    () => (conversationsRaw ?? []) as ConversationItem[],
    [conversationsRaw]
  );

  const messages = useMemo(
    () => toUiMessages(messagesRaw ?? []),
    [messagesRaw]
  );

  useEffect(() => {
    if (!email) return;
    if (!user) {
      void createUser({ email });
    }
  }, [email, user, createUser]);

  useEffect(() => {
    if (conversations.length > 0 && !activeId) {
      setActiveId(conversations[0]._id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId || !conversations.length) return;
    const conv = conversations.find((c) => c._id === activeId);
    if (conv && isValidMode(conv.mode)) {
      setMode(conv.mode);
    }
  }, [activeId, conversations]);

  const startNewChat = useCallback(async () => {
    if (!email) return;
    setError(null);
    const id = await createConversation({ userId: email, mode });
    setActiveId(id);
  }, [email, createConversation, mode]);

  const selectConversation = useCallback((id: Id<"conversations">) => {
    setActiveId(id);
    setError(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: Id<"conversations">) => {
      if (!email) return;
      await removeConversation({ conversationId: id, userId: email });
      if (activeId === id) {
        setActiveId(null);
      }
    },
    [email, removeConversation, activeId]
  );

  const changeMode = useCallback(
    async (next: AiModeId) => {
      setMode(next);
      if (!email || !activeId) return;
      await setConversationMode({
        conversationId: activeId,
        userId: email,
        mode: next,
      });
    },
    [email, activeId, setConversationMode]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!email) {
        setError("Please sign in");
        return;
      }
      setError(null);
      setIsSending(true);

      try {
        let conversationId = activeId;
        if (!conversationId) {
          conversationId = await createConversation({ userId: email, mode });
          setActiveId(conversationId);
        }

        await sendMessageAction({
          userId: email,
          conversationId,
          content,
          mode,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send");
      } finally {
        setIsSending(false);
      }
    },
    [email, activeId, mode, createConversation, sendMessageAction]
  );

  return {
    email,
    user,
    conversations,
    activeId,
    messages,
    mode,
    isSending,
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    setActiveId,
  };
}
