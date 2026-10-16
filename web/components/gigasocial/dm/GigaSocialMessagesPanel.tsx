"use client";

import { SocialEmptyState } from "@/components/gigasocial/ux/SocialEmptyState";
import { Button } from "@/components/ui/Button";
import { useEffectiveOnline } from "@/hooks/useEffectiveOnline";
import { formatRelativeTime } from "@/lib/datetime";
import {
  dmUiStrings,
  readDmUiLocale,
  writeDmUiLocale,
  type DmUiLocale,
} from "@/lib/gigasocial/dmLocale";
import {
  interpretDmHistoryPage,
  newDmClientId,
} from "@/lib/gigasocial/dmPagination";
import {
  hideDmThreadLocally,
  isDmThreadHiddenLocally,
  isDmThreadUnread,
  markDmThreadRead,
} from "@/lib/gigasocial/dmUnread";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { handleFromEmail } from "@/lib/gigasocial/handleFromEmail";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Ban,
  Flag,
  MessageCircle,
  MoreVertical,
  Send,
} from "lucide-react";
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type DmThread = {
  threadId: Id<"socialDmThreads">;
  otherUserId: string;
  requestStatus: "open" | "accepted" | "declined";
  initiatedByMe: boolean;
  lastMessageAt: number | null;
  lastMessagePreview: string | null;
  updatedAt: number;
  createdAt: number;
};

type DmMessage = {
  messageId: Id<"socialDmMessages">;
  senderId: string;
  body: string;
  deliveryState: "sent" | "delivered";
  createdAt: number;
  mine: boolean;
};

function displayPeer(userId: string): string {
  return handleFromEmail(userId) ?? userId;
}

export const GigaSocialMessagesPanel = memo(function GigaSocialMessagesPanel({
  sessionToken,
  initialRecipient,
  initialThreadId,
}: {
  sessionToken: string;
  /** Prefill compose from `?to=` deep link (email / user id). */
  initialRecipient?: string;
  /** Open a thread from `?thread=` deep link. */
  initialThreadId?: string;
}) {
  const features = useGigaSocialFeatures();
  const [locale, setLocale] = useState<DmUiLocale>("en");
  const t = dmUiStrings(locale);
  const { effectiveOnline } = useEffectiveOnline();

  const [activeThreadId, setActiveThreadId] = useState<Id<"socialDmThreads"> | null>(
    () => (initialThreadId ? (initialThreadId as Id<"socialDmThreads">) : null)
  );
  const [hiddenTick, setHiddenTick] = useState(0);
  const [composeOpen, setComposeOpen] = useState(
    () => Boolean(initialRecipient && !initialThreadId)
  );
  const [recipient, setRecipient] = useState(() => initialRecipient?.trim() ?? "");
  const [firstMessage, setFirstMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocale(readDmUiLocale());
  }, []);

  useEffect(() => {
    if (initialThreadId) {
      setActiveThreadId(initialThreadId as Id<"socialDmThreads">);
      setComposeOpen(false);
      return;
    }
    if (initialRecipient?.trim()) {
      setRecipient(initialRecipient.trim());
      setComposeOpen(true);
    }
  }, [initialRecipient, initialThreadId]);

  const setLocaleAndPersist = (next: DmUiLocale) => {
    setLocale(next);
    writeDmUiLocale(next);
  };

  if (!features.enableDirectMessages) {
    return (
      <SocialEmptyState
        title={t.featureDisabledTitle}
        description={t.featureDisabledBody}
        icon={MessageCircle}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t.sectionDescription}</p>
        <div
          className="inline-flex rounded-full border border-border p-0.5"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            className={cn(
              "min-h-10 min-w-11 rounded-full px-3 text-xs font-medium",
              locale === "en" ? "bg-accent/15 text-foreground" : "text-muted"
            )}
            aria-pressed={locale === "en"}
            onClick={() => setLocaleAndPersist("en")}
          >
            {t.localeToggleEn}
          </button>
          <button
            type="button"
            className={cn(
              "min-h-10 min-w-11 rounded-full px-3 text-xs font-medium",
              locale === "fr" ? "bg-accent/15 text-foreground" : "text-muted"
            )}
            aria-pressed={locale === "fr"}
            onClick={() => setLocaleAndPersist("fr")}
          >
            {t.localeToggleFr}
          </button>
        </div>
      </div>

      {!effectiveOnline ? (
        <div
          className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">{t.offlineTitle}</p>
          <p className="text-xs opacity-90">{t.offlineSend}</p>
        </div>
      ) : null}

      {statusMessage ? (
        <p className="rounded-xl border border-border bg-white px-3 py-2 text-sm" role="status">
          {statusMessage}
        </p>
      ) : null}

      {activeThreadId ? (
        <DmConversation
          sessionToken={sessionToken}
          threadId={activeThreadId}
          locale={locale}
          online={effectiveOnline}
          onBack={() => setActiveThreadId(null)}
          onBlocked={() => {
            hideDmThreadLocally(activeThreadId);
            setHiddenTick((n) => n + 1);
            setStatusMessage(`${t.blockSuccess} ${t.blockHistoryNote}`);
            setActiveThreadId(null);
          }}
          onStatus={setStatusMessage}
        />
      ) : (
        <DmThreadList
          sessionToken={sessionToken}
          locale={locale}
          online={effectiveOnline}
          hiddenTick={hiddenTick}
          composeOpen={composeOpen}
          recipient={recipient}
          firstMessage={firstMessage}
          onRecipientChange={setRecipient}
          onFirstMessageChange={setFirstMessage}
          onComposeOpen={() => setComposeOpen(true)}
          onComposeClose={() => {
            setComposeOpen(false);
            setRecipient("");
            setFirstMessage("");
          }}
          onOpenThread={(id) => {
            markDmThreadRead(id);
            setActiveThreadId(id);
          }}
          onStarted={(id) => {
            setComposeOpen(false);
            setRecipient("");
            setFirstMessage("");
            markDmThreadRead(id);
            setActiveThreadId(id);
          }}
          onStatus={setStatusMessage}
        />
      )}
    </div>
  );
});

