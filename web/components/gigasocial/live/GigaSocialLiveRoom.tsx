"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  LIVE_GIFTS,
  LIVE_REACTIONS,
  LIVE_VIDEO_CAPTURE_CONSTRAINTS,
  getLiveReactionCount,
  type LiveStreamMode,
} from "@/lib/gigasocial/liveStreaming";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Gift, MessageCircle, Radio, Shield, Users, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export const GigaSocialLiveRoom = memo(function GigaSocialLiveRoom({
  sessionToken,
  streamId,
  isHost,
  onClose,
}: {
  sessionToken: string;
  streamId: Id<"socialLiveStreams">;
  isHost: boolean;
  onClose: () => void;
}) {
  const data = useQuery(api.gigaSocialLive.getLiveStream, { streamId, sessionToken });
  const joinLive = useMutation(api.gigaSocialLive.joinLiveStream);
  const sendChat = useMutation(api.gigaSocialLive.sendLiveChat);
  const sendReaction = useMutation(api.gigaSocialLive.sendLiveReaction);
  const sendGift = useMutation(api.gigaSocialLive.sendLiveGift);
  const addCaption = useMutation(api.gigaSocialLive.addLiveCaption);
  const addCoHost = useMutation(api.gigaSocialLive.addLiveCoHost);
  const moderate = useMutation(api.gigaSocialLive.moderateLiveChat);
  const endLive = useMutation(api.gigaSocialLive.endLiveStream);
  const startLive = useMutation(api.gigaSocialLive.startLiveStream);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const [chatBody, setChatBody] = useState("");
  const [coHostHandle, setCoHostHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const joinedRef = useRef(false);
  const startLiveCalledRef = useRef(false);
  const hostMediaStartedRef = useRef(false);

  const stream = data?.stream;
  const mode = (stream?.mode ?? "video") as LiveStreamMode;

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const startHostMedia = useCallback(async () => {
    if (!isHost || stream?.status !== "live") return;
    setMediaError(null);
    try {
      stopMedia();
      const media =
        mode === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({
              video: mode === "video" ? LIVE_VIDEO_CAPTURE_CONSTRAINTS : false,
              audio: true,
            });
      mediaStreamRef.current = media;
      if (videoRef.current && mode !== "audio") {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
      const win = window as Window & {
        SpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          onresult: ((event: { results: { [index: number]: { [index: number]: { transcript?: string } } } }) => void) | null;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          onresult: ((event: { results: { [index: number]: { [index: number]: { transcript?: string } } } }) => void) | null;
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionCtor && isHost) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const line = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
          if (line) {
            void addCaption({ sessionToken, streamId, line });
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Could not access camera or microphone.");
    }
  }, [addCaption, isHost, mode, sessionToken, stopMedia, stream?.status, streamId]);

  useEffect(() => {
    if (!stream || joinedRef.current) return;
    if (stream.status === "live" && !isHost) {
      joinedRef.current = true;
      void joinLive({ sessionToken, streamId });
    }
  }, [isHost, joinLive, sessionToken, stream, streamId]);

  useEffect(() => {
    if (!isHost || stream?.status !== "scheduled" || startLiveCalledRef.current) return;
    startLiveCalledRef.current = true;
    void startLive({ sessionToken, streamId, mode });
  }, [isHost, mode, sessionToken, startLive, stream?.status, streamId]);

  useEffect(() => {
    if (!isHost || stream?.status !== "live") {
      if (stream?.status !== "live") {
        hostMediaStartedRef.current = false;
      }
      return;
    }
    if (hostMediaStartedRef.current) return;
    hostMediaStartedRef.current = true;
    void startHostMedia();
  }, [isHost, startHostMedia, stream?.status]);

  useEffect(() => {
    return () => stopMedia();
  }, [stopMedia]);

  if (data === undefined) {
    return <LoadingState label="Joining live room…" />;
  }

  if (data === null || !stream) {
    return (
      <div className="saas-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted">This live stream is unavailable or has ended.</p>
        <Button type="button" className="mt-4 min-h-11" onClick={onClose}>
          Go back
        </Button>
      </div>
    );
  }

  async function handleSendChat() {
    if (!chatBody.trim() || busy) return;
    setBusy(true);
    try {
      await sendChat({ sessionToken, streamId, body: chatBody });
      setChatBody("");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    stopMedia();
    if (isHost && stream.status === "live") {
      await endLive({ sessionToken, streamId });
    }
    onClose();
  }

  return (
    <div className="gigasocial-live-stable gigasocial-live-room space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">GigaSocial Live</p>
          <h3 className="text-lg font-semibold text-foreground">{stream.title}</h3>
          <p className="text-xs text-muted">
            @{stream.host.handle} · {stream.status} · {stream.viewerCount} viewers
            {stream.peakViewers > 0 ? ` · peak ${stream.peakViewers}` : ""}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleEnd()} className="min-h-9">
          <X className="h-4 w-4" aria-hidden />
          {isHost ? "End stream" : "Leave"}
        </Button>
      </div>

      <div className="saas-card gigasocial-live-stage overflow-hidden rounded-2xl border border-border bg-black">
        {stream.replayUrl && stream.status === "ended" ? (
          <video
            src={stream.replayUrl}
            controls
            className={cn(
              "gigasocial-live-video w-full bg-black",
              mode === "video" && "gigasocial-live-video--portrait"
            )}
          />
        ) : mode === "audio" ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 px-6 py-10 text-white">
            <Radio className="h-10 w-10" aria-hidden />
            <p className="text-sm font-medium">Live audio room</p>
            <p className="text-xs text-violet-200">Chat, reactions, and gifts are active.</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted={isHost}
            controls={!isHost}
            className={cn(
              "gigasocial-live-video w-full bg-black",
              mode === "video" && "gigasocial-live-video--portrait",
              mode === "screen" && "gigasocial-live-video--screen"
            )}
            aria-label="Live stream preview"
          />
        )}
        {mediaError ? (
          <p className="bg-red-950 px-3 py-2 text-xs text-red-200">{mediaError}</p>
        ) : null}
        {stream.captionLines?.length ? (
          <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-sm text-white">
            <p className="text-[10px] uppercase tracking-wide text-violet-300">AI captions</p>
            <p>{stream.captionLines[stream.captionLines.length - 1]}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {LIVE_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="min-h-9 rounded-full border border-border bg-white px-3 text-sm"
            onClick={() => void sendReaction({ sessionToken, streamId, emoji })}
          >
            {emoji} {getLiveReactionCount(stream.reactionCounts, emoji)}
          </button>
        ))}
      </div>

      {isHost ? (
        <div className="saas-card space-y-2 rounded-xl border border-border bg-white p-3">
          <p className="text-sm font-medium text-foreground">
            <Shield className="mr-1 inline h-4 w-4" aria-hidden />
            Host moderation
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={coHostHandle}
              onChange={(e) => setCoHostHandle(e.target.value)}
              placeholder="Add co-host @handle"
              className="input-surface min-h-9 flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              onClick={() =>
                void addCoHost({ sessionToken, streamId, coHostHandle }).then(() => setCoHostHandle(""))
              }
            >
              <Users className="h-4 w-4" aria-hidden />
              Co-host
            </Button>
          </div>
        </div>
      ) : null}

      <div className="saas-card rounded-xl border border-border bg-white p-3">
        <p className="mb-2 text-sm font-medium text-foreground">
          <Gift className="mr-1 inline h-4 w-4" aria-hidden />
          Send a gift
        </p>
        <div className="flex flex-wrap gap-2">
          {LIVE_GIFTS.map((gift) => (
            <Button
              key={gift.id}
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              onClick={() =>
                void sendGift({
                  sessionToken,
                  streamId,
                  giftType: gift.id,
                  amount: gift.credits,
                })
              }
            >
              {gift.emoji} {gift.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="saas-card rounded-xl border border-border bg-white p-3">
        <p className="mb-2 text-sm font-medium text-foreground">
          <MessageCircle className="mr-1 inline h-4 w-4" aria-hidden />
          Live chat
        </p>
        <ul className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
          {data.chat.map((message) => (
            <li key={message._id} className="text-sm">
              <span className="font-medium text-foreground">{message.author.displayName}</span>
              <span className="text-muted"> {message.body}</span>
              {isHost ? (
                <button
                  type="button"
                  className="ml-2 text-xs text-red-700"
                  onClick={() =>
                    void moderate({ sessionToken, streamId, messageId: message._id })
                  }
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {stream.status === "live" ? (
          <div className="mt-3 flex gap-2">
            <input
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              placeholder="Say something…"
              className="input-surface min-h-10 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendChat();
              }}
            />
            <Button type="button" disabled={busy} onClick={() => void handleSendChat()} className="min-h-10">
              Send
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
});
