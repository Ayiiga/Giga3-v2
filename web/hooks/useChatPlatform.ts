"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { useChatReplyPolling } from "@/hooks/useChatReplyPolling";
import { useStableConversations } from "@/hooks/useStableConversations";
import { useStableUiMessages } from "@/hooks/useStableUiMessages";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { getSessionToken, getUserEmail, setSessionToken } from "@/lib/auth";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import {
  bumpOutboxAttempt,
  enqueueOutbox,
  listOutbox,
  newClientRequestId,
  registerChatOutboxSync,
  removeOutbox,
  type OutboxEntry,
} from "@/lib/chat/offlineOutbox";
import {
  readCachedMessages,
  writeCachedMessages,
} from "@/lib/chat/messageCache";
import { chatSystemForModel, gigaModelForMode, type GigaModelId } from "@/lib/chat/gigaModels";
import {
  acceptTimeoutMs,
  CHAT_REPLY_WAIT_MS,
  CHAT_REPLY_WAIT_SLOW_MS,
  MAX_SEND_RETRIES,
  MAX_SEND_RETRIES_SLOW,
  RETRY_BASE_MS,
  RETRY_BASE_SLOW_MS,
} from "@/lib/chat/chatNetwork";
import { getConvexUrl } from "@/lib/convex";
import {
  fingerprintLastAssistant,
  isNewAssistantReply,
  type AssistantFingerprint,
} from "@/lib/chat/replyDetection";
import { convexHttpCall } from "@/lib/network/convexCall";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AcceptMessageResult = {
  status: "processing" | "complete";
  conversationId: string;
  content?: string;
  chatProviderLabel?: string;
  usedFallback?: boolean;
  jobId?: string;
};

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