const DmThreadList = memo(function DmThreadList({
  sessionToken,
  locale,
  online,
  hiddenTick,
  composeOpen,
  recipient,
  firstMessage,
  onRecipientChange,
  onFirstMessageChange,
  onComposeOpen,
  onComposeClose,
  onOpenThread,
  onStarted,
  onStatus,
}: {
  sessionToken: string;
  locale: DmUiLocale;
  online: boolean;
  hiddenTick: number;
  composeOpen: boolean;
  recipient: string;
  firstMessage: string;
  onRecipientChange: (v: string) => void;
  onFirstMessageChange: (v: string) => void;
  onComposeOpen: () => void;
  onComposeClose: () => void;
  onOpenThread: (id: Id<"socialDmThreads">) => void;
  onStarted: (id: Id<"socialDmThreads">) => void;
  onStatus: (msg: string | null) => void;
}) {
  const t = dmUiStrings(locale);
  const recipientId = useId();
  const status = useQuery(api.gigaSocialDm.getDmFoundationStatus, { sessionToken });
  // Keep first page subscribed so new/reordered threads stay live after load-more.
  const firstPage = useQuery(
    api.gigaSocialDm.listMyThreads,
    status?.enabled ? { sessionToken, limit: 40 } : "skip"
  );
  const [loadCursor, setLoadCursor] = useState<string | null>(null);
  const [olderThreads, setOlderThreads] = useState<DmThread[]>([]);
  const [threadsNextCursor, setThreadsNextCursor] = useState<string | null>(null);
  const olderPage = useQuery(
    api.gigaSocialDm.listMyThreads,
    status?.enabled && loadCursor
      ? { sessionToken, limit: 40, cursor: loadCursor }
      : "skip"
  );
  const sendMessage = useMutation(api.gigaSocialDm.sendMessage);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [listError, setListError] = useState(false);

  useEffect(() => {
    if (firstPage === undefined) return;
    setListError(false);
    if (olderThreads.length === 0 && loadCursor === null) {
      setThreadsNextCursor(firstPage.nextCursor ?? null);
    }
  }, [firstPage, olderThreads.length, loadCursor]);

  useEffect(() => {
    if (olderPage === undefined || loadCursor === null) return;
    const rows = (olderPage.threads ?? []) as DmThread[];
    setOlderThreads((prev) => {
      const seen = new Set(prev.map((t) => t.threadId));
      return [...prev, ...rows.filter((t) => !seen.has(t.threadId))];
    });
    setThreadsNextCursor(olderPage.nextCursor ?? null);
    setLoadCursor(null);
  }, [olderPage, loadCursor]);

  const threads = useMemo(() => {
    void hiddenTick;
    const first = (firstPage?.threads ?? []) as DmThread[];
    const firstIds = new Set(first.map((t) => t.threadId));
    const merged = [
      ...first,
      ...olderThreads.filter((t) => !firstIds.has(t.threadId)),
    ];
    return merged.filter((row) => !isDmThreadHiddenLocally(row.threadId));
  }, [firstPage?.threads, olderThreads, hiddenTick]);

  const startConversation = async () => {
    if (!online) {
      setStartError(t.offlineSend);
      return;
    }
    const email = recipient.trim();
    const body = firstMessage.trim();
    if (!email || !body) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await sendMessage({
        sessionToken,
        recipientUserId: email,
        body,
        clientId: newDmClientId(),
      });
      onStarted(result.threadId);
      onStatus(null);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : t.sendFailed);
    } finally {
      setStarting(false);
    }
  };

  if (status === undefined) {
    return <p className="py-8 text-center text-sm text-muted">{t.loadingThreads}</p>;
  }

  if (!status.enabled) {
    return (
      <SocialEmptyState
        title={t.serverDisabledTitle}
        description={t.serverDisabledBody}
        icon={MessageCircle}
      />
    );
  }

  if (firstPage === undefined) {
    return <p className="py-8 text-center text-sm text-muted">{t.loadingThreads}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          onClick={onComposeOpen}
          aria-expanded={composeOpen}
        >
          {t.newMessage}
        </Button>
        {listError ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11"
            onClick={() => setListError(false)}
          >
            {t.errorRetry}
          </Button>
        ) : null}
      </div>

      {composeOpen ? (
        <form
          className="space-y-2 rounded-xl border border-border bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void startConversation();
          }}
        >
          <label htmlFor={recipientId} className="block text-sm font-medium text-foreground">
            {t.recipientLabel}
          </label>
          <input
            id={recipientId}
            type="email"
            autoComplete="email"
            inputMode="email"
            className="min-h-12 w-full rounded-xl border border-border px-3 text-base"
            placeholder={t.recipientPlaceholder}
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            aria-required
          />
          <label htmlFor={`${recipientId}-body`} className="block text-sm font-medium text-foreground">
            {t.composerPlaceholder}
          </label>
          <textarea
            id={`${recipientId}-body`}
            rows={2}
            className="min-h-12 w-full rounded-xl border border-border px-3 py-2 text-base"
            placeholder={t.composerPlaceholder}
            value={firstMessage}
            onChange={(e) => onFirstMessageChange(e.target.value)}
            aria-required
          />
          {startError ? (
            <p className="text-sm text-red-700" role="alert">
              {startError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              className="min-h-11"
              disabled={starting || !recipient.trim() || !firstMessage.trim()}
            >
              {starting ? t.sending : t.startConversation}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={onComposeClose}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : null}

      {threads.length === 0 ? (
        <SocialEmptyState
          title={t.emptyTitle}
          description={t.emptyDescription}
          icon={MessageCircle}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white" role="list">
          {threads.map((thread) => {
            const unread = isDmThreadUnread(
              thread.threadId,
              thread.lastMessageAt,
              thread.initiatedByMe,
              thread.requestStatus
            );
            const request =
              thread.requestStatus === "open" && !thread.initiatedByMe;
            return (
              <li key={thread.threadId}>
                <button
                  type="button"
                  className="flex w-full min-h-14 items-start gap-3 px-3 py-3 text-left hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  onClick={() => onOpenThread(thread.threadId)}
                  aria-label={`${displayPeer(thread.otherUserId)}${
                    unread ? `, ${t.unread}` : ""
                  }`}
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-foreground"
                    aria-hidden
                  >
                    {displayPeer(thread.otherUserId).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {displayPeer(thread.otherUserId)}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatRelativeTime(thread.lastMessageAt ?? thread.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-sm text-muted">
                        {thread.lastMessagePreview?.trim() || t.previewEmpty}
                      </span>
                      {request ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          {t.messageRequest}
                        </span>
                      ) : null}
                      {unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {threadsNextCursor ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 w-full"
          disabled={loadCursor !== null}
          onClick={() => setLoadCursor(threadsNextCursor)}
        >
          {t.loadMoreThreads}
        </Button>
      ) : null}
    </div>
  );
});

const DmConversation = memo(function DmConversation({
  sessionToken,
  threadId,
  locale,
  online,
  onBack,
  onBlocked,
  onStatus,
}: {
  sessionToken: string;
  threadId: Id<"socialDmThreads">;
  locale: DmUiLocale;
  online: boolean;
  onBack: () => void;
  onBlocked: () => void;
  onStatus: (msg: string | null) => void;
}) {
  const t = dmUiStrings(locale);
  const composerId = useId();
  const reasonId = useId();
  const menuId = useId();

  const thread = useQuery(api.gigaSocialDm.getThread, {
    sessionToken,
    threadId,
  }) as DmThread | null | undefined;
  const sendMessage = useMutation(api.gigaSocialDm.sendMessage);
  const acceptRequest = useMutation(api.gigaSocialDm.acceptRequest);
  const declineRequest = useMutation(api.gigaSocialDm.declineRequest);
  const blockUser = useMutation(api.gigaSocialDm.blockUser);
  const reportMessage = useMutation(api.gigaSocialDm.reportMessage);

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [acting, setActing] = useState(false);
  const pendingClientId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // First page via useQuery (newest). Older pages via compound cursor string.
  // Empty pages with a cursor are NOT treated as end-of-history.
  const [historyCursor, setHistoryCursor] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const page = useQuery(api.gigaSocialDm.listThreadMessages, {
    sessionToken,
    threadId,
    limit: 30,
    cursor: historyCursor,
  });

  // Reset when opening a thread
  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    setExhausted(false);
    setOlderError(false);
    setHistoryCursor(undefined);
    setLoadingPage(true);
    setLoadError(null);
    markDmThreadRead(threadId);
  }, [threadId]);

  useEffect(() => {
    if (page === undefined) return;
    setLoadingPage(false);
    const rows = (page.messages ?? []) as DmMessage[];
    const outcome = interpretDmHistoryPage(
      {
        messages: rows.map((m) => ({ messageId: m.messageId, createdAt: m.createdAt })),
        nextCursor: page.nextCursor ?? null,
      },
      { usedCursor: historyCursor !== undefined }
    );

    if (outcome.kind === "empty_not_exhausted") {
      setOlderError(true);
      return;
    }
    if (outcome.kind === "exhausted") {
      setExhausted(true);
      if (historyCursor === undefined) setMessages([]);
      return;
    }

    setOlderError(false);
    setNextCursor(outcome.nextCursor);
    setExhausted(outcome.exhausted);
    setMessages((prev) => {
      if (historyCursor === undefined) {
        // Newest-first from API → show oldest at top for chat feel
        return [...rows].reverse();
      }
      const older = [...rows].reverse();
      const seen = new Set(prev.map((m) => m.messageId));
      const merged = [...older.filter((m) => !seen.has(m.messageId)), ...prev];
      return merged;
    });
    markDmThreadRead(threadId, Date.now());
  }, [page, historyCursor, threadId, refreshKey]);

  const loadOlder = () => {
    if (nextCursor == null && !olderError) {
      if (!exhausted) setExhausted(true);
      return;
    }
    // M2: empty page is not end — allow retry with same cursor
    const cursor = olderError ? historyCursor : nextCursor ?? undefined;
    if (cursor == null && !olderError) {
      setExhausted(true);
      return;
    }
    if (cursor != null) {
      setLoadingPage(true);
      setHistoryCursor(cursor);
      setRefreshKey((n) => n + 1);
    }
  };

  const handleSend = async () => {
    if (sending || pendingClientId.current) return;
    const body = draft.trim();
    if (!body) return;
    if (!online) {
      setSendError(t.offlineSend);
      return;
    }
    if (!thread) {
      setSendError(t.errorTitle);
      return;
    }
    const clientId = newDmClientId();
    pendingClientId.current = clientId;
    setSending(true);
    setSendError(null);
    try {
      const result = await sendMessage({
        sessionToken,
        recipientUserId: thread.otherUserId,
        threadId,
        body,
        clientId,
      });
      setDraft("");
      // Refresh first page
      setHistoryCursor(undefined);
      setRefreshKey((n) => n + 1);
      setMessages((prev) => {
        if (prev.some((m) => m.messageId === result.messageId)) return prev;
        return [
          ...prev,
          {
            messageId: result.messageId,
            senderId: "me",
            body,
            deliveryState: "sent",
            createdAt: Date.now(),
            mine: true,
          },
        ];
      });
      markDmThreadRead(threadId);
      onStatus(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t.sendFailed);
    } finally {
      pendingClientId.current = null;
      setSending(false);
    }
  };

  const handleAccept = async () => {
    if (acting) return;
    setActing(true);
    try {
      await acceptRequest({ sessionToken, threadId });
      onStatus(t.accepted);
      setRefreshKey((n) => n + 1);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t.errorTitle);
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (acting) return;
    if (!window.confirm(t.declineConfirm)) return;
    setActing(true);
    try {
      await declineRequest({ sessionToken, threadId });
      onStatus(t.declined);
      onBack();
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t.errorTitle);
    } finally {
      setActing(false);
    }
  };

  const handleDeclineAndBlock = async () => {
    if (!thread || acting) return;
    if (!window.confirm(t.declineAndBlockConfirm)) return;
    setActing(true);
    try {
      await blockUser({ sessionToken, blockedUserId: thread.otherUserId });
      onStatus(t.declinedBlocked);
      onBlocked();
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t.errorTitle);
    } finally {
      setActing(false);
    }
  };

  const handleBlock = async () => {
    if (!thread || acting) return;
    if (!window.confirm(t.blockConfirm)) return;
    setActing(true);
    try {
      await blockUser({ sessionToken, blockedUserId: thread.otherUserId });
      onBlocked();
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t.errorTitle);
    } finally {
      setActing(false);
      setMenuOpen(false);
    }
  };

  const handleReport = async () => {
    if (reporting) return;
    const reason = reportReason.trim();
    if (!reason) return;
    setReporting(true);
    try {
      await reportMessage({
        sessionToken,
        threadId,
        reason,
      });
      onStatus(t.reportSuccess);
      setReportOpen(false);
      setReportReason("");
      setMenuOpen(false);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t.errorTitle);
    } finally {
      setReporting(false);
    }
  };

  if (thread === undefined) {
    return (
      <div className="rounded-xl border border-border bg-white px-3 py-8 text-center text-sm text-muted">
        {t.loadingMessages}
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-white p-3">
        <p className="text-sm text-muted" role="alert">
          {t.errorTitle}
        </p>
        <Button type="button" size="sm" className="min-h-11" onClick={onBack}>
          {t.backToList}
        </Button>
      </div>
    );
  }

  const isRequest = thread.requestStatus === "open" && !thread.initiatedByMe;
  const peerLabel = displayPeer(thread.otherUserId);

  return (
    <div className="flex min-h-[60vh] flex-col rounded-xl border border-border bg-white">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/[0.04]"
          aria-label={t.backToList}
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{peerLabel}</h3>
          {thread.requestStatus === "open" ? (
            <p className="text-[11px] text-amber-800">{t.messageRequest}</p>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/[0.04]"
            aria-label={t.conversationMenu}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical className="h-5 w-5" aria-hidden />
          </button>
          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-white p-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]"
                onClick={() => void handleBlock()}
              >
                <Ban className="h-4 w-4" aria-hidden />
                {t.blockUser}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]"
                onClick={() => {
                  setReportOpen(true);
                  setMenuOpen(false);
                }}
              >
                <Flag className="h-4 w-4" aria-hidden />
                {t.reportMessage}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {isRequest ? (
        <div className="space-y-2 border-b border-amber-200 bg-amber-50 px-3 py-3" role="region">
          <p className="text-sm text-amber-950">{t.requestBanner}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={acting}
              onClick={() => void handleAccept()}
            >
              {t.acceptRequest}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={acting}
              onClick={() => void handleDecline()}
            >
              {t.declineRequest}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={acting}
              onClick={() => void handleDeclineAndBlock()}
            >
              {t.declineAndBlock}
            </Button>
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div className="space-y-2 border-b border-border px-3 py-3">
          <label htmlFor={reasonId} className="text-sm font-medium">
            {t.reportReasonLabel}
          </label>
          <input
            id={reasonId}
            className="min-h-12 w-full rounded-xl border border-border px-3 text-base"
            placeholder={t.reportReasonPlaceholder}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={reporting || !reportReason.trim()}
              onClick={() => void handleReport()}
            >
              {t.reportSubmit}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setReportOpen(false);
                setReportReason("");
              }}
            >
              {t.reportCancel}
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3" role="log" aria-live="polite">
        {!exhausted || olderError ? (
          <div className="flex flex-col items-center gap-1 pb-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11"
              disabled={loadingPage && historyCursor !== undefined}
              onClick={loadOlder}
              aria-describedby="dm-load-older-hint"
            >
              {olderError ? t.loadOlderRetry : t.loadOlder}
            </Button>
            <p id="dm-load-older-hint" className="text-[11px] text-muted">
              {t.loadOlderHint}
            </p>
          </div>
        ) : messages.length > 0 ? (
          <p className="pb-2 text-center text-[11px] text-muted">{t.endOfHistory}</p>
        ) : null}

        {loadingPage && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t.loadingMessages}</p>
        ) : null}

        {loadError ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm text-red-700" role="alert">
              {loadError}
            </p>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={() => {
                setHistoryCursor(undefined);
                setRefreshKey((n) => n + 1);
                setLoadingPage(true);
              }}
            >
              {t.errorRetry}
            </Button>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.messageId}
            className={cn(
              "flex",
              message.mine ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                message.mine
                  ? "bg-accent text-white"
                  : "bg-black/[0.05] text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  message.mine ? "text-white/80" : "text-muted"
                )}
              >
                {message.mine ? t.you : peerLabel} ·{" "}
                {formatRelativeTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t border-border p-2">
        {sendError ? (
          <p className="mb-2 text-sm text-red-700" role="alert">
            {sendError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void handleSend()}
            >
              {t.errorRetry}
            </button>
          </p>
        ) : null}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <label htmlFor={composerId} className="sr-only">
            {t.composerPlaceholder}
          </label>
          <textarea
            id={composerId}
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-y rounded-xl border border-border px-3 py-2.5 text-base"
            placeholder={t.composerPlaceholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending || thread?.requestStatus === "declined"}
          />
          <Button
            type="submit"
            size="sm"
            className="min-h-12 min-w-12"
            disabled={sending || !draft.trim() || thread?.requestStatus === "declined"}
            aria-label={t.send}
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only">{sending ? t.sending : t.send}</span>
          </Button>
        </form>
      </footer>
    </div>
  );
});
