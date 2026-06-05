"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { useStableConversations } from "@/hooks/useStableConversations";
import { useStableUiMessages } from "@/hooks/useStableUiMessages";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import { getUserEmail } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import {
  appendSupabaseMessage,
  createSupabaseChat,
  ensureSupabaseUser,
  getSupabaseInterestProfile,
  listSupabaseChats,
  listSupabaseMessages,
  replaceSupabaseMessages,
  removeSupabaseChat,
  updateSupabaseChat,
} from "@/lib/supabase/data";
import { syncSupabaseAuthToLocalEmail } from "@/lib/supabase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CHAT_ACTION_TIMEOUT_MS = 75_000;

type MessageRow = { _id: string; role: string; content: string; createdAt?: number };
type ConvexSendResult = {
  chatProviderLabel?: string;
  usedFallback?: boolean;
};

function makeTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : "");
}

async function createConvexConversation(userId: string, mode: string): Promise<string> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Convex URL is required while Supabase chat is in migration mode.");
  return await convexHttpCall<string>(
    convexUrl,
    "mutation",
    "conversations:create",
    { userId, mode },
    { timeoutMs: 20_000, retries: 1 }
  );
}

async function sendConvexMessage(args: {
  userId: string;
  conversationId: string;
  content: string;
  mode: string;
}) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Convex URL is required while Supabase chat is in migration mode.");
  return await convexHttpCall<ConvexSendResult>(
    convexUrl,
    "action",
    "platformActions:sendMessage",
    args,
    { timeoutMs: CHAT_ACTION_TIMEOUT_MS, retries: 1 }
  );
}

async function fetchConvexMessages(userId: string, conversationId: string) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) return [];
  return await convexHttpCall<MessageRow[]>(
    convexUrl,
    "query",
    "messages:listByConversation",
    { userId, conversationId },
    { timeoutMs: 20_000, retries: 1 }
  );
}

export function useSupabaseChatPlatform() {
  const [email, setEmail] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatProviderLabel, setChatProviderLabel] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [interestProfileJson, setInterestProfileJson] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [conversationsRaw, setConversationsRaw] = useState<ConversationItem[] | undefined>();
  const [messagesRaw, setMessagesRaw] = useState<MessageRow[] | undefined>();
  const loadingConversationsRef = useRef(false);
  const loadingMessagesRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    void syncSupabaseAuthToLocalEmail()
      .then((syncedEmail) => setEmail(syncedEmail ?? getUserEmail()))
      .catch(() => setEmail(getUserEmail()));
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!email || loadingConversationsRef.current) return;
    loadingConversationsRef.current = true;
    try {
      const user = await ensureSupabaseUser(email);
      setCredits(user.credits);
      setInterestProfileJson(await getSupabaseInterestProfile(email));
      setConversationsRaw(await listSupabaseChats(email));
    } finally {
      loadingConversationsRef.current = false;
    }
  }, [email]);

  const refreshMessages = useCallback(async () => {
    if (!activeId || loadingMessagesRef.current) return;
    loadingMessagesRef.current = true;
    try {
      setMessagesRaw(await listSupabaseMessages(activeId));
    } finally {
      loadingMessagesRef.current = false;
    }
  }, [activeId]);

  useEffect(() => {
    if (!mounted || !email) return;
    void refreshConversations().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load Supabase chats.");
    });
  }, [mounted, email, refreshConversations]);

  const conversations = useStableConversations(conversationsRaw);
  const messages = useStableUiMessages(messagesRaw, pendingUserText);

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
    if (!activeId) {
      setMessagesRaw([]);
      return;
    }
    void refreshMessages().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load Supabase messages.");
    });
  }, [activeId, refreshMessages]);

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
    if (synced) setPendingUserText(null);
  }, [messagesRaw, pendingUserText]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c._id === activeId) ?? null,
    [conversations, activeId]
  );

  const startNewChat = useCallback(async () => {
    if (!email) return;
    setError(null);
    const chat = await createSupabaseChat(email, mode);
    setConversationsRaw((prev) => [chat, ...(prev ?? [])]);
    setActiveId(chat._id);
  }, [email, mode]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
    setPendingUserText(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await removeSupabaseChat(id);
      setConversationsRaw((prev) => (prev ?? []).filter((c) => c._id !== id));
      if (activeId === id) {
        setActiveId(null);
        setPendingUserText(null);
      }
    },
    [activeId]
  );

  const changeMode = useCallback(
    async (next: AiModeId) => {
      setMode(next);
      if (!activeId) return;
      const updated = await updateSupabaseChat(activeId, { mode: next });
      if (updated) {
        setConversationsRaw((prev) =>
          (prev ?? []).map((c) => (c._id === updated._id ? updated : c))
        );
      }
    },
    [activeId]
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
        let chat = activeConversation;
        if (!chat) {
          chat = await createSupabaseChat(email, mode);
          setConversationsRaw((prev) => [chat as ConversationItem, ...(prev ?? [])]);
          setActiveId(chat._id);
        }

        await appendSupabaseMessage(chat._id, "user", content);
        setMessagesRaw(await listSupabaseMessages(chat._id));

        let convexConversationId = chat.convexConversationId ?? null;
        if (!convexConversationId) {
          convexConversationId = await createConvexConversation(email, mode);
          const updated = await updateSupabaseChat(chat._id, {
            convexConversationId,
          });
          if (updated) chat = updated;
        }

        const result = await sendConvexMessage({
          userId: email,
          conversationId: convexConversationId,
          content,
          mode,
        });
        const convexMessages = await fetchConvexMessages(email, convexConversationId);
        await replaceSupabaseMessages(chat._id, convexMessages);

        const title =
          chat.title === "New chat" || chat.title.endsWith("…")
            ? makeTitle(content)
            : chat.title;
        const updated = await updateSupabaseChat(chat._id, {
          title,
          convexConversationId,
        });
        if (updated) {
          setConversationsRaw((prev) =>
            [updated, ...(prev ?? []).filter((c) => c._id !== updated._id)].sort(
              (a, b) => b.updatedAt - a.updatedAt
            )
          );
        }
        setMessagesRaw(await listSupabaseMessages(chat._id));
        setChatProviderLabel(
          typeof result.chatProviderLabel === "string" ? result.chatProviderLabel : null
        );
        setUsedFallback(Boolean(result.usedFallback));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
        setPendingUserText(null);
      } finally {
        setIsSending(false);
      }
    },
    [email, activeConversation, mode]
  );

  return {
    email,
    mounted,
    conversations,
    conversationsLoading: conversationsRaw === undefined,
    messagesLoading: Boolean(activeId) && messagesRaw === undefined,
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

