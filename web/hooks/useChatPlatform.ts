"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import { useStableConversations } from "@/hooks/useStableConversations";
import { useStableUiMessages } from "@/hooks/useStableUiMessages";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { getSessionToken, getUserEmail, setSessionToken } from "@/lib/auth";
import { isValidMode, type AiModeId } from "@/lib/aiRouter";
import type { PreparedChatAttachment } from "@/lib/chat/multimodalAttachments";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Fast ack — save message + queue AI worker (not full reply). */
const CHAT_ACCEPT_TIMEOUT_MS = 45_000;
const CHAT_REPLY_WAIT_MS = 120_000;
const CHAT_REPLY_WAIT_SLOW_MS = 180_000;

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
  const createUserAttempted = useRef(false);
  const creditsCacheRef = useRef<number | null>(null);
  const interestProfileCacheRef = useRef<string | null>(null);
  const assistantBaselineRef = useRef(0);
  const { isSlowNetwork } = useConnectionQuality();

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
  const uploadUsage = useQuery(api.uploadLimits.getUploadUsageSnapshot, sessionQueryArgs);
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
  const setPinnedMutation = useMutation(api.conversations.setPinned);
  const setArchivedMutation = useMutation(api.conversations.setArchived);
  const setFavoriteMutation = useMutation(api.conversations.setFavorite);
  const updateUserMessage = useMutation(api.messages.updateUserMessage);
  const sendMessageAction = useMutation(api.chatMessaging.acceptMessage);
  const regenerateMessageAction = useAction(api.platformActions.regenerateMessage);
  const createUser = useMutation(api.users.createUser);

  const conversationsLoading = conversationsRaw === undefined;
  const messagesLoading =
    Boolean(activeId) && messagesRaw === undefined && mounted && Boolean(sessionToken);

  const conversations = useStableConversations(
    conversationsRaw as ConversationItem[] | undefined
  );

  const messages = useStableUiMessages(messagesRaw, pendingUserText);

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
    }
  }, [messagesRaw, pendingUserText]);

  useEffect(() => {
    if (!awaitingReply || !messagesRaw) return;
    const assistants = countAssistantMessages(messagesRaw);
    if (assistants > assistantBaselineRef.current) {
      setAwaitingReply(false);
      setIsSending(false);
      setPendingUserText(null);
    }
  }, [messagesRaw, awaitingReply]);

  useEffect(() => {
    if (!awaitingReply) return;
    const waitMs = isSlowNetwork ? CHAT_REPLY_WAIT_SLOW_MS : CHAT_REPLY_WAIT_MS;
    const timer = setTimeout(() => {
      setAwaitingReply(false);
      setIsSending(false);
      setError(
        "Reply is taking longer on this connection. Your message was saved — please wait a moment or try again when the signal is stronger."
      );
    }, waitMs);
    return () => clearTimeout(timer);
  }, [awaitingReply, isSlowNetwork]);

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
    async (content: string, attachments?: PreparedChatAttachment[]) => {
      const token = sessionToken ?? getSessionToken();
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }
      setError(null);
      setPendingUserText(content);
      setIsSending(true);
      setAwaitingReply(false);

      const hasImages = attachments?.some((a) => a.kind === "image") ?? false;
      const acceptTimeoutMs = hasImages
        ? CHAT_ACCEPT_TIMEOUT_MS * 2
        : CHAT_ACCEPT_TIMEOUT_MS;
      assistantBaselineRef.current = countAssistantMessages(messagesRaw);

      try {
        let conversationId = activeId;
        if (!conversationId) {
          conversationId = await createConversation({ sessionToken: token, mode });
          setActiveId(conversationId);
        }

        const result = await withClientTimeout(
          sendMessageAction({
            sessionToken: token,
            conversationId: conversationId as Id<"conversations">,
            content,
            mode,
            ...(attachments?.length
              ? {
                  attachments: attachments.map(
                    ({ previewUrl: _previewUrl, thumbDataUrl: _thumb, ...attachment }) =>
                      attachment
                  ),
                }
              : {}),
          }),
          acceptTimeoutMs,
          hasImages
            ? "Image upload is taking longer on this connection. Please wait or try again on Wi‑Fi."
            : "Could not reach the server on this connection. Check your signal and try again."
        );

        const nextLabel =
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null;
        const nextFallback = Boolean(result.usedFallback);
        setChatProviderLabel((prev) => (prev === nextLabel ? prev : nextLabel));
        setUsedFallback((prev) => (prev === nextFallback ? prev : nextFallback));

        if (result.status === "processing") {
          setPendingUserText(null);
          setAwaitingReply(true);
          return;
        }

        setIsSending(false);
        setPendingUserText(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send");
        setPendingUserText(null);
        setIsSending(false);
        setAwaitingReply(false);
      }
    },
    [sessionToken, activeId, mode, createConversation, sendMessageAction, messagesRaw]
  );

  const regenerateMessage = useCallback(
    async (assistantMessageId: string) => {
      const token = sessionToken ?? getSessionToken();
      if (!token || !activeId) return;
      setError(null);
      setIsSending(true);
      setAwaitingReply(false);
      assistantBaselineRef.current = countAssistantMessages(messagesRaw);
      try {
        const result = await withClientTimeout(
          regenerateMessageAction({
            sessionToken: token,
            conversationId: activeId as Id<"conversations">,
            assistantMessageId: assistantMessageId as Id<"messages">,
            mode,
          }),
          CHAT_REPLY_WAIT_SLOW_MS,
          "Regenerate is taking longer than usual. Please try again in a moment."
        );
        const nextLabel =
          typeof result.chatProviderLabel === "string"
            ? result.chatProviderLabel
            : null;
        const nextFallback = Boolean(result.usedFallback);
        setChatProviderLabel((prev) => (prev === nextLabel ? prev : nextLabel));
        setUsedFallback((prev) => (prev === nextFallback ? prev : nextFallback));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to regenerate");
      } finally {
        setIsSending(false);
      }
    },
    [sessionToken, activeId, mode, regenerateMessageAction, messagesRaw]
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
      await updateUserMessage({
        sessionToken: token,
        messageId: messageId as Id<"messages">,
        content,
      });
    },
    [sessionToken, updateUserMessage]
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
    isAcceptingMessage: isSending && !awaitingReply,
    isSlowNetwork,
    error,
    startNewChat,
    selectConversation,
    deleteConversation,
    changeMode,
    sendMessage,
    regenerateMessage,
    pinConversation,
    archiveConversation,
    favoriteConversation,
    editMessage,
    setActiveId,
    chatProviderLabel,
    usedFallback,
    credits,
    interestProfileJson,
    uploadUsage: uploadUsage ?? null,
  };
}
