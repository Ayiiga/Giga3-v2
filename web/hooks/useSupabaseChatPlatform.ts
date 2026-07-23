"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { useStableConversations } from "@/hooks/useStableConversations";
import { useStableUiMessages } from "@/hooks/useStableUiMessages";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import {
  bumpOutboxAttempt,
  enqueueOutbox,
  listOutbox,
  newClientRequestId,
  registerChatOutboxSync,
  removeOutbox,
  type OutboxEntry,
} from "@/lib/chat/offlineOutbox";
import { emitOutboxStatus } from "@/lib/chat/outboxEvents";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import { chatSystemForModel, gigaModelForMode, type GigaModelId } from "@/lib/chat/gigaModels";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import {
  acceptTimeoutMs,
  CHAT_REGENERATE_TIMEOUT_MS,
  CHAT_REPLY_POLL_MS,
  CHAT_REPLY_POLL_SLOW_MS,
  maxSendRetries,
  replyWaitMs,
  RETRY_BASE_MS,
  RETRY_BASE_SLOW_MS,
} from "@/lib/chat/chatNetwork";
import { toUserFacingError } from "@/lib/errors/userMessage";
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
import {
  CHAT_SEGMENT_NOTICE,
  continuedConversationTitle,
} from "@/lib/chat/chatSegmentation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MessageRow = { _id: string; role: string; content: string; createdAt?: number };
type ConvexSendResult = {
  status?: "processing" | "complete";
  conversationId?: string;
  chatProviderLabel?: string;
  usedFallback?: boolean;
  segmented?: boolean;
};

function countAssistantMessages(rows: MessageRow[] | undefined): number {
  return rows?.filter((m) => m.role === "assistant").length ?? 0;
}

function makeTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : "");
}

async function createConvexConversation(sessionToken: string, mode: string): Promise<string> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Convex URL is required while Supabase chat is in migration mode.");
  return await convexHttpCall<string>(
    convexUrl,
    "mutation",
    "conversations:create",
    { sessionToken, mode },
    { timeoutMs: 20_000, retries: 1 }
  );
}

async function sendConvexMessage(
  args: {
    sessionToken: string;
    conversationId: string;
    content: string;
    mode: string;
    chatSystem?: GigaModelId;
    attachments?: Omit<PreparedChatAttachment, "previewUrl">[];
  },
  slowNetwork: boolean
) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Convex URL is required while Supabase chat is in migration mode.");
  const hasImages = args.attachments?.some((a) => a.kind === "image") ?? false;
  return await convexHttpCall<ConvexSendResult>(
    convexUrl,
    "mutation",
    "chatMessaging:acceptMessage",
    args,
    {
      timeoutMs: acceptTimeoutMs(slowNetwork, hasImages),
      retries: slowNetwork ? 2 : 1,
    }
  );
}

async function sendConvexMessageWithRetry(
  args: Parameters<typeof sendConvexMessage>[0],
  slowNetwork: boolean,
  attempt = 0
): Promise<ConvexSendResult> {
  try {
    return await sendConvexMessage(args, slowNetwork);
  } catch (e) {
    const maxRetries = maxSendRetries(slowNetwork);
    const shouldRetry =
      attempt < maxRetries - 1 &&
      typeof navigator !== "undefined" &&
      navigator.onLine;
    if (shouldRetry) {
      const retryBase = slowNetwork ? RETRY_BASE_SLOW_MS : RETRY_BASE_MS;
      await new Promise((resolve) => setTimeout(resolve, retryBase * 2 ** attempt));
      return sendConvexMessageWithRetry(args, slowNetwork, attempt + 1);
    }
    throw e;
  }
}

