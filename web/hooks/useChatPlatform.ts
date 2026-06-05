"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { useStableConversations } from "@/hooks/useStableConversations";
import { useStableUiMessages } from "@/hooks/useStableUiMessages";
import { getUserEmail } from "@/lib/auth";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHAT_ACTION_TIMEOUT_MS = 75_000;

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatProviderLabel, setChatProviderLabel] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [mounted, setMounted] = useState(false);
  const createUserAttempted = useRef(false);
  const creditsCacheRef = useRef<number | null>(null);
  const interestProfileCacheRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setEmail(getUserEmail());
  }, []);

  const emailQueryArgs = useMemo(
    () => (mounted && email ? { email } : ("skip" as const)),
    [mounted, email]
  );
  const conversationsQueryArgs = useMemo(
    () => (mounted && email ? { userId: email } : ("skip" as const)),
    [mounted, email]
  );
  const messagesQueryArgs = useMemo(
    () =>
      mounted && email && activeId
        ? { conversationId: activeId as Id<"conversations">, userId: email }
        : ("skip" as const),
    [mounted, email, activeId]
  );

  /** Credits-only probe for user existence — not full getUser (avoids shell churn). */
  const chatCreditsRow = useQuery(api.users.getChatCredits, emailQueryArgs);
  const interestProfileRow = useQuery(api.users.getInterestProfile, emailQueryArgs);
  const conversationsRaw = useQuery(api.conversations.list, conversationsQueryArgs);
  const messagesRaw = useQuery(api.messages.listByConversation, messagesQueryArgs);
  const credits =
    chatCreditsRow === undefined
      ? creditsCacheRef.current
      : chatCreditsRow === null
        ? null
        : chatCreditsRow.credits;

  if (chatCreditsRow !== undefined) {
    creditsCacheRef.current = credits;
  }

  const interestProfileJson =
    interestProfileRow === undefined
      ? interestProfileCacheRef.current
      : interestProfileRow?.interestProfile ?? null;

  if (interestProfileRow !== undefined) {
    interestProfileCacheRef.current = interestProfileJson;
  }

  const createConversation = useMutation(api.conversations.create);
  const removeConversation = useMutation(api.conversations.remove);
  const setConversationMode = useMutation(api.conversations.setMode);
  const sendMessageAction = useAction(api.platformActions.sendMessage);
  const createUser = useMutation(api.users.createUser);

  const conversationsLoading = conversationsRaw === undefined;
  const messagesLoading =
    Boolean(activeId) && messagesRaw === undefined && mounted && Boolean(email);

  const conversations = useStableConversations(
    conversationsRaw as ConversationItem[] | undefined
  );

  const messages = useStableUiMessages(messagesRaw, pendingUserText);

  useEffect(() => {
    if (!email || chatCreditsRow === undefined || createUserAttempted.current) {
      return;
    }
    if (chatCreditsRow !== null) return;
    createUserAttempted.current = true;
    void createUser({ email });
  }, [email, chatCreditsRow, createUser]);

  useEffect(() => {
    if (conversations.length === 0) {
      setActiveId((prev) => (prev ? null : prev));
      return;
    }
    setActiveId((prev) => {
      if (prev && conversations.some((c) => c._id === prev)) return prev;
      return conversations[0]._id;
    });
  }, [conversations]);

  useEffect(() => {
    if (!activeId || !conversations.length) return;
    const conv = conversations.find((c) => c._id === activeId);
    if (conv && isValidMode(conv.mode)) {
      setMode((prev) => (prev === conv.mode ? prev : conv.mode));
    }
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

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
    setPendingUserText(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!email) return;
      await removeConversation({ conversationId: id as Id<"conversations">, userId: email });
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
        conversationId: activeId as Id<"conversations">,
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
            conversationId: conversationId as Id<"conversations">,
            content,
            mode,
          }),
          CHAT_ACTION_TIMEOUT_MS,
          "Chat is taking longer than usual on this connection. Your message was saved — please try sending again in a moment."
        );
        const nextLabel =
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null;
        const nextFallback = Boolean(result.usedFallback);
        setChatProviderLabel((prev) => (prev === nextLabel ? prev : nextLabel));
        setUsedFallback((prev) => (prev === nextFallback ? prev : nextFallback));
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
    mounted,
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
    credits,
    interestProfileJson,
  };
}