function countAssistantMessages(
  rows: { role: string }[] | undefined
): number {
  return rows?.filter((m) => m.role === "assistant").length ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChatPlatform() {
  const [email, setEmail] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AiModeId>("general");
  const [isSending, setIsSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatProviderLabel, setChatProviderLabel] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const createUserAttempted = useRef(false);
  const creditsCacheRef = useRef<number | null>(null);
  const interestProfileCacheRef = useRef<string | null>(null);
  const assistantBaselineRef = useRef(0);
  const replyWaitStartedAtRef = useRef(0);
  const replyDeadlineRef = useRef(0);
  const assistantFingerprintBeforeRef = useRef<AssistantFingerprint>(null);
  const syncingOutboxRef = useRef(false);
  const lastChatSystemRef = useRef<GigaModelId>("fast");
  const { isSlowNetwork } = useConnectionQuality();
  const isSlowNetworkRef = useRef(isSlowNetwork);
  isSlowNetworkRef.current = isSlowNetwork;

  const clearPendingSyncUi = useCallback(() => {
    setIsSending(false);
  }, []);

  const beginReplyWait = useCallback(
    (rows: { _id: string; role: string; content: string; createdAt?: number }[] | undefined) => {
      const now = Date.now();
      replyWaitStartedAtRef.current = now;
      // Fix a stuck-forever "Thinking…": the deadline is captured once, at wait
      // start, so later connection-quality flips cannot keep resetting the
      // failsafe timer and leave the spinner running indefinitely.
      replyDeadlineRef.current =
        now + (isSlowNetworkRef.current ? CHAT_REPLY_WAIT_SLOW_MS : CHAT_REPLY_WAIT_MS);
      assistantFingerprintBeforeRef.current = fingerprintLastAssistant(rows);
      assistantBaselineRef.current = countAssistantMessages(rows);
    },
    []
  );

  const cachedMessageFallback = useMemo(
    () => (activeId ? readCachedMessages(activeId) : null),
    [activeId]
  );

  useEffect(() => {
    setMounted(true);
    setEmail(getUserEmail());
    setSessionTokenState(getSessionToken());
  }, []);

  const sessionQueryArgs = useMemo(
    () => (mounted && sessionToken ? { sessionToken } : ("skip" as const)),
    [mounted, sessionToken]
  );
  const conversationsQueryArgs = sessionQueryArgs;
  const messagesQueryArgs = useMemo(
    () =>
      mounted && sessionToken && activeId
        ? {
            conversationId: activeId as Id<"conversations">,
            sessionToken,
          }
        : ("skip" as const),
    [mounted, sessionToken, activeId]
  );

  const chatCreditsRow = useQuery(api.users.getChatCredits, sessionQueryArgs);
  const interestProfileRow = useQuery(api.users.getInterestProfile, sessionQueryArgs);
  const conversationsRaw = useQuery(api.conversations.list, conversationsQueryArgs);
  const messagesRaw = useQuery(api.messages.listByConversation, messagesQueryArgs);
  const [pollConversationId, setPollConversationId] = useState<string | null>(null);
  const pollTargetId = pollConversationId ?? activeId;
  const pollSnapshot = useChatReplyPolling(
    isSending || awaitingReply,
    sessionToken,
    pollTargetId,
    mounted
  );
  const effectiveMessagesRaw = pollSnapshot.messages ?? messagesRaw;
  const polledReplyActive = pollSnapshot.replyActive;
  const messagesRawRef = useRef(effectiveMessagesRaw);
  messagesRawRef.current = effectiveMessagesRaw;
  const replyStatusQueryArgs = useMemo(
    () =>
      mounted && sessionToken && activeId && awaitingReply
        ? {
            sessionToken,
            conversationId: activeId as Id<"conversations">,
          }
        : ("skip" as const),
    [mounted, sessionToken, activeId, awaitingReply]
  );
  const replyStatus = useQuery(api.chatMessaging.getReplyStatus, replyStatusQueryArgs);
  const uploadUsage = useQuery(api.uploadLimits.getUploadUsageSnapshot, sessionQueryArgs);
  const credits =
    chatCreditsRow === undefined
      ? creditsCacheRef.current
      : chatCreditsRow === null
        ? null
        : chatCreditsRow.credits;

  const hasOpenAiAccess =
    chatCreditsRow === undefined
      ? false
      : chatCreditsRow === null
        ? false
        : Boolean(chatCreditsRow.hasOpenAiAccess);

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
  const setPinnedMutation = useMutation(api.conversations.setPinned);
  const setArchivedMutation = useMutation(api.conversations.setArchived);
  const setFavoriteMutation = useMutation(api.conversations.setFavorite);
  const cancelReplyMutation = useMutation(api.chatMessaging.cancelReply);
  const regenerateMessageMutation = useMutation(api.chatMessaging.regenerateMessage);
  const editAndResendMutation = useMutation(api.chatMessaging.editAndResend);
  const createUser = useMutation(api.users.createUser);

  const conversationsLoading = conversationsRaw === undefined;
  const messagesLoading =
    Boolean(activeId) && messagesRaw === undefined && mounted && Boolean(sessionToken);

  const conversations = useStableConversations(
    conversationsRaw as ConversationItem[] | undefined
  );

  const messages = useStableUiMessages(
    effectiveMessagesRaw,
    pendingUserText,
    cachedMessageFallback
  );

  useEffect(() => {
    if (!activeId || !messagesRaw?.length) return;
    writeCachedMessages(
      activeId,
      messagesRaw.map((m: { _id: string; role: string; content: string; createdAt?: number }) => ({
        id: m._id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt,
      }))
    );
  }, [activeId, messagesRaw]);

  const refreshOutboxCount = useCallback(async () => {
    const rows = await listOutbox();
    setOutboxCount(rows.length);
  }, []);

  const dispatchAccept = useCallback(
    async (
      token: string,
      conversationId: string | null,
      content: string,
      attachments: PreparedChatAttachment[] | undefined,
      clientRequestId: string,
      chatSystem: GigaModelId,
      slowNetwork: boolean,
      attempt = 0
    ) => {
      const hasImages = attachments?.some((a) => a.kind === "image") ?? false;
      const maxRetries = slowNetwork ? MAX_SEND_RETRIES_SLOW : MAX_SEND_RETRIES;
      const acceptTimeoutMsValue = acceptTimeoutMs(slowNetwork, hasImages);

      try {
        const convexUrl = getConvexUrl();
        if (!convexUrl) {
          throw new Error("Chat backend is not configured.");
        }

        const mutationArgs = {
          sessionToken: token,
          ...(conversationId
            ? { conversationId: conversationId as Id<"conversations"> }
            : {}),
          content,
          mode,
          clientRequestId,
          chatSystem,
          ...(attachments?.length
            ? {
                attachments: attachments.map(
                  ({ previewUrl: _previewUrl, thumbDataUrl: _thumb, ...attachment }) =>
                    attachment
                ),
              }
            : {}),
        };

        // HTTP POST — reliable on 2G/3G. Websocket mutations often never ack.
        const result = await withClientTimeout(
          convexHttpCall<AcceptMessageResult>(
            convexUrl,
            "mutation",
            "chatMessaging:acceptMessage",
            mutationArgs,
            { timeoutMs: acceptTimeoutMsValue, retries: 0 }
          ),
          acceptTimeoutMsValue,
          hasImages
            ? "Image upload is taking longer on this connection. Please wait or try again on Wi‑Fi."
            : "Could not reach the server on this connection. Check your signal and try again."
        );

        if (result.conversationId && result.conversationId !== conversationId) {
          setPollConversationId(result.conversationId);
          setActiveId(result.conversationId);
        }

        const nextLabel =
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null;
        const nextFallback = Boolean(result.usedFallback);
        setChatProviderLabel((prev) => (prev === nextLabel ? prev : nextLabel));
        setUsedFallback((prev) => (prev === nextFallback ? prev : nextFallback));

        if (result.status === "processing") {
          setIsSending(false);
          beginReplyWait(messagesRawRef.current);
          setAwaitingReply(true);
          return { ok: true as const, conversationId: result.conversationId };
        }

        setIsSending(false);
        setAwaitingReply(false);
        setPendingUserText(null);
        return { ok: true as const, conversationId: result.conversationId };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to send";
        const shouldRetry =
          attempt < maxRetries - 1 &&
          typeof navigator !== "undefined" &&
          navigator.onLine;
        if (shouldRetry) {
          const retryBase = slowNetwork ? RETRY_BASE_SLOW_MS : RETRY_BASE_MS;
          await sleep(retryBase * 2 ** attempt);
          return dispatchAccept(
            token,
            conversationId,
            content,
            attachments,
            clientRequestId,
            chatSystem,
            slowNetwork,
            attempt + 1
          );
        }
        throw new Error(message);
      }
    },
    [mode, beginReplyWait]
  );

  const flushOutbox = useCallback(async () => {
    if (syncingOutboxRef.current || typeof navigator === "undefined" || !navigator.onLine) {
      return;
    }
    syncingOutboxRef.current = true;
    try {
      const rows = await listOutbox();
      setOutboxCount(rows.length);
      for (const row of rows) {
        const token = getSessionToken();
        if (!token) continue;
        try {
          let conversationId = row.conversationId;
          if (!conversationId) {
            conversationId = await createConversation({
              sessionToken: token,
              mode: row.mode as AiModeId,
            });
          }
          await dispatchAccept(
            token,
            conversationId,
            row.content,
            row.attachments as PreparedChatAttachment[] | undefined,
            row.clientRequestId,
            chatSystemForModel(gigaModelForMode(row.mode as AiModeId), hasOpenAiAccess),
            isSlowNetwork
          );
          await removeOutbox(row.id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Sync failed";
          await bumpOutboxAttempt(row.id, msg);
          const maxOutboxAttempts = isSlowNetwork
            ? MAX_SEND_RETRIES_SLOW
            : MAX_SEND_RETRIES;
          if (row.attempts + 1 >= maxOutboxAttempts) {
            await removeOutbox(row.id);
            setError(msg);
          }
        }
      }
      await refreshOutboxCount();
    } finally {
      syncingOutboxRef.current = false;
    }
  }, [createConversation, dispatchAccept, refreshOutboxCount, hasOpenAiAccess, isSlowNetwork]);

  useEffect(() => {
    if (!email || createUserAttempted.current) return;
    const token = getSessionToken();
    if (token) {
      setSessionTokenState(token);
      return;
    }
    createUserAttempted.current = true;
    void createUser({ email }).then((result) => {
      if (result && typeof result === "object" && "sessionToken" in result) {
        const next = (result as { sessionToken: string }).sessionToken;
        if (next) {
          setSessionToken(next);
          setSessionTokenState(next);
        }
      }
    });
  }, [email, createUser]);

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
      const nextMode = conv.mode;
      setMode((prev) => (prev === nextMode ? prev : nextMode));
    }
  }, [activeId, conversations]);

  useEffect(() => {
    if (!pendingUserText || !messagesRaw) return;
    const synced = messagesRaw.some(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content === pendingUserText
    );
    if (synced) {
      setPendingUserText(null);
      clearPendingSyncUi();
    }
  }, [messagesRaw, pendingUserText, clearPendingSyncUi]);

  useEffect(() => {
    if (!awaitingReply || !effectiveMessagesRaw) return;
    const after = fingerprintLastAssistant(effectiveMessagesRaw);
    const before = assistantFingerprintBeforeRef.current;
    const waitStartedAt = replyWaitStartedAtRef.current;

    if (isNewAssistantReply(before, after, waitStartedAt)) {
      setAwaitingReply(false);
      setPendingUserText(null);
      clearPendingSyncUi();
      setError(null);
      return;
    }

    const assistants = countAssistantMessages(effectiveMessagesRaw);
    if (assistants > assistantBaselineRef.current) {
      setAwaitingReply(false);
      setPendingUserText(null);
      clearPendingSyncUi();
      setError(null);
    }
  }, [effectiveMessagesRaw, awaitingReply, clearPendingSyncUi]);

  useEffect(() => {
    if (!awaitingReply || replyStatus === undefined) return;
    if (replyStatus.active) return;

    const elapsed = Date.now() - replyWaitStartedAtRef.current;
    if (elapsed < 4000) return;

    const after = fingerprintLastAssistant(effectiveMessagesRaw);
    if (
      !isNewAssistantReply(
        assistantFingerprintBeforeRef.current,
        after,
        replyWaitStartedAtRef.current
      )
    ) {
      setAwaitingReply(false);
      clearPendingSyncUi();
      setPendingUserText(null);
      setError(
        "AI could not complete this reply. Your message was saved — please try again."
      );
    }
  }, [replyStatus, awaitingReply, effectiveMessagesRaw, clearPendingSyncUi]);

  useEffect(() => {
    if (!awaitingReply || polledReplyActive !== false) return;

    const elapsed = Date.now() - replyWaitStartedAtRef.current;
    if (elapsed < 4000) return;

    const after = fingerprintLastAssistant(effectiveMessagesRaw);
    if (
      !isNewAssistantReply(
        assistantFingerprintBeforeRef.current,
        after,
        replyWaitStartedAtRef.current
      )
    ) {
      setAwaitingReply(false);
      clearPendingSyncUi();
      setPendingUserText(null);
      setPollConversationId(null);
      setError(
        "AI could not complete this reply. Your message was saved — please try again."
      );
    }
  }, [polledReplyActive, awaitingReply, effectiveMessagesRaw, clearPendingSyncUi]);

  useEffect(() => {
    if (!isSending) return;
    const started = Date.now();
    const slow = isSlowNetworkRef.current;
    const maxMs =
      acceptTimeoutMs(slow) * (slow ? MAX_SEND_RETRIES_SLOW : MAX_SEND_RETRIES) + 15_000;
    const interval = setInterval(() => {
      if (Date.now() - started < maxMs) return;
      setIsSending(false);
      setPendingUserText(null);
      setPollConversationId(null);
      setError(
        "Could not send on this connection. Check your signal and try again."
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isSending]);

  useEffect(() => {
    if (!awaitingReply) {
      replyDeadlineRef.current = 0;
      return;
    }
    // Guarantee the spinner always ends: a fixed deadline (set in beginReplyWait)
    // is polled by a single interval. Crucially this effect depends only on
    // awaitingReply — connection-quality changes no longer restart the timer,
    // which previously let "Thinking…" run forever on flaky mobile networks.
    if (replyDeadlineRef.current === 0) {
      replyDeadlineRef.current =
        Date.now() +
        (isSlowNetworkRef.current ? CHAT_REPLY_WAIT_SLOW_MS : CHAT_REPLY_WAIT_MS);
    }
    const waitToken = replyWaitStartedAtRef.current;
    const interval = setInterval(() => {
      if (replyWaitStartedAtRef.current !== waitToken) return;
      if (Date.now() < replyDeadlineRef.current) return;
      setAwaitingReply(false);
      clearPendingSyncUi();
      setPendingUserText(null);
      setError(
        "Reply is taking longer than expected. Your message was saved — please try again or check your connection."
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [awaitingReply, clearPendingSyncUi]);

  useEffect(() => {
    void refreshOutboxCount();
    const onOnline = () => {
      registerChatOutboxSync();
      void flushOutbox();
    };
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "GIGA3_FLUSH_OUTBOX") {
        void flushOutbox();
      }
    };
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushOutbox();
    }
    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [flushOutbox, refreshOutboxCount]);

  const startNewChat = useCallback(async () => {
    const token = sessionToken ?? getSessionToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setError(null);
    const id = await createConversation({ sessionToken: token, mode });
    setActiveId(id);
  }, [sessionToken, createConversation, mode]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setPollConversationId(null);
    setError(null);
    setPendingUserText(null);
    setAwaitingReply(false);
    setIsSending(false);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) return;
      await removeConversation({
        conversationId: id as Id<"conversations">,
        sessionToken: token,
      });
      if (activeId === id) {
        setActiveId(null);
        setPendingUserText(null);
        setAwaitingReply(false);
        setIsSending(false);
      }
    },
    [sessionToken, removeConversation, activeId]
  );

  const changeMode = useCallback(
    async (next: AiModeId) => {
      setMode(next);
      const token = sessionToken ?? getSessionToken();
      if (!token || !activeId) return;
      await setConversationMode({
        conversationId: activeId as Id<"conversations">,
        sessionToken: token,
        mode: next,
      });
    },
    [sessionToken, activeId, setConversationMode]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: PreparedChatAttachment[],
      modelTier: GigaModelId = "fast"
    ) => {
      const chatSystem = chatSystemForModel(modelTier, hasOpenAiAccess);
      lastChatSystemRef.current = chatSystem;
      const token = sessionToken ?? getSessionToken();
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }
      setError(null);
      setPendingUserText(content);
      setIsSending(true);
      setAwaitingReply(false);
      setPollConversationId(activeId);
      const clientRequestId = newClientRequestId();

      if (typeof navigator !== "undefined" && !navigator.onLine) {
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
        setAwaitingReply(false);
        setError("Offline — message queued and will send when you're back online.");
        return;
      }

      void dispatchAccept(
        token,
        activeId,
        content,
        attachments,
        clientRequestId,
        chatSystem,
        isSlowNetwork
      ).catch(async (e) => {
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
        try {
          await enqueueOutbox(entry);
          registerChatOutboxSync();
          await refreshOutboxCount();
        } catch {
          /* ignore */
        }
        setAwaitingReply(false);
        setPendingUserText(null);
        clearPendingSyncUi();
        setError(
          e instanceof Error
            ? `${e.message} Message queued — we'll retry when your connection is stronger.`
            : "Message queued — we'll retry when your connection is stronger."
        );
      });
    },
    [
      sessionToken,
      activeId,
      mode,
      dispatchAccept,
      messagesRaw,
      refreshOutboxCount,
      hasOpenAiAccess,
      isSlowNetwork,
      clearPendingSyncUi,
    ]
  );

  const stopGenerating = useCallback(async () => {
    const token = sessionToken ?? getSessionToken();
    if (!token || !activeId) return;
    try {
      await cancelReplyMutation({
        sessionToken: token,
        conversationId: activeId as Id<"conversations">,
      });
      setAwaitingReply(false);
      setIsSending(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop generation");
    }
  }, [sessionToken, activeId, cancelReplyMutation]);

  const regenerateMessage = useCallback(
    async (assistantMessageId: string) => {
      const token = sessionToken ?? getSessionToken();
      if (!token || !activeId) return;
      setError(null);
      setAwaitingReply(false);

      try {
        const result = await regenerateMessageMutation({
          sessionToken: token,
          conversationId: activeId as Id<"conversations">,
          assistantMessageId: assistantMessageId as Id<"messages">,
          mode,
          clientRequestId: newClientRequestId(),
          chatSystem: lastChatSystemRef.current,
        });
        const nextLabel =
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null;
        setChatProviderLabel((prev) => (prev === nextLabel ? prev : nextLabel));
        setUsedFallback(Boolean(result.usedFallback));
        if (result.status === "processing") {
          beginReplyWait(messagesRaw);
          setAwaitingReply(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to regenerate");
      }
    },
    [sessionToken, activeId, mode, regenerateMessageMutation, messagesRaw, beginReplyWait]
  );

  const pinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) return;
      await setPinnedMutation({
        sessionToken: token,
        conversationId: conversationId as Id<"conversations">,
        pinned,
      });
    },
    [sessionToken, setPinnedMutation]
  );

  const archiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) return;
      await setArchivedMutation({
        sessionToken: token,
        conversationId: conversationId as Id<"conversations">,
        archived,
      });
      if (archived && activeId === conversationId) {
        setActiveId(null);
      }
    },
    [sessionToken, activeId, setArchivedMutation]
  );

  const favoriteConversation = useCallback(
    async (conversationId: string, isFavorite: boolean) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) return;
      await setFavoriteMutation({
        sessionToken: token,
        conversationId: conversationId as Id<"conversations">,
        isFavorite,
      });
    },
    [sessionToken, setFavoriteMutation]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) return;
      setError(null);
      beginReplyWait(messagesRaw);
      try {
        const result = await editAndResendMutation({
          sessionToken: token,
          messageId: messageId as Id<"messages">,
          content,
          mode,
          clientRequestId: newClientRequestId(),
          chatSystem: lastChatSystemRef.current,
        });
        if (result.status === "processing") {
          setAwaitingReply(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to edit message");
      }
    },
    [sessionToken, mode, editAndResendMutation, messagesRaw, beginReplyWait]
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
    awaitingReply,
    isAcceptingMessage: false,
    isSlowNetwork,
    outboxCount,
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    stopGenerating,
    regenerateMessage,
    pinConversation,
    archiveConversation,
    favoriteConversation,
    editMessage,
    setActiveId,
    chatProviderLabel,
    usedFallback,
    credits,
    hasOpenAiAccess,
    interestProfileJson,
    uploadUsage: uploadUsage ?? null,
  };
}
