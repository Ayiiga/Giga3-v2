"use client";

import type { UiMessage } from "@/components/chat/MessageList";
import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { getUserEmail } from "@/lib/auth";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHAT_ACTION_TIMEOUT_MS = 75_000;

function toUiMessages(
  rows: { _id: string; role: string; content: string; createdAt?: number }[]
): UiMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r._id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : undefined,
    }));
}

function withClientTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export function useChatPlatform() {
  const [email, setEmail] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<Id<"conversations"> | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatProviderLabel, setChatProviderLabel] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEmail(getUserEmail());
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
  const sendMessageAction = useAction(api.platformActions.sendMessage);
  const createUser = useMutation(api.users.createUser);

  const conversationsLoading = conversationsRaw === undefined;
  const messagesLoading =
    Boolean(activeId) && messagesRaw === undefined && mounted && Boolean(email);

  const conversations: ConversationItem[] = useMemo(
    () => (conversationsRaw ?? []) as ConversationItem[],
    [conversationsRaw]
  );

  const messages = useMemo(() => {
    const base = toUiMessages(messagesRaw ?? []);
    if (!pendingUserText) return base;
    const last = base[base.length - 1];
    if (last?.role === "user" && last.content === pendingUserText) {
      return base;
    }
    return [
      ...base,
      {
        id: "pending-user",
        role: "user" as const,
        content: pendingUserText,
      },
    ];
  }, [messagesRaw, pendingUserText]);

  useEffect(() => {
    if (!email) return;
    if (user === null) {
      void createUser({ email });
    }
  }, [email, user, createUser]);

  const syncedActiveRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversations.length === 0) {
      if (activeId !== null) setActiveId(null);
      syncedActiveRef.current = null;
      return;
    }
    const firstId = conversations[0]._id;
    const activeStillExists =
      activeId !== null && conversations.some((c) => c._id === activeId);
    if (!activeStillExists && syncedActiveRef.current !== firstId) {
      syncedActiveRef.current = firstId;
      setActiveId(firstId);
    }
  }, [conversations, activeId]);

  const lastModeSyncRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeId || !conversations.length) return;
    const conv = conversations.find((c) => c._id === activeId);
    if (!conv || !isValidMode(conv.mode)) return;
    const key = `${activeId}:${conv.mode}`;
    if (lastModeSyncRef.current === key) return;
    lastModeSyncRef.current = key;
    setMode((prev) => (prev === conv.mode ? prev : conv.mode));
  }, [activeId, conversations]);

  useEffect(() => {
    if (!pendingUserText || !messagesRaw) return;
    const synced = messagesRaw.some(
      (m) => m.role === "user" && m.content === pendingUserText
    );
    if (synced) {
      setPendingUserText(null);
    }
  }, [messagesRaw, pendingUserText]);

  const startNewChat = useCallback(async () => {
    if (!email) return;
    setError(null);
    const id = await createConversation({ userId: email, mode });
    setActiveId(id);
  }, [email, createConversation, mode]);

  const selectConversation = useCallback((id: Id<"conversations">) => {
    setActiveId(id);
    setError(null);
    setPendingUserText(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: Id<"conversations">) => {
      if (!email) return;
      await removeConversation({ conversationId: id, userId: email });
      if (activeId === id) {
        setActiveId(null);
        setPendingUserText(null);
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
      setPendingUserText(content);
      setIsSending(true);

      try {
        let conversationId = activeId;
        if (!conversationId) {
          conversationId = await createConversation({ userId: email, mode });
          setActiveId(conversationId);
        }

        const result = await withClientTimeout(
          sendMessageAction({
            userId: email,
            conversationId,
            content,
            mode,
          }),
          CHAT_ACTION_TIMEOUT_MS,
          "Chat is taking longer than usual on this connection. Your message was saved — please try sending again in a moment."
        );
        setChatProviderLabel(
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null
        );
        setUsedFallback(Boolean(result.usedFallback));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send");
        setPendingUserText(null);
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
    conversationsLoading,
    messagesLoading,
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
    chatProviderLabel,
    usedFallback,
  };
}