async function waitForAssistantReply(
  sessionToken: string,
  conversationId: string,
  baselineAssistants: number,
  maxWaitMs: number,
  slowNetwork: boolean
): Promise<MessageRow[]> {
  const started = Date.now();
  const pollMs = slowNetwork ? CHAT_REPLY_POLL_SLOW_MS : CHAT_REPLY_POLL_MS;
  while (Date.now() - started < maxWaitMs) {
    const messages = await fetchConvexMessages(sessionToken, conversationId, slowNetwork);
    if (countAssistantMessages(messages) > baselineAssistants) return messages;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(
    "Reply is taking longer on this connection. Your message was saved — please wait or try again."
  );
}

async function regenerateConvexMessage(args: {
  sessionToken: string;
  conversationId: string;
  assistantMessageId: string;
  mode: string;
}) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Convex URL is required while Supabase chat is in migration mode.");
  return await convexHttpCall<ConvexSendResult>(
    convexUrl,
    "action",
    "platformActions:regenerateMessage",
    args,
    { timeoutMs: CHAT_REGENERATE_TIMEOUT_MS, retries: 1 }
  );
}

async function fetchConvexMessages(
  sessionToken: string,
  conversationId: string,
  slowNetwork = false
) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) return [];
  return await convexHttpCall<MessageRow[]>(
    convexUrl,
    "query",
    "messages:listByConversation",
    { sessionToken, conversationId },
    { timeoutMs: slowNetwork ? 30_000 : 20_000, retries: slowNetwork ? 2 : 1 }
  );
}

export function useSupabaseChatPlatform() {
  const [email, setEmail] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatProviderLabel, setChatProviderLabel] = useState<string | null>(null);
  const { isSlowNetwork } = useConnectionQuality();
  const [usedFallback, setUsedFallback] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [interestProfileJson, setInterestProfileJson] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [conversationsRaw, setConversationsRaw] = useState<ConversationItem[] | undefined>();
  const [messagesRaw, setMessagesRaw] = useState<MessageRow[] | undefined>();
  const [segmentNotice, setSegmentNotice] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const loadingConversationsRef = useRef(false);
  const loadingMessagesRef = useRef(false);
  const syncingOutboxRef = useRef(false);
  const { effectiveOnline } = useEffectiveOnline();

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
      const nextMode = conv.mode;
      setMode((prev) => (prev === nextMode ? prev : nextMode));
    }
  }, [activeId, conversations]);

  useEffect(() => {
    if (!pendingUserText || !messagesRaw) return;
    const synced = messagesRaw.some(
      (m) => m.role === "user" && m.content === pendingUserText
    );
    if (synced) setPendingUserText(null);
  }, [messagesRaw, pendingUserText]);

  useEffect(() => {
    if (!segmentNotice) return;
    const timer = window.setTimeout(() => setSegmentNotice(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [segmentNotice]);

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
    setSegmentNotice(null);
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

  const refreshOutboxCount = useCallback(async () => {
    const rows = await listOutbox();
    setOutboxCount(rows.length);
    emitOutboxStatus({ count: rows.length, syncing: syncingOutboxRef.current });
    return rows.length;
  }, []);

  const deliverSupabaseMessage = useCallback(
    async (
      content: string,
      attachments: PreparedChatAttachment[] | undefined,
      modelTier: GigaModelId,
      chatId: string | null
    ) => {
      if (!email) throw new Error("Please sign in");
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error("Session expired. Please sign in again.");

      let chat =
        (chatId ? conversations.find((c) => c._id === chatId) : null) ?? activeConversation;
      if (!chat) {
        chat = await createSupabaseChat(email, mode);
        setConversationsRaw((prev) => [chat as ConversationItem, ...(prev ?? [])]);
        setActiveId(chat._id);
      }

      await appendSupabaseMessage(chat._id, "user", content);
      let convexConversationId = chat.convexConversationId ?? null;
      if (!convexConversationId) {
        convexConversationId = await createConvexConversation(sessionToken, mode);
        const updated = await updateSupabaseChat(chat._id, { convexConversationId });
        if (updated) chat = updated;
      }

      const assistantBaseline = countAssistantMessages(
        await fetchConvexMessages(sessionToken, convexConversationId, isSlowNetwork)
      );

      const result = await sendConvexMessageWithRetry(
        {
          sessionToken,
          conversationId: convexConversationId,
          content,
          mode,
          chatSystem: chatSystemForModel(modelTier),
          ...(attachments?.length
            ? {
                attachments: attachments.map(
                  ({ previewUrl: _previewUrl, thumbDataUrl: _thumb, ...attachment }) =>
                    attachment
                ),
              }
            : {}),
        },
        isSlowNetwork
      );

      if (result.status === "processing") {
        await waitForAssistantReply(
          sessionToken,
          convexConversationId,
          assistantBaseline,
          replyWaitMs(isSlowNetwork),
          isSlowNetwork
        );
      }
      const convexMessages = await fetchConvexMessages(
        sessionToken,
        convexConversationId,
        isSlowNetwork
      );
      await replaceSupabaseMessages(chat._id, convexMessages);
      setMessagesRaw(await listSupabaseMessages(chat._id));
    },
    [activeConversation, conversations, email, isSlowNetwork, mode]
  );

  const flushOutbox = useCallback(async () => {
    if (
      syncingOutboxRef.current ||
      typeof navigator === "undefined" ||
      !navigator.onLine ||
      !effectiveOnline
    ) {
      return;
    }
    syncingOutboxRef.current = true;
    setIsSyncingOutbox(true);
    try {
      const rows = await listOutbox();
      emitOutboxStatus({ count: rows.length, syncing: true });
      for (const row of rows) {
        try {
          await deliverSupabaseMessage(
            row.content,
            row.attachments as PreparedChatAttachment[] | undefined,
            gigaModelForMode(row.mode as AiModeId),
            row.conversationId
          );
          await removeOutbox(row.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Sync failed";
          await bumpOutboxAttempt(row.id, msg);
          if (row.attempts + 1 >= maxSendRetries(isSlowNetwork)) {
            await removeOutbox(row.id);
            setError(toUserFacingError(e, msg));
          }
        }
      }
      await refreshOutboxCount();
    } finally {
      syncingOutboxRef.current = false;
      setIsSyncingOutbox(false);
      const remaining = await listOutbox();
      emitOutboxStatus({ count: remaining.length, syncing: false });
    }
  }, [deliverSupabaseMessage, effectiveOnline, isSlowNetwork, refreshOutboxCount]);

  useEffect(() => {
    void refreshOutboxCount();
    const onOnline = () => {
      registerChatOutboxSync();
      void flushOutbox();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        registerChatOutboxSync();
        void flushOutbox();
      }
    };
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "GIGA3_FLUSH_OUTBOX") {
        void flushOutbox();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    if (navigator.onLine) void flushOutbox();
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [flushOutbox, refreshOutboxCount]);

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
    async (
      content: string,
      attachments?: PreparedChatAttachment[],
      modelTier: GigaModelId = "fast"
    ) => {
      if (!email) {
        setError("Please sign in");
        return;
      }
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("Session expired. Please sign in again.");
        return;
      }
      setError(null);
      setPendingUserText(content);

      if (!effectiveOnline) {
        const clientRequestId = newClientRequestId();
        const entry: OutboxEntry = {
          id: clientRequestId,
          clientRequestId,
          conversationId: activeId,
          content,
          mode,
          attachments: attachments?.map(
            ({ previewUrl: _p, thumbDataUrl: _t, ...rest }) => rest
          ),
          attempts: 0,
          createdAt: Date.now(),
        };
        await enqueueOutbox(entry);
        registerChatOutboxSync();
        await refreshOutboxCount();
        // Keep pending bubble; outbox flush retries silently in the background.
        return;
      }

      setIsSending(true);
      setAwaitingReply(false);
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
          convexConversationId = await createConvexConversation(sessionToken, mode);
          const updated = await updateSupabaseChat(chat._id, {
            convexConversationId,
          });
          if (updated) chat = updated;
        }

        const assistantBaseline = countAssistantMessages(
          await fetchConvexMessages(sessionToken, convexConversationId, isSlowNetwork)
        );

        const result = await sendConvexMessageWithRetry(
          {
            sessionToken,
            conversationId: convexConversationId,
            content,
            mode,
            chatSystem: chatSystemForModel(modelTier),
            ...(attachments?.length
              ? {
                  attachments: attachments.map(
                    ({ previewUrl: _previewUrl, thumbDataUrl: _thumb, ...attachment }) =>
                      attachment
                  ),
                }
              : {}),
          },
          isSlowNetwork
        );

        setIsSending(false);
        setAwaitingReply(result.status === "processing");

        let activeChat = chat;
        let activeConvexId = convexConversationId;

        if (
          result.segmented &&
          result.conversationId &&
          result.conversationId !== convexConversationId
        ) {
          const oldMessages = await listSupabaseMessages(chat._id);
          const trimmedOld = oldMessages.filter(
            (m, idx, arr) =>
              !(
                idx === arr.length - 1 &&
                m.role === "user" &&
                m.content === content
              )
          );
          await replaceSupabaseMessages(chat._id, trimmedOld);

          const continued = await createSupabaseChat(email, mode);
          activeChat =
            (await updateSupabaseChat(continued._id, {
              title: continuedConversationTitle(chat.title),
              convexConversationId: result.conversationId,
            })) ?? continued;
          activeConvexId = result.conversationId;
          setActiveId(activeChat._id);
          setSegmentNotice(CHAT_SEGMENT_NOTICE);
        }

        let convexMessages =
          result.status === "processing"
            ? await waitForAssistantReply(
                sessionToken,
                activeConvexId,
                assistantBaseline,
                replyWaitMs(isSlowNetwork),
                isSlowNetwork
              )
            : await fetchConvexMessages(sessionToken, activeConvexId, isSlowNetwork);
        await replaceSupabaseMessages(activeChat._id, convexMessages);

        const title =
          activeChat.title === "New chat" || activeChat.title.endsWith("…")
            ? makeTitle(content)
            : activeChat.title;
        const updated = await updateSupabaseChat(activeChat._id, {
          title,
          convexConversationId: activeConvexId,
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
        setError(toUserFacingError(err, "Failed to send"));
        setPendingUserText(null);
      } finally {
        setIsSending(false);
        setAwaitingReply(false);
      }
    },
    [email, activeConversation, mode, isSlowNetwork, effectiveOnline, activeId, refreshOutboxCount]
  );

  const regenerateMessage = useCallback(
    async (assistantMessageId: string) => {
      if (!email) return;
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const chat = activeConversation;
      if (!chat?.convexConversationId) {
        setError("Conversation is not ready for regenerate yet. Send a message first.");
        return;
      }
      const uiIdx = messages.findIndex((m) => m.id === assistantMessageId);
      if (uiIdx < 0) return;

      setError(null);
      setIsSending(true);
      try {
        const convexMessages = await fetchConvexMessages(
          sessionToken,
          chat.convexConversationId,
          isSlowNetwork
        );
        const convexTarget = convexMessages[uiIdx];
        if (!convexTarget || convexTarget.role !== "assistant") {
          throw new Error("Could not find assistant message to regenerate.");
        }

        const result = await regenerateConvexMessage({
          sessionToken,
          conversationId: chat.convexConversationId,
          assistantMessageId: convexTarget._id,
          mode,
        });
        const synced = await fetchConvexMessages(
          sessionToken,
          chat.convexConversationId,
          isSlowNetwork
        );
        await replaceSupabaseMessages(chat._id, synced);
        setMessagesRaw(await listSupabaseMessages(chat._id));
        setChatProviderLabel(
          typeof result.chatProviderLabel === "string" ? result.chatProviderLabel : null
        );
        setUsedFallback(Boolean(result.usedFallback));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to regenerate");
      } finally {
        setIsSending(false);
      }
    },
    [email, activeConversation, messages, mode, isSlowNetwork]
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
    awaitingReply,
    isAcceptingMessage: isSending,
    isSlowNetwork,
    outboxCount,
    isSyncingOutbox,
    retryOutboxSync: flushOutbox,
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    stopGenerating: async () => undefined,
    regenerateMessage,
    pinConversation: async () => undefined,
    archiveConversation: async () => undefined,
    favoriteConversation: async () => undefined,
    editMessage: async () => undefined,
    deleteMessage: async () => undefined,
    renameConversation: async () => undefined,
    setActiveId,
    chatProviderLabel,
    usedFallback,
    segmentNotice,
    credits,
    hasOpenAiAccess: false,
    isPremium: false,
    subscriptionActive: false,
    freeOpenAiRemaining: 0,
    interestProfileJson,
    uploadUsage: null,
  };
}

